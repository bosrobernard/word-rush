import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { GameRoomService } from '../services/game-room.service';
import { LetterTile, AnswerSlot } from '../models/game.models';
import { tileEnter, slotPopIn, shake, buzzPulse, fadeUp } from '../animations/game.animations';

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
    <div *ngFor="let tile of gridTiles; trackBy: trackTile"
         class="p-tile" [class.used]="tile.used"
         @tileEnter
         (click)="onGridTile(tile)"
         [style.animationDelay]="tile.gridIndex! * 80 + 'ms'">
      {{ tile.letter }}
    </div>
  </div>

  <!-- Answer Construction Row -->
  <div class="answer-row" [@shake]="shakeState">
    <div *ngFor="let slot of answerSlots; trackBy: trackSlot"
         class="a-slot"
         [class.active]="slot.active"
         [class.filled]="slot.filled"
         [@slotPopIn]="slot.filled ? 'filled' : 'void'"
         (click)="onRemoveSlot(slot.index)">
      <span *ngIf="slot.filled" class="slot-letter">{{ slot.letter }}</span>
      <span *ngIf="slot.active && !slot.filled" class="slot-cursor"></span>
    </div>
  </div>

  <!-- Letter Bank -->
  <div class="bank">
    <div class="bank-row" *ngFor="let row of bankRows">
      <div *ngFor="let tile of row; trackBy: trackTile"
           class="b-key" [class.used]="tile.used"
           (click)="onBankTile(tile)">
        {{ tile.letter }}
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <button class="btn-submit" (click)="onSubmit()"
    [class.locked]="phase === 'answering'" [disabled]="phase === 'round_result'">
    <span *ngIf="phase !== 'answering'">SUBMIT</span>
    <span *ngIf="phase === 'answering'" class="answering-label">⚡ ANSWERING…</span>
  </button>

  <div class="btn-row">
    <button class="btn-sec" (click)="onClear()">⊘&nbsp; CLEAR</button>
    <button class="btn-sec" (click)="onShuffle()">⇄&nbsp; SHUFFLE</button>
  </div>

  <!-- Buzz button (shown during buzz_window phase) -->
  <button *ngIf="phase === 'buzz_window'" class="btn-buzz" (click)="onBuzz()"
          [@buzzPulse]="'open'" [@fadeUp]>
    ⚡ BUZZ IN
  </button>

  <!-- Round result overlay -->
  <div *ngIf="phase === 'round_result' && roundWinner" class="round-result" @fadeUp>
    <div class="rr-winner">🏆 {{ roundWinner }} got it!</div>
  </div>

</div>
  `,
  styles: [`
    .board { display: flex; flex-direction: column; gap: 11px; }
    .instruct {
      text-align: center; font-family: 'Orbitron', monospace;
      font-size: clamp(9px,1.4vw,12px); font-weight: 700; letter-spacing: 3px;
      color: var(--text); text-shadow: 0 0 14px rgba(0,200,255,.35);
    }
    .puzzle-grid {
      display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
      padding: 13px; background: rgba(0,24,70,.07);
      border: 1px solid rgba(0,140,255,.09); border-radius: 20px;
      transition: border-color .3s, box-shadow .3s;
    }
    .puzzle-grid.buzz-glow {
      border-color: rgba(0,200,255,.35);
      box-shadow: 0 0 24px rgba(0,200,255,.15), inset 0 0 20px rgba(0,200,255,.04);
    }
    .p-tile {
      aspect-ratio: 1;
      background: linear-gradient(145deg,#071428 0%,#030810 100%);
      border: 1.5px solid rgba(0,130,255,.3); border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', monospace; font-size: clamp(26px,7vw,36px); font-weight: 900;
      color: var(--text); cursor: pointer; user-select: none; position: relative;
      box-shadow: 0 0 14px rgba(0,80,200,.12), 0 5px 12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05);
      transition: all .14s;
    }
    .p-tile::after {
      content: ''; position: absolute; inset: 0; border-radius: 13px;
      background: linear-gradient(135deg,rgba(0,160,255,.07),transparent 60%); pointer-events: none;
    }
    .p-tile:hover:not(.used) {
      border-color: var(--blue); transform: translateY(-3px) scale(1.05);
      box-shadow: 0 0 26px var(--blue-glow), 0 0 52px rgba(0,200,255,.1), 0 5px 12px rgba(0,0,0,.5);
      color: var(--blue); text-shadow: 0 0 14px var(--blue);
    }
    .p-tile:active:not(.used) { transform: scale(.94); }
    .p-tile.used { opacity: .18; transform: scale(.9); pointer-events: none; }

    .answer-row {
      display: flex; gap: 7px; justify-content: center; padding: 10px;
      background: rgba(0,8,26,.7); border: 1px solid rgba(0,150,210,.16);
      border-radius: 14px; box-shadow: inset 0 2px 10px rgba(0,0,0,.35);
    }
    .a-slot {
      flex: 1; max-width: 52px; height: 50px;
      background: rgba(0,6,20,.88); border: 1.5px solid rgba(0,160,210,.18); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 700;
      color: var(--blue); text-shadow: 0 0 8px var(--blue); transition: all .18s; cursor: pointer;
      position: relative;
    }
    .a-slot.active {
      border-color: var(--blue);
      box-shadow: 0 0 14px var(--blue-glow), inset 0 0 8px rgba(0,200,255,.05);
      animation: slotPulse 1.4s ease-in-out infinite;
    }
    .a-slot.filled { border-color: rgba(0,200,255,.4); background: rgba(0,55,130,.22); }
    .a-slot.filled:hover { border-color: var(--red); color: var(--red); text-shadow: 0 0 8px var(--red); }
    @keyframes slotPulse { 0%,100%{box-shadow:0 0 10px var(--blue-glow)} 50%{box-shadow:0 0 22px rgba(0,200,255,.65)} }
    .slot-cursor {
      width: 2px; height: 60%; background: var(--blue);
      animation: blink 1s step-end infinite; border-radius: 1px;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

    .bank { background: rgba(2,5,12,.82); border: 1px solid rgba(30,48,72,.4); border-radius: 16px; padding: 10px 7px; }
    .bank-row { display: flex; justify-content: center; gap: 6px; margin-bottom: 6px; }
    .bank-row:last-child { margin-bottom: 0; }
    .b-key {
      width: 42px; height: 42px;
      background: linear-gradient(145deg,#0e1e30,#070f1c);
      border: 1px solid rgba(65,95,135,.48); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700;
      color: var(--text); cursor: pointer; user-select: none;
      box-shadow: 0 2px 6px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.045); transition: all .12s;
    }
    .b-key:hover:not(.used) {
      background: linear-gradient(145deg,#122540,#09172e);
      border-color: rgba(0,180,255,.55);
      box-shadow: 0 0 11px rgba(0,160,255,.28), 0 2px 6px rgba(0,0,0,.4);
      color: var(--blue); transform: translateY(-2px);
    }
    .b-key:active:not(.used) { transform: scale(.89); }
    .b-key.used { opacity: .15; pointer-events: none; }
    @media(min-width:920px) {
      .b-key { width: clamp(36px,4vw,46px); height: clamp(36px,4vw,46px); font-size: clamp(12px,1.5vw,15px); }
    }

    .btn-submit {
      width: 100%; padding: 14px; border: none; border-radius: 30px;
      background: linear-gradient(90deg,#7a3400,#d07800,#7a3400); background-size: 200%;
      font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; letter-spacing: 3px;
      color: #fff; cursor: pointer; position: relative; overflow: hidden;
      box-shadow: 0 0 26px rgba(255,140,0,.55), 0 4px 16px rgba(180,70,0,.35), inset 0 1px 0 rgba(255,255,255,.2);
      transition: all .2s; text-shadow: 0 1px 3px rgba(0,0,0,.3);
    }
    .btn-submit::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
      transform: skewX(-20deg) translateX(-130%); animation: sheen 2.6s ease-in-out infinite;
    }
    @keyframes sheen { 0%{transform:skewX(-20deg) translateX(-130%)} 60%,100%{transform:skewX(-20deg) translateX(280%)} }
    .btn-submit:hover:not(:disabled) { box-shadow: 0 0 40px rgba(255,140,0,.7), 0 4px 20px rgba(180,70,0,.45); transform: translateY(-2px); }
    .btn-submit:active:not(:disabled) { transform: scale(.97); }
    .btn-submit.locked { background: linear-gradient(90deg,#002040,#003060,#002040); box-shadow: 0 0 20px rgba(0,150,255,.3); }
    .btn-submit:disabled { opacity: .5; cursor: not-allowed; }
    .answering-label { animation: blink 0.6s step-end infinite; }

    .btn-row { display: flex; gap: 10px; }
    .btn-sec {
      flex: 1; padding: 11px; border-radius: 30px;
      background: rgba(0,8,24,.7); border: 1.5px solid rgba(0,140,200,.25);
      font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
      color: var(--blue); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all .18s;
    }
    .btn-sec:hover { background: rgba(0,75,175,.2); border-color: var(--blue); box-shadow: 0 0 14px var(--blue-glow); transform: translateY(-1px); }
    .btn-sec:active { transform: scale(.95); }

    .btn-buzz {
      width: 100%; padding: 16px; border: none; border-radius: 30px;
      background: linear-gradient(90deg,#003060,#00aaff,#003060); background-size: 200%;
      font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 900; letter-spacing: 4px;
      color: #fff; cursor: pointer;
      box-shadow: 0 0 40px rgba(0,170,255,.6), 0 0 80px rgba(0,170,255,.2), inset 0 1px 0 rgba(255,255,255,.2);
      animation: buzzAnim 1s ease-in-out infinite alternate;
    }
    @keyframes buzzAnim { 0%{box-shadow:0 0 30px rgba(0,170,255,.5)} 100%{box-shadow:0 0 60px rgba(0,170,255,.9)} }
    .btn-buzz:active { transform: scale(.96); }

    .round-result {
      text-align: center; padding: 14px;
      background: rgba(0,30,60,.6); border: 1px solid rgba(0,200,255,.2); border-radius: 16px;
    }
    .rr-winner { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; color: var(--blue); }
  `]
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

  constructor(private state: GameStateService, private room: GameRoomService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.subs.add(this.state.gridTiles$.subscribe(t => { this.gridTiles = t; this.cdr.markForCheck(); }));
    this.subs.add(this.state.bankTiles$.subscribe(t => {
      const half = Math.ceil(t.length / 2);
      this.bankRows = [t.slice(0, half), t.slice(half)];
      this.cdr.markForCheck();
    }));
    this.subs.add(this.state.answerSlots$.subscribe(s => { this.answerSlots = s; this.cdr.markForCheck(); }));
    this.subs.add(this.state.shakeSlots$.subscribe(v => {
      this.shakeState = v ? 'shake' : 'idle'; this.cdr.markForCheck();
    }));
    this.subs.add(this.state.phase$.subscribe(p => { this.phase = p; this.cdr.markForCheck(); }));
    this.subs.add(this.room.buzzOpen$.subscribe(v => { this.buzzOpen = v; this.cdr.markForCheck(); }));
    this.subs.add(this.state.roundWinner$.subscribe(w => { this.roundWinner = w; this.cdr.markForCheck(); }));
  }

  onGridTile(tile: LetterTile) { this.state.addLetterFromGrid(tile); }
  onBankTile(tile: LetterTile) { this.state.addLetterFromBank(tile); }
  onRemoveSlot(i: number) { this.state.removeSlotAt(i); }
  onClear() { this.state.clearSlots(); }
  onShuffle() { this.state.shuffleBank(); }

  onSubmit() {
    const word = this.state.getAnswerWord();
    const snap = this.room.state$.getValue();
    if (!snap) { this.state.showToast('Not connected to a room', 'error'); return; }
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
    if (e.key === 'Enter') { this.onSubmit(); return; }
    if (e.key === 'Backspace') {
      const filled = this.answerSlots.filter(s => s.filled);
      if (filled.length) this.state.removeSlotAt(filled[filled.length - 1].index);
      return;
    }
    if (e.key === 'Escape') { this.state.clearSlots(); return; }
    const ch = e.key.toUpperCase();
    if (/^[A-Z]$/.test(ch)) {
      const tile = this.state.bankTiles$.getValue().find(t => t.letter === ch && !t.used);
      if (tile) this.state.addLetterFromBank(tile);
    }
  }

  trackTile(_: number, t: LetterTile) { return t.id; }
  trackSlot(_: number, s: AnswerSlot) { return s.index; }

  ngOnDestroy() { this.subs.unsubscribe(); }
}
