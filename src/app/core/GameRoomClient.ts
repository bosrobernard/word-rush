import { Client, Room } from 'colyseus.js';

// All shared types live in game.models — single source of truth, no duplicates
import {
  ScoreboardItem,
  PlayerSnapshot,
  RoomStateSnapshot,
  RoomStatus,
} from '../game/models/game.models';

// ─── Client-to-server event payloads ─────────────────────────────────────────

export interface ClientToServerReady     { type: 'ready'; }
export interface ClientToServerHeartbeat { type: 'heartbeat'; sentAt: number; }
export interface ClientToServerBuzz      { type: 'buzz';     roundNo: number; sentAt: number; }
export interface ClientToServerAnswer    { type: 'answer';   roundNo: number; answer: string; sentAt: number; }
export interface ClientToServerForfeit   { type: 'forfeit'; }

export type ClientToServerEvent =
  | ClientToServerReady
  | ClientToServerHeartbeat
  | ClientToServerBuzz
  | ClientToServerAnswer
  | ClientToServerForfeit;

// ─── Server-to-client event payloads ─────────────────────────────────────────

export interface ServerToClientMatchCountdown {
  type: 'match_countdown';
  startsInMs: number;
  matchId: string;
}

export interface ServerToClientRoundStart {
  type: 'round_start';
  roundNo: number;
  scrambledWord: string;
  wordId: string;
  category: string;
  difficulty: string;
  totalRounds: number;
}

export interface ServerToClientBuzzOpen {
  type: 'buzz_open';
  roundNo: number;
  answerWindowMs: number;
  answerWindowEndsAt: number;
}

export interface ServerToClientBuzzAccepted {
  type: 'buzz_accepted';
  sessionId: string;
  nickname: string;
  roundNo: number;
}

export interface ServerToClientAnswerResult {
  type: 'answer_result';
  roundNo: number;
  correct: boolean;
  answer: string;
  pointsAwarded: number;
  timeTakenMs: number;
  sessionId: string;
  nickname: string;
}

export interface ServerToClientRoundEnd {
  type: 'round_end';
  roundNo: number;
  correctAnswer: string;
  scoreboard: ScoreboardItem[];
  winnerNickname?: string;
  winnerSessionId?: string;
}

export interface ServerToClientMatchEnd {
  type: 'match_end';
  matchId: string;
  winnerCustomerId: string;
  winnerNickname: string;
  finalScoreboard: ScoreboardItem[];
  resultHash: string;
}

// ─── Internal event map ───────────────────────────────────────────────────────

type Listener<T> = (payload: T) => void;

type EventMap = {
  match_countdown: ServerToClientMatchCountdown;
  round_start:     ServerToClientRoundStart;
  buzz_open:       ServerToClientBuzzOpen;
  buzz_accepted:   ServerToClientBuzzAccepted;
  answer_result:   ServerToClientAnswerResult;
  round_end:       ServerToClientRoundEnd;
  match_end:       ServerToClientMatchEnd;
  state_change:    RoomStateSnapshot;
  error:           { message: string; cause?: unknown };
  leave:           { code: number };
};

type EventName = keyof EventMap;

// ─── Join params ──────────────────────────────────────────────────────────────

export interface JoinRoomParams {
  roomName?: string;
  customerId: string;
  nickname: string;
  seatNo: number;
  seatToken: string;
}

// ─── GameRoomClient ───────────────────────────────────────────────────────────

export class GameRoomClient {
  private client: Client;
  private room: Room | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private listeners: { [K in EventName]: Set<Listener<EventMap[K]>> } = {
    match_countdown: new Set(),
    round_start:     new Set(),
    buzz_open:       new Set(),
    buzz_accepted:   new Set(),
    answer_result:   new Set(),
    round_end:       new Set(),
    match_end:       new Set(),
    state_change:    new Set(),
    error:           new Set(),
    leave:           new Set(),
  };

  private stateSnapshot: RoomStateSnapshot | null = null;

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  getRoom():          Room | null               { return this.room; }
  getStateSnapshot(): RoomStateSnapshot | null  { return this.stateSnapshot; }

  getConnectedPlayers(): PlayerSnapshot[] {
    return this.stateSnapshot?.players.filter(p => p.connected) ?? [];
  }

  getScoreboard(): ScoreboardItem[] {
    return [...(this.stateSnapshot?.players ?? [])]
      .sort((a, b) => {
        if (b.score !== a.score)                         return b.score - a.score;
        if (a.wrongAttemptsUsed !== b.wrongAttemptsUsed) return a.wrongAttemptsUsed - b.wrongAttemptsUsed;
        return b.correctAnswers - a.correctAnswers;
      })
      .map(p => ({
        customerId:        p.customerId,
        nickname:          p.nickname,
        seatNo:            p.seatNo,
        score:             p.score,
        wrongAttemptsUsed: p.wrongAttemptsUsed,
        rank:              p.rank ?? 0,
      }));
  }

  async join(params: JoinRoomParams): Promise<Room> {
    const roomName = params.roomName ?? 'my_room';
    this.room = await this.client.joinOrCreate(roomName, {
      customerId: params.customerId,
      nickname:   params.nickname,
      seatNo:     params.seatNo,
      seatToken:  params.seatToken,
    });
    this.bindCoreEvents();
    this.bindMessageEvents();
    this.bindStateEvents();
    return this.room;
  }

  async leave(consented = true): Promise<void> {
    this.stopHeartbeat();
    if (this.room) {
      await this.room.leave(consented);
      this.room = null;
    }
  }

  startHeartbeat(intervalMs = 5000): void {
    if (!this.room) throw new Error('Room not connected');
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      try { this.sendHeartbeat(); }
      catch (error) { this.emit('error', { message: 'Failed to send heartbeat', cause: error }); }
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  sendReady():                              void { this.assertRoom(); this.room!.send('ready',     { type: 'ready' }); }
  sendHeartbeat():                          void { this.assertRoom(); this.room!.send('heartbeat', { type: 'heartbeat', sentAt: Date.now() }); }
  sendBuzz(roundNo: number):                void { this.assertRoom(); this.room!.send('buzz',      { type: 'buzz', roundNo, sentAt: Date.now() }); }
  sendForfeit():                            void { this.assertRoom(); this.room!.send('forfeit',   { type: 'forfeit' }); }
  sendAnswer(roundNo: number, answer: string): void {
    this.assertRoom();
    this.room!.send('answer', { type: 'answer', roundNo, answer, sentAt: Date.now() });
  }

  send(event: ClientToServerEvent): void {
    switch (event.type) {
      case 'ready':     return this.sendReady();
      case 'heartbeat': return this.sendHeartbeat();
      case 'buzz':      return this.sendBuzz(event.roundNo);
      case 'answer':    return this.sendAnswer(event.roundNo, event.answer);
      case 'forfeit':   return this.sendForfeit();
      default:          throw new Error(`Unsupported event: ${(event as any)?.type}`);
    }
  }

  on<K extends EventName>(event: K, listener: Listener<EventMap[K]>): () => void {
    this.listeners[event].add(listener as any);
    return () => this.off(event, listener);
  }

  off<K extends EventName>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners[event].delete(listener as any);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    for (const listener of this.listeners[event]) {
      try { listener(payload); }
      catch (error) { console.error(`[GameRoomClient] listener error for "${event}"`, error); }
    }
  }

  private assertRoom(): void {
    if (!this.room) throw new Error('Room not connected');
  }

  private bindCoreEvents(): void {
    if (!this.room) return;
    this.room.onLeave(code => { this.stopHeartbeat(); this.emit('leave', { code }); });
    this.room.onError((code, message) => this.emit('error', { message: `Room error (${code}): ${message}` }));
  }

  private bindMessageEvents(): void {
    if (!this.room) return;
    this.room.onMessage('match_countdown', (p: ServerToClientMatchCountdown) => this.emit('match_countdown', p));
    this.room.onMessage('round_start',     (p: ServerToClientRoundStart)     => this.emit('round_start',     p));
    this.room.onMessage('buzz_open',       (p: ServerToClientBuzzOpen)       => this.emit('buzz_open',       p));
    this.room.onMessage('buzz_accepted',   (p: ServerToClientBuzzAccepted)   => this.emit('buzz_accepted',   p));
    this.room.onMessage('answer_result',   (p: ServerToClientAnswerResult)   => this.emit('answer_result',   p));
    this.room.onMessage('round_end',       (p: ServerToClientRoundEnd)       => this.emit('round_end',       p));
    this.room.onMessage('match_end',       (p: ServerToClientMatchEnd)       => this.emit('match_end',       p));
  }

  private bindStateEvents(): void {
    if (!this.room) return;
    this.room.onStateChange((state: any) => {
      this.stateSnapshot = this.makeStateSnapshot(state);
      this.emit('state_change', this.stateSnapshot);
    });
  }

  private makeStateSnapshot(state: any): RoomStateSnapshot {
    const players: PlayerSnapshot[] = [];

    if (state?.players) {
      if (typeof state.players.forEach === 'function') {
        state.players.forEach((player: any, sessionId: string) =>
          players.push(this.mapPlayer(sessionId, player))
        );
      } else {
        for (const sessionId of Object.keys(state.players)) {
          players.push(this.mapPlayer(sessionId, state.players[sessionId]));
        }
      }
    }

    players.sort((a, b) => a.seatNo - b.seatNo);

    return {
      roomId:                String(state.roomId                ?? ''),
      matchId:               String(state.matchId               ?? ''),
      gameKey:               String(state.gameKey               ?? ''),
      currency:              String(state.currency              ?? ''),
      entryAmount:           Number(state.entryAmount           ?? 0),
      maxPlayers:            Number(state.maxPlayers            ?? 0),
      status:                String(state.status                ?? '')  as RoomStatus,
      createdAt:             Number(state.createdAt             ?? 0),
      startedAt:             Number(state.startedAt             ?? 0),
      endedAt:               Number(state.endedAt               ?? 0),
      winnerCustomerId:      String(state.winnerCustomerId       ?? ''),
      resultHash:            String(state.resultHash            ?? ''),
      totalRounds:           Number(state.totalRounds           ?? 0),
      currentRoundNo:        Number(state.currentRoundNo        ?? 0),
      currentWordId:         String(state.currentWordId         ?? ''),
      scrambledWord:         String(state.scrambledWord         ?? ''),
      roundCategory:         String(state.roundCategory         ?? ''),
      roundDifficulty:       String(state.roundDifficulty       ?? ''),
      buzzOpen:              Boolean(state.buzzOpen),
      answerLockedSessionId: String(state.answerLockedSessionId  ?? ''),
      answerWindowEndsAt:    Number(state.answerWindowEndsAt    ?? 0),
      players,
    };
  }

  private mapPlayer(sessionId: string, player: any): PlayerSnapshot {
    return {
      sessionId,
      customerId:              String(player.customerId              ?? ''),
      nickname:                String(player.nickname                ?? ''),
      seatNo:                  Number(player.seatNo                  ?? 0),
      connected:               Boolean(player.connected),
      ready:                   Boolean(player.ready),
      score:                   Number(player.score                   ?? 0),
      rank:                    Number(player.rank                    ?? 0),
      status:                  String(player.status                  ?? ''),
      wrongAttemptsUsed:       Number(player.wrongAttemptsUsed       ?? 0),
      eliminatedFromAnswering: Boolean(player.eliminatedFromAnswering),
      correctAnswers:          Number(player.correctAnswers          ?? 0),
      buzzCount:               Number(player.buzzCount               ?? 0),
    };
  }
}
