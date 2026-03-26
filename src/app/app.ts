import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameHudComponent }      from './game/components/game-hud.component';
import { PuzzleBoardComponent }  from './game/components/puzzle-board.component';
import { LeftSidebarComponent }  from './game/components/left-sidebar.component';
import { RightSidebarComponent } from './game/components/right-sidebar.component';
import { GameOverlaysComponent } from './game/components/game-overlays.component';
import { LobbyComponent }        from './shared/lobby.component';
import { CanvasBackgroundService } from './game/services/canvas-background.service';
import { GameRoomService }         from './game/services/game-room.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LobbyComponent,
    GameHudComponent,
    PuzzleBoardComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    GameOverlaysComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<!-- Animated canvas background (always present) -->
<canvas #bgCanvas id="bgCanvas"></canvas>
<div class="scanline"></div>

<!-- LOBBY screen — shown until connected -->
<app-lobby *ngIf="!connected" (joined)="onJoined()"></app-lobby>

<!-- GAME screen — shown once connected -->
<div id="app" *ngIf="connected">
  <app-game-hud></app-game-hud>

  <div class="game-grid">
    <app-left-sidebar></app-left-sidebar>
    <app-puzzle-board></app-puzzle-board>
    <app-right-sidebar></app-right-sidebar>
  </div>
</div>

<!-- Overlays always rendered on top -->
<app-game-overlays></app-game-overlays>

<!-- Connection error banner -->
<div *ngIf="connectionError" class="conn-error">
  ⚠ {{ connectionError }}
  <button (click)="dismiss()">✕</button>
</div>
  `,
  styles: [`
    :host { display: block; }

    #bgCanvas {
      position: fixed; inset: 0; width: 100%; height: 100%;
      z-index: 0; pointer-events: none;
    }

    .scanline {
      position: fixed; inset: 0; z-index: 2; pointer-events: none;
      background: repeating-linear-gradient(
        0deg, transparent, transparent 3px,
        rgba(0,0,0,.035) 3px, rgba(0,0,0,.035) 4px
      );
    }

    #app {
      position: relative; z-index: 1; min-height: 100vh;
      display: flex; flex-direction: column; align-items: center;
      padding: 14px 12px 24px;
    }

    .game-grid {
      width: 100%; max-width: 1240px;
      display: grid; grid-template-columns: 1fr;
      gap: 16px; flex: 1;
    }

    @media(min-width: 920px) {
      .game-grid { grid-template-columns: 280px 1fr 280px; align-items: start; }
    }

    .conn-error {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(224,51,68,.15); border: 1px solid rgba(224,51,68,.4);
      border-radius: 12px; padding: 10px 20px;
      font-family: 'Orbitron', monospace; font-size: 11px; color: var(--red);
      z-index: 300; display: flex; align-items: center; gap: 12px;
      backdrop-filter: blur(12px);
    }
    .conn-error button {
      background: none; border: none; color: var(--red); cursor: pointer;
      font-size: 14px; line-height: 1; padding: 0;
    }
  `]
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  connected       = false;
  connectionError: string | null = null;

  private subs = new Subscription();

  constructor(
    private bg:   CanvasBackgroundService,
    private room: GameRoomService,
    private cdr:  ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
  this.subs.add(this.room.connected$.subscribe(v => {
    this.connected = v;
    this.cdr.markForCheck();
  }));

  this.subs.add(this.room.connectionError$.subscribe(err => {
    this.connectionError = err;
    this.cdr.markForCheck();
  }));

  // ── Auto-reconnect if token already in storage ──
  this.tryAutoReconnect();
}

private async tryAutoReconnect(): Promise<void> {
  const token      = localStorage.getItem('lb_access_token');
  const customerId = localStorage.getItem('lb_customer_id');
  if (!token || !customerId) return;

  try {
    await this.room.join({
      endpoint:   environment.wsEndpoint,
      roomName:   environment.roomName,
      customerId,
      nickname:   customerId,   // fallback; room will use server-side display name
      seatNo:     1,
      seatToken:  token,
    });
  } catch {
    // Token expired or invalid — clear it, let lobby show
    localStorage.removeItem('lb_access_token');
    localStorage.removeItem('lb_refresh_token');
    localStorage.removeItem('lb_customer_id');
  }
}

  ngAfterViewInit(): void {
    this.bg.init(this.canvasRef.nativeElement);
  }

  onJoined(): void {
    // connected$ will flip to true via GameRoomService → triggers UI switch
  }

  dismiss(): void {
    this.connectionError = null;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.bg.destroy();
    this.room.leave();
  }
}
