import {
  Component, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameRoomService } from '../game/services/game-room.service';
import { environment } from '../../environments/environment';
import { fadeUp } from '../game/animations/game.animations';

type LobbyTab = 'guest' | 'full';

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
    <div class="lobby-brand">LEXBLITZ</div>
    <div class="lobby-sub">Competitive Word Unscramble</div>

    <!-- Tab switcher — guest tab hidden in production -->
    <div class="tab-bar" *ngIf="guestModeEnabled">
      <button class="tab-btn" [class.active]="tab === 'guest'" (click)="setTab('guest')">
        <span class="tab-icon">👤</span> Guest
      </button>
      <button class="tab-btn" [class.active]="tab === 'full'" (click)="setTab('full')">
        <span class="tab-icon">🔑</span> Full Credentials
      </button>
    </div>

    <!-- Error banner -->
    <div *ngIf="error" class="lobby-error" @fadeUp>
      ⚠ {{ error }}
    </div>

    <!-- ── GUEST TAB ── -->
    <div *ngIf="tab === 'guest'" class="lobby-form" @fadeUp>

      <div class="guest-hero">
        <div class="guest-icon">👾</div>
        <div class="guest-desc">
          Jump straight in — just pick a name.<br>
          The server generates your session automatically.
        </div>
      </div>

      <div class="field">
        <label>Your Nickname</label>
        <input #nickInput type="text" [(ngModel)]="nickname"
               placeholder="e.g. BlitzMaster42"
               maxlength="20" [disabled]="connecting"
               (keyup.enter)="joinGuest()" />
        <div class="field-hint">{{ 20 - nickname.length }} characters remaining</div>
      </div>

      <div class="field">
        <label>Server</label>
        <input type="text" [(ngModel)]="endpoint" [disabled]="connecting" />
      </div>

      <button class="btn-join" (click)="joinGuest()"
              [disabled]="connecting || !nickname.trim()">
        <span *ngIf="!connecting">⚡ JUMP IN AS GUEST</span>
        <span *ngIf="connecting" class="connecting-text">CONNECTING…</span>
      </button>

      <div class="guest-note">
        Guest sessions are temporary. Switch to
        <span class="tab-link" (click)="setTab('full')">Full Credentials</span>
        for a persistent account.
      </div>
    </div>

    <!-- ── FULL CREDENTIALS TAB ── -->
    <div *ngIf="tab === 'full'" class="lobby-form" @fadeUp>

      <div class="field">
        <label>Nickname</label>
        <input type="text" [(ngModel)]="nickname"
               placeholder="Your display name"
               maxlength="20" [disabled]="connecting" />
      </div>

      <div class="field">
        <label>Customer ID</label>
        <input type="text" [(ngModel)]="customerId"
               placeholder="cust_xxxx"
               [disabled]="connecting" />
        <div class="field-hint">Provided by your matchmaking system</div>
      </div>

      <div class="field">
        <label>Seat Token</label>
        <input type="password" [(ngModel)]="seatToken"
               placeholder="Signed JWT seat token"
               [disabled]="connecting" />
        <div class="field-hint">Signed by your backend before joining</div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Seat No.</label>
          <input type="number" [(ngModel)]="seatNo"
                 min="1" max="12" [disabled]="connecting" />
        </div>
        <div class="field">
          <label>Server</label>
          <input type="text" [(ngModel)]="endpoint" [disabled]="connecting" />
        </div>
      </div>

      <button class="btn-join" (click)="joinFull()"
              [disabled]="connecting || !canFullJoin">
        <span *ngIf="!connecting">⚡ JOIN MATCH</span>
        <span *ngIf="connecting" class="connecting-text">CONNECTING…</span>
      </button>

      <div class="guest-note">
        Don't have credentials yet?
        <span class="tab-link" (click)="setTab('guest')">Try Guest mode</span> instead.
      </div>
    </div>

    <!-- Players online indicator -->
    <div class="online-strip">
      <span class="online-dot"></span>
      Server: <strong>{{ endpoint }}</strong>
    </div>

  </div>
</div>
  `,
  styles: [`
    .lobby-wrap {
      position: fixed; inset: 0; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }

    .lobby-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 32px 28px;
      width: 100%; max-width: 460px;
      backdrop-filter: blur(20px);
      box-shadow:
        0 0 0 1px rgba(0,130,210,.08),
        0 0 60px rgba(0,130,210,.1),
        0 24px 48px rgba(0,0,0,.55);
      position: relative; overflow: hidden;
    }

    /* subtle top glow line */
    .lobby-card::before {
      content: '';
      position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,180,238,.5), transparent);
    }

    .lobby-brand {
      font-family: 'Orbitron', monospace;
      font-size: clamp(28px, 6vw, 44px);
      font-weight: 900; letter-spacing: 3px; text-align: center;
      background: linear-gradient(90deg, var(--blue), var(--orange));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      margin-bottom: 4px;
    }

    .lobby-sub {
      text-align: center; font-size: 10px; letter-spacing: 2.5px;
      color: var(--muted); margin-bottom: 20px; text-transform: uppercase;
      font-family: 'Orbitron', monospace;
    }

    /* Tab bar */
    .tab-bar {
      display: flex; gap: 8px; margin-bottom: 20px;
      background: rgba(0,10,28,.5);
      border: 1px solid var(--border);
      border-radius: 14px; padding: 4px;
    }
    .tab-btn {
      flex: 1; padding: 9px 8px;
      background: transparent; border: none; border-radius: 10px;
      font-family: 'Orbitron', monospace; font-size: 10px;
      font-weight: 700; letter-spacing: 1px;
      color: var(--muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all .2s;
    }
    .tab-btn:hover { color: var(--text); background: rgba(0,60,130,.2); }
    .tab-btn.active {
      background: rgba(0,80,160,.25);
      color: var(--blue);
      border: 1px solid rgba(0,180,238,.22);
      box-shadow: 0 0 12px rgba(0,180,238,.1);
    }
    .tab-icon { font-size: 14px; }

    /* Error */
    .lobby-error {
      background: rgba(224,51,68,.1); border: 1px solid rgba(224,51,68,.28);
      border-radius: 10px; padding: 10px 14px; color: var(--red);
      font-size: 12px; margin-bottom: 14px; text-align: center; line-height: 1.5;
    }

    /* Form */
    .lobby-form { display: flex; flex-direction: column; gap: 14px; }

    .guest-hero {
      display: flex; align-items: center; gap: 14px;
      background: rgba(0,60,130,.15); border: 1px solid rgba(0,130,210,.15);
      border-radius: 14px; padding: 14px;
    }
    .guest-icon { font-size: 32px; flex-shrink: 0; }
    .guest-desc { font-size: 13px; color: rgba(180,210,240,.75); line-height: 1.55; }

    .field { display: flex; flex-direction: column; gap: 5px; }
    .field-row { display: flex; gap: 12px; }
    .field-row .field { flex: 1; }

    label {
      font-family: 'Orbitron', monospace; font-size: 8px;
      letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase;
    }

    input {
      background: rgba(0,8,24,.75);
      border: 1px solid var(--border);
      border-radius: 10px; padding: 11px 14px;
      font-family: 'Rajdhani', sans-serif; font-size: 15px; font-weight: 600;
      color: var(--text); outline: none; width: 100%;
      transition: border-color .2s, box-shadow .2s;
    }
    input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(0,180,238,.08), 0 0 12px rgba(0,180,238,.15);
    }
    input::placeholder { color: var(--muted); font-weight: 400; }
    input:disabled { opacity: .45; cursor: not-allowed; }

    .field-hint {
      font-size: 10px; color: var(--muted); padding-left: 2px;
    }

    /* Join button */
    .btn-join {
      width: 100%; padding: 15px; border: none; border-radius: 30px;
      background: linear-gradient(90deg, #7a3400, #d07800, #7a3400);
      background-size: 200%;
      font-family: 'Orbitron', monospace; font-size: 13px;
      font-weight: 700; letter-spacing: 3px; color: #fff;
      cursor: pointer; position: relative; overflow: hidden;
      box-shadow:
        0 0 28px rgba(255,140,0,.45),
        0 4px 16px rgba(160,60,0,.3),
        inset 0 1px 0 rgba(255,255,255,.18);
      transition: all .2s; text-shadow: 0 1px 2px rgba(0,0,0,.3);
    }
    .btn-join::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent);
      transform: skewX(-20deg) translateX(-130%);
      animation: sheen 2.6s ease-in-out infinite;
    }
    @keyframes sheen {
      0%   { transform: skewX(-20deg) translateX(-130%); }
      60%, 100% { transform: skewX(-20deg) translateX(280%); }
    }
    .btn-join:hover:not(:disabled) {
      box-shadow: 0 0 44px rgba(255,140,0,.65), 0 4px 20px rgba(160,60,0,.4);
      transform: translateY(-2px);
    }
    .btn-join:active:not(:disabled) { transform: scale(.97); }
    .btn-join:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

    .connecting-text { animation: blink .55s step-end infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

    .guest-note {
      text-align: center; font-size: 11px; color: var(--muted); line-height: 1.6;
    }
    .tab-link {
      color: var(--blue); cursor: pointer; text-decoration: underline;
      text-underline-offset: 2px;
    }
    .tab-link:hover { color: #fff; }

    /* Online strip */
    .online-strip {
      margin-top: 20px; padding-top: 14px;
      border-top: 1px solid rgba(0,130,210,.1);
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; color: var(--muted);
    }
    .online-strip strong { color: rgba(180,210,240,.7); font-weight: 600; }
    .online-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--green); box-shadow: 0 0 6px var(--green);
      flex-shrink: 0; animation: dotPulse 2s ease-in-out infinite;
    }
    @keyframes dotPulse {
      0%,100% { opacity: 1; box-shadow: 0 0 6px var(--green); }
      50%     { opacity: .6; box-shadow: 0 0 12px var(--green); }
    }
  `]
})
export class LobbyComponent implements OnInit {
  @Output() joined = new EventEmitter<void>();

  tab: LobbyTab = 'guest';
  guestModeEnabled = environment.guestModeEnabled;

  // Shared
  nickname  = '';
  endpoint  = environment.wsEndpoint;
  connecting = false;
  error: string | null = null;

  // Full-credentials only
  customerId = '';
  seatToken  = '';
  seatNo     = 1;

  get canFullJoin(): boolean {
    return !!(
      this.nickname.trim() &&
      this.customerId.trim() &&
      this.seatToken.trim() &&
      this.endpoint.trim()
    );
  }

  constructor(private room: GameRoomService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.endpoint = environment.wsEndpoint;
    // Default to full credentials tab in production
    this.tab = environment.guestModeEnabled ? 'guest' : 'full';
  }

  setTab(t: LobbyTab): void {
    this.tab = t;
    this.error = null;
    this.cdr.markForCheck();
  }

  // ── Guest join — server generates customerId + seatToken ──────────────────
  async joinGuest(): Promise<void> {
    if (!this.nickname.trim() || this.connecting) return;

    // Generate a guest customerId client-side (server should accept 'guest_*' tokens)
    const guestId    = `guest_${Math.random().toString(36).slice(2, 10)}`;
    const guestToken = `guest`; // server should allow this in dev/guest mode

    await this.doJoin({
      endpoint:   this.endpoint,
      roomName:   environment.roomName,
      customerId: guestId,
      nickname:   this.nickname.trim(),
      seatNo:     this.seatNo,
      seatToken:  guestToken,
    });
  }

  // ── Full credentials join ─────────────────────────────────────────────────
  async joinFull(): Promise<void> {
    if (!this.canFullJoin || this.connecting) return;

    await this.doJoin({
      endpoint:   this.endpoint,
      roomName:   environment.roomName,
      customerId: this.customerId.trim(),
      nickname:   this.nickname.trim(),
      seatNo:     this.seatNo,
      seatToken:  this.seatToken.trim(),
    });
  }

  // ── Shared join logic ─────────────────────────────────────────────────────
  private async doJoin(config: {
    endpoint: string; roomName: string; customerId: string;
    nickname: string; seatNo: number; seatToken: string;
  }): Promise<void> {
    this.connecting = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      await this.room.join(config);
      this.joined.emit();
    } catch (err: any) {
      // Surface a friendly error depending on the failure type
      const raw = err?.message ?? '';
      if (raw.includes('4002') || raw.includes('token')) {
        this.error = 'Invalid seat token. Ask your server admin or use Guest mode.';
      } else if (raw.includes('connect') || raw.includes('ECONNREFUSED') || raw.includes('WebSocket')) {
        this.error = `Cannot reach server at "${config.endpoint}". Is it running?`;
      } else if (raw.includes('full') || raw.includes('4001')) {
        this.error = 'Room is full. Try again shortly.';
      } else {
        this.error = raw || 'Connection failed. Check your server and try again.';
      }
    } finally {
      this.connecting = false;
      this.cdr.markForCheck();
    }
  }
}
