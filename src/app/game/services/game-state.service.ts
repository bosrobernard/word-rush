import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import {
  LetterTile,
  AnswerSlot,
  HistoryEntry,
  Toast,
  PlayerReaction,
  FloatingScore,
  GamePhase,
} from '../models/game.models';
import { GameRoomService } from './game-room.service';

let _id = 0;
const uid = () => `t${++_id}_${Date.now()}`;

@Injectable({ providedIn: 'root' })
export class GameStateService implements OnDestroy {
  private subs = new Subscription();

  // ── Puzzle state ──────────────────────────────────────────────────────────
  readonly gridTiles$ = new BehaviorSubject<LetterTile[]>([]);
  readonly bankTiles$ = new BehaviorSubject<LetterTile[]>([]);
  readonly answerSlots$ = new BehaviorSubject<AnswerSlot[]>([]);
  readonly shakeSlots$ = new BehaviorSubject<boolean>(false);

  // ── Timer ─────────────────────────────────────────────────────────────────
  readonly timerValue$ = new BehaviorSubject<number>(30);
  readonly timerMax$ = new BehaviorSubject<number>(30);
  readonly timerCritical$ = new BehaviorSubject<boolean>(false);
  readonly timerRunning$ = new BehaviorSubject<boolean>(false);
  private timerInterval?: ReturnType<typeof setInterval>;

  // ── Player stats ──────────────────────────────────────────────────────────
  readonly myScore$ = new BehaviorSubject<number>(0);
  readonly myStreak$ = new BehaviorSubject<number>(0);
  readonly mySolved$ = new BehaviorSubject<number>(0);
  readonly myAccuracy$ = new BehaviorSubject<number>(100);
  readonly history$ = new BehaviorSubject<HistoryEntry[]>([]);
  private totalAttempts = 0;
  private correctCount = 0;

  // ── Effects ───────────────────────────────────────────────────────────────
  readonly reactions$ = new BehaviorSubject<PlayerReaction[]>([]);
  readonly floatingScores$ = new BehaviorSubject<FloatingScore[]>([]);
  readonly toast$ = new BehaviorSubject<Toast | null>(null);
  readonly burst$ = new Subject<void>();
  readonly correctFlash$ = new Subject<void>();
  readonly wrongFlash$ = new Subject<void>();

  // ── Game context ──────────────────────────────────────────────────────────
  readonly phase$ = new BehaviorSubject<GamePhase>('lobby');
  readonly currentRound$ = new BehaviorSubject<number>(1);
  readonly totalRounds$ = new BehaviorSubject<number>(10);
  readonly category$ = new BehaviorSubject<string>('');
  readonly difficulty$ = new BehaviorSubject<string>('medium');
  readonly roundWinner$ = new BehaviorSubject<string>('');
  readonly matchWinner$ = new BehaviorSubject<string>('');
  readonly countdownSec$ = new BehaviorSubject<number>(0);

  constructor(private room: GameRoomService) {
    this.wireRoomEvents();
  }

  // ── Wire all server events → local reactive state ─────────────────────────
  private wireRoomEvents(): void {
    // Phase mirror
    this.subs.add(this.room.phase$.subscribe((p) => this.phase$.next(p)));

    // match_countdown → show countdown overlay
    this.subs.add(
      this.room.matchCountdown$.subscribe((ev) => {
        this.countdownSec$.next(0); // ← reset first so next value always fires
        setTimeout(
          () => this.countdownSec$.next(Math.ceil(ev.startsInMs / 1000)),
          0,
        );
      }),
    );

    // round_start → build puzzle from server's scrambledWord
    this.subs.add(
      this.room.roundStart$.subscribe((ev) => {
        this.roundWinner$.next('');
        this.matchWinner$.next('');

        if (ev.roundNo === 1) {
          // Reset per-match stats at the start of a fresh match
          this.totalAttempts = 0;
          this.correctCount = 0;
          this.myScore$.next(0);
          this.myStreak$.next(0);
          this.mySolved$.next(0);
          this.myAccuracy$.next(100);
          this.history$.next([]);
        }

        this.currentRound$.next(ev.roundNo);
        this.totalRounds$.next(ev.totalRounds);
        this.category$.next(ev.category ?? '');
        this.difficulty$.next(ev.difficulty ?? 'medium');
        this.buildPuzzleFromWord(ev.scrambledWord);
      }),
    );

    // buzz_open → start answer-window timer precisely from server deadline
    this.subs.add(
      this.room.buzzOpenEvent$.subscribe((ev) => {
        this.startTimerFromDeadline(
          ev.answerWindowEndsAt,
          ev.answerWindowMs / 1000,
        );
      }),
    );

    // buzz_accepted → reaction + banner
    this.subs.add(
      this.room.buzzAccepted$.subscribe((ev) => {
        this.addReaction(ev.sessionId, ev.nickname, '⚡');
      }),
    );

    // answer_result → score, streak, effects
    this.subs.add(
      this.room.answerResult$.subscribe((ev) => {
        this.stopTimer();
        this.totalAttempts++;

        if (ev.correct) {
          this.correctCount++;
          this.myScore$.next(this.myScore$.getValue() + ev.pointsAwarded);
          this.myStreak$.next(this.myStreak$.getValue() + 1);
          this.mySolved$.next(this.mySolved$.getValue() + 1);
          this.showToast(`CORRECT! +${ev.pointsAwarded} pts`, 'success');
          this.burst$.next();
          this.correctFlash$.next();
          this.clearSlots(); // ← add this

          this.addFloatingScore(ev.pointsAwarded);
          this.addHistory(
            ev.answer,
            ev.pointsAwarded,
            (ev.timeTakenMs / 1000).toFixed(1),
            true,
          );
        } else {
          this.myStreak$.next(0);
          this.showToast('WRONG ANSWER!', 'error');
          this.wrongFlash$.next();
          this.triggerShake();
          this.addHistory(
            ev.answer,
            0,
            (ev.timeTakenMs / 1000).toFixed(1),
            false,
          );
        }

        this.recalcAccuracy();
      }),
    );

    // round_end → show winner, reveal answer if nobody got it
    this.subs.add(
      this.room.roundEnd$.subscribe((ev) => {
        this.stopTimer();
        this.roundWinner$.next(ev.winnerNickname ?? '');
        if (!ev.winnerNickname) {
          this.showToast(`ANSWER: ${ev.correctAnswer}`, 'info');
        }
        // Update our score from canonical scoreboard
        const myId = this.room.myCustomerId$.getValue();
        const me = ev.scoreboard?.find((p) => p.customerId === myId);
        if (me) this.myScore$.next(me.score);
      }),
    );

    // match_end
    this.subs.add(
      this.room.matchEnd$.subscribe((ev) => {
        this.stopTimer();
        this.matchWinner$.next(ev.winnerNickname);
        this.showToast(`🏆 ${ev.winnerNickname} WINS!`, 'success');
        // Final canonical score
        const myId = this.room.myCustomerId$.getValue();
        const me = ev.finalScoreboard?.find((p) => p.customerId === myId);
        if (me) this.myScore$.next(me.score);
      }),
    );

    // connection error
    this.subs.add(
      this.room.error$.subscribe((err) => {
        this.showToast(err.message, 'error');
      }),
    );
  }

  // ── Puzzle construction ───────────────────────────────────────────────────
  buildPuzzleFromWord(scrambled: string): void {
    const letters = scrambled.toUpperCase().split('');

    const grid: LetterTile[] = letters.map((l, i) => ({
      id: uid(),
      letter: l,
      used: false,
      source: 'grid',
      gridIndex: i,
    }));

    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    const bank: LetterTile[] = shuffled.map((l) => ({
      id: uid(),
      letter: l,
      used: false,
      source: 'bank',
    }));

    const slots: AnswerSlot[] = letters.map((_, i) => ({
      index: i,
      letter: '',
      tileId: null,
      active: i === 0,
      filled: false,
    }));

    this.gridTiles$.next(grid);
    this.bankTiles$.next(bank);
    this.answerSlots$.next(slots);
  }

  // ── Letter interaction ────────────────────────────────────────────────────
  addLetterFromGrid(tile: LetterTile): void {
    if (tile.used) return;
    const slots = [...this.answerSlots$.getValue()];
    const nextEmpty = slots.findIndex((s) => !s.filled);
    if (nextEmpty === -1) return;

    const tiles = [...this.gridTiles$.getValue()];
    tiles.find((t) => t.id === tile.id)!.used = true;

    slots[nextEmpty] = {
      ...slots[nextEmpty],
      letter: tile.letter,
      tileId: tile.id,
      filled: true,
      active: false,
    };
    const next = slots.findIndex((s) => !s.filled);
    if (next !== -1) slots[next] = { ...slots[next], active: true };

    this.gridTiles$.next(tiles);
    this.answerSlots$.next(slots);
  }

  addLetterFromBank(tile: LetterTile): void {
    if (tile.used) return;
    const slots = [...this.answerSlots$.getValue()];
    const nextEmpty = slots.findIndex((s) => !s.filled);
    if (nextEmpty === -1) return;

    const bank = [...this.bankTiles$.getValue()];
    bank.find((b) => b.id === tile.id)!.used = true;

    slots[nextEmpty] = {
      ...slots[nextEmpty],
      letter: tile.letter,
      tileId: tile.id,
      filled: true,
      active: false,
    };
    const next = slots.findIndex((s) => !s.filled);
    if (next !== -1) slots[next] = { ...slots[next], active: true };

    this.bankTiles$.next(bank);
    this.answerSlots$.next(slots);
  }

  removeSlotAt(index: number): void {
    const slots = [...this.answerSlots$.getValue()];
    if (!slots[index]?.filled) return;

    const tileId = slots[index].tileId;
    const grid = [...this.gridTiles$.getValue()];
    const bank = [...this.bankTiles$.getValue()];
    const gt = grid.find((t) => t.id === tileId);
    const bt = bank.find((t) => t.id === tileId);
    if (gt) gt.used = false;
    if (bt) bt.used = false;

    // Shift remaining slots left
    for (let i = index; i < slots.length - 1; i++) {
      slots[i] = { ...slots[i + 1], index: i };
    }
    slots[slots.length - 1] = {
      index: slots.length - 1,
      letter: '',
      tileId: null,
      active: false,
      filled: false,
    };

    const firstEmpty = slots.findIndex((s) => !s.filled);
    slots.forEach((s, i) => (s.active = i === firstEmpty));

    this.gridTiles$.next(grid);
    this.bankTiles$.next(bank);
    this.answerSlots$.next(slots);
  }

  clearSlots(): void {
    this.gridTiles$.next(
      this.gridTiles$.getValue().map((t) => ({ ...t, used: false })),
    );
    this.bankTiles$.next(
      this.bankTiles$.getValue().map((t) => ({ ...t, used: false })),
    );
    this.answerSlots$.next(
      this.answerSlots$.getValue().map((s, i) => ({
        ...s,
        letter: '',
        tileId: null,
        filled: false,
        active: i === 0,
      })),
    );
  }

  shuffleBank(): void {
    const bank = [...this.bankTiles$.getValue()];
    const available = bank
      .filter((b) => !b.used)
      .sort(() => Math.random() - 0.5);
    const used = bank.filter((b) => b.used);
    this.bankTiles$.next([...available, ...used]);
  }

  getAnswerWord(): string {
    return this.answerSlots$
      .getValue()
      .map((s) => s.letter)
      .join('');
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  /**
   * Start timer anchored to a server timestamp deadline.
   * Falls back to `fallbackSecs` when deadline is 0 or in the past.
   */
  startTimerFromDeadline(deadlineMs: number, fallbackSecs: number): void {
    const now = Date.now();
    const seconds = deadlineMs > now ? (deadlineMs - now) / 1000 : fallbackSecs;
    this.startTimer(seconds);
  }

  startTimer(seconds: number): void {
    this.stopTimer();
    const rounded = Math.max(1, Math.round(seconds * 10) / 10);
    this.timerMax$.next(rounded);
    this.timerValue$.next(rounded);
    this.timerRunning$.next(true);

    const deadline = Date.now() + rounded * 1000; // ← anchor to wall clock

    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      const v = parseFloat(remaining.toFixed(1));
      this.timerValue$.next(v);
      this.timerCritical$.next(v <= 5);
      if (v === 0) {
        this.stopTimer();
        this.showToast("TIME'S UP!", 'warning');
      }
    }, 100);
  }

  stopTimer(): void {
    clearInterval(this.timerInterval);
    this.timerRunning$.next(false);
    this.timerCritical$.next(false);
  }

  // ── Reactions ─────────────────────────────────────────────────────────────
  addReaction(sessionId: string, nickname: string, emoji: string): void {
    const r: PlayerReaction = { sessionId, nickname, emoji, id: uid() };
    this.reactions$.next([...this.reactions$.getValue(), r]);
    setTimeout(() => {
      this.reactions$.next(
        this.reactions$.getValue().filter((x) => x.id !== r.id),
      );
    }, 2500);
  }

  triggerReaction(emoji: string): void {
    const nickname =
      this.room
        .getStateSnapshot()
        ?.players.find(
          (p) => p.customerId === this.room.myCustomerId$.getValue(),
        )?.nickname ?? 'You';
    this.addReaction('me', nickname, emoji);
  }

  // ── Floating score indicators ─────────────────────────────────────────────
  addFloatingScore(value: number): void {
    const fs: FloatingScore = {
      id: uid(),
      value,
      x: 35 + Math.random() * 30,
      y: 40 + Math.random() * 20,
    };
    this.floatingScores$.next([...this.floatingScores$.getValue(), fs]);
    setTimeout(() => {
      this.floatingScores$.next(
        this.floatingScores$.getValue().filter((s) => s.id !== fs.id),
      );
    }, 1600);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  showToast(message: string, type: Toast['type']): void {
    this.toast$.next({ message, type, visible: true });
    setTimeout(() => this.toast$.next(null), 2200);
  }

  // ── Shake ─────────────────────────────────────────────────────────────────
  triggerShake(): void {
    this.shakeSlots$.next(true);
    setTimeout(() => this.shakeSlots$.next(false), 500);
  }

  // ── History ───────────────────────────────────────────────────────────────
  addHistory(word: string, pts: number, time: string, correct: boolean): void {
    const h = [{ word, pts, time, correct }, ...this.history$.getValue()].slice(
      0,
      8,
    );
    this.history$.next(h);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private recalcAccuracy(): void {
    if (this.totalAttempts === 0) return;
    this.myAccuracy$.next(
      Math.round((this.correctCount / this.totalAttempts) * 100),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopTimer();
  }
}
