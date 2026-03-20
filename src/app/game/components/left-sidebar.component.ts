import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { GameRoomService } from '../services/game-room.service';
import { ScoreboardItem } from '../models/game.models';
import { fadeUp, playerRowEnter, staggerList } from '../animations/game.animations';

@Component({
  selector: 'app-left-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeUp, playerRowEnter, staggerList],
  template: `
<aside class="side-l" @fadeUp>

  <!-- Leaderboard -->
  <div class="card">
    <div class="card-title">Leaderboard</div>
    <div [@staggerList]="scoreboard.length">
      <div *ngFor="let p of scoreboard; trackBy: trackPlayer; let i = index"
           class="p-row" [class.me]="p.customerId === myId" @playerRowEnter>
        <div class="p-av" [style.background]="avatarGrad(i)">
          {{ p.nickname[0].toUpperCase() }}
        </div>
        <div class="p-inf">
          <div class="p-name">
            <span [style.color]="p.customerId === myId ? 'var(--blue)' : ''">
              {{ p.customerId === myId ? '[You] ' : '' }}<b>{{ p.nickname }}</b>
            </span>
            <span class="p-rank">#{{ p.rank || i+1 }}</span>
          </div>
          <div class="p-bar-wrap">
            <div class="p-bar" [style.width]="barPct(p.score) + '%'"></div>
          </div>
        </div>
        <div class="p-pts">{{ p.score }}</div>
      </div>

      <!-- Empty state before first state_change -->
      <div *ngIf="scoreboard.length === 0" class="empty-lb">
        <div class="empty-text">Waiting for players…</div>
      </div>
    </div>
  </div>

  <!-- Hint -->
  <div class="card">
    <div class="card-title">Hint</div>
    <div class="hint-box">
      Rearrange all letters to form a common English word.
      <div class="hint-def">{{ hint }}</div>
    </div>
  </div>

  <!-- Reactions panel -->
  <div class="card reactions-card">
    <div class="card-title">React</div>
    <div class="reaction-btns">
      <button *ngFor="let e of emojis" class="emoji-btn" (click)="react(e)">{{ e }}</button>
    </div>
    <div class="live-reactions">
      <div *ngFor="let r of reactions; trackBy: trackReaction"
           class="live-reaction" @playerRowEnter>
        <span class="lr-emoji">{{ r.emoji }}</span>
        <span class="lr-name">{{ r.nickname }}</span>
      </div>
    </div>
  </div>

</aside>
  `,
  styles: [`
    .side-l { display: none; flex-direction: column; gap: 14px; }
    @media(min-width:920px) { .side-l { display: flex; } }
    .card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 20px;
      padding: 18px 16px; backdrop-filter: blur(16px);
    }
    .card-title {
      font-family: 'Orbitron', monospace; font-size: 9px; letter-spacing: 2px; color: var(--muted);
      text-transform: uppercase; margin-bottom: 13px; display: flex; align-items: center; gap: 8px;
    }
    .card-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg,var(--border),transparent); }
    .p-row {
      display: flex; align-items: center; gap: 10px; padding: 8px 10px;
      background: rgba(0,18,48,.35); border-radius: 10px; margin-bottom: 6px;
      border: 1px solid rgba(0,90,170,.1); transition: all .2s;
    }
    .p-row:last-child { margin-bottom: 0; }
    .p-row:hover, .p-row.me { background: rgba(0,35,78,.42); border-color: var(--border); }
    .p-row.me { border-color: rgba(0,180,238,.25); }
    .p-av {
      width: 30px; height: 30px; border-radius: 50%;
      border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: var(--blue); flex-shrink: 0;
    }
    .p-inf { flex: 1; min-width: 0; }
    .p-name { font-size: 13px; font-weight: 600; letter-spacing: .4px; display: flex; align-items: center; justify-content: space-between; }
    .p-rank { font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: var(--orange); }
    .p-bar-wrap { height: 4px; background: rgba(0,70,150,.2); border-radius: 2px; overflow: hidden; margin-top: 3px; }
    .p-bar { height: 100%; border-radius: 2px; background: linear-gradient(90deg,var(--blue),var(--orange)); transition: width 1.2s ease; }
    .p-pts { font-size: 11px; color: var(--orange); font-family: 'Orbitron', monospace; font-weight: 700; }
    .hint-box {
      background: rgba(0,35,75,.25); border: 1px solid rgba(0,180,255,.12);
      border-radius: 11px; padding: 12px 13px; font-size: 13px; line-height: 1.65;
      color: rgba(180,210,240,.82);
    }
    .hint-def { font-size: 11px; color: var(--muted); margin-top: 7px; font-style: italic; border-top: 1px solid var(--border); padding-top: 8px; }
    .reactions-card { }
    .reaction-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .emoji-btn {
      width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(0,120,200,.2);
      background: rgba(0,18,48,.5); font-size: 18px; cursor: pointer; transition: all .15s;
      display: flex; align-items: center; justify-content: center;
    }
    .emoji-btn:hover { background: rgba(0,50,120,.4); border-color: rgba(0,180,255,.4); transform: scale(1.15); }
    .emoji-btn:active { transform: scale(.9); }
    .live-reactions { display: flex; flex-direction: column; gap: 5px; min-height: 30px; }
    .live-reaction {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: var(--muted); animation: fadeSlide .3s ease;
    }
    @keyframes fadeSlide { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
    .lr-emoji { font-size: 16px; }
    .lr-name { color: var(--blue); font-weight: 600; }
  `]
})
export class LeftSidebarComponent implements OnInit, OnDestroy {
  scoreboard: ScoreboardItem[] = [];
  myId = '';
  hint = 'Think carefully about all the letters…';
  reactions: any[] = [];
  emojis = ['🔥','👏','😮','💯','⚡','🎯','😤','🤯'];
  maxScore = 1;

  private subs = new Subscription();
  constructor(private state: GameStateService, private room: GameRoomService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.subs.add(this.room.myCustomerId$.subscribe(id => { this.myId = id; this.cdr.markForCheck(); }));
    this.subs.add(this.room.state$.subscribe(s => {
      if (s) {
        this.scoreboard = this.room.getScoreboard();
        this.maxScore = Math.max(1, ...this.scoreboard.map(p => p.score));
        this.cdr.markForCheck();
      }
    }));
    this.subs.add(this.state.category$.subscribe(c => {
      this.hint = c ? `Category: ${c}` : 'Think carefully about all the letters…';
      this.cdr.markForCheck();
    }));
    this.subs.add(this.state.reactions$.subscribe(r => { this.reactions = r; this.cdr.markForCheck(); }));
  }

  react(emoji: string) { this.state.triggerReaction(emoji); }
  barPct(score: number) { return Math.max(5, Math.round((score / this.maxScore) * 100)); }
  avatarGrad(i: number) {
    const gs = ['linear-gradient(135deg,#0e2d5e,#1a4f8c)','linear-gradient(135deg,#2e0e5e,#4f1a8c)','linear-gradient(135deg,#0e4020,#1a8c40)','linear-gradient(135deg,#5e2e0e,#8c4f1a)','linear-gradient(135deg,#0e3050,#1a5080)'];
    return gs[i % gs.length];
  }
  trackPlayer(_: number, p: any) { return p.customerId || p.n; }
  trackReaction(_: number, r: any) { return r.id; }
  ngOnDestroy() { this.subs.unsubscribe(); }
}
