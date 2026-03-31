import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { GameRoomService } from '../services/game-room.service';
import { HistoryEntry, ScoreboardItem } from '../models/game.models';
import { fadeUp, staggerList } from '../animations/game.animations';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeUp, staggerList],
  template: `
    <aside class="side-r" @fadeUp>
      <!-- Stats -->
      <div class="card">
        <div class="card-title">Your Stats</div>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="sv" [class.flash]="accFlash">{{ acc }}%</div>
            <div class="sl">Accuracy</div>
          </div>
          <div class="stat-item">
            <div class="sv" [class.flash]="scoreFlash">
              {{ score | number }}
            </div>
            <div class="sl">Score</div>
          </div>
          <div class="stat-item">
            <div class="sv">{{ solved }}</div>
            <div class="sl">Solved</div>
          </div>
          <div class="stat-item">
            <div class="sv streak-val">
              {{ streak }}<span *ngIf="streak > 0">🔥</span>
            </div>
            <div class="sl">Streak</div>
          </div>
        </div>
        <div class="streak-row">
          <div
            *ngFor="let pip of streakPips; let i = index"
            class="s-pip"
            [class.lit]="i < streak"
          ></div>
        </div>
      </div>

      <!-- Mobile scoreboard — now wired to real data -->
      <div class="mob-score-card card">
        <div class="card-title">Scores</div>
        <div class="mob-score" *ngIf="topThree.length > 0; else noPlayers">
          <div
            *ngFor="let p of topThree"
            class="sc-col"
            [class.me]="p.customerId === myId"
          >
            <div class="sc-n">
              {{ p.customerId === myId ? '[You]' : p.nickname }}
              <span class="sc-r">#{{ p.rank || '?' }}</span>
            </div>
            <div class="sc-p">{{ p.score | number }} pts</div>
          </div>
        </div>
        <ng-template #noPlayers>
          <div class="no-players">Waiting for players…</div>
        </ng-template>
      </div>

      <!-- Word History -->
      <div class="card">
        <div class="card-title">Word History</div>
        <div [@staggerList]="history.length">
          <div
            *ngFor="let h of history; trackBy: trackHist"
            class="hist-item"
            [class.correct]="h.correct"
            [class.wrong]="!h.correct"
          >
            <span class="hw">{{ h.word }}</span>
            <span
              class="hpts"
              [style.color]="h.correct ? 'var(--green)' : 'var(--red)'"
            >
              {{ h.correct ? '+' : '' }}{{ h.pts }}
            </span>
            <span class="htm">{{ h.time }}s</span>
          </div>
          <div *ngIf="history.length === 0" class="hist-empty">
            No words solved yet…
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .side-r {
        display: none;
        flex-direction: column;
        gap: 14px;
      }
      @media (min-width: 920px) {
        .side-r {
          display: flex;
        }
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 18px 16px;
        backdrop-filter: blur(16px);
      }
      .card-title {
        font-family: 'Orbitron', monospace;
        font-size: 9px;
        letter-spacing: 2px;
        color: var(--muted);
        text-transform: uppercase;
        margin-bottom: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .card-title::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, var(--border), transparent);
      }
      .stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .stat-item {
        background: rgba(0, 18, 48, 0.4);
        border: 1px solid var(--border);
        border-radius: 11px;
        padding: 12px 8px;
        text-align: center;
      }
      .sv {
        font-family: 'Orbitron', monospace;
        font-size: clamp(15px, 2vw, 22px);
        font-weight: 900;
        color: var(--blue);
        text-shadow: 0 0 10px var(--blue);
        transition: all 0.3s;
      }
      .sv.flash {
        animation: flashPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes flashPop {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.35);
          color: var(--green);
        }
        100% {
          transform: scale(1);
        }
      }
      .streak-val {
        color: var(--orange) !important;
        text-shadow: 0 0 10px var(--orange-glow) !important;
      }
      .sl {
        font-size: 9px;
        color: var(--muted);
        letter-spacing: 1px;
        margin-top: 3px;
        text-transform: uppercase;
      }
      .streak-row {
        display: flex;
        gap: 5px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .s-pip {
        width: 22px;
        height: 7px;
        border-radius: 3px;
        background: rgba(0, 70, 150, 0.28);
        border: 1px solid rgba(0, 110, 200, 0.18);
        transition: all 0.4s;
      }
      .s-pip.lit {
        background: linear-gradient(90deg, var(--blue), var(--orange));
        box-shadow: 0 0 8px var(--blue-glow);
        border-color: var(--blue);
      }
      .mob-score-card {
        display: block;
      }
      @media (min-width: 920px) {
        .mob-score-card {
          display: none;
        }
      }
      .mob-score {
        display: flex;
      }
      .sc-col {
        flex: 1;
        text-align: center;
        padding: 8px 5px;
        border-right: 1px solid rgba(45, 70, 100, 0.35);
      }
      .sc-col:last-child {
        border-right: none;
      }
      .sc-col.me {
        background: rgba(0, 70, 150, 0.11);
        border-radius: 8px;
      }
      .sc-n {
        font-size: 10px;
        color: var(--muted);
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sc-r {
        font-family: 'Orbitron', monospace;
        font-size: 10px;
        font-weight: 700;
        color: var(--orange);
      }
      .sc-p {
        font-family: 'Orbitron', monospace;
        font-size: clamp(12px, 2vw, 16px);
        font-weight: 700;
        color: var(--text);
      }
      .no-players {
        font-size: 11px;
        color: var(--muted);
        text-align: center;
        padding: 8px;
        font-style: italic;
      }
      .hist-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 10px;
        background: rgba(0, 18, 48, 0.4);
        border-radius: 9px;
        border: 1px solid rgba(0, 100, 180, 0.12);
        margin-bottom: 6px;
        font-size: 13px;
        animation: histSlide 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes histSlide {
        from {
          transform: translateX(16px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .hist-item.correct {
        border-color: rgba(0, 200, 106, 0.18);
      }
      .hist-item.wrong {
        border-color: rgba(224, 51, 68, 0.18);
      }
      .hist-item:last-child {
        margin-bottom: 0;
      }
      .hw {
        font-family: 'Orbitron', monospace;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 1px;
      }
      .hpts {
        font-weight: 700;
        font-size: 12px;
      }
      .htm {
        color: var(--muted);
        font-size: 10px;
      }
      .hist-empty {
        font-size: 12px;
        color: var(--muted);
        text-align: center;
        padding: 8px;
        font-style: italic;
      }
    `,
  ],
})
export class RightSidebarComponent implements OnInit, OnDestroy {
  acc = 100;
  score = 0;
  solved = 0;
  streak = 0;
  history: HistoryEntry[] = [];
  streakPips = Array(10).fill(0);
  accFlash = false;
  scoreFlash = false;
  topThree: ScoreboardItem[] = []; // ← new
  myId = ''; // ← new
  private prevScore = 0;
  private subs = new Subscription();

  constructor(
    private state: GameStateService,
    private room: GameRoomService, // ← inject room service
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.subs.add(
      this.room.myCustomerId$.subscribe((id) => {
        this.myId = id;
        this.cdr.markForCheck();
      }),
    );

    // Wire mobile scoreboard to real room state
    this.subs.add(
      this.room.state$.subscribe((s) => {
        if (s) {
          this.topThree = this.room.getScoreboard().slice(0, 3);
          this.cdr.markForCheck();
        }
      }),
    );

    this.subs.add(
      this.state.myAccuracy$.subscribe((v) => {
        this.acc = v;
        this.accFlash = true;
        setTimeout(() => {
          this.accFlash = false;
          this.cdr.markForCheck();
        }, 500);
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.myScore$.subscribe((v) => {
        if (v !== this.prevScore) {
          this.scoreFlash = true;
          setTimeout(() => {
            this.scoreFlash = false;
            this.cdr.markForCheck();
          }, 500);
        }
        this.prevScore = v;
        this.score = v;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.mySolved$.subscribe((v) => {
        this.solved = v;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.myStreak$.subscribe((v) => {
        this.streak = v;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.history$.subscribe((h) => {
        this.history = h;
        this.cdr.markForCheck();
      }),
    );
  }

  trackHist(_: number, h: HistoryEntry) {
    return h.word + h.time;
  }
  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
