/* GOD FALL 엔진: 사용자 확정 조작(조이스틱·공격·점프), 물리 충돌, 소리, 조작 UI. 프로토타입 v3에서 그대로 옮겼다. 내용 변경은 play.js에서 한다 */
'use strict';

/* ───── 조작 레이아웃: 사용자 PPT(폰 578×993) 값 ───── */
const PPT = {
  phoneW: 578, phoneH: 993,
  stick:  { left: 103, bottom: 121, knobR: 41 },
  zone:   { x0: .043, x1: .300, y0: .107, y1: .967 },   // 조이스틱이 나타날 수 있는 x 범위(그대로)
  touch:  { x0: 0, x1: .56 },                            // 조이스틱을 잡을 수 있는 x 범위: 화면 가운데까지 넓힌다(2026-11-06)
  // 2026-11-12 v30: 공격 버튼을 없애고 점프 버튼 하나로 합쳤다(v30.1: 점프 뒤 누르고 있으면 공격). 예전 공격 자리(right 188, bottom 123)보다 오른쪽으로 56, 살짝 아래로 3.
  // 판정: 버튼 반지름의 1.3배 원 + 버튼 왼쪽 끝(1.05r)·위(1.45r)부터 화면 오른쪽 끝·아래 끝까지의 빈 곳 전부(조이스틱 영역 밖만)
  btn: { right: 132, bottom: 120, r: 70, hitR: 1.3, ext: { left: 1.05, up: 1.45 } },
};
const STICK_RADIUS_RATIO = 2.45, STICK_DEAD_PX = 6;
/* 테스트용 키. 화면에 글자로 쓰지 않는다(나중에 바꿀 값) */
const KEYMAP = { KeyA: 'l', KeyD: 'r', KeyO: 'a', KeyP: 'j' };

/* ───── 조작감 수치(⚙ 패널에서 바꿔 볼 수 있다) ─────
   단위: 세계 폭 360 기준. 다운웰 측정값(논리 폭 162)에 2.2배를 곱한 값이 시작점이다 */
const TUNE_DEFAULT = {
  run: 235,          // 좌우 속도. 다운웰처럼 거의 즉시 도달
  accel: 9000,       // 가속. 클수록 미끄러지지 않는다
  grav: 1500,
  maxFall: 560,      // 다운웰 빠른 낙하 200~320 논리px/초
  jumpV: 707,        // v31(2026-11-12): 점프 1회로 줄이며 높이 +30%(속도 ×√1.3 = 620→707). 예전 약 3칸 → 약 4칸
  airAdd: .82,       // 공중 점프: 상승 중 더해지는 비율 → 더 높이 간다
  airCap: 1.15,      // 공중 점프 최대 상승 속도 비율. 크면 빠른 2회가 느린 3회보다 높아진다
  // v31: 점프는 1회(날개 신발이면 2회). 게이지는 남은 점프 칸 표시일 뿐 공중에서 차지 않는다 — 땅에 닿거나 적을 밟으면 다시 찬다(refill)
  fireEvery: .12,    // 다운웰 머신건 측정값
  stompV: 430, stompHoldV: 600,
};
const TUNE_UI = [
  ['run', '좌우 속도', 150, 340, 5], ['grav', '중력', 900, 2400, 50], ['maxFall', '최대 낙하', 300, 800, 10],
  ['jumpV', '점프 힘', 400, 860, 10], ['airAdd', '공중 점프 추가', .4, 1.2, .02], 
  ['stompV', '밟기 반동', 250, 700, 10], ['fireEvery', '발사 간격', .06, .24, .01],
];
const T = Object.assign({}, TUNE_DEFAULT);
try { const saved = JSON.parse(localStorage.getItem('gf_tune') || '{}'); delete saved.gaugeRegen; delete saved.jumpV; delete saved.recoil; delete saved.recoilFall; Object.assign(T, saved); } catch (e) {}

const HAND_X = 6;   // 던지는 손의 가로 위치(세계 단위)
// v31: 점프 횟수 = 1(날개 신발 +1). 게이지 한 칸 = 점프 1회
const jumpMax = () => 1 + (typeof has === 'function' && has('wings') ? 1 : 0), gaugeCost = () => 100 / jumpMax();
const COYOTE = .08, BUFFER = .11;
const HOLD_FIRE = .12;   // v30.4: 점프 상태로 공중에서 눌러 바로 뛴 누르기를 이만큼(초) 넘게 누르고 있으면 그때부터 공격(짧은 탭은 점프만). 못 뛴 누르기(게이지 없음)는 바로 공격
const WORLD_W = 360, TILE = 40, COLS = 9;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const approachSnap = (v, target, rate, dt, eps = .004) => {
  const n = v + (target - v) * (1 - Math.exp(-rate * dt));
  return Math.abs(n - target) < eps ? target : n;
};
const $ = id => document.getElementById(id);
const stage = $('stage'), cv = $('c'), ctx = cv.getContext('2d');
const PX = 3;
const IMG = {};
const ok = im => im && im.complete && im.naturalWidth > 0;
/* 모바일 네트워크 실패 대비: 그림은 두 번 더 받아 보고, 끝내 깨진 그림은 그리지 않고 건너뛴다 */
const loadImg = (key, src) => { if (IMG[key]) return IMG[key]; const packed = window.GF_PACK && window.GF_PACK[src]; if (packed) src = packed; const im = new Image(); let tries = 0; im.onerror = () => { if (tries++ < 2) setTimeout(() => { im.src = packed ? src : `${src}?r=${tries}`; }, 700 * tries); }; im.src = src; IMG[key] = im; return im; };
const rawDrawImage = ctx.drawImage.bind(ctx);
ctx.drawImage = (im, ...a) => { if (im && im.tagName === 'IMG' && !(im.complete && im.naturalWidth > 0)) return; rawDrawImage(im, ...a); };
const FONT = '"Jua","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';

/* ───── 소리: Web Audio 합성. 타격감의 절반이라 프로토타입부터 넣는다 ───── */
const sfx = {
  ctx: null, master: null, muted: false, last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = .5; const lim = this.ctx.createDynamicsCompressor(); lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .12; this.master.connect(lim); lim.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  tone(type, f0, f1, dur, vol = .3, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol = .3, cut = 2000, delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + delay;
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = cut;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  limit(k, ms) { const n = performance.now(); if (n - (this.last[k] || 0) < ms) return false; this.last[k] = n; return true; },
  shot() { this.noise(.07, .15, 7000); this.tone('triangle', 1300, 520, .05, .1); },   // 편지가 바람을 가르는 소리
  shotOf(k) {
    if (k === 'letter') this.shot();
    else if (k === 'arrow') { this.noise(.05, .14, 9000); this.tone('triangle', 1700, 700, .06, .12); }
    else if (k === 'wine') { this.tone('sine', 300, 700, .09, .16); this.noise(.06, .08, 1800); }
    else if (k === 'bomb') { this.tone('square', 160, 60, .14, .3); this.noise(.12, .22, 900); }
    else if (k === 'soul') { this.tone('sine', 620, 980, .1, .13); this.tone('triangle', 310, 490, .1, .06); }
    else if (k === 'bolt') { this.noise(.05, .22, 9500); this.tone('sawtooth', 1500, 300, .06, .11); }
  },
  boom() { if (this.limit('bm', 50)) { this.noise(.2, .34, 1400); this.tone('sine', 120, 36, .2, .42); } },
  bigBoom() { this.noise(.5, .5, 1200); this.tone('sine', 90, 26, .6, .7); this.tone('square', 180, 40, .3, .24); },
  bossHit() { this.tone('square', 180, 90, .07, .22); },
  roar() { this.tone('sawtooth', 110, 46, .8, .46); this.tone('square', 74, 40, .9, .3); this.noise(.7, .22, 700); },
  rumble() { this.tone('sine', 56, 34, .8, .56); this.noise(.8, .16, 300); },
  spit() { if (this.limit('sp', 70)) { this.tone('sine', 240, 520, .08, .2); this.noise(.05, .1, 2000); } },
  zap() { if (this.limit('z', 50)) { this.noise(.08, .2, 8000); this.tone('sawtooth', 1200, 200, .08, .12); } },
  door() { this.tone('sine', 300, 900, .18, .2); this.tone('triangle', 600, 1500, .2, .1, .04); },
  buy() { [0, .06, .12, .2].forEach((d, i) => this.tone('square', 700 * (1 + i * .2), 800 * (1 + i * .2), .08, .13, d)); },
  tap() { this.tone('triangle', 900, 700, .04, .12); },
  equip() { this.tone('square', 300, 600, .08, .16); this.noise(.06, .14, 3500); this.tone('triangle', 1200, 1600, .08, .08, .05); },
  upgrade() { [0, .05, .1].forEach((d, i) => this.tone('triangle', 800 * (1 + i * .3), 1000 * (1 + i * .3), .09, .16, d)); },
  start() { [0, .08, .16, .26].forEach((d, i) => this.tone('square', 392 * Math.pow(1.26, i), 400 * Math.pow(1.26, i), .12, .14, d)); },
  cardOpen() { this.tone('sine', 200, 500, .22, .2); this.noise(.2, .08, 2000); },
  cardTick() { if (this.limit('ct', 70)) this.tone('square', 1100, 900, .02, .05); },
  cardLock(t) { this.tone('square', 500 + t * 220, 760 + t * 300, .12, .16); this.noise(.08, .14, 5000); },
  cardOpen2() { this.noise(.1, .1, 3500); },
  // 상자 두구두구: 갈수록 높고 빨라지는 북소리
  drum(i) { this.tone('triangle', 90 + i * 14, 60 + i * 10, .12, .3); this.noise(.06, .18, 900 + i * 260); },
  // 등급이 오를 때: 단계가 높을수록 높고 길고 화려하다
  cardUp(s) { this.tone('triangle', 420 + s * 180, 900 + s * 320, .16 + s * .05, .22); this.tone('sine', 840 + s * 360, 1700 + s * 500, .1 + s * .06, .12); this.noise(.12 + s * .05, .1 + s * .04, 4200 + s * 900); if (s === 3) this.tone('square', 1320, 2640, .35, .08); },
  setMute(m) { this.muted = m; if (typeof Meta !== 'undefined') { Meta.s.opt.mute = m; Meta.save(); } if (this.bgmGain) this.bgmGain.gain.value = m ? 0 : .34; if (this.bgmEl) this.bgmEl.volume = m ? 0 : .34; },
  /* 배경음: 앞뒤를 겹쳐 만든 파일을 버퍼로 반복한다(인코더 공백을 건너뛴다). 곡이 바뀌면 교차로 줄인다 */
  bgmCache: {}, bgmNow: null, bgmSrc: null, bgmGain: null, bgmWant: null,
  async bgmFor(kind, biome) {
    const name = kind === 'lobby' ? 'lobby' : kind === 'boss' ? 'boss' : biome;
    this.bgmWant = name;
    if (!this.ctx || this.bgmNow === name) return;
    if (!this.bgmGain) { this.bgmGain = this.ctx.createGain(); this.bgmGain.gain.value = this.muted ? 0 : .34; this.bgmGain.connect(this.ctx.destination); }
    let buf = this.bgmCache[name];
    if (!buf) {
      try { const r = await fetch(`assets/bgm/${name}.mp3`), ab = await r.arrayBuffer(); buf = this.bgmCache[name] = await this.ctx.decodeAudioData(ab); }
      catch (e) {
        // 파일을 직접 못 읽는 환경: audio 태그로 반복한다
        if (this.bgmEl) this.bgmEl.pause();
        try { const el = new Audio(`assets/bgm/${name}.mp3`); el.loop = true; el.volume = this.muted ? 0 : .34; el.play().catch(() => {}); this.bgmEl = el; this.bgmNow = name; } catch (e2) {}
        return;
      }
    }
    if (this.bgmWant !== name) return;
    const c = this.ctx, t = c.currentTime;
    if (this.bgmSrc) { const old = this.bgmSrc; old.fade.gain.setValueAtTime(1, t); old.fade.gain.linearRampToValueAtTime(0, t + .5); old.stop(t + .55); }
    const src = c.createBufferSource(), f = c.createGain(); src.buffer = buf; src.loop = true; src.loopStart = .06; src.loopEnd = buf.duration - .06; src.fade = f;
    f.gain.setValueAtTime(0, t); f.gain.linearRampToValueAtTime(1, t + .6); src.connect(f); f.connect(this.bgmGain); src.start(t, .06);
    this.bgmSrc = src; this.bgmNow = name;
  },
  flap() { this.noise(.1, .17, 2600); this.tone('sine', 240, 420, .08, .08); },   // 모자 날개 퍼덕임
  paper() { if (this.limit('pp', 40)) this.noise(.04, .12, 4200); },
  jump(n) { this.tone('square', 300 + n * 140, 620 + n * 200, .11, .16); },
  empty() { if (this.limit('e', 200)) this.tone('square', 150, 110, .05, .14); },
  fizzle() { if (this.limit('f', 180)) this.tone('sawtooth', 190, 90, .09, .12); },
  land() { if (this.limit('l', 90)) this.noise(.05, .16, 700); },
  stomp(combo = 0) { const k = 1 + Math.min(combo, 24) * .03; this.tone('square', 240 * k, 60, .12, .4); this.noise(.12, .36, 2600); this.tone('sine', 110, 40, .16, .5); this.tone('square', 900 * k, 1400 * k, .08, .12, .03); },
  kill(combo = 0) { if (this.limit('k', 26)) { const k = 1 + Math.min(combo, 24) * .035; this.noise(.14, .3, 3400); this.tone('square', 340 * k, 70, .12, .22); this.tone('sine', 150, 46, .12, .34); this.tone('triangle', 1400 * k, 1900 * k, .05, .09, .015); } },
  hit() { if (this.limit('h', 40)) { this.tone('square', 640, 300, .04, .12); this.noise(.04, .14, 5000); } },
  ping() { if (this.limit('p', 60)) this.tone('triangle', 1500, 1100, .05, .12); },
  brk() { if (this.limit('b', 40)) this.noise(.13, .26, 1500); },
  gem(chain) { if (this.limit('g', 28)) this.tone('sine', 900 + Math.min(chain, 100) * 9, 1300 + Math.min(chain, 100) * 9, .05, .09); },
  hurt() { this.tone('sawtooth', 300, 60, .24, .34); this.noise(.16, .3, 1200); },
  reward() { [0, .07, .14].forEach((d, i) => this.tone('square', 620 * (1 + i * .25), 660 * (1 + i * .25), .09, .14, d)); },
  over() { this.tone('sawtooth', 300, 40, .7, .3); },
  card() { this.tone('square', 660, 990, .1, .16); },
};

/* ───── 화면 치수 ───── */
const view = { W: 0, H: 0, dpr: 1, s: 1, worldH: 0, safeT: 0, safeB: 0, u: 1 };
const ui = { stickHome: { x: 0, y: 0 }, knobR: 0, baseR: 0, travel: 0, zone: {}, btn: { x: 0, y: 0, r: 0 }, attack: null, jumpCenter: null, jumpTop: { x: 0, y: 0 } };
var layout = function () {
  const vw = innerWidth, vh = innerHeight, W = Math.min(vw, Math.round(vh * 9 / 16)), H = vh;
  stage.style.width = W + 'px';
  const m = getComputedStyle($('measure'));
  view.safeT = parseFloat(m.paddingTop) || 0; view.safeB = parseFloat(m.paddingBottom) || 0;
  view.W = W; view.H = H; view.dpr = Math.min(devicePixelRatio || 1, 2.5);
  view.s = W / WORLD_W; view.worldH = H / view.s;
  cv.width = Math.round(W * view.dpr); cv.height = Math.round(H * view.dpr);
  const u = view.u = W / PPT.phoneW;
  ui.knobR = PPT.stick.knobR * u; ui.baseR = ui.knobR * STICK_RADIUS_RATIO; ui.travel = ui.baseR - ui.knobR;
  ui.stickHome.x = PPT.stick.left * u; ui.stickHome.y = H - PPT.stick.bottom * u - view.safeB;
  ui.zone = { x0: W * PPT.touch.x0, x1: W * PPT.touch.x1, y0: H * PPT.zone.y0, y1: H * PPT.zone.y1, sx0: W * PPT.zone.x0, sx1: W * PPT.zone.x1 };
  const b = ui.btn; b.x = W - PPT.btn.right * u; b.y = H - PPT.btn.bottom * u - view.safeB; b.r = PPT.btn.r * u;
  ui.attack = ui.jumpCenter = b; ui.jumpTop = { x: b.x, y: b.y - b.r };   // 예전 이름(시험·안내 글자 자리)도 같은 버튼을 가리킨다
  input.resetStickVisual();
};

/* ───── 입력 ───── */
const input = {
  ptr: new Map(), axis: 0, attackHeld: false, jumpHeld: false, jumpEdge: false, attackEdge: false,
  stick: { id: null, ox: 0, oy: 0, dx: 0, knobX: 0, knobY: 0, baseX: 0, baseY: 0, baseAlpha: 0, pop: 0, dirL: 0, dirR: 0, centerX: 0, centerY: 0 },
  keys: { l: false, r: false, a: false, j: false }, blockUntil: 0,
  resetStickVisual() { const s = this.stick; if (s.id !== null) return; s.knobX = s.centerX = s.baseX = ui.stickHome.x; s.knobY = s.centerY = s.baseY = ui.stickHome.y; },
  inZone(x, y) { const z = ui.zone; return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1; },
  hitJump(x, y, pad = 0) {
    const b = ui.btn, B = PPT.btn; if (Math.hypot(x - b.x, y - b.y) <= b.r * B.hitR + pad) return true;
    return x > ui.zone.x1 && x >= b.x - b.r * B.ext.left - pad && y >= b.y - b.r * B.ext.up - pad;
  },
  down(e) {
    sfx.init();
    if (performance.now() < this.blockUntil || game.state !== 'play') return;
    const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let role = null;
    if (this.hitJump(x, y)) role = 'jump';
    else if (this.stick.id === null && this.inZone(x, y)) role = 'stick';
    if (!role) return;
    this.ptr.set(e.pointerId, { role, x, y });
    if (role === 'stick') this.beginStick(e.pointerId, x, y);
    else { this.jumpEdge = true; btnAnim.ring = 1; this.syncButtons(); }
  },
  move(e) {
    const p = this.ptr.get(e.pointerId); if (!p) return;
    const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    p.x = x; p.y = y;
    if (p.role === 'stick') this.stick.dx = x - this.stick.ox;
  },
  up(e) { const p = this.ptr.get(e.pointerId); if (!p) return; this.ptr.delete(e.pointerId); if (p.role === 'stick') this.endStick(); else this.syncButtons(); },
  beginStick(id, x, y) {
    // 화면 맨 왼쪽 끝(16px 안)에 엄지를 대면 더 밀 자리가 없으므로, 시작점을 16px로 잡아 그 자리 그대로 왼쪽 입력이 되게 한다(2026-11-07)
    const s = this.stick; s.id = id; s.ox = Math.max(x, 16); s.oy = y; s.dx = x - s.ox;
    const ax = clamp(x, ui.knobR + 3, Math.max(ui.knobR + 3, ui.zone.sx1)), ay = clamp(y, ui.knobR + 3, view.H - ui.knobR - 3 - view.safeB * .5);
    s.centerX = s.baseX = s.knobX = ax; s.centerY = s.baseY = s.knobY = ay; s.baseAlpha = .35; s.pop = 0;
  },
  endStick() { const s = this.stick; s.id = null; s.dx = 0; s.centerX = ui.stickHome.x; s.centerY = ui.stickHome.y; },
  syncButtons() { let j = false; for (const p of this.ptr.values()) if (p.role === 'jump') j = true; this.attackHeld = false; this.jumpHeld = j; },
  clearAll() { this.ptr.clear(); this.attackHeld = this.jumpHeld = this.jumpEdge = this.attackEdge = false; if (this.stick.id !== null) this.endStick(); this.keys.l = this.keys.r = this.keys.a = this.keys.j = false; },
  update(dt) {
    const s = this.stick; let axis = 0;
    if (s.id !== null) {
      const dx = s.dx, leftReach = Math.max(14, Math.min(ui.travel, s.ox - 2)), reach = dx < 0 ? leftReach : ui.travel;
      const dead = Math.min(STICK_DEAD_PX, reach * .3), mag = clamp((Math.abs(dx) - dead) / (reach - dead), 0, 1);
      axis = Math.sign(dx) * Math.pow(mag, .55);   // 살짝만 밀어도 빠르게. 끊어 누르는 다운웰 손맛
      s.knobX = s.centerX + clamp(dx, -ui.travel, ui.travel); s.knobY = s.centerY; s.baseX = s.centerX; s.baseY = s.centerY;
      s.baseAlpha = approachSnap(s.baseAlpha, 1, 22, dt); s.pop = approachSnap(s.pop, 1, 26, dt);
    } else {
      const k = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0); if (k) axis = k;
      s.knobX = approachSnap(s.knobX, ui.stickHome.x + k * ui.travel * .9, 24, dt, .3);
      s.knobY = approachSnap(s.knobY, ui.stickHome.y, 24, dt, .3);
      s.baseAlpha = approachSnap(s.baseAlpha, k ? 1 : 0, k ? 22 : 18, dt);
      if (k) { s.baseX = ui.stickHome.x; s.baseY = ui.stickHome.y; s.pop = 1; }
    }
    this.axis = axis;
    const on = Math.min(Math.abs(axis) * 2.2, 1);
    s.dirL = approachSnap(s.dirL, axis < 0 ? on : 0, 20, dt); s.dirR = approachSnap(s.dirR, axis > 0 ? on : 0, 20, dt);
  },
};
for (const [t, fn] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'], ['pointercancel', 'up'], ['lostpointercapture', 'up']])
  cv.addEventListener(t, e => { e.preventDefault(); input[fn](e); }, { passive: false });
for (const t of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'dblclick', 'contextmenu']) cv.addEventListener(t, e => e.preventDefault(), { passive: false });
addEventListener('blur', () => input.clearAll());
document.addEventListener('visibilitychange', () => { if (document.hidden) { input.clearAll(); if (sfx.ctx) sfx.ctx.suspend(); if (game.state === 'play' && typeof UI !== 'undefined') UI.pause(); } else if (sfx.ctx) sfx.ctx.resume(); });
addEventListener('resize', () => layout()); addEventListener('orientationchange', () => layout());
addEventListener('keydown', e => {
  sfx.init();
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  // 모달: 왼쪽·오른쪽으로 고르고 공격 키로 결정
  if (game.state !== 'play') { modalKey(k); return; }
  if (k === 'j' && !input.keys.j) { input.jumpEdge = true; btnAnim.ring = 1; }
  if (k === 'a' && !input.keys.a) input.attackEdge = true;   // O 키 = 문·좌판·휴식 물건 쓰기(시험용). 버튼으로는 그 앞 바닥에서 점프 버튼
  input.keys[k] = true;
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) input.keys[k] = false; });

/* ───── 난수 ───── */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ───── 지형: 칸 격자 ───── */
const EMPTY = 0, HARD = 1, BREAK = 2, ONEWAY = 3, SPIKE = 4;
const lvl = { rows: 0, grid: null, hp: null, at(c, r) { if (c < 0 || c >= COLS) return HARD; if (r < 0 || r >= this.rows) return EMPTY; return this.grid[r * COLS + c]; }, set(c, r, v) { if (c >= 0 && c < COLS && r >= 0 && r < this.rows) this.grid[r * COLS + c] = v; } };
const isSolid = t => t === HARD || t === BREAK || t === SPIKE;

/* ───── 상태 ───── */
const game = {
  state: 'title', t: 0, wave: 1, seed: 7, rand: Math.random,
  enemies: [], jars: [], shards: [], bullets: [], fx: [], popups: [], dust: [], decor: [],
  levelH: 0, cam: 0, kick: 0, shake: 0, hitStop: 0, flash: 0, portal: null,
  cards: new Set(), choiceBonus: 0, kills: 0, maxCombo: 0, shardTotal: 0, god: false, p: null,
  stats: { jumps: 0 },
};
const has = id => game.cards.has(id);
function newPlayer() {
  return {
    x: WORLD_W / 2, y: 40, vx: 0, vy: 0, w: 20, h: 34, face: 1, onGround: false,
    hp: 100, maxHp: 100, ammo: 8, maxAmmo: 8, gauge: 100, jumps: 0, gaugeFlash: 0,
    coyote: 0, buffer: 0, fireT: 0, inv: 0, combo: 0, shards: 0, gemChain: 0, gemT: 0, high: false,
    attackPose: 0, throwT: 0, shotN: 0, hurtT: 0, landT: 0, tilt: 0, flip: -1, breath: 0, glide: 3, squash: 0, emptyT: 0, spin: 0, walk: 0,
  };
}
$('gear').onclick = () => $('tools').classList.toggle('on');
$('optGod').onchange = e => { game.god = e.target.checked; };
$('optMute').onchange = e => { sfx.muted = e.target.checked; };
(function buildTuner() {
  const box = $('tuner');
  for (const [key, label, min, max, step] of TUNE_UI) {
    const row = document.createElement('label');
    row.className = 'tn';
    const fmt = v => (step < 1 ? (+v).toFixed(2) : Math.round(v));
    row.innerHTML = `<span>${label}</span><input type="range" id="tn_${key}" min="${min}" max="${max}" step="${step}" value="${T[key]}"><b>${fmt(T[key])}</b>`;
    const inp = row.querySelector('input'), val = row.querySelector('b');
    inp.oninput = () => { T[key] = +inp.value; val.textContent = fmt(T[key]); try { localStorage.setItem('gf_tune', JSON.stringify(T)); } catch (e) {} };
    box.appendChild(row);
  }
  $('tnReset').onclick = () => {
    Object.assign(T, TUNE_DEFAULT);
    try { localStorage.removeItem('gf_tune'); } catch (e) {}
    for (const [key, , , , step] of TUNE_UI) { const i = $('tn_' + key); i.value = T[key]; i.nextElementSibling.textContent = step < 1 ? (+T[key]).toFixed(2) : Math.round(T[key]); }
  };
})();

/* ───── 이펙트 ─────
   헤르메스의 무기는 바람에 실어 던지는 날개 편지다. 총구 불꽃 대신 바람·깃털·종이로 통일한다 */
function puff(x, y, n = 3, spread = 12, r = 6) {
  for (let i = 0; i < n; i++) game.fx.push({ type: 'puff', x: x + (i - (n - 1) / 2) * spread * .55, y: y - Math.random() * 7, vx: (i - (n - 1) / 2) * (38 + Math.random() * 44), vy: -4 - Math.random() * 38, r: r * (.5 + Math.random() * .75), t: 0, life: .2 + Math.random() * .09 });
}
function gust(x, y, r = 30) { game.fx.push({ type: 'gust', x, y, r, t: 0, life: .22 }); }
function feathers(x, y, n, sp = 90) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    game.fx.push({ type: 'spr', name: Math.random() < .5 ? 'fx_feather1' : 'fx_feather2', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6 - 20, g: 110, drag: 4, rot: Math.random() * 6, vr: (Math.random() - .5) * 7, w: 10 + Math.random() * 3, flutter: 22, ph: Math.random() * 6, t: 0, life: .55 + Math.random() * .35 });
  }
}
function paperBits(x, y, n = 2) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.6, sp = 90 + Math.random() * 120;
    game.fx.push({ type: 'spr', name: 'fx_scrap', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 520, drag: 1.6, rot: Math.random() * 6, vr: (Math.random() - .5) * 16, w: 6 + Math.random() * 3, t: 0, life: .3 + Math.random() * .15 });
  }
  if (Math.random() < .3) game.fx.push({ type: 'spr', name: 'fx_seal', x, y, vx: (Math.random() - .5) * 120, vy: -110, g: 700, drag: 1, rot: 0, vr: 12, w: 6, t: 0, life: .34 });
}
// 그림 조각: 블록·항아리 그림을 그대로 잘라 날린다(같은 질감)
function popup(x, y, text, col = '#fff', big = false) { game.popups.push({ x, y, text, col, t: 0, big }); }
function sparks(x, y, n, col, sp = 150, life = .35, r = 2.4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (.3 + Math.random());
    game.fx.push({ type: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: life * (.5 + Math.random() * .7), r: r * (.6 + Math.random() * .8), col, g: 400 });
  }
}
function chunks(x, y, n, cols, sp = 220, size = 4.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (.4 + Math.random());
    game.fx.push({ type: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, t: 0, life: .55 + Math.random() * .3, r: size * (.6 + Math.random() * .8), rot: Math.random() * 6, vr: (Math.random() - .5) * 18, col: cols[i % cols.length] });
  }
}
/* piece: 한 알의 값을 정할 때(루비 광맥 = 5, 작은 루비 그림). 없으면 10짜리 황금과 2짜리 루비로 나눈다 */
function spawnShards(x, y, value, piece) {
  let left = value;
  while (left > 0) {
    const v = piece ? Math.min(piece, left) : left >= 10 ? 10 : 2; left -= v;
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, sp = 150 + Math.random() * 190;
    game.shards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v, t: 0 });
  }
}
/* ───── 충돌 ───── */
function moveX(p, dx) {
  p.x += dx;
  const left = p.x - p.w / 2, right = p.x + p.w / 2, r0 = Math.floor((p.y - p.h / 2 + 2) / TILE), r1 = Math.floor((p.y + p.h / 2 - 2) / TILE);
  if (dx > 0) { const c = Math.floor(right / TILE); for (let r = r0; r <= r1; r++) if (isSolid(lvl.at(c, r))) { p.x = c * TILE - p.w / 2 - .01; p.vx = 0; return; } }
  else if (dx < 0) { const c = Math.floor(left / TILE); for (let r = r0; r <= r1; r++) if (isSolid(lvl.at(c, r))) { p.x = (c + 1) * TILE + p.w / 2 + .01; p.vx = 0; return; } }
}
function moveY(p, dy) {
  const before = p.y + p.h / 2; p.y += dy;
  const left = p.x - p.w / 2 + 1, right = p.x + p.w / 2 - 1, c0 = Math.floor(left / TILE), c1 = Math.floor(right / TILE);
  if (dy >= 0) {
    const after = p.y + p.h / 2, r = Math.floor(after / TILE), top = r * TILE;
    if (before > top + 1) return null;
    for (let c = c0; c <= c1; c++) {
      const t = lvl.at(c, r);
      if (t === EMPTY) continue;
      p.y = top - p.h / 2; return t;
    }
  } else {
    const head = p.y - p.h / 2, r = Math.floor(head / TILE);
    if (r < 0) return null;
    const lt = isSolid(lvl.at(c0, r)), rt = isSolid(lvl.at(c1, r));
    if (lt || rt) {
      // 머리가 모서리에 살짝 걸리면 옆으로 밀어 준다(걸리는 느낌 제거)
      const nudge = 7;
      if (lt && !rt && (c0 + 1) * TILE - left <= nudge) { p.x += (c0 + 1) * TILE - left + .1; return null; }
      if (rt && !lt && right - c1 * TILE <= nudge) { p.x -= right - c1 * TILE + .1; return null; }
      p.y = (r + 1) * TILE + p.h / 2; p.vy = Math.max(p.vy, 0);
    }
  }
  return null;
}

// 바닥이나 몬스터에 닿으면 탄과 점프가 둘 다 리셋된다
function refill(p) { p.ammo = p.maxAmmo; p.gauge = 100; p.jumps = 0; p.glide = 3; }

/* ───── 1프레임(1/60초) 갱신 ───── */
function fxUpdate(dt) {
  const g = game;
  for (const f of g.fx) {
    f.t += dt;
    if (f.type === 'spr' || f.type === 'bit' || f.type === 'puff') {
      f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; const dr = Math.exp(-(f.drag || 3) * dt); f.vx *= dr; if (f.flutter) { f.x += Math.sin(f.t * 8 + f.ph) * f.flutter * dt; f.vy *= dr; } if (f.vr) f.rot += f.vr * dt;
    } else if (f.type === 'dot' || f.type === 'chunk') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.type === 'chunk' ? 950 : (f.g || 200)) * dt; if (f.vr) f.rot += f.vr * dt; f.vx *= Math.exp(-1.6 * dt); }
  }
  g.fx = g.fx.filter(f => f.t < f.life);
  for (const m of g.popups) m.t += dt;
  g.popups = g.popups.filter(m => m.t < (m.dmg ? .6 : 1));
}

/* ───── 그리기: 세계 ───── */
const wx = x => x * view.s, wy = y => (y - game.cam) * view.s;
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// 칸 경계를 기기 픽셀에 맞춘다
// 탄 = 날개 편지. 날갯짓(펼침·접힘)과 작은 흔들림, 위로 남는 바람 줄기
// 상태 → 프레임. 원본 그림은 왼쪽을 보고 있어 오른쪽으로 갈 때 뒤집는다
function drawFx() {
  const s = view.s;
  for (const f of game.fx) {
    const k = f.t / f.life, x = wx(f.x), y = wy(f.y);
    if (f.type === 'dot') { ctx.fillStyle = f.col; ctx.globalAlpha = 1 - k; const r = f.r * s; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    else if (f.type === 'ring') { ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = (5 * (1 - k) + 1) * s; ctx.beginPath(); ctx.arc(x, y, f.r * s * (.4 + k * .8), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.type === 'burst') {
      // 흰 덩어리: 순간적으로 커졌다가 바로 사라진다
      const rr2 = f.r * s * (k < .4 ? .6 + k : 1 - (k - .4) * .9);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, rr2, 0, 7); ctx.fill();
      if (k > .4) { ctx.fillStyle = f.ink || '#2b1626'; ctx.beginPath(); ctx.arc(x, y, rr2 * (k - .25) * 1.25, 0, 7); ctx.fill(); }
    } else if (f.type === 'line') { ctx.fillStyle = '#fff'; const w = 62 * s * (1 - k * .3), h = 5 * s * (1 - k); ctx.fillRect(x - w / 2, y - h / 2, w, h); }
    else if (f.type === 'gustHand') {
      // 던지는 순간 손끝의 바람: 아래로 벌어지는 작은 호
      const r = (7 + k * 10) * s; ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * .95})`; ctx.lineWidth = (3.4 * (1 - k) + .8) * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(x, y + k * 8 * s, r, r * .42, 0, .15, Math.PI - .15); ctx.stroke();
    } else if (f.type === 'gust') {
      // 발밑으로 퍼지는 바람 고리
      const rx = f.r * s * (.35 + k * .9), ry = rx * .3; ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * .9})`; ctx.lineWidth = (4.5 * (1 - k) + .8) * s; ctx.beginPath(); ctx.ellipse(x, y + k * 7 * s, rx, ry, 0, -.3, Math.PI + .3); ctx.stroke();
      ctx.strokeStyle = `rgba(190,232,255,${(1 - k) * .7})`; ctx.lineWidth = (2.6 * (1 - k) + .5) * s; ctx.beginPath(); ctx.ellipse(x, y + 5 * s + k * 13 * s, rx * .62, ry * .62, 0, -.2, Math.PI + .2); ctx.stroke();
    } else if (f.type === 'puff') {
      // 먼지 구름: 칠한 동그라미 두 겹. 사라질 때 작아진다
      const rr2 = f.r * s * (k < .25 ? .6 + k * 1.6 : 1 - (k - .25) * 1.2), al = (k < .5 ? 1 : (1 - k) / .5) * .85;
      ctx.globalAlpha = al; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, Math.max(.1, rr2), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    } else if (f.type === 'streak') {
      ctx.fillStyle = `rgba(255,255,255,${(1 - k) * .75})`; ctx.fillRect(x - .9 * s, y - f.l * s, 1.8 * s, f.l * s);
    } else if (f.type === 'spr') {
      const im = IMG[f.name]; if (!ok(im)) continue; const w = f.w * s, h = w * im.naturalHeight / im.naturalWidth;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot); ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    } else if (f.type === 'bit') {
      const im = IMG[f.name]; if (!ok(im)) continue; const w = f.w * s, h = f.h * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot); ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, -w / 2, -h / 2, w, h); ctx.restore();
    } else if (f.type === 'chunk') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot); ctx.globalAlpha = 1 - k * k; ctx.fillStyle = f.col; const m = f.r * s; ctx.fillRect(-m, -m * .7, m * 2, m * 1.4); ctx.restore();
    }
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const m of game.popups) {
    if (m.dmg) continue;
    const k = m.t, fs = (m.big ? 17 : 12) * s;
    ctx.font = `${fs}px ${FONT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(10,14,28,.9)';
    const x = clamp(wx(m.x), 80 * s, view.W - 80 * s), y = wy(m.y) - k * 28 * s;
    ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
    ctx.strokeText(m.text, x, y); ctx.fillStyle = m.col; ctx.fillText(m.text, x, y); ctx.globalAlpha = 1;
  }
}

/* ───── HUD ───── */
/* ───── 조작 UI ───── */
function drawStick() {
  const s = input.stick, R = ui.baseR, kr = ui.knobR;
  if (s.baseAlpha > .004) {
    const a = s.baseAlpha, rNow = R * (.88 + .12 * s.pop), x = s.baseX, y = s.baseY;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(200,205,225,.17)'; ctx.beginPath(); ctx.arc(x, y, rNow, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rNow - .75, 0, 7); ctx.stroke();
    for (const [dir, k] of [[-1, s.dirL], [1, s.dirR]]) { if (k < .01) continue; drawCrescent(x, y, rNow, dir, k * a); drawChevron(x, y, rNow, dir, k * a); }
    ctx.globalAlpha = 1;
  }
  const active = s.id !== null || s.baseAlpha > .5, kx = s.knobX, ky = s.knobY;
  ctx.globalAlpha = active ? .96 : .72;
  const kg = ctx.createLinearGradient(kx, ky - kr, kx, ky + kr);
  kg.addColorStop(0, '#8a8f9f'); kg.addColorStop(.5, '#616677'); kg.addColorStop(1, '#3f4354');
  ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, kr, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.34)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(kx, ky, kr - .8, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  for (const [dir, k] of [[-1, s.dirL], [1, s.dirR]]) {
    const ax = kx + dir * kr * .62, h = kr * .19, w = kr * .17;
    ctx.fillStyle = k > .05 ? `rgba(255,232,170,${.55 + k * .45})` : 'rgba(205,209,220,.72)';
    ctx.beginPath(); ctx.moveTo(ax + dir * w, ky); ctx.lineTo(ax - dir * w * .4, ky - h); ctx.lineTo(ax - dir * w * .4, ky + h); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawCrescent(x, y, R, dir, alpha) {
  const span = 1.22, a0 = dir > 0 ? -span : Math.PI - span, a1 = dir > 0 ? span : Math.PI + span;
  const shift = R * .15, inner = Math.sqrt(R * R + shift * shift - 2 * R * shift * Math.cos(span)), cx = x - dir * shift;
  const in0 = Math.atan2(R * Math.sin(a0), x + R * Math.cos(a0) - cx), in1 = Math.atan2(R * Math.sin(a1), x + R * Math.cos(a1) - cx);
  const g = ctx.createLinearGradient(x + dir * R * .55, y, x + dir * R, y);
  g.addColorStop(0, `rgba(255,186,50,${.05 * alpha})`); g.addColorStop(.5, `rgba(255,190,55,${.72 * alpha})`); g.addColorStop(1, `rgba(255,226,130,${alpha})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, a0, a1, false); ctx.arc(cx, y, inner, in1, in0, true); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(255,248,214,${.95 * alpha})`; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, R - .6, dir > 0 ? -span * .8 : Math.PI - span * .8, dir > 0 ? span * .8 : Math.PI + span * .8); ctx.stroke();
}
function drawChevron(x, y, R, dir, alpha) {
  const size = R * .17; let cx = x + dir * (R + size * .85); cx = clamp(cx, size + 3, view.W - size - 3);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [w, c] of [[size * .78, `rgba(110,70,10,${.55 * alpha})`], [size * .44, `rgba(255,243,205,${alpha})`]]) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx - dir * size * .45, y - size); ctx.lineTo(cx + dir * size * .55, y); ctx.lineTo(cx - dir * size * .45, y + size); ctx.stroke();
  }
}
/* 점프 버튼(v30): 금빛 테두리 메달 + 청금석 면 + 날개 도약 무늬. 공격 버튼과 합쳐 점프 상태에서 누르고 있으면 공격한다(v30.1).
   층: 그림자 → 금 테두리 → 게이지 홈(2칸: 왼쪽 반원 1칸 · 오른쪽 반원 2칸, 아래에서 위로 찬다) → 면 → 안쪽 그늘 → 무늬 → 광택 → 눌림 고리.
   문·좌판·휴식 물건 앞 바닥에서는 면이 금빛으로 바뀌고 무늬 대신 할 일(들어가기·사기 등)을 적는다 */
const btnAnim = { j: 0, act: 0, fire: 0, ring: 0, dim: 0, actLab: '' };
function wingPath(cx, cy, f, s) {
  // 한쪽 날개(s=1 오른쪽, -1 왼쪽). f = 면 반지름. 깃 세 갈래가 바깥 위로 뻗는다
  const P = (x, y) => [cx + s * x * f, cy + y * f];
  ctx.moveTo(...P(.07, .12));
  ctx.quadraticCurveTo(...P(.30, .02), ...P(.60, -.30));
  ctx.quadraticCurveTo(...P(.56, -.13), ...P(.47, -.07));
  ctx.quadraticCurveTo(...P(.53, .01), ...P(.43, .08));
  ctx.quadraticCurveTo(...P(.46, .15), ...P(.34, .19));
  ctx.quadraticCurveTo(...P(.20, .24), ...P(.07, .21));
  ctx.closePath();
}
function drawButtons(dt) {
  const b = ui.btn, p = game.p, on = input.jumpHeld || input.keys.j;
  const act = typeof interactNear === 'function' ? interactNear() : null;
  if (act) btnAnim.actLab = act;
  btnAnim.j = approachSnap(btnAnim.j, on ? 1 : 0, 30, dt);
  btnAnim.act = approachSnap(btnAnim.act, act ? 1 : 0, 14, dt);
  btnAnim.fire = approachSnap(btnAnim.fire, p && p.fireGlow > 0 ? 1 : 0, p && p.fireGlow > 0 ? 30 : 8, dt);
  btnAnim.ring = Math.max(0, btnAnim.ring - dt * 3.2);
  const nJ = jumpMax(), gf = p ? clamp(p.gauge / gaugeCost(), 0, nJ) : nJ, canJump = !p || p.jumps < nJ || (p.jumpState && !p.onGround);   // v31: 공중 점프 상태에서는 누르면 공격이라 어둡게 하지 않는다
  btnAnim.dim = approachSnap(btnAnim.dim, canJump || act ? 0 : 1, 12, dt);
  const R = b.r * (1 - .06 * btnAnim.j), x = b.x, y = b.y, fR = R * .72, A = btnAnim.act;
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(4,6,18,.45)'; ctx.beginPath(); ctx.ellipse(x, y + R * .1, R * 1.03, R * 1.01, 0, 0, 7); ctx.fill();
  // 금 테두리: 위가 밝고 아래가 어두운 금속
  const rim = ctx.createLinearGradient(x, y - R, x, y + R);
  rim.addColorStop(0, '#fff3c4'); rim.addColorStop(.32, '#eab955'); rim.addColorStop(.68, '#a9691e'); rim.addColorStop(1, '#5e330c');
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
  // 게이지 홈
  const gR = R * .845, gW = R * .13, gap = .2, span_ = Math.PI - gap * 2, H2 = Math.PI / 2;
  ctx.lineCap = 'butt'; ctx.lineWidth = gW; ctx.strokeStyle = '#120c26'; ctx.beginPath(); ctx.arc(x, y, gR, 0, 7); ctx.stroke();
  for (let i = 0; i < 2; i++) {
    const f = nJ === 1 ? clamp(gf, 0, 1) : clamp(gf - i, 0, 1); if (f <= 0) continue;   // 점프 1회면 양쪽 반원이 함께 한 칸
    const a0 = i ? H2 - gap : H2 + gap, a1 = i ? a0 - span_ * f : a0 + span_ * f, ccw = !!i;
    if (f >= 1) {
      ctx.lineWidth = gW * 1.5; ctx.strokeStyle = 'rgba(110,210,255,.28)'; ctx.beginPath(); ctx.arc(x, y, gR, a0, a1, ccw); ctx.stroke();
      const cg = ctx.createLinearGradient(x, y + gR, x, y - gR); cg.addColorStop(0, '#2f8cf0'); cg.addColorStop(1, '#aef0ff');
      ctx.lineWidth = gW * .78; ctx.strokeStyle = cg; ctx.beginPath(); ctx.arc(x, y, gR, a0, a1, ccw); ctx.stroke();
    } else {
      ctx.lineWidth = gW * .7; ctx.strokeStyle = '#4a7fb4'; ctx.beginPath(); ctx.arc(x, y, gR, a0, a1, ccw); ctx.stroke();
      ctx.fillStyle = '#d8f6ff'; ctx.beginPath(); ctx.arc(x + Math.cos(a1) * gR, y + Math.sin(a1) * gR, gW * .36, 0, 7); ctx.fill();
    }
  }
  // 면: 청금석. 할 일이 있으면 금빛으로 바뀐다
  const fg = ctx.createRadialGradient(x - fR * .25, y - fR * .45, fR * .1, x, y, fR);
  fg.addColorStop(0, '#5f95f6'); fg.addColorStop(.55, '#2a52ad'); fg.addColorStop(1, '#122760');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, fR, 0, 7); ctx.fill();
  if (A > .01) {
    const ag = ctx.createRadialGradient(x - fR * .25, y - fR * .45, fR * .1, x, y, fR);
    ag.addColorStop(0, '#fff0a8'); ag.addColorStop(.55, '#e4a12a'); ag.addColorStop(1, '#7a4508');
    ctx.globalAlpha = A; ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(x, y, fR, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (btnAnim.fire > .01) { ctx.globalAlpha = btnAnim.fire * .3; ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.arc(x, y, fR, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  // 안쪽 그늘(면이 테두리 안으로 들어가 보이게): 위는 어둡고 아래는 밝은 얇은 고리
  const ig = ctx.createLinearGradient(x, y - fR, x, y + fR); ig.addColorStop(0, 'rgba(0,0,0,.55)'); ig.addColorStop(.5, 'rgba(0,0,0,.12)'); ig.addColorStop(1, 'rgba(255,240,200,.35)');
  ctx.lineWidth = R * .045; ctx.strokeStyle = ig; ctx.beginPath(); ctx.arc(x, y, fR - R * .02, 0, 7); ctx.stroke();
  // 무늬
  const ic = 1 - A;
  if (ic > .01) {
    ctx.globalAlpha = ic * (1 - .45 * btnAnim.dim);
    const cy = y + fR * .1;
    ctx.fillStyle = 'rgba(8,20,60,.4)'; ctx.beginPath(); wingPath(x, cy + fR * .06, fR, 1); wingPath(x, cy + fR * .06, fR, -1); ctx.fill();
    const wg = ctx.createLinearGradient(x, cy - fR * .3, x, cy + fR * .25); wg.addColorStop(0, '#ffffff'); wg.addColorStop(1, '#cfe0ff');
    ctx.fillStyle = wg; ctx.beginPath(); wingPath(x, cy, fR, 1); wingPath(x, cy, fR, -1); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const chev = (dy, w) => { ctx.beginPath(); ctx.moveTo(x - fR * .2, cy + dy * fR + fR * .2); ctx.lineTo(x, cy + dy * fR); ctx.lineTo(x + fR * .2, cy + dy * fR + fR * .2); ctx.lineWidth = w; ctx.stroke(); };
    ctx.strokeStyle = 'rgba(8,20,60,.45)'; chev(-.48, fR * .2); ctx.strokeStyle = '#fff'; chev(-.52, fR * .13);
    // 아래로 쏘는 표시: 평소엔 흐리고, 공중에서 쏘는 동안 밝게 깜빡인다
    const fa = .32 + .68 * btnAnim.fire * (.65 + .35 * Math.sin(game.t * 40));
    ctx.globalAlpha = ic * fa; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = fR * .09;
    ctx.beginPath(); ctx.moveTo(x - fR * .12, cy + fR * .4); ctx.lineTo(x, cy + fR * .52); ctx.lineTo(x + fR * .12, cy + fR * .4); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (A > .01) {
    ctx.globalAlpha = A; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.max(13, Math.min(fR * .5, fR * 1.86 / Math.max(2, btnAnim.actLab.length)));   // 글자 15px 안팎, 면 폭 안에 들어가게
    ctx.font = `${fs}px ${FONT}`; ctx.lineJoin = 'round'; ctx.lineWidth = fs * .26; ctx.strokeStyle = 'rgba(90,45,0,.85)';
    ctx.strokeText(btnAnim.actLab, x, y + fR * .06); ctx.fillStyle = '#fffbe8'; ctx.fillText(btnAnim.actLab, x, y + fR * .06);
    // 할 일이 있을 때 바깥으로 퍼지는 금빛 고리(누를 수 있다는 표시)
    const k = (game.t * 1.4) % 1; ctx.globalAlpha = A * (1 - k) * .8; ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = R * .06;
    ctx.beginPath(); ctx.arc(x, y, R * (1 + k * .32), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // 광택: 면 위쪽에 얇은 초승달
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, fR, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.ellipse(x - fR * .1, y - fR * .62, fR * .82, fR * .42, -.12, 0, 7); ctx.fill(); ctx.restore();
  // 점프를 쓸 수 없을 때(게이지 부족)는 면을 어둡게
  if (btnAnim.dim > .01) { ctx.globalAlpha = btnAnim.dim * .38; ctx.fillStyle = '#0a0a1c'; ctx.beginPath(); ctx.arc(x, y, fR, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  // 누른 순간 퍼지는 고리
  if (btnAnim.ring > 0) { const k = 1 - btnAnim.ring; ctx.globalAlpha = btnAnim.ring * .9; ctx.strokeStyle = A > .5 ? '#ffe39a' : '#bff0ff'; ctx.lineWidth = R * .07 * btnAnim.ring + 1; ctx.beginPath(); ctx.arc(x, y, R * (1 + k * .38), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawDebug() {
  const z = ui.zone;
  if ($('optZone').checked) { ctx.fillStyle = 'rgba(255,80,80,.18)'; ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.strokeStyle = 'rgba(255,60,60,.8)'; ctx.lineWidth = 1; ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); }
  if ($('optHit').checked) {
    const b = ui.btn, B = PPT.btn; ctx.strokeStyle = 'rgba(0,255,255,.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * B.hitR, 0, 7); ctx.stroke();
    const ex = Math.max(ui.zone.x1, b.x - b.r * B.ext.left), ey = b.y - b.r * B.ext.up; ctx.strokeRect(ex, ey, view.W - ex, view.H - ey);
    const p = game.p; if (p) { ctx.strokeStyle = '#0f0'; ctx.strokeRect(wx(p.x - p.w / 2), wy(p.y - p.h / 2), p.w * view.s, p.h * view.s); }
  }
}
/* ───── 메인 루프: 물리는 1/60초 고정. 화면 주사율과 상관없이 손맛이 같다 ───── */
const FIXED = 1 / 60;
let last = performance.now(), acc = 0, uiDt = 0;
function frame(now) {
  requestAnimationFrame(frame);   // 맨 앞에 둔다: 아래에서 오류가 나도 게임이 멈추지 않는다
  const dt = Math.min((now - last) / 1000, .1); last = now; acc += dt; uiDt = dt;
  let n = 0;
  if (window.__manual) acc = 0;   // 자동 검증 때 시간을 코드로 돌린다
  while (acc >= FIXED && n < 5) { step(FIXED); acc -= FIXED; n++; }
  if (n === 5) acc = 0;
  render(uiDt);
}
