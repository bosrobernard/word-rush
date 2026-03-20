// ─── Server event payloads ───────────────────────────────────────────────────

export interface MatchCountdownEvent {
  type: 'match_countdown';
  startsInMs: number;
  matchId: string;
}

export interface RoundStartEvent {
  type: 'round_start';
  roundNo: number;
  scrambledWord: string;
  wordId: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalRounds: number;
}

export interface BuzzOpenEvent {
  type: 'buzz_open';
  roundNo: number;
  answerWindowMs: number;
  answerWindowEndsAt: number;
}

export interface BuzzAcceptedEvent {
  type: 'buzz_accepted';
  sessionId: string;
  nickname: string;
  roundNo: number;
}

export interface AnswerResultEvent {
  type: 'answer_result';
  roundNo: number;
  correct: boolean;
  answer: string;
  pointsAwarded: number;
  timeTakenMs: number;
  sessionId: string;
  nickname: string;
}

export interface RoundEndEvent {
  type: 'round_end';
  roundNo: number;
  correctAnswer: string;
  scoreboard: ScoreboardItem[];
  winnerNickname?: string;
  winnerSessionId?: string;
}

export interface MatchEndEvent {
  type: 'match_end';
  matchId: string;
  winnerCustomerId: string;
  winnerNickname: string;
  finalScoreboard: ScoreboardItem[];
  resultHash: string;
}

export interface ScoreboardItem {
  customerId: string;
  nickname: string;
  seatNo: number;
  score: number;
  wrongAttemptsUsed: number;
  rank: number;
}

// ─── Room state ──────────────────────────────────────────────────────────────

export interface PlayerSnapshot {
  sessionId: string;
  customerId: string;
  nickname: string;
  seatNo: number;
  connected: boolean;
  ready: boolean;
  score: number;
  rank: number;
  status: string;
  wrongAttemptsUsed: number;
  eliminatedFromAnswering: boolean;
  correctAnswers: number;
  buzzCount: number;
}

export interface RoomStateSnapshot {
  roomId: string;
  matchId: string;
  gameKey: string;
  currency: string;
  entryAmount: number;
  maxPlayers: number;
  status: RoomStatus;
  createdAt: number;
  startedAt: number;
  endedAt: number;
  winnerCustomerId: string;
  resultHash: string;
  totalRounds: number;
  currentRoundNo: number;
  currentWordId: string;
  scrambledWord: string;
  roundCategory: string;
  roundDifficulty: string;
  buzzOpen: boolean;
  answerLockedSessionId: string;
  answerWindowEndsAt: number;
  players: PlayerSnapshot[];
}

export type RoomStatus =
  | 'waiting'
  | 'countdown'
  | 'in_round'
  | 'round_end'
  | 'match_end';

// ─── Local UI state ──────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'round_active'
  | 'buzz_window'
  | 'answering'
  | 'round_result'
  | 'match_end';

export interface LetterTile {
  id: string;
  letter: string;
  used: boolean;
  source: 'grid' | 'bank';
  gridIndex?: number;
}

export interface AnswerSlot {
  index: number;
  letter: string;
  tileId: string | null;
  active: boolean;
  filled: boolean;
  shake?: boolean;
  popIn?: boolean;
}

export interface PlayerReaction {
  sessionId: string;
  nickname: string;
  emoji: string;
  id: string;
}

export interface FloatingScore {
  id: string;
  value: number;
  x: number;
  y: number;
}

export interface HistoryEntry {
  word: string;
  pts: number;
  time: string;
  correct: boolean;
}

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  visible: boolean;
}

export interface JoinConfig {
  endpoint: string;
  roomName?: string;
  customerId: string;
  nickname: string;
  seatNo: number;
  seatToken: string;
}
