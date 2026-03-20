import { Injectable, ElementRef } from '@angular/core';

interface Particle { x:number; y:number; sz:number; sp:number; op:number; c:string; dx:number; }
interface FloatLetter { ch:string; x:number; y:number; sz:number; sp:number; op:number; rot:number; rs:number; }
interface Streak { word:string; x:number; y:number; sp:number; sz:number; op:number; fromRight:boolean; }
interface Ripple { x:number; y:number; r:number; op:number; }
interface Orb { rx:number; ry:number; r:number; c:string; }

const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STREAK_WORDS = ['WORD','LEXICON','BLITZ','ANAGRAM','CIPHER','ZEAL','SYNTAX','QUIRK','FLUX','GLITCH','BYTE','ALPHA'];
const ORBS: Orb[] = [
  {rx:.14,ry:.3,r:260,c:'30,8,0'},
  {rx:.86,ry:.72,r:220,c:'30,8,0'},
  {rx:.5,ry:.92,r:180,c:'0,16,55'},
  {rx:.08,ry:.82,r:190,c:'0,12,44'},
  {rx:.92,ry:.15,r:140,c:'0,10,40'},
];

@Injectable({ providedIn: 'root' })
export class CanvasBackgroundService {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private W = 0; private H = 0;
  private raf = 0;
  private streakTimer = 0;
  private particles: Particle[] = [];
  private floats: FloatLetter[] = [];
  private streaks: Streak[] = [];
  private ripples: Ripple[] = [];
  private mx = -999; private my = -999;
  private resizeObs!: ResizeObserver;
  private mouseFn!: EventListener;
  private clickFn!: EventListener;

  init(canvasEl: HTMLCanvasElement) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d')!;
    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(document.documentElement);
    this.mouseFn = (e: Event) => { const m = e as MouseEvent; this.mx = m.clientX; this.my = m.clientY; };
    this.clickFn = (e: Event) => { const m = e as MouseEvent; this.ripples.push({x:m.clientX,y:m.clientY,r:0,op:.45}); };
    window.addEventListener('mousemove', this.mouseFn);
    window.addEventListener('click', this.clickFn);
    this.buildParticles();
    this.buildFloats();
    this.streakTimer = window.setInterval(() => this.spawnStreak(), 2000);
    this.loop();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearInterval(this.streakTimer);
    this.resizeObs?.disconnect();
    window.removeEventListener('mousemove', this.mouseFn);
    window.removeEventListener('click', this.clickFn);
  }

  addRipple(x: number, y: number) { this.ripples.push({x,y,r:0,op:.5}); }

  private resize() {
    this.W = this.canvas.width = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
  }

  private buildParticles() {
    this.particles = Array.from({length:130},()=>this.newPt(true));
  }

  private newPt(init: boolean): Particle {
    return {
      x: Math.random()*this.W,
      y: init ? Math.random()*this.H : this.H+10,
      sz: Math.random()*1.5+0.3,
      sp: Math.random()*.4+.08,
      op: Math.random()*.2+.04,
      c: Math.random()>.5?'0,160,220':'200,100,0',
      dx: (Math.random()-.5)*.22,
    };
  }

  private buildFloats() {
    this.floats = Array.from({length:22},()=>({
      ch: AB[Math.floor(Math.random()*26)],
      x: Math.random()*100, y: Math.random()*100,
      sz: Math.random()*44+14,
      sp: Math.random()*.018+.004,
      op: Math.random()*.032+.008,
      rot: Math.random()*360,
      rs: (Math.random()-.5)*.4,
    }));
  }

  private spawnStreak() {
    this.streaks.push({
      word: STREAK_WORDS[Math.floor(Math.random()*STREAK_WORDS.length)],
      x: -200, y: Math.random()*this.H*.8+this.H*.1,
      sp: Math.random()*.8+.4,
      sz: Math.random()*13+8,
      op: Math.random()*.038+.01,
      fromRight: Math.random()>.5,
    });
  }

  private loop() {
    const c = this.ctx; const W = this.W; const H = this.H;
    c.clearRect(0,0,W,H);
    // base
    const bg = c.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#010408'); bg.addColorStop(.5,'#020609'); bg.addColorStop(1,'#010203');
    c.fillStyle=bg; c.fillRect(0,0,W,H);
    // orbs
    ORBS.forEach(o=>{
      const x=o.rx*W,y=o.ry*H;
      const g=c.createRadialGradient(x,y,0,x,y,o.r);
      g.addColorStop(0,`rgba(${o.c},.13)`); g.addColorStop(1,`rgba(${o.c},0)`);
      c.fillStyle=g; c.beginPath(); c.arc(x,y,o.r,0,Math.PI*2); c.fill();
    });
    // grid
    c.strokeStyle='rgba(0,90,200,.035)'; c.lineWidth=1;
    for(let x=0;x<W;x+=56){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
    for(let y=0;y<H;y+=56){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    // floats
    this.floats.forEach(f=>{
      f.y-=f.sp; f.rot+=f.rs;
      if(f.y<-8){f.y=108;f.ch=AB[Math.floor(Math.random()*26)];}
      c.save();c.translate(f.x/100*W,f.y/100*H);c.rotate(f.rot*Math.PI/180);
      c.font=`900 ${f.sz}px Orbitron,monospace`;
      c.fillStyle=`rgba(0,140,210,${f.op})`;
      c.textAlign='center';c.textBaseline='middle';c.fillText(f.ch,0,0);c.restore();
    });
    // streaks
    for(let i=this.streaks.length-1;i>=0;i--){
      const s=this.streaks[i];
      s.fromRight ? (s.x-=s.sp) : (s.x+=s.sp);
      const gone = s.fromRight ? s.x<-300 : s.x>W+300;
      if(gone){this.streaks.splice(i,1);continue;}
      c.font=`700 ${s.sz}px Rajdhani,sans-serif`;
      c.fillStyle=`rgba(0,180,255,${s.op})`;
      c.textBaseline='middle';
      c.fillText(s.word,s.fromRight?W-s.x:s.x,s.y);
    }
    // particles
    this.particles.forEach(p=>{
      p.y-=p.sp; p.x+=p.dx;
      if(p.y<-5) Object.assign(p,this.newPt(false));
      c.beginPath();c.arc(p.x,p.y,p.sz,0,Math.PI*2);
      c.fillStyle=`rgba(${p.c},${p.op})`;c.fill();
    });
    // mouse glow
    const mg=c.createRadialGradient(this.mx,this.my,0,this.mx,this.my,130);
    mg.addColorStop(0,'rgba(0,140,210,.03)'); mg.addColorStop(1,'rgba(0,140,210,0)');
    c.fillStyle=mg; c.fillRect(0,0,W,H);
    // ripples
    for(let i=this.ripples.length-1;i>=0;i--){
      const r=this.ripples[i]; r.r+=3.5; r.op-=.016;
      if(r.op<=0){this.ripples.splice(i,1);continue;}
      c.beginPath();c.arc(r.x,r.y,r.r,0,Math.PI*2);
      c.strokeStyle=`rgba(0,200,255,${r.op})`;c.lineWidth=1.5;c.stroke();
    }
    this.raf = requestAnimationFrame(()=>this.loop());
  }
}
