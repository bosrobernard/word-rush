import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { GameRoomService } from '../services/game-room.service';
import { slideDown } from '../animations/game.animations';

@Component({
  selector: 'app-game-hud',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideDown],
  template: `
    <header class="hdr" @slideDown>
      <!-- Row 1: Brand + Timer HUD -->
      <div class="hdr-row1">
        <div class="brand">Scramble</div>

        <div class="hud-center">
          <div class="hchip" [class.pulse]="roundChanged">
            <div class="hchip-lbl">Round</div>
            <div class="hchip-val">
              {{ round }}<span class="of">/{{ totalRounds }}</span>
            </div>
          </div>

          <!-- Timer Ring -->
          <div class="timer-ring" [class.critical]="critical">
            <svg viewBox="0 0 72 72">
              <circle class="tr-track" cx="36" cy="36" r="31.5" />
              <circle
                class="tr-arc"
                cx="36"
                cy="36"
                r="31.5"
                [style.strokeDashoffset]="timerOffset"
                [style.stroke]="critical ? 'var(--red)' : 'var(--orange)'"
                [style.filter]="
                  critical
                    ? 'drop-shadow(0 0 9px var(--red))'
                    : 'drop-shadow(0 0 7px var(--orange))'
                "
              />
            </svg>
            <div
              class="timer-val"
              [style.color]="critical ? 'var(--red)' : 'var(--orange)'"
              [style.textShadow]="
                critical ? '0 0 12px var(--red)' : '0 0 10px var(--orange)'
              "
            >
              {{ timerDisplay }}
              <span class="timer-s">SEC</span>
            </div>
          </div>

          <div class="hchip">
            <div class="hchip-lbl">Players</div>
            <div class="hchip-val">{{ connectedCount }}</div>
          </div>
        </div>

        <!-- Score badge (desktop shows inline) -->
        <div class="score-badge desktop-only">
          <div class="hchip-lbl">Score</div>
          <div class="hchip-val score-val">{{ score | number }}</div>
        </div>
      </div>

      <!-- Row 2: Players strip + category -->
      <div class="hdr-row2">
        <div class="row2-left">
          <div class="row2-title">👥 {{ connectedCount }} REMAINING</div>
          <div class="row2-names">{{ topNames }}</div>
        </div>
        <div class="row2-right">
          <div class="cat-badge" *ngIf="category">{{ category }}</div>
          <div class="diff-badge" [class]="difficulty">{{ difficulty }}</div>
          <div class="row2-dots">
            <div class="pc-dot green"></div>
            <div class="pc-dot orange"></div>
            <div class="pc-dot grey"></div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .hdr {
        width: 100%;
        max-width: 1240px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 20px;
        backdrop-filter: blur(18px);
        margin-bottom: 16px;
        padding: 12px 14px;
        overflow: hidden;
      }
      .hdr-row1 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .brand {
        font-family: 'Orbitron', monospace;
        font-size: clamp(14px, 4vw, 22px);
        font-weight: 900;
        letter-spacing: 2px;
        flex-shrink: 0;
        background: linear-gradient(90deg, var(--blue), var(--orange));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .hud-center {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        justify-content: center;
      }
      .hchip {
        background: rgba(0, 10, 26, 0.82);
        border: 1px solid var(--border);
        border-radius: 40px;
        padding: 5px 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
        flex-shrink: 0;
      }
      .hchip.pulse {
        animation: chipPulse 0.4s ease;
      }
      @keyframes chipPulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
      .hchip-lbl {
        font-size: 7px;
        letter-spacing: 1.5px;
        color: var(--muted);
        font-family: 'Orbitron', monospace;
        text-transform: uppercase;
      }
      .hchip-val {
        font-family: 'Orbitron', monospace;
        font-size: 16px;
        font-weight: 700;
        color: var(--orange);
        margin-top: 2px;
      }
      .hchip-val .of {
        font-size: 10px;
        opacity: 0.5;
      }
      .score-val {
        color: var(--green) !important;
      }
      .score-badge {
        display: none;
      }
      .timer-ring {
        position: relative;
        width: 72px;
        height: 72px;
        flex-shrink: 0;
        transition: transform 0.2s;
      }
      .timer-ring.critical {
        animation: timerShake 0.15s ease-in-out infinite alternate;
      }
      @keyframes timerShake {
        0% {
          transform: scale(1);
        }
        100% {
          transform: scale(1.04);
        }
      }
      .timer-ring svg {
        position: absolute;
        inset: 0;
        transform: rotate(-90deg);
      }
      .tr-track {
        fill: none;
        stroke: rgba(255, 140, 0, 0.1);
        stroke-width: 4.5;
      }
      .tr-arc {
        fill: none;
        stroke-width: 4.5;
        stroke-linecap: round;
        stroke-dasharray: 198;
        stroke-dashoffset: 0;
        transition: stroke-dashoffset 0.1s linear;
      }
      .timer-val {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-family: 'Orbitron', monospace;
        font-size: 17px;
        font-weight: 900;
        line-height: 1;
      }
      .timer-s {
        font-size: 7px;
        opacity: 0.65;
        margin-top: 2px;
        letter-spacing: 1px;
      }
      .hdr-row2 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(0, 15, 38, 0.5);
        border: 1px solid rgba(0, 140, 255, 0.12);
        border-radius: 12px;
        padding: 7px 12px;
      }
      .row2-left {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .row2-title {
        font-family: 'Orbitron', monospace;
        font-size: 9px;
        letter-spacing: 1.5px;
        color: var(--text);
        font-weight: 700;
      }
      .row2-names {
        font-size: 11px;
        color: var(--muted);
      }
      .row2-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .row2-dots {
        display: flex;
        gap: 5px;
        align-items: center;
      }
      .pc-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }
      .pc-dot.green {
        background: var(--green);
        box-shadow: 0 0 6px var(--green);
      }
      .pc-dot.orange {
        background: #ff9500;
        box-shadow: 0 0 6px #ff9500;
      }
      .pc-dot.grey {
        background: #5a7090;
      }
      .cat-badge {
        font-family: 'Orbitron', monospace;
        font-size: 8px;
        letter-spacing: 1px;
        color: var(--blue);
        border: 1px solid rgba(0, 180, 238, 0.25);
        border-radius: 20px;
        padding: 2px 8px;
        background: rgba(0, 20, 50, 0.5);
      }
      .diff-badge {
        font-size: 8px;
        letter-spacing: 1px;
        font-family: 'Orbitron', monospace;
        border-radius: 20px;
        padding: 2px 8px;
        text-transform: uppercase;
      }
      .diff-badge.easy {
        background: rgba(0, 200, 106, 0.12);
        color: var(--green);
        border: 1px solid rgba(0, 200, 106, 0.25);
      }
      .diff-badge.medium {
        background: rgba(255, 140, 0, 0.1);
        color: var(--orange);
        border: 1px solid rgba(255, 140, 0, 0.2);
      }
      .diff-badge.hard {
        background: rgba(224, 51, 68, 0.12);
        color: var(--red);
        border: 1px solid rgba(224, 51, 68, 0.25);
      }
      @media (min-width: 920px) {
        .hdr {
          flex-direction: row;
          align-items: center;
          padding: 10px 20px;
          gap: 12px;
        }
        .hdr-row1 {
          flex: 1;
        }
        .hdr-row2 {
          flex-shrink: 0;
          border-radius: 40px;
          padding: 6px 14px;
          background: rgba(0, 20, 48, 0.65);
          border-color: var(--border);
        }
        .score-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 5px 14px;
          background: rgba(0, 10, 26, 0.82);
          border: 1px solid var(--border);
          border-radius: 40px;
          flex-shrink: 0;
        }
      }
    `,
  ],
})
export class GameHudComponent implements OnInit, OnDestroy {
  round = 1;
  totalRounds = 10;
  critical = false;
  connectedCount = 12;
  timerDisplay = '10.0';
  timerOffset = 0;
  score = 0;
  category = '';
  difficulty = 'medium';
  topNames = '';
  roundChanged = false;
  private subs = new Subscription();
  private readonly CIRC = 198;

  constructor(
    private state: GameStateService,
    private room: GameRoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.subs.add(
      this.state.timerValue$.subscribe((v) => {
        this.timerDisplay = v.toFixed(1);
        this.timerOffset =
          this.CIRC * (1 - v / (this.state.timerMax$.getValue() || 30));
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.state.timerCritical$.subscribe((v) => {
        this.critical = v;
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.state.myScore$.subscribe((v) => {
        this.score = v;
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.state.currentRound$.subscribe((v) => {
        this.round = v;
        this.roundChanged = true;
        setTimeout(() => {
          this.roundChanged = false;
          this.cdr.markForCheck();
        }, 500);
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.state.totalRounds$.subscribe((v) => {
        this.totalRounds = v;
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.state.category$.subscribe((v) => {
        this.category = v;
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.state.difficulty$.subscribe((v) => {
        this.difficulty = v;
        this.cdr.markForCheck(); // ← add
      }),
    );
    this.subs.add(
      this.room.state$.subscribe((s) => {
        if (s) {
          this.connectedCount = s.players.filter((p) => p.connected).length;
          this.topNames =
            [...s.players]
              .filter((p) => p.connected)
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((p) => p.nickname)
              .join(' · ') || 'Waiting for players…';
          this.cdr.markForCheck(); // ← add
        }
      }),
    );
  }
  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
