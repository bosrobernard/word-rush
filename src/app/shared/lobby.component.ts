import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GameRoomService } from '../game/services/game-room.service';
import { environment } from '../../environments/environment';
import { fadeUp } from '../game/animations/game.animations';

type AuthTab = 'login' | 'register';
type LobbyStep = 'auth' | 'match_setup' | 'connecting';

interface GameOption {
  gameKey: string;
  name: string;
  slug: string;
  minEntryAmount: number;
  currency: string;
  minPlayers: number;
  maxPlayers: number;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeUp],
  template: `
    <div class="lobby-wrap">
      <div class="lobby-card" @fadeUp>
        <!-- Brand -->
        <div class="lobby-brand">Scramble</div>
        <div class="lobby-sub">Competitive Word Unscramble</div>

        <!-- ══════════════ STEP 1: AUTH ══════════════ -->
        <ng-container *ngIf="step === 'auth'">
          <div class="tab-bar">
            <button
              class="tab-btn"
              [class.active]="authTab === 'login'"
              (click)="setAuthTab('login')"
            >
              <span class="tab-icon">🔑</span> Login
            </button>
            <button
              class="tab-btn"
              [class.active]="authTab === 'register'"
              (click)="setAuthTab('register')"
            >
              <span class="tab-icon">👤</span> Register
            </button>
          </div>

          <div *ngIf="error" class="lobby-error" @fadeUp>⚠ {{ error }}</div>

          <!-- Login form -->
          <div *ngIf="authTab === 'login'" class="lobby-form" @fadeUp>
            <div class="field">
              <label>Email or Username</label>
              <input
                type="text"
                [(ngModel)]="loginForm.login"
                placeholder="player@email.com or BlitzMaster"
                [disabled]="loading"
                (keyup.enter)="onLogin()"
              />
            </div>
            <div class="field">
              <label>Password</label>
              <input
                type="password"
                [(ngModel)]="loginForm.password"
                placeholder="Your password"
                [disabled]="loading"
                (keyup.enter)="onLogin()"
              />
            </div>
            <button
              class="btn-join"
              (click)="onLogin()"
              [disabled]="loading || !canLogin"
            >
              <span *ngIf="!loading">⚡ LOGIN</span>
              <span *ngIf="loading" class="connecting-text">SIGNING IN…</span>
            </button>
            <div class="guest-note">
              No account?
              <span class="tab-link" (click)="setAuthTab('register')"
                >Register here</span
              >
            </div>
          </div>

          <!-- Register form -->
          <div *ngIf="authTab === 'register'" class="lobby-form" @fadeUp>
            <div class="field-row">
              <div class="field">
                <label>Username</label>
                <input
                  type="text"
                  [(ngModel)]="registerForm.username"
                  placeholder="BlitzMaster42"
                  maxlength="30"
                  [disabled]="loading"
                />
                <div class="field-hint">3–30 characters</div>
              </div>
              <div class="field">
                <label
                  >Display Name
                  <span class="optional-tag">optional</span></label
                >
                <input
                  type="text"
                  [(ngModel)]="registerForm.displayName"
                  placeholder="BlitzMaster"
                  [disabled]="loading"
                />
              </div>
            </div>
            <div class="field">
              <label>Email</label>
              <input
                type="email"
                [(ngModel)]="registerForm.email"
                placeholder="player@email.com"
                [disabled]="loading"
              />
            </div>
            <div class="field-row">
              <div class="field">
                <label>Password</label>
                <input
                  type="password"
                  [(ngModel)]="registerForm.password"
                  placeholder="Min. 6 characters"
                  [disabled]="loading"
                />
              </div>
              <div class="field">
                <label>Phone <span class="optional-tag">optional</span></label>
                <input
                  type="text"
                  [(ngModel)]="registerForm.phone"
                  placeholder="+233..."
                  [disabled]="loading"
                />
              </div>
            </div>
            <button
              class="btn-join"
              (click)="onRegister()"
              [disabled]="loading || !canRegister"
            >
              <span *ngIf="!loading">⚡ CREATE ACCOUNT</span>
              <span *ngIf="loading" class="connecting-text">CREATING…</span>
            </button>
            <div class="guest-note">
              Already have an account?
              <span class="tab-link" (click)="setAuthTab('login')"
                >Login instead</span
              >
            </div>
          </div>
        </ng-container>

        <!-- ══════════════ STEP 2: MATCH SETUP ══════════════ -->
        <ng-container *ngIf="step === 'match_setup'">
          <!-- Logged-in indicator -->
          <div class="player-chip" @fadeUp>
            <span class="player-av">{{ nickname[0]?.toUpperCase() }}</span>
            <div class="player-inf">
              <div class="player-name">{{ nickname }}</div>
              <div class="player-sub">Ready to play</div>
            </div>
            <button class="btn-logout" (click)="logout()">Logout</button>
          </div>

          <div *ngIf="error" class="lobby-error" @fadeUp>⚠ {{ error }}</div>

          <div class="lobby-form" @fadeUp>
            <!-- Nickname for this match -->
            <div class="field">
              <label>Match Nickname</label>
              <input
                type="text"
                [(ngModel)]="matchForm.nickname"
                placeholder="How you appear in-game"
                maxlength="40"
                [disabled]="loading"
              />
            </div>

            <!-- Game picker -->
            <div class="field">
              <label>Game</label>
              <div *ngIf="loadingGames" class="field-loading">
                Loading games…
              </div>
              <div *ngIf="!loadingGames" class="game-picker">
                <div
                  *ngFor="let g of availableGames"
                  class="game-option"
                  [class.selected]="matchForm.gameKey === g.gameKey"
                  (click)="selectGame(g)"
                >
                  <div class="go-name">{{ g.name }}</div>
                  <div class="go-key">{{ g.gameKey }}</div>
                </div>
                <div *ngIf="availableGames.length === 0" class="field-hint">
                  No games available right now.
                </div>
              </div>
            </div>

            <!-- Entry amount + player count -->
            <div class="field-row">
              <div class="field">
                <label>Entry Amount ({{ matchForm.currency }})</label>
                <input
                  type="number"
                  [(ngModel)]="matchForm.entryAmount"
                  placeholder="e.g. 100"
                  min="1"
                  [disabled]="loading"
                />
              </div>
              <div class="field">
                <label>Players</label>
                <div class="seg-control">
                  <button
                    class="seg-btn"
                    [class.active]="matchForm.expectedPlayers === 5"
                    (click)="matchForm.expectedPlayers = 5"
                    [disabled]="loading"
                  >
                    5
                  </button>
                  <button
                    class="seg-btn"
                    [class.active]="matchForm.expectedPlayers === 10"
                    (click)="matchForm.expectedPlayers = 10"
                    [disabled]="loading"
                  >
                    10
                  </button>
                </div>
              </div>
            </div>

            <button
              class="btn-join"
              (click)="onJoinMatch()"
              [disabled]="loading || !canJoinMatch"
            >
              <span *ngIf="!loading">⚡ FIND MATCH</span>
              <span *ngIf="loading" class="connecting-text"
                >FINDING MATCH…</span
              >
            </button>
          </div>
        </ng-container>

        <!-- ══════════════ STEP 3: CONNECTING ══════════════ -->
        <ng-container *ngIf="step === 'connecting'">
          <div class="connecting-screen" @fadeUp>
            <div class="conn-spinner"></div>
            <div class="conn-label">Entering room…</div>
            <div class="conn-sub">Match found — connecting to game server</div>
          </div>
        </ng-container>

        <!-- Server strip -->
        <div class="online-strip">
          <span class="online-dot"></span>
          Server: <strong>{{ endpoint }}</strong>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .lobby-wrap {
        position: fixed;
        inset: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }

      .lobby-card {
        background: rgba(10, 25, 55, 0.92);
        border: 1px solid rgba(0, 180, 255, 0.22);
        border-radius: 24px;
        padding: 32px 28px;
        width: 100%;
        max-width: 500px;
        backdrop-filter: blur(20px);
        box-shadow:
          0 0 0 1px rgba(0, 160, 255, 0.08),
          0 0 80px rgba(0, 120, 255, 0.18),
          0 24px 48px rgba(0, 0, 0, 0.4);
        position: relative;
        overflow: hidden;
      }
      .lobby-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 10%;
        right: 10%;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(0, 200, 255, 0.6),
          transparent
        );
      }

      .lobby-brand {
        font-family: 'Orbitron', monospace;
        font-size: clamp(28px, 6vw, 44px);
        font-weight: 900;
        letter-spacing: 3px;
        text-align: center;
        background: linear-gradient(90deg, #00c8ff, #ff8c00);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 4px;
      }
      .lobby-sub {
        text-align: center;
        font-size: 10px;
        letter-spacing: 2.5px;
        color: #4a7aaa;
        margin-bottom: 20px;
        text-transform: uppercase;
        font-family: 'Orbitron', monospace;
      }

      /* Tabs */
      .tab-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        background: rgba(0, 15, 40, 0.6);
        border: 1px solid rgba(0, 160, 255, 0.2);
        border-radius: 14px;
        padding: 4px;
      }
      .tab-btn {
        flex: 1;
        padding: 9px 8px;
        background: transparent;
        border: none;
        border-radius: 10px;
        font-family: 'Orbitron', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #4a7aaa;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
      }
      .tab-btn:hover {
        color: #dff0ff;
        background: rgba(0, 80, 160, 0.25);
      }
      .tab-btn.active {
        background: rgba(0, 100, 200, 0.3);
        color: #00c8ff;
        border: 1px solid rgba(0, 200, 255, 0.28);
        box-shadow: 0 0 16px rgba(0, 200, 255, 0.12);
      }
      .tab-icon {
        font-size: 14px;
      }

      /* Error */
      .lobby-error {
        background: rgba(255, 68, 85, 0.12);
        border: 1px solid rgba(255, 68, 85, 0.3);
        border-radius: 10px;
        padding: 10px 14px;
        color: #ff4455;
        font-size: 12px;
        margin-bottom: 14px;
        text-align: center;
        line-height: 1.5;
      }

      /* Form */
      .lobby-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .field-row {
        display: flex;
        gap: 12px;
      }
      .field-row .field {
        flex: 1;
      }

      label {
        font-family: 'Orbitron', monospace;
        font-size: 8px;
        letter-spacing: 1.5px;
        color: #4a7aaa;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .optional-tag {
        font-size: 7px;
        color: #2a4a6a;
        letter-spacing: 1px;
        border: 1px solid rgba(0, 140, 220, 0.2);
        border-radius: 4px;
        padding: 1px 5px;
      }
      input {
        background: rgba(0, 15, 40, 0.8);
        border: 1px solid rgba(0, 140, 220, 0.25);
        border-radius: 10px;
        padding: 11px 14px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 15px;
        font-weight: 600;
        color: #dff0ff;
        outline: none;
        width: 100%;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
      }
      input:focus {
        border-color: #00c8ff;
        box-shadow:
          0 0 0 3px rgba(0, 200, 255, 0.1),
          0 0 14px rgba(0, 200, 255, 0.18);
      }
      input::placeholder {
        color: #2a4a6a;
        font-weight: 400;
      }
      input:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      input[type='number'] {
        -moz-appearance: textfield;
      }
      input[type='number']::-webkit-outer-spin-button,
      input[type='number']::-webkit-inner-spin-button {
        -webkit-appearance: none;
      }
      .field-hint {
        font-size: 10px;
        color: #4a7aaa;
        padding-left: 2px;
      }
      .field-loading {
        font-size: 12px;
        color: #4a7aaa;
        padding: 8px 0;
        font-style: italic;
      }

      /* Game picker */
      .game-picker {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .game-option {
        padding: 10px 14px;
        background: rgba(0, 15, 40, 0.7);
        border: 1px solid rgba(0, 140, 220, 0.2);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.18s;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .game-option:hover {
        border-color: rgba(0, 200, 255, 0.35);
        background: rgba(0, 40, 100, 0.3);
      }
      .game-option.selected {
        border-color: #00c8ff;
        background: rgba(0, 80, 160, 0.25);
        box-shadow: 0 0 14px rgba(0, 200, 255, 0.12);
      }
      .go-name {
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        font-weight: 700;
        color: #dff0ff;
      }
      .go-key {
        font-size: 10px;
        color: #4a7aaa;
        letter-spacing: 1px;
      }

      /* Segmented control */
      .seg-control {
        display: flex;
        gap: 6px;
        margin-top: 2px;
      }
      .seg-btn {
        flex: 1;
        padding: 10px;
        border-radius: 10px;
        background: rgba(0, 15, 40, 0.7);
        border: 1px solid rgba(0, 140, 220, 0.2);
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        color: #4a7aaa;
        cursor: pointer;
        transition: all 0.18s;
      }
      .seg-btn:hover {
        color: #dff0ff;
        border-color: rgba(0, 200, 255, 0.3);
      }
      .seg-btn.active {
        background: rgba(0, 80, 160, 0.3);
        color: #00c8ff;
        border-color: rgba(0, 200, 255, 0.4);
        box-shadow: 0 0 10px rgba(0, 200, 255, 0.1);
      }
      .seg-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      /* Player chip */
      .player-chip {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(0, 50, 120, 0.2);
        border: 1px solid rgba(0, 180, 255, 0.18);
        border-radius: 14px;
        padding: 10px 14px;
        margin-bottom: 16px;
      }
      .player-av {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        flex-shrink: 0;
        background: linear-gradient(135deg, #0e3a7a, #1a6abc);
        border: 1px solid rgba(0, 200, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #00c8ff;
      }
      .player-inf {
        flex: 1;
      }
      .player-name {
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        font-weight: 700;
        color: #dff0ff;
      }
      .player-sub {
        font-size: 10px;
        color: #4a7aaa;
        margin-top: 2px;
      }
      .btn-logout {
        background: rgba(255, 68, 85, 0.1);
        border: 1px solid rgba(255, 68, 85, 0.25);
        border-radius: 8px;
        padding: 5px 12px;
        color: #ff4455;
        font-family: 'Orbitron', monospace;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.18s;
      }
      .btn-logout:hover {
        background: rgba(255, 68, 85, 0.2);
      }

      /* Join button */
      .btn-join {
        width: 100%;
        padding: 15px;
        border: none;
        border-radius: 30px;
        background: linear-gradient(
          180deg,
          #ffcc66 0%,
          #ff8c00 45%,
          #c05800 100%
        );
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 3px;
        color: #1a0800;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        box-shadow:
          0 5px 0 #7a3000,
          0 8px 20px rgba(255, 140, 0, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.35);
        text-shadow: 0 1px 0 rgba(255, 200, 100, 0.4);
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        transition:
          transform 0.12s,
          filter 0.15s,
          box-shadow 0.12s;
        -webkit-text-fill-color: #1a0800;
      }
      .btn-join::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.22) 50%,
          transparent 100%
        );
        transform: skewX(-20deg) translateX(-130%);
        animation: sheen 2.6s ease-in-out infinite;
        pointer-events: none;
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
      .btn-join:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      .btn-join:active:not(:disabled) {
        transform: translateY(4px) scale(0.98);
        box-shadow:
          0 1px 0 #7a3000,
          0 2px 8px rgba(255, 140, 0, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        filter: brightness(0.92);
      }
      .btn-join:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none !important;
      }

      .connecting-text {
        animation: blink 0.55s step-end infinite;
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

      .guest-note {
        text-align: center;
        font-size: 11px;
        color: #4a7aaa;
        line-height: 1.6;
      }
      .tab-link {
        color: #00c8ff;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .tab-link:hover {
        color: #fff;
      }

      /* Connecting screen */
      .connecting-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 32px 0;
      }
      .conn-spinner {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 3px solid rgba(0, 200, 255, 0.15);
        border-top-color: #00c8ff;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .conn-label {
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #00c8ff;
        letter-spacing: 2px;
      }
      .conn-sub {
        font-size: 12px;
        color: #4a7aaa;
        text-align: center;
      }

      /* Online strip */
      .online-strip {
        margin-top: 20px;
        padding-top: 14px;
        border-top: 1px solid rgba(0, 160, 255, 0.12);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: #4a7aaa;
      }
      .online-strip strong {
        color: rgba(180, 220, 255, 0.75);
        font-weight: 600;
      }
      .online-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #00e57a;
        box-shadow: 0 0 6px #00e57a;
        flex-shrink: 0;
        animation: dotPulse 2s ease-in-out infinite;
      }
      @keyframes dotPulse {
        0%,
        100% {
          opacity: 1;
          box-shadow: 0 0 6px #00e57a;
        }
        50% {
          opacity: 0.6;
          box-shadow: 0 0 14px #00e57a;
        }
      }
    `,
  ],
})
export class LobbyComponent implements OnInit {
  @Output() joined = new EventEmitter<void>();

  // Step management
  step: LobbyStep = 'auth';
  authTab: AuthTab = 'login';
  loading = false;
  loadingGames = false;
  error: string | null = null;
  endpoint = environment.wsEndpoint;

  // Stored after auth
  nickname = '';
  private accessToken = '';

  // Forms
  loginForm = { login: '', password: '' };
  registerForm = {
    email: '',
    username: '',
    password: '',
    phone: '',
    displayName: '',
  };
  matchForm = {
    nickname: '',
    gameKey: '',
    entryAmount: 100,
    currency: 'DORX',
    expectedPlayers: 5 as 5 | 10,
  };

  availableGames: GameOption[] = [];

  get canLogin(): boolean {
    return !!(this.loginForm.login.trim() && this.loginForm.password.trim());
  }
  get canRegister(): boolean {
    return !!(
      this.registerForm.email.trim() &&
      this.registerForm.username.trim() &&
      this.registerForm.password.trim()
    );
  }
  get canJoinMatch(): boolean {
    return !!(
      this.matchForm.nickname.trim() &&
      this.matchForm.gameKey &&
      this.matchForm.entryAmount > 0
    );
  }

  constructor(
    private http: HttpClient,
    private room: GameRoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // If already logged in from a previous session, skip auth step
    const storedToken = localStorage.getItem('lb_access_token');
    const storedNick = localStorage.getItem('lb_nickname');
    if (storedToken && storedNick) {
      this.accessToken = storedToken;
      this.nickname = storedNick;
      this.matchForm.nickname = storedNick;
      this.goToMatchSetup();
    }
  }

  setAuthTab(t: AuthTab): void {
    this.authTab = t;
    this.error = null;
    this.cdr.markForCheck();
  }

  // ── Step 1a: Login ────────────────────────────────────────────────────────
  async onLogin(): Promise<void> {
    if (!this.canLogin || this.loading) return;
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      const res: any = await this.http
        .post(`${environment.apiBase}/auth/login`, {
          login: this.loginForm.login.trim(),
          password: this.loginForm.password.trim(),
        })
        .toPromise();

      this.handleAuthResponse(res);
      this.goToMatchSetup();
    } catch (err: any) {
      this.error = this.parseApiError(err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // ── Step 1b: Register ─────────────────────────────────────────────────────
  async onRegister(): Promise<void> {
    if (!this.canRegister || this.loading) return;
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      const payload: any = {
        email: this.registerForm.email.trim(),
        username: this.registerForm.username.trim(),
        password: this.registerForm.password.trim(),
      };
      if (this.registerForm.phone.trim())
        payload.phone = this.registerForm.phone.trim();
      if (this.registerForm.displayName.trim())
        payload.displayName = this.registerForm.displayName.trim();

      const res: any = await this.http
        .post(`${environment.apiBase}/auth/register`, payload)
        .toPromise();

      this.handleAuthResponse(res);
      this.goToMatchSetup();
    } catch (err: any) {
      this.error = this.parseApiError(err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // ── Store auth response fields ────────────────────────────────────────────
  private handleAuthResponse(res: any): void {
    const user = res?.data?.user ?? res?.data ?? res;
    const tokens = res?.data?.tokens ?? {};

    console.log('tokens object:', tokens); // ← add this
    console.log('accessToken:', tokens?.accessToken); // ← and this

    this.accessToken =
      tokens?.accessToken ?? tokens?.token ?? tokens?.jwt ?? '';
    this.nickname = user?.displayName ?? user?.username ?? '';

    const refreshToken = tokens?.refreshToken ?? '';
    const userId = user?.id ?? user?.userId ?? '';

    localStorage.setItem('lb_access_token', this.accessToken);
    localStorage.setItem('lb_refresh_token', refreshToken);
    localStorage.setItem('lb_user_id', String(userId));
    localStorage.setItem('lb_nickname', this.nickname);

    this.matchForm.nickname = this.nickname;
  }

  // ── Transition to match setup and load games ──────────────────────────────
  private goToMatchSetup(): void {
    this.step = 'match_setup';
    this.error = null;
    this.loadAvailableGames();
    this.cdr.markForCheck();
  }

  // ── Load game list from /games/active/list ────────────────────────────────
  private async loadAvailableGames(): Promise<void> {
    this.loadingGames = true;
    this.cdr.markForCheck();

    try {
      const res: any = await this.http
        .get(`${environment.apiBase}/games/active/list`)
        .toPromise();

      const list: any[] = res?.data ?? [];
      this.availableGames = list.map((g: any) => ({
        gameKey: g.code, // ← was g.gameKey, actual field is g.code
        name: g.name,
        slug: g.slug,
        minEntryAmount: g.defaultEntryAmount ?? 1, // ← was g.minEntryAmount
        currency: g.entryCurrency ?? 'DORX', // ← was g.currency
        minPlayers: g.minPlayers ?? 2,
        maxPlayers: g.maxPlayers ?? 10,
      }));

      if (this.availableGames.length > 0 && !this.matchForm.gameKey) {
        this.selectGame(this.availableGames[0]);
      }
    } catch {
      this.availableGames = [];
    } finally {
      this.loadingGames = false;
      this.cdr.markForCheck();
    }
  }

  selectGame(g: GameOption): void {
    this.matchForm.gameKey = g.gameKey;
    this.matchForm.currency = g.currency;
    this.matchForm.entryAmount = g.minEntryAmount || 100;
    this.cdr.markForCheck();
  }

  // ── Step 2: Create/Join match → get seatToken + seatNo ───────────────────
  async onJoinMatch(): Promise<void> {
    if (!this.canJoinMatch || this.loading) return;
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      // ← Read fresh from localStorage in case this.accessToken wasn't set
      const token =
        this.accessToken || localStorage.getItem('lb_access_token') || '';

      if (!token) {
        this.error = 'Session expired. Please login again.';
        this.logout();
        return;
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });

      console.log('Sending token:', token.substring(0, 30) + '...'); // ← confirm it's sent

      const res: any = await this.http
        .post(
          `${environment.apiBase}/game-matches`,
          {
            nickname: this.matchForm.nickname.trim(),
            gameKey: this.matchForm.gameKey,
            entryAmount: this.matchForm.entryAmount,
            currency: this.matchForm.currency,
            expectedPlayers: this.matchForm.expectedPlayers,
          },
          { headers },
        )
        .toPromise();

      console.log('game-matches response:', res); // ← log full response so we see field names

      const data = res?.data ?? res;

      const seatToken = data?.seatToken ?? data?.token ?? token;
      const seatNo = data?.seatNo ?? data?.seat ?? 1;
      const roomName =
        data?.roomName ?? data?.gameKey ?? data?.code ?? environment.roomName;
      const customerId =
        data?.customerId ??
        data?.userId ??
        localStorage.getItem('lb_user_id') ??
        '';

      this.step = 'connecting';
      this.cdr.markForCheck();

      await this.room.join({
        endpoint: environment.wsEndpoint,
        roomName,
        customerId: String(customerId),
        nickname: this.matchForm.nickname.trim(),
        seatNo: Number(seatNo),
        seatToken,
      });

      this.joined.emit();
    } catch (err: any) {
      console.error('game-matches error:', err); // ← log full error
      this.step = 'match_setup';
      this.error = this.parseApiError(err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  logout(): void {
    localStorage.removeItem('lb_access_token');
    localStorage.removeItem('lb_refresh_token');
    localStorage.removeItem('lb_user_id');
    localStorage.removeItem('lb_nickname');
    this.accessToken = '';
    this.nickname = '';
    this.step = 'auth';
    this.error = null;
    this.availableGames = [];
    this.cdr.markForCheck();
  }

  // ── Error parser ──────────────────────────────────────────────────────────
  private parseApiError(err: any): string {
    const apiMsg =
      err?.error?.message ?? err?.error?.error ?? err?.message ?? '';
    if (err?.status === 401 || err?.status === 403)
      return 'Invalid credentials. Please try again.';
    if (err?.status === 409) return 'That email or username is already taken.';
    if (err?.status === 400 || err?.status === 422)
      return apiMsg || 'Please check your inputs.';
    if (err?.status === 0 || apiMsg.includes('ECONNREFUSED')) {
      return `Cannot reach server at "${environment.apiBase}". Is it running?`;
    }
    return apiMsg || 'Something went wrong. Please try again.';
  }
}
