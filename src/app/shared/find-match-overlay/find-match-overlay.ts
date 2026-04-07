
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
import { GameRoomService } from '../../game/services/game-room.service';
import { environment } from '../../../environments/environment';

const WORD_RUSH_GAME = {
  gameKey:        'WORD_RUSH',
  name:           'Fastest Finger Word Guess',
  minEntryAmount: 0,
  currency:       'DORX',
  minPlayers:     5,
  maxPlayers:     10,
} as const;

@Component({
   selector: 'app-find-match-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Blurred backdrop -->
    <div class="backdrop" [class.finding]="loading"></div>

    <!-- Floating panel -->
    <div class="panel" [class.loading]="loading">

      <!-- Header -->
      <div class="panel-header">
        <div class="panel-brand">Scramble</div>
        <div class="panel-sub">Word Rush · Multiplayer</div>
      </div>

      <!-- Player chip -->
      <div class="player-chip">
        <span class="player-av">{{ nickname[0]?.toUpperCase() }}</span>
        <div class="player-inf">
          <div class="player-name">{{ nickname }}</div>
          <div class="player-sub">Ready to compete</div>
        </div>
        <button class="btn-logout" (click)="onLogout()">Logout</button>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="panel-error">⚠ {{ error }}</div>

      <!-- Nickname -->
      <div class="field">
        <label>Match Nickname</label>
        <input
          type="text"
          [(ngModel)]="nickname"
          placeholder="How you appear in-game"
          maxlength="40"
          [disabled]="loading"
        />
      </div>

      <!-- Players -->
      <div class="field">
        <label>Players per Match</label>
        <div class="seg-control">
          <button
            class="seg-btn"
            [class.active]="expectedPlayers === WORD_RUSH_GAME.minPlayers"
            (click)="expectedPlayers = $any(WORD_RUSH_GAME.minPlayers)"
            [disabled]="loading"
          >{{ WORD_RUSH_GAME.minPlayers }}</button>
          <button
            class="seg-btn"
            [class.active]="expectedPlayers === WORD_RUSH_GAME.maxPlayers"
            (click)="expectedPlayers = $any(WORD_RUSH_GAME.maxPlayers)"
            [disabled]="loading"
          >{{ WORD_RUSH_GAME.maxPlayers }}</button>
        </div>
      </div>

      <!-- Find Match button -->
      <button class="btn-find" (click)="onFindMatch()" [disabled]="loading || !nickname.trim()">
        <ng-container *ngIf="!loading">
          <span class="btn-icon">⚡</span> FIND MATCH
        </ng-container>
        <span *ngIf="loading" class="btn-finding">
          <span class="spinner"></span> FINDING MATCH…
        </span>
      </button>

      <!-- Live indicator -->
      <div class="live-strip">
        <span class="live-dot"></span>
        <span>{{ WORD_RUSH_GAME.name }}</span>
        <span class="live-badge">LIVE</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }

    .backdrop {
      position: fixed; inset: 0;
      background: rgba(4, 10, 24, 0.55);
      backdrop-filter: blur(6px);
      transition: background 0.3s;
    }
    .backdrop.finding {
      background: rgba(4, 10, 24, 0.75);
    }

    .panel {
      position: relative; z-index: 1;
      background: rgba(8, 18, 44, 0.96);
      border: 1px solid rgba(0, 180, 255, 0.25);
      border-radius: 24px;
      padding: 28px 24px;
      width: 100%; max-width: 380px;
      backdrop-filter: blur(24px);
      box-shadow:
        0 0 0 1px rgba(0,160,255,0.08),
        0 0 60px rgba(0,100,255,0.2),
        0 24px 48px rgba(0,0,0,0.5);
      display: flex; flex-direction: column; gap: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .panel.loading {
      transform: scale(0.99);
      box-shadow:
        0 0 0 1px rgba(0,200,255,0.2),
        0 0 80px rgba(0,180,255,0.3),
        0 24px 48px rgba(0,0,0,0.5);
    }

    /* Header */
    .panel-brand {
      font-family: 'Orbitron', monospace;
      font-size: 26px; font-weight: 900; letter-spacing: 3px; text-align: center;
      background: linear-gradient(90deg, #00c8ff, #ff8c00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .panel-sub {
      text-align: center; font-size: 9px; letter-spacing: 2.5px;
      color: #4a7aaa; text-transform: uppercase; font-family: 'Orbitron', monospace;
    }

    /* Player chip */
    .player-chip {
      display: flex; align-items: center; gap: 10px;
      background: rgba(0,50,120,0.2); border: 1px solid rgba(0,180,255,0.15);
      border-radius: 12px; padding: 8px 12px;
    }
    .player-av {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg,#0e3a7a,#1a6abc);
      border: 1px solid rgba(0,200,255,0.3);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; color: #00c8ff;
    }
    .player-inf { flex: 1; }
    .player-name { font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: #dff0ff; }
    .player-sub { font-size: 9px; color: #4a7aaa; margin-top: 1px; }
    .btn-logout {
      background: rgba(255,68,85,0.1); border: 1px solid rgba(255,68,85,0.25);
      border-radius: 7px; padding: 4px 10px; color: #ff4455;
      font-family: 'Orbitron', monospace; font-size: 7px; font-weight: 700;
      letter-spacing: 1px; cursor: pointer; transition: all 0.15s; flex-shrink: 0;
    }
    .btn-logout:hover { background: rgba(255,68,85,0.2); }

    /* Error */
    .panel-error {
      background: rgba(255,68,85,0.1); border: 1px solid rgba(255,68,85,0.28);
      border-radius: 10px; padding: 9px 13px; color: #ff4455;
      font-size: 11px; text-align: center; line-height: 1.5;
    }

    /* Field */
    .field { display: flex; flex-direction: column; gap: 5px; }
    label {
      font-family: 'Orbitron', monospace; font-size: 7px; letter-spacing: 1.5px;
      color: #4a7aaa; text-transform: uppercase;
    }
    input {
      background: rgba(0,15,40,0.8); border: 1px solid rgba(0,140,220,0.25);
      border-radius: 10px; padding: 10px 13px;
      font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600;
      color: #dff0ff; outline: none; width: 100%;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
      border-color: #00c8ff;
      box-shadow: 0 0 0 3px rgba(0,200,255,0.1);
    }
    input::placeholder { color: #2a4a6a; font-weight: 400; }
    input:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Seg control */
    .seg-control { display: flex; gap: 6px; }
    .seg-btn {
      flex: 1; padding: 9px; border-radius: 9px;
      background: rgba(0,15,40,0.7); border: 1px solid rgba(0,140,220,0.2);
      font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700;
      color: #4a7aaa; cursor: pointer; transition: all 0.15s;
    }
    .seg-btn.active {
      background: rgba(0,80,160,0.3); color: #00c8ff;
      border-color: rgba(0,200,255,0.4); box-shadow: 0 0 10px rgba(0,200,255,0.1);
    }
    .seg-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Find match button */
    .btn-find {
      width: 100%; padding: 15px; border: none; border-radius: 30px;
      background: linear-gradient(180deg, #ffcc66 0%, #ff8c00 45%, #c05800 100%);
      font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700;
      letter-spacing: 3px; color: #1a0800; cursor: pointer;
      position: relative; overflow: hidden;
      box-shadow: 0 5px 0 #7a3000, 0 8px 20px rgba(255,140,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35);
      -webkit-text-fill-color: #1a0800;
      transition: transform 0.12s, filter 0.15s, box-shadow 0.12s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-find::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);
      transform: skewX(-20deg) translateX(-130%);
      animation: sheen 2.6s ease-in-out infinite;
    }
    @keyframes sheen {
      0% { transform: skewX(-20deg) translateX(-130%); }
      60%,100% { transform: skewX(-20deg) translateX(280%); }
    }
    .btn-find:hover:not(:disabled) { filter: brightness(1.08); }
    .btn-find:active:not(:disabled) {
      transform: translateY(3px) scale(0.98);
      box-shadow: 0 2px 0 #7a3000, 0 3px 8px rgba(255,140,0,0.25);
    }
    .btn-find:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-icon { font-size: 16px; }
    .btn-finding {
      display: flex; align-items: center; gap: 10px;
      animation: blink 0.55s step-end infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Spinner inside button */
    .spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(26,8,0,0.3); border-top-color: #1a0800;
      animation: spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Live strip */
    .live-strip {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-size: 10px; color: #4a7aaa; padding-top: 4px;
      border-top: 1px solid rgba(0,160,255,0.1);
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #00e57a;
      box-shadow: 0 0 6px #00e57a; animation: dotPulse 2s ease-in-out infinite;
    }
    @keyframes dotPulse {
      0%,100% { opacity:1; box-shadow: 0 0 6px #00e57a; }
      50%      { opacity:.6; box-shadow: 0 0 12px #00e57a; }
    }
    .live-badge {
      font-family: 'Orbitron', monospace; font-size: 7px; font-weight: 700;
      letter-spacing: 1.5px; color: #00e57a;
      border: 1px solid rgba(0,229,122,0.3); border-radius: 20px;
      padding: 2px 7px; background: rgba(0,229,122,0.08);
    }
  `],
})
export class FindMatchOverlay implements OnInit {
  @Output() joined  = new EventEmitter<void>();
  @Output() logout  = new EventEmitter<void>();

  readonly WORD_RUSH_GAME = WORD_RUSH_GAME;

  nickname         = '';
  expectedPlayers: number = WORD_RUSH_GAME.minPlayers;
  loading          = false;
  error: string | null = null;

  private accessToken = '';

  constructor(
    private http: HttpClient,
    private room: GameRoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.nickname     = localStorage.getItem('lb_nickname')      ?? '';
    this.accessToken  = localStorage.getItem('lb_access_token')  ?? '';
  }

  async onFindMatch(): Promise<void> {
    if (!this.nickname.trim() || this.loading) return;
    this.loading = true;
    this.error   = null;
    this.cdr.markForCheck();

    try {
      const token = this.accessToken || localStorage.getItem('lb_access_token') || '';
      if (!token) {
        this.error = 'Session expired. Please logout and login again.';
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      const headers = new HttpHeaders({
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      });

      const uniqueGameKey = `${WORD_RUSH_GAME.gameKey}_${crypto.randomUUID()}`;

      const res: any = await this.http
        .post(
          `${environment.apiBase}/game-matches`,
          {
            nickname:        this.nickname.trim(),
            gameKey:         uniqueGameKey,
            entryAmount:     WORD_RUSH_GAME.minEntryAmount,
            currency:        WORD_RUSH_GAME.currency,
            expectedPlayers: this.expectedPlayers,
          },
          { headers },
        )
        .toPromise();

      // Backend returns 200 with success:false for business errors
      if (res && res.success === false) {
        this.error = this.parseBackendMessage(res.message);
        return;
      }

      const data = res?.data ?? res;
      console.log('Match data fields:', Object.keys(data));

      const seatToken  = data?.seatToken  ?? data?.token   ?? token;
      const seatNo     = data?.seatNo     ?? data?.seat    ?? 1;
      const customerId = data?.customerId ?? data?.userId  ?? localStorage.getItem('lb_customer_id') ?? '';
      const roomName   = data?.colyseusRoom ?? data?.roomName ?? data?.roomType ?? data?.gameCode ?? WORD_RUSH_GAME.gameKey;

      await this.room.join({
        endpoint:   environment.wsEndpoint,
        roomName,
        customerId: String(customerId),
        nickname:   this.nickname.trim(),
        seatNo:     Number(seatNo),
        seatToken,
      });

      this.joined.emit();

    } catch (err: any) {
      console.error('Find match error:', err);
      this.error = this.parseApiError(err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  onLogout(): void {
    this.logout.emit();
  }

  private parseBackendMessage(message: string): string {
    if (!message) return 'Something went wrong. Please try again.';
    const lower = message.toLowerCase();
    if (lower.includes('insufficient') || lower.includes('balance'))
      return 'Your DORX balance is too low to enter this match. Please top up and try again.';
    if (lower.includes('already in') || lower.includes('active match'))
      return 'You are already in an active match.';
    return message;
  }

  private parseApiError(err: any): string {
    const msg = err?.error?.message ?? err?.error?.error ?? err?.message ?? '';
    if (err?.status === 401 || err?.status === 403) return 'Session expired. Please logout and login again.';
    if (err?.status === 0) return 'Cannot reach game server. Please check your connection.';
    if (msg) return this.parseBackendMessage(msg);
    return 'Something went wrong. Please try again.';
  }
}
