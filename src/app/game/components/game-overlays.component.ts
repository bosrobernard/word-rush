import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { Toast, PlayerReaction, FloatingScore } from '../models/game.models';
import {
  toastAnim,
  reactionFloat,
  floatingScore,
  countdownPop,
  fadeUp,
} from '../animations/game.animations';

@Component({
  selector: 'app-game-overlays',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [toastAnim, reactionFloat, floatingScore, countdownPop, fadeUp],
  template: `
    <!-- Toast notification -->
    <div
      *ngIf="toast"
      class="toast"
      [class]="'toast toast-' + toast.type"
      @toastAnim
    >
      {{ toast.message }}
    </div>

    <!-- Burst particles (CSS-driven) -->
    <div class="burst-container" *ngIf="burstActive">
      <div
        *ngFor="let p of burstParticles"
        class="burst-particle"
        [style.--tx]="p.tx + 'px'"
        [style.--ty]="p.ty + 'px'"
        [style.background]="p.color"
        [style.width]="p.size + 'px'"
        [style.height]="p.size + 'px'"
        [style.left]="p.cx + 'px'"
        [style.top]="p.cy + 'px'"
      ></div>
    </div>

    <!-- Floating score indicators -->
    <div
      *ngFor="let fs of floatingScores; trackBy: trackFs"
      class="floating-score"
      @floatingScore
      [style.left]="fs.x + '%'"
      [style.top]="fs.y + '%'"
    >
      +{{ fs.value }}
    </div>

    <!-- Player reactions floating up -->
    <div class="reactions-layer">
      <div
        *ngFor="let r of reactions; trackBy: trackR"
        class="reaction-bubble"
        @reactionFloat
        [style.left]="reactionX(r.id) + '%'"
      >
        <span class="r-emoji">{{ r.emoji }}</span>
        <span class="r-nick">{{ r.nickname }}</span>
      </div>
    </div>

    <!-- Match countdown overlay -->
    <div *ngIf="showCountdown" class="countdown-overlay" @fadeUp>
      <div class="cd-inner">
        <div class="cd-label">MATCH STARTS IN</div>
        <div
          class="cd-num"
          [@countdownPop]="countdownDisplay"
          [style.color]="cdColor"
        >
          {{ countdownDisplay }}
        </div>
        <div class="cd-sub">Get ready to unscramble!</div>
        <div class="cd-pulse"></div>
      </div>
    </div>

    <!-- Match end screen -->
    <div *ngIf="showMatchEnd" class="match-end-overlay" @fadeUp>
      <div class="me-inner">
        <div class="me-trophy">🏆</div>
        <div class="me-title">MATCH OVER</div>
        <div class="me-winner">{{ matchWinner }}</div>
        <div class="me-sub">takes the crown!</div>
        <button class="me-btn" (click)="dismissMatchEnd()">PLAY AGAIN</button>
      </div>
    </div>

    <!-- Correct flash overlay -->
    <div *ngIf="correctFlash" class="correct-flash"></div>

    <!-- Wrong flash -->
    <div *ngIf="wrongFlash" class="wrong-flash"></div>

    <!-- Buzz accepted banner -->
    <div *ngIf="buzzBanner" class="buzz-banner" @fadeUp>
      <span class="buzz-icon">⚡</span>
      <span>{{ buzzBannerText }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 50;
      }

      .toast {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: rgba(3, 10, 22, 0.96);
        border-radius: 16px;
        padding: 14px 32px;
        font-family: 'Orbitron', monospace;
        font-size: clamp(14px, 2vw, 20px);
        font-weight: 700;
        pointer-events: none;
        z-index: 200;
        white-space: nowrap;
        backdrop-filter: blur(20px);
        border: 1px solid;
      }
      .toast-success {
        color: var(--green);
        border-color: var(--green);
        text-shadow: 0 0 14px var(--green);
      }
      .toast-error {
        color: var(--red);
        border-color: var(--red);
        text-shadow: 0 0 14px var(--red);
      }
      .toast-info {
        color: var(--blue);
        border-color: var(--blue);
        text-shadow: 0 0 14px var(--blue);
      }
      .toast-warning {
        color: var(--orange);
        border-color: var(--orange);
        text-shadow: 0 0 14px var(--orange);
      }

      .burst-container {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 190;
      }
      .burst-particle {
        position: fixed;
        border-radius: 50%;
        animation: burstKf 0.75s ease-out forwards;
      }
      @keyframes burstKf {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(var(--tx), var(--ty)) scale(0);
          opacity: 0;
        }
      }

      .floating-score {
        position: fixed;
        font-family: 'Orbitron', monospace;
        font-size: 22px;
        font-weight: 900;
        color: var(--green);
        text-shadow: 0 0 16px var(--green);
        pointer-events: none;
        z-index: 100;
      }

      .reactions-layer {
        position: fixed;
        bottom: 20%;
        left: 0;
        right: 0;
        pointer-events: none;
        z-index: 80;
      }
      .reaction-bubble {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        background: rgba(3, 10, 22, 0.85);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 6px 10px;
        backdrop-filter: blur(10px);
      }
      .r-emoji {
        font-size: 22px;
      }
      .r-nick {
        font-size: 10px;
        color: var(--muted);
      }

      /* Countdown */
      .countdown-overlay {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 18, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 300;
        backdrop-filter: blur(12px);
        pointer-events: all;
      }
      .cd-inner {
        text-align: center;
        position: relative;
      }
      .cd-label {
        font-family: 'Orbitron', monospace;
        font-size: clamp(11px, 2vw, 14px);
        letter-spacing: 4px;
        color: var(--muted);
        margin-bottom: 20px;
      }
      .cd-num {
        font-family: 'Orbitron', monospace;
        font-size: clamp(80px, 15vw, 160px);
        font-weight: 900;
        line-height: 1;
        text-shadow:
          0 0 40px currentColor,
          0 0 80px currentColor;
      }
      .cd-sub {
        font-family: 'Orbitron', monospace;
        font-size: clamp(10px, 1.5vw, 13px);
        color: var(--muted);
        margin-top: 20px;
        letter-spacing: 2px;
      }
      .cd-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 300px;
        border-radius: 50%;
        border: 1px solid rgba(0, 200, 255, 0.2);
        animation: cdPulse 1s ease-out infinite;
      }
      @keyframes cdPulse {
        0% {
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 0.8;
        }
        100% {
          transform: translate(-50%, -50%) scale(1.5);
          opacity: 0;
        }
      }

      /* Match end */
      .match-end-overlay {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 18, 0.92);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 300;
        backdrop-filter: blur(16px);
        pointer-events: all;
      }
      .me-inner {
        text-align: center;
      }
      .me-trophy {
        font-size: 80px;
        animation: trophySpin 1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      @keyframes trophySpin {
        from {
          transform: scale(0) rotate(-180deg);
        }
        to {
          transform: scale(1) rotate(0);
        }
      }
      .me-title {
        font-family: 'Orbitron', monospace;
        font-size: clamp(22px, 5vw, 48px);
        font-weight: 900;
        color: var(--orange);
        text-shadow: 0 0 30px var(--orange);
        letter-spacing: 4px;
        margin: 16px 0 8px;
      }
      .me-winner {
        font-family: 'Orbitron', monospace;
        font-size: clamp(16px, 3vw, 28px);
        font-weight: 700;
        color: var(--blue);
        text-shadow: 0 0 20px var(--blue);
      }
      .me-sub {
        font-size: 14px;
        color: var(--muted);
        margin-top: 8px;
      }

      /* ── Play Again — gamey raised orange ── */
      .me-btn {
        margin-top: 32px;
        padding: 14px 40px;
        border: none;
        border-radius: 30px;
        background: linear-gradient(
          180deg,
          #ffb84d 0%,
          #ff8c00 50%,
          #a04800 100%
        );
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 3px;
        color: #fff;
        cursor: pointer;
        pointer-events: all;
        position: relative;
        overflow: hidden;
        box-shadow:
          0 4px 0 #5a2800,
          0 6px 22px rgba(255, 140, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.25);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition:
          transform 0.12s,
          filter 0.15s,
          box-shadow 0.12s;
      }
      .me-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.14),
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
      .me-btn:hover {
        filter: brightness(1.1);
      }
      .me-btn:active {
        transform: translateY(3px) scale(0.98);
        box-shadow:
          0 1px 0 #5a2800,
          0 2px 8px rgba(255, 140, 0, 0.22),
          inset 0 1px 0 rgba(255, 255, 255, 0.14);
        filter: brightness(0.9);
      }

      /* Flash overlays */
      .correct-flash {
        position: fixed;
        inset: 0;
        background: rgba(0, 229, 122, 0.06);
        animation: flashOut 0.5s ease forwards;
        pointer-events: none;
        z-index: 40;
      }
      .wrong-flash {
        position: fixed;
        inset: 0;
        background: rgba(255, 68, 85, 0.08);
        animation: flashOut 0.5s ease forwards;
        pointer-events: none;
        z-index: 40;
      }
      @keyframes flashOut {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      /* Buzz banner */
      .buzz-banner {
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 20, 60, 0.9);
        border: 1px solid rgba(0, 200, 255, 0.5);
        border-radius: 50px;
        padding: 10px 24px;
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        color: var(--blue);
        text-shadow: 0 0 12px var(--blue);
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 0 30px rgba(0, 200, 255, 0.3);
        pointer-events: none;
        z-index: 60;
      }
      .buzz-icon {
        font-size: 18px;
        animation: buzzSpin 0.3s ease;
      }
      @keyframes buzzSpin {
        from {
          transform: rotate(-20deg) scale(0.5);
        }
        to {
          transform: rotate(0) scale(1);
        }
      }
    `,
  ],
})
export class GameOverlaysComponent implements OnInit, OnDestroy {
  toast: Toast | null = null;
  burstActive = false;
  burstParticles: any[] = [];
  floatingScores: FloatingScore[] = [];
  reactions: PlayerReaction[] = [];
  showCountdown = false;
  countdownDisplay = '3';
  showMatchEnd = false;
  matchWinner = '';
  correctFlash = false;
  wrongFlash = false;
  buzzBanner = false;
  buzzBannerText = '';
  private cdInterval?: ReturnType<typeof setInterval>;
  private subs = new Subscription();

  get cdColor() {
    const n = parseInt(this.countdownDisplay, 10);
    if (isNaN(n)) return 'var(--green)';
    return n <= 1 ? 'var(--red)' : n <= 2 ? 'var(--orange)' : 'var(--blue)';
  }

  constructor(
    private state: GameStateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.subs.add(
      this.state.toast$.subscribe((t) => {
        this.toast = t;
        this.cdr.markForCheck();
      }),
    );

    this.subs.add(
      this.state.burst$.subscribe(() => {
        this.triggerBurst();
      }),
    );

    this.subs.add(
      this.state.floatingScores$.subscribe((fs) => {
        this.floatingScores = fs;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.reactions$.subscribe((r) => {
        this.reactions = r;
        this.cdr.markForCheck();
      }),
    );

    this.subs.add(
      this.state.correctFlash$.subscribe(() => {
        this.correctFlash = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.correctFlash = false;
          this.cdr.markForCheck();
        }, 500);
      }),
    );

    this.subs.add(
      this.state.wrongFlash$.subscribe(() => {
        this.wrongFlash = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.wrongFlash = false;
          this.cdr.markForCheck();
        }, 500);
      }),
    );

    this.subs.add(
      this.state.countdownSec$.subscribe((v) => {
        if (v > 0) this.startCountdown(v);
      }),
    );

    this.subs.add(
      this.state.matchWinner$.subscribe((w) => {
        if (w) {
          this.matchWinner = w;
          this.showMatchEnd = true;
          this.cdr.markForCheck();
        }
      }),
    );

    this.subs.add(
      this.state.roundWinner$.subscribe((w) => {
        if (w) {
          this.buzzBannerText = `⚡ ${w} got it!`;
          this.buzzBanner = true;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.buzzBanner = false;
            this.cdr.markForCheck();
          }, 2500);
        }
      }),
    );
  }

  triggerBurst() {
    const cx = window.innerWidth / 2,
      cy = window.innerHeight / 2;
    const cols = [
      'rgba(0,220,100,.92)',
      'rgba(0,200,255,.92)',
      'rgba(255,140,0,.92)',
      'rgba(220,80,255,.92)',
      'rgba(255,60,80,.92)',
    ];
    this.burstParticles = Array.from({ length: 32 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 150;
      return {
        cx,
        cy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: cols[i % cols.length],
        size: 4 + Math.random() * 8,
      };
    });
    this.burstActive = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.burstActive = false;
      this.burstParticles = [];
      this.cdr.markForCheck();
    }, 800);
  }

  startCountdown(from: number) {
    clearInterval(this.cdInterval);
    let v = from;
    this.showCountdown = true;
    this.countdownDisplay = String(v);
    this.cdr.markForCheck();
    this.cdInterval = setInterval(() => {
      v--;
      if (v <= 0) {
        clearInterval(this.cdInterval);
        this.countdownDisplay = 'GO!';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.showCountdown = false;
          this.cdr.markForCheck();
        }, 800);
      } else {
        this.countdownDisplay = String(v);
        this.cdr.markForCheck();
      }
    }, 1000);
  }

  dismissMatchEnd() {
    this.showMatchEnd = false;
    // The host application should handle navigation back to lobby / matchmaking.
    // Emit leave so the app component can show the lobby screen again.
    this.cdr.markForCheck();
  }

  reactionX(id: string) {
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return 10 + (hash % 80);
  }

  trackFs(_: number, fs: FloatingScore) {
    return fs.id;
  }
  trackR(_: number, r: PlayerReaction) {
    return r.id;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    clearInterval(this.cdInterval);
  }
}
