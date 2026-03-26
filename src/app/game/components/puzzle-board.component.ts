import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { GameRoomService } from '../services/game-room.service';
import { LetterTile, AnswerSlot } from '../models/game.models';
import {
  tileEnter,
  slotPopIn,
  shake,
  buzzPulse,
  fadeUp,
} from '../animations/game.animations';

@Component({
  selector: 'app-puzzle-board',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [tileEnter, slotPopIn, shake, buzzPulse, fadeUp],
  template: `
    <div class="board" @fadeUp>
      <!-- Category label -->
      <div class="instruct">UNSCRAMBLE THE WORD</div>

      <!-- Puzzle Grid Tiles -->
      <div class="puzzle-grid" [class.buzz-glow]="buzzOpen">
        <div
          *ngFor="let tile of gridTiles; trackBy: trackTile"
          class="p-tile"
          [class.used]="tile.used"
          @tileEnter
          (click)="onGridTile(tile)"
          [style.animationDelay]="tile.gridIndex! * 80 + 'ms'"
        >
          {{ tile.letter }}
        </div>
      </div>

      <!-- Answer Construction Row -->
      <div class="answer-row" [@shake]="shakeState">
        <div
          *ngFor="let slot of answerSlots; trackBy: trackSlot"
          class="a-slot"
          [class.active]="slot.active"
          [class.filled]="slot.filled"
          [@slotPopIn]="slot.filled ? 'filled' : 'void'"
          (click)="onRemoveSlot(slot.index)"
        >
          <span *ngIf="slot.filled" class="slot-letter">{{ slot.letter }}</span>
          <span *ngIf="slot.active && !slot.filled" class="slot-cursor"></span>
        </div>
      </div>

      <!-- Letter Bank -->
      <div class="bank">
        <div class="bank-row" *ngFor="let row of bankRows">
          <div
            *ngFor="let tile of row; trackBy: trackTile"
            class="b-key"
            [class.used]="tile.used"
            (click)="onBankTile(tile)"
          >
            {{ tile.letter }}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <button
        class="btn-submit"
        (click)="onSubmit()"
        [class.locked]="phase === 'answering'"
        [disabled]="phase === 'round_result'"
      >
        <span *ngIf="phase !== 'answering'">SUBMIT</span>
        <span *ngIf="phase === 'answering'" class="answering-label"
          >⚡ ANSWERING…</span
        >
      </button>

      <div class="btn-row">
        <button class="btn-sec" (click)="onClear()">⊘&nbsp; CLEAR</button>
        <button class="btn-sec" (click)="onShuffle()">⇄&nbsp; SHUFFLE</button>
      </div>

      <!-- Buzz button (shown during buzz_window phase) -->
      <button
        *ngIf="phase === 'buzz_window'"
        class="btn-buzz"
        (click)="onBuzz()"
        [@buzzPulse]="'open'"
        [@fadeUp]
      >
        ⚡ BUZZ IN
      </button>

      <!-- Round result overlay -->
      <div
        *ngIf="phase === 'round_result' && roundWinner"
        class="round-result"
        @fadeUp
      >
        <div class="rr-winner">🏆 {{ roundWinner }} got it!</div>
      </div>
    </div>
  `,
  styles: [
    `
      .board {
        display: flex;
        flex-direction: column;
        gap: 11px;
      }

      .instruct {
        text-align: center;
        font-family: 'Orbitron', monospace;
        font-size: clamp(9px, 1.4vw, 12px);
        font-weight: 700;
        letter-spacing: 3px;
        color: var(--text);
        text-shadow: 0 0 14px rgba(0, 200, 255, 0.35);
      }

      .puzzle-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        padding: 13px;
        background: rgba(0, 24, 70, 0.07);
        border: 1px solid rgba(0, 140, 255, 0.09);
        border-radius: 20px;
        transition:
          border-color 0.3s,
          box-shadow 0.3s;
      }
      .puzzle-grid.buzz-glow {
        border-color: rgba(0, 200, 255, 0.35);
        box-shadow:
          0 0 24px rgba(0, 200, 255, 0.15),
          inset 0 0 20px rgba(0, 200, 255, 0.04);
      }

      .p-tile {
        aspect-ratio: 1;
        background: linear-gradient(145deg, #0d2145 0%, #07101e 100%);
        border: 1.5px solid rgba(0, 130, 255, 0.3);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', monospace;
        font-size: clamp(26px, 7vw, 36px);
        font-weight: 900;
        color: var(--text);
        cursor: pointer;
        user-select: none;
        position: relative;
        box-shadow:
          0 0 14px rgba(0, 80, 200, 0.12),
          0 5px 12px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        transition: all 0.14s;
      }
      .p-tile::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 13px;
        background: linear-gradient(
          135deg,
          rgba(0, 160, 255, 0.07),
          transparent 60%
        );
        pointer-events: none;
      }
      .p-tile:hover:not(.used) {
        border-color: var(--blue);
        transform: translateY(-3px) scale(1.05);
        box-shadow:
          0 0 26px var(--blue-glow),
          0 0 52px rgba(0, 200, 255, 0.1),
          0 5px 12px rgba(0, 0, 0, 0.4);
        color: var(--blue);
        text-shadow: 0 0 14px var(--blue);
      }
      .p-tile:active:not(.used) {
        transform: scale(0.94);
      }
      .p-tile.used {
        opacity: 0.2;
        transform: scale(0.9);
        pointer-events: none;
      }

      .answer-row {
        display: flex;
        gap: 7px;
        justify-content: center;
        padding: 10px;
        background: rgba(0, 16, 50, 0.5);
        border: 1px solid rgba(0, 180, 255, 0.2);
        border-radius: 14px;
        box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.25);
      }
      .a-slot {
        flex: 1;
        max-width: 52px;
        height: 50px;
        background: rgba(0, 12, 38, 0.7);
        border: 1.5px solid rgba(0, 200, 255, 0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', monospace;
        font-size: 18px;
        font-weight: 700;
        color: var(--blue);
        text-shadow: 0 0 8px var(--blue);
        transition: all 0.18s;
        cursor: pointer;
        position: relative;
      }
      .a-slot.active {
        border-color: var(--blue);
        box-shadow:
          0 0 14px var(--blue-glow),
          inset 0 0 8px rgba(0, 200, 255, 0.05);
        animation: slotPulse 1.4s ease-in-out infinite;
      }
      .a-slot.filled {
        border-color: rgba(0, 200, 255, 0.4);
        background: rgba(0, 55, 130, 0.22);
      }
      .a-slot.filled:hover {
        border-color: var(--red);
        color: var(--red);
        text-shadow: 0 0 8px var(--red);
      }
      @keyframes slotPulse {
        0%,
        100% {
          box-shadow: 0 0 10px var(--blue-glow);
        }
        50% {
          box-shadow: 0 0 22px rgba(0, 200, 255, 0.65);
        }
      }
      .slot-cursor {
        width: 2px;
        height: 60%;
        background: var(--blue);
        animation: blink 1s step-end infinite;
        border-radius: 1px;
      }
      @keyframes blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
      }

      .bank {
        background: rgba(5, 10, 20, 0.72);
        border: 1px solid rgba(44, 66, 100, 0.4);
        border-radius: 16px;
        padding: 10px 7px;
      }
      .bank-row {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      .bank-row:last-child {
        margin-bottom: 0;
      }

      .b-key {
        width: 42px;
        height: 42px;
        background: linear-gradient(145deg, #18293f, #0d1926);
        border: 1px solid rgba(65, 95, 135, 0.48);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        cursor: pointer;
        user-select: none;
        box-shadow:
          0 2px 6px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.045);
        transition: all 0.12s;
      }
      .b-key:hover:not(.used) {
        background: linear-gradient(145deg, #1e3a5c, #112340);
        border-color: rgba(0, 180, 255, 0.55);
        box-shadow:
          0 0 11px rgba(0, 160, 255, 0.28),
          0 2px 6px rgba(0, 0, 0, 0.4);
        color: var(--blue);
        transform: translateY(-2px);
      }
      .b-key:active:not(.used) {
        transform: scale(0.89);
      }
      .b-key.used {
        opacity: 0.15;
        pointer-events: none;
      }
      @media (min-width: 920px) {
        .b-key {
          width: clamp(36px, 4vw, 46px);
          height: clamp(36px, 4vw, 46px);
          font-size: clamp(12px, 1.5vw, 15px);
        }
      }

      /* ── SUBMIT — gamey raised orange ── */
      .btn-submit {
        width: 100%;
        padding: 14px;
        border: none;
        border-radius: 30px;
        background: linear-gradient(
          180deg,
          #ffb84d 0%,
          #ff8c00 50%,
          #a04800 100%
        );
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 3px;
        color: #fff;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        box-shadow:
          0 4px 0 #5a2800,
          0 6px 18px rgba(255, 140, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.28);
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition:
          transform 0.12s,
          filter 0.15s,
          box-shadow 0.12s;
      }
      .btn-submit::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.18),
          transparent
        );
        transform: skewX(-20deg) translateX(-130%);
        animation: sheen 2.6s ease-in-out infinite;
      }
      @keyframes sheen {
        0% {
          transform: skewX(-20deg) translateX(-130%);
        }
        60%,
        100% {
          transform: skewX(-20deg) translateX(280%);
        }
      }
      .btn-submit:hover:not(:disabled) {
        filter: brightness(1.1);
      }
      .btn-submit:active:not(:disabled) {
        transform: translateY(3px) scale(0.98);
        box-shadow:
          0 1px 0 #5a2800,
          0 2px 8px rgba(255, 140, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        filter: brightness(0.9);
      }
      .btn-submit:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .btn-submit.locked {
        background: linear-gradient(
          180deg,
          #4ab0ff 0%,
          #0090ff 50%,
          #004a99 100%
        );
        box-shadow:
          0 4px 0 #002255,
          0 6px 18px rgba(0, 144, 255, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.22);
      }
      .answering-label {
        animation: blink 0.6s step-end infinite;
      }

      .btn-row {
        display: flex;
        gap: 10px;
      }

      /* ── Secondary buttons — gamey navy ── */
      .btn-sec {
        flex: 1;
        padding: 11px;
        border-radius: 30px;
        background: linear-gradient(
          180deg,
          #1a5299 0%,
          #0f3a7a 50%,
          #081e44 100%
        );
        border: 1px solid rgba(0, 160, 255, 0.35);
        font-family: 'Orbitron', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: #7dd4ff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow:
          0 4px 0 #040e22,
          0 4px 12px rgba(0, 100, 220, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.14);
        text-shadow: 0 0 8px rgba(0, 200, 255, 0.5);
        transition:
          transform 0.12s,
          filter 0.15s,
          box-shadow 0.12s;
      }
      .btn-sec:hover {
        filter: brightness(1.15);
      }
      .btn-sec:active {
        transform: translateY(3px) scale(0.98);
        box-shadow:
          0 1px 0 #040e22,
          0 2px 6px rgba(0, 100, 220, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
        filter: brightness(0.88);
      }

      /* ── Buzz button — electric cyan ── */
      .btn-buzz {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 30px;
        background: linear-gradient(
          180deg,
          #40d8ff 0%,
          #00c8ff 50%,
          #005a99 100%
        );
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 4px;
        color: #fff;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        box-shadow:
          0 4px 0 #003060,
          0 6px 24px rgba(0, 200, 255, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.35);
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        animation: buzzPulse 1s ease-in-out infinite alternate;
        transition:
          transform 0.12s,
          box-shadow 0.12s;
      }
      @keyframes buzzPulse {
        0% {
          box-shadow:
            0 4px 0 #003060,
            0 6px 24px rgba(0, 200, 255, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        100% {
          box-shadow:
            0 4px 0 #003060,
            0 10px 42px rgba(0, 200, 255, 0.75),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
      }
      .btn-buzz:active {
        transform: translateY(3px) scale(0.97);
        box-shadow:
          0 1px 0 #003060,
          0 3px 12px rgba(0, 200, 255, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .round-result {
        text-align: center;
        padding: 14px;
        background: rgba(0, 30, 60, 0.6);
        border: 1px solid rgba(0, 200, 255, 0.2);
        border-radius: 16px;
      }
      .rr-winner {
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        font-weight: 700;
        color: var(--blue);
      }
    `,
  ],
})
export class PuzzleBoardComponent implements OnInit, OnDestroy {
  gridTiles: LetterTile[] = [];
  bankRows: LetterTile[][] = [];
  answerSlots: AnswerSlot[] = [];
  buzzOpen = false;
  phase = 'lobby';
  shakeState = 'idle';
  roundWinner = '';
  private subs = new Subscription();

  constructor(
    private state: GameStateService,
    private room: GameRoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.subs.add(
      this.state.gridTiles$.subscribe((t) => {
        this.gridTiles = t;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.bankTiles$.subscribe((t) => {
        const half = Math.ceil(t.length / 2);
        this.bankRows = [t.slice(0, half), t.slice(half)];
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.answerSlots$.subscribe((s) => {
        this.answerSlots = s;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.shakeSlots$.subscribe((v) => {
        this.shakeState = v ? 'shake' : 'idle';
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.phase$.subscribe((p) => {
        this.phase = p;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.room.buzzOpen$.subscribe((v) => {
        this.buzzOpen = v;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.roundWinner$.subscribe((w) => {
        this.roundWinner = w;
        this.cdr.markForCheck();
      }),
    );
  }

  onGridTile(tile: LetterTile) {
    this.state.addLetterFromGrid(tile);
  }
  onBankTile(tile: LetterTile) {
    this.state.addLetterFromBank(tile);
  }
  onRemoveSlot(i: number) {
    this.state.removeSlotAt(i);
  }
  onClear() {
    this.state.clearSlots();
  }
  onShuffle() {
    this.state.shuffleBank();
  }

  onSubmit() {
    const word = this.state.getAnswerWord();
    const snap = this.room.state$.getValue();
    if (!snap) {
      this.state.showToast('Not connected to a room', 'error');
      return;
    }
    if (word.length < this.answerSlots.length) {
      this.state.showToast('Fill all slots first!', 'warning');
      this.state.triggerShake();
      return;
    }
    this.room.answer(snap.currentRoundNo, word);
  }

  onBuzz() {
    const snap = this.room.state$.getValue();
    if (!snap) return;
    this.room.buzz(snap.currentRoundNo);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.onSubmit();
      return;
    }
    if (e.key === 'Backspace') {
      const filled = this.answerSlots.filter((s) => s.filled);
      if (filled.length)
        this.state.removeSlotAt(filled[filled.length - 1].index);
      return;
    }
    if (e.key === 'Escape') {
      this.state.clearSlots();
      return;
    }
    const ch = e.key.toUpperCase();
    if (/^[A-Z]$/.test(ch)) {
      const tile = this.state.bankTiles$
        .getValue()
        .find((t) => t.letter === ch && !t.used);
      if (tile) this.state.addLetterFromBank(tile);
    }
  }

  trackTile(_: number, t: LetterTile) {
    return t.id;
  }
  trackSlot(_: number, s: AnswerSlot) {
    return s.index;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
