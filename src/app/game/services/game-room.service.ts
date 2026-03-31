import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameRoomClient } from '../../core/GameRoomClient';
import {
  GamePhase,
  RoomStateSnapshot,
  MatchCountdownEvent,
  RoundStartEvent,
  BuzzOpenEvent,
  BuzzAcceptedEvent,
  AnswerResultEvent,
  RoundEndEvent,
  MatchEndEvent,
  JoinConfig,
  PlayerSnapshot,
  ScoreboardItem,
} from '../models/game.models';
import { GameMatchService, GameMatch } from './game-match.service';

@Injectable({ providedIn: 'root' })
export class GameRoomService implements OnDestroy {
  private client!: GameRoomClient;
  private unsubs: Array<() => void> = [];

  // ── Connection state ───────────────────────────────────────────────────────
  readonly connected$ = new BehaviorSubject<boolean>(false);
  readonly connecting$ = new BehaviorSubject<boolean>(false);
  readonly connectionError$ = new BehaviorSubject<string | null>(null);

  // ── Room / match state ─────────────────────────────────────────────────────
  readonly phase$ = new BehaviorSubject<GamePhase>('lobby');
  readonly state$ = new BehaviorSubject<RoomStateSnapshot | null>(null);
  readonly scrambledWord$ = new BehaviorSubject<string>('');
  readonly mySessionId$ = new BehaviorSubject<string>('');
  readonly myCustomerId$ = new BehaviorSubject<string>('');
  readonly countdownMs$ = new BehaviorSubject<number>(0);
  readonly buzzOpen$ = new BehaviorSubject<boolean>(false);
  readonly answerWindowEndsAt$ = new BehaviorSubject<number>(0);
  readonly lockedSessionId$ = new BehaviorSubject<string>('');
  readonly buzzedNickname$ = new BehaviorSubject<string>('');

  // ── Server event streams ───────────────────────────────────────────────────
  readonly matchCountdown$ = new Subject<MatchCountdownEvent>();
  readonly roundStart$ = new Subject<RoundStartEvent>();
  readonly buzzOpenEvent$ = new Subject<BuzzOpenEvent>();
  readonly buzzAccepted$ = new Subject<BuzzAcceptedEvent>();
  readonly answerResult$ = new Subject<AnswerResultEvent>();
  readonly roundEnd$ = new Subject<RoundEndEvent>();
  readonly matchEnd$ = new Subject<MatchEndEvent>();
  readonly error$ = new Subject<{ message: string; cause?: unknown }>();

  readonly matchDetail$ = new BehaviorSubject<GameMatch | null>(null);

  constructor(private matchService: GameMatchService) {}

  async fetchMatchDetail(roomId: string): Promise<void> {
    try {
      const match = await this.matchService.getMatchByRoomId(roomId);
      this.matchDetail$.next(match);
    } catch (err) {
      console.warn('[GameRoomService] Could not fetch match detail:', err);
    }
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  async join(config: JoinConfig): Promise<void> {
    if (this.connecting$.getValue()) return;
    this.connecting$.next(true);
    this.connectionError$.next(null);

    try {
      this.client = new GameRoomClient(config.endpoint);

      const room = await this.client.join({
        roomName: config.roomName,
        customerId: config.customerId,
        nickname: config.nickname,
        seatNo: config.seatNo,
        seatToken: config.seatToken,
      });

      this.mySessionId$.next(room.sessionId);
      this.myCustomerId$.next(config.customerId);
      this.connected$.next(true);
      this.phase$.next('lobby');

      this.bindEvents();
      this.client.startHeartbeat(5000);
      this.client.sendReady();
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to connect to game server';
      this.connectionError$.next(msg);
      this.connected$.next(false);
      throw err;
    } finally {
      this.connecting$.next(false);
    }
  }

  // ── Leave ─────────────────────────────────────────────────────────────────
  async leave(): Promise<void> {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
    await this.client?.leave();
    this.connected$.next(false);
    this.connecting$.next(false);
    this.phase$.next('lobby');
    this.state$.next(null);
    this.buzzOpen$.next(false);
    this.lockedSessionId$.next('');
    this.buzzedNickname$.next('');
    this.matchDetail$.next(null); // ← add
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  buzz(roundNo: number): void {
    this.client?.sendBuzz(roundNo);
  }
  answer(roundNo: number, word: string): void {
    this.client?.sendAnswer(roundNo, word);
  }
  forfeit(): void {
    this.client?.sendForfeit();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getScoreboard(): ScoreboardItem[] {
    return this.client?.getScoreboard() ?? [];
  }
  getConnectedPlayers(): PlayerSnapshot[] {
    return this.client?.getConnectedPlayers() ?? [];
  }
  getStateSnapshot(): RoomStateSnapshot | null {
    return this.client?.getStateSnapshot() ?? null;
  }
  isMe(sessionId: string): boolean {
    return sessionId === this.mySessionId$.getValue();
  }

  // ── Internal: bind all Colyseus events to RxJS streams ───────────────────
  private bindEvents(): void {
    this.unsubs.push(
      this.client.on('state_change', (snap) => {
        this.state$.next(snap);
        this.buzzOpen$.next(snap.buzzOpen);
        this.lockedSessionId$.next(snap.answerLockedSessionId);
        this.answerWindowEndsAt$.next(snap.answerWindowEndsAt);

        // ── Fetch full match detail once we have a roomId ──
        if (snap.roomId && !this.matchDetail$.getValue()) {
          this.fetchMatchDetail(snap.roomId);
        }
      }),

      this.client.on('match_countdown', (ev) => {
        this.countdownMs$.next(ev.startsInMs);
        this.phase$.next('countdown');
        this.matchCountdown$.next(ev as MatchCountdownEvent);
      }),

      this.client.on('round_start', (ev) => {
        this.scrambledWord$.next(ev.scrambledWord);
        this.buzzOpen$.next(false);
        this.lockedSessionId$.next('');
        this.buzzedNickname$.next(''); // ← already there, good — this is what allows re-fire
        this.phase$.next('round_active');
        this.roundStart$.next(ev as RoundStartEvent);
      }),

      this.client.on('buzz_open', (ev) => {
        this.buzzOpen$.next(true);
        this.answerWindowEndsAt$.next(ev.answerWindowEndsAt);
        this.phase$.next('buzz_window');
        this.buzzOpenEvent$.next(ev as BuzzOpenEvent);
      }),

      this.client.on('buzz_accepted', (ev) => {
        this.lockedSessionId$.next(ev.sessionId);
        this.buzzedNickname$.next(ev.nickname);
        this.phase$.next(this.isMe(ev.sessionId) ? 'answering' : 'buzz_window');
        this.buzzAccepted$.next(ev as BuzzAcceptedEvent);
      }),

      this.client.on('answer_result', (ev) => {
        this.phase$.next('round_result');
        this.answerResult$.next(ev as AnswerResultEvent);
      }),

      this.client.on('round_end', (ev) => {
        this.phase$.next('round_result');
        this.roundEnd$.next(ev as RoundEndEvent);
      }),

      this.client.on('match_end', (ev) => {
        this.phase$.next('match_end');
        this.matchEnd$.next(ev as MatchEndEvent);
      }),

      this.client.on('error', (err) => {
        this.error$.next(err);
        console.error('[GameRoomService]', err.message, err.cause);
      }),

      this.client.on('leave', ({ code }) => {
        this.connected$.next(false);
        this.phase$.next('lobby');
        if (code !== 1000) {
          this.error$.next({ message: `Disconnected (code ${code})` });
        }
      }),
    );
  }

  ngOnDestroy() {
    this.leave();
  }
}
