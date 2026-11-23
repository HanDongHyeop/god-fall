/* v42 도전 모드(modes.js): 챕터 밖에서 하는 짧은 판. 궁수의 전설 2처럼 챕터를 깨면 하나씩 열리고 하루 횟수가 있다.
   seal 보스 봉인전(사용자 OK): 보스 하나와 2분. 준 피해가 점수. 보스 체력은 바닥나면 다시 차고(그동안 2단계로 사나워진다), 피해를 줄 때마다 카드를 고른다
   eel  심연의 장어(사용자 설계): 아래에서 거대한 장어가 입을 벌리고 올라온다. 주인공은 발판을 밟고 계속 위로 뛰며 아래로 쏜다.
        장어는 느리게/빠르게 튀어올라 물고(붉은 경고), 체력이 줄면 빨라지고 · 탄을 뱉고 · 졸개를 부르고 · 기둥 광선을 쏜다. 발판은 통과 발판뿐이라 걸리적거리지 않는다 */
'use strict';
const MODES = {
  seal: { name: '보스 봉인전', sub: '2분 동안 보스에게 준 피해가 점수', open: 2, tries: 2, time: 120, cardEvery: .8, cards: 6, tier: [100, 250, 500, 900] },   // tier = 보상 단계(보스 체력 대비 %)
  eel: { name: '심연의 장어', sub: '올라오는 장어를 피해 위로 뛰며 쏘아 쓰러뜨리기', open: 3, tries: 2, cardEvery: .14, cards: 6 },
};
/* v47(2026-11-23 사용자 요청): 장어가 올라오는 속도 = 화면이 올라가는 속도. 주인공이 아무리 올라가도 장어는 늘 화면 아래쪽에 보인다(view = 평소 입 끝이 놓이는 화면 높이 비율).
   공격: 통째로 솟기(느리게 높이 slow · 빠르게 낮게 fast) + 얇게 치고 올라오기(stab: 폭 w px ≈ 화면의 1/3, 높이 = 화면의 h배) + 뱉기 · 기둥 광선 · 졸개.
   gapT = 단계별 공격 사이 쉬는 시간, extend = 맨 위에서 이 칸 수 안으로 들어오면 맵을 위로 이어 붙인다 */
const EEL = {
  rows: 420, hpK: 2.8, rise: [62, 78, 96], view: .8, gapT: [3.2, 2.6, 2],
  slow: { h: 290, warn: .95, up: .4 }, fast: { h: 190, warn: .55, up: .13 }, hold: .22, down: .5,
  stab: { w: (WORLD_W - 2 * TILE) / 3 - 6, h: .64, warn: .6, up: .12, hold: .26, down: .32 },   // v50 벽이 없어져 화면이 넓어졌다: 띠 폭 = 화면의 1/3(틈 3px씩)
  bite: 30, spit: 3.2, laser: 4.6, summon: 6, imgW: 1.3, extend: 110, shift: 200,
};
for (const k of ['eel_open', 'eel_bite']) loadImg(k, `assets/mon/${k}.webp`);
const modeToday = () => new Date().toISOString().slice(0, 10);
function modeState(id) { const s = Meta.s; s.modes = s.modes || {}; const m = s.modes[id] || (s.modes[id] = { day: '', n: 0, best: 0 }); if (m.day !== modeToday()) { m.day = modeToday(); m.n = 0; } return m; }
/* v43 디버그 패널의 '뱀장어 모드 열기'(window.__dbgMode.eel): 조건 없이 열리고 하루 횟수도 쓰지 않는다. 저장(깬 챕터 · 오늘 횟수)은 건드리지 않아 잠그면 원래 조건 그대로다 */
const modeDbg = id => !!(window.__dbgMode && window.__dbgMode[id]);
const modeOpen = id => Meta.clearedN() >= MODES[id].open || !!window.__modesOpen || modeDbg(id);
const modeLeft = id => modeDbg(id) ? MODES[id].tries : Math.max(0, MODES[id].tries - modeState(id).n);
const modeChapter = () => clamp(Meta.clearedN() - 1, 0, CHAPTERS - 1);   // 가장 최근에 깬 챕터의 세기로 한다
function startMode(id) {
  if (!modeOpen(id)) return false;
  if (modeLeft(id) <= 0 && !window.__modesOpen) return false;
  const c = modeChapter(); if (!modeDbg(id)) modeState(id).n++; Meta.save(); sfx.init(); sfx.start(); UI.cover();
  if (id === 'seal') startRun({ chapter: c, wave: c * STAGES + STAGES, mode: 'seal', noIntro: true });   // 가장 최근에 깬 챕터의 보스(첫 실행에서 주마다 바뀌는 보스는 내 공격력에 비해 너무 약했다)
  else startRun({ chapter: c, wave: c * STAGES + 1, mode: 'eel', noIntro: true });
  return true;
}
/* 판을 지은 뒤(beginWave) 모드에 맞게 고친다 */
function modeBuild() {
  const g = game, p = g.p;
  g.enemies = []; g.jars = []; g.doors = []; g.hearts = []; g.xpNeed = 0; g.zone = null; g.torches = []; g.clams = []; g.banner = null;   // 챕터 · 판 알림 띠는 띄우지 않는다
  if (g.mode === 'seal') {
    g.seal = { t: MODES.seal.time, dmg: 0, on: false, cards: 0, first: false, max: 0 };
    p.x = WORLD_W / 2; p.y = (g.arenaTop + 1) * TILE + 20; p.vy = 0;   // 바로 보스방으로
    g.cam = Math.max(0, g.levelH + TILE - view.worldH);
  } else if (g.mode === 'eel') {
    const rows = EEL.rows, F = rows - 5; lvl.rows = rows; lvl.grid = new Uint8Array(rows * COLS); lvl.hp = new Float32Array(rows * COLS); g.floorRow = F; g.levelH = (rows - 1) * TILE;
    g.isBossWave = false; g.boss = null; g.rest = null; g.portal = null; g.arenaTop = 0; g.decor = [];
    for (let r = 0; r < rows; r++) { lvl.set(0, r, HARD); lvl.set(COLS - 1, r, HARD); }
    for (let c = 1; c < COLS - 1; c++) lvl.set(c, F, HARD);
    g.eelTop = { c0: 3, r: F - 3, n: 0 }; eelPlats();
    p.x = WORLD_W / 2; p.y = F * TILE - p.h / 2 - 1; p.vx = p.vy = 0; p.onGround = true;
    const base = BOSSES[g.biome.boss], hp = Math.round(DIFF.bossHp(chapterOf(g.wave) * STAGES + STAGES) * base.hpMul * EEL.hpK);
    g.eel = { y: F * TILE + 140, hp, maxHp: hp, phase: 0, t: 0, lungeT: 3, warn: null, lunge: null, off: 0, stabs: [], spitT: 2, laserT: 3, sumT: 4, cards: 0, flash: 0, biteT: 0, chompT: 1, dead: 0, first: false, cols: null, lz: null, last: '' };
    g.cam = Math.max(0, g.levelH + TILE - view.worldH);
  }
}
/* 통과 발판 놓기(g.eelTop에서 위로 이어서): 3칸 위마다 하나, 옆으로는 2칸 안쪽으로만 옮겨 가서 늘 뛰어 닿는다. 12칸마다 넓은 쉼터 */
function eelPlats() {
  const T = game.eelTop;
  while (T.r > 8) {
    const wide = T.n % 4 === 3, w = wide ? 4 : 2 + (Math.random() < .5 ? 1 : 0);
    T.c0 = clamp(T.c0 + Math.floor(Math.random() * 5) - 2, 1, COLS - 1 - w);
    for (let i = 0; i < w; i++) lvl.set(T.c0 + i, T.r, ONEWAY);
    if (!wide && Math.random() < .5) { const c2 = clamp(T.c0 + (T.c0 < 4 ? 3 + Math.floor(Math.random() * 2) : -3 - Math.floor(Math.random() * 2)), 1, COLS - 3); for (let i = 0; i < 2; i++) if (!lvl.at(c2 + i, T.r)) lvl.set(c2 + i, T.r - 1, ONEWAY); }
    T.r -= 3; T.n++;
  }
}
/* 맵 이어 붙이기: 장어가 맨 위에 가까워지면 판 전체를 EEL.shift칸 아래로 옮기고(지나온 아래쪽은 버린다) 위쪽에 새 발판을 놓는다. 화면에 보이는 것은 그대로다 */
function eelExtend() {
  const g = game, E = g.eel, S = EEL.shift, rows = lvl.rows, old = lvl.grid, ng = new Uint8Array(rows * COLS), dy = S * TILE;
  for (let r = rows - 1; r >= S; r--) for (let c = 0; c < COLS; c++) ng[r * COLS + c] = old[(r - S) * COLS + c];
  lvl.grid = ng; for (let r = 0; r < S; r++) { lvl.set(0, r, HARD); lvl.set(COLS - 1, r, HARD); }
  g.eelTop.r += S; eelPlats();
  g.p.y += dy; E.y += dy; g.cam += dy;
  for (const k of ['bullets', 'ebul', 'enemies', 'fx', 'popups', 'shards', 'hearts', 'cfx', 'haz', 'decals']) for (const o of g[k] || []) { if (typeof o.y === 'number') o.y += dy; if (typeof o.baseY === 'number') o.baseY += dy; if (typeof o.y0 === 'number') o.y0 += dy; if (typeof o.y1 === 'number') o.y1 += dy; }
  g.eelExt = (g.eelExt || 0) + 1;
}
const eelLine = () => { const E = game.eel; return E.y - E.off; };   // 지금 입 끝(물리는 선)의 높이
function eelPhase() { const E = game.eel, k = E.hp / E.maxHp; return k > .66 ? 0 : k > .33 ? 1 : 2; }
function modeCard(title, sub) { const g = game, p = g.p; openCards(false, { title, sub, after: () => { g.state = 'play'; p.inv = Math.max(p.inv, .8); input.clearAll(); input.blockUntil = performance.now() + 150; } }); }
/* 1프레임. tick 끝(카메라 뒤)에서 부른다 */
function modeTick(dt) {
  const g = game, p = g.p; if (g.state !== 'play') return;
  if (g.mode === 'seal') {
    const S = g.seal, b = g.boss; if (!b || !b.alive || b.state === 'intro') return;
    if (!S.first) { S.first = true; S.max = b.maxHp; modeCard('봉인전 시작!', '능력 하나를 고르고 싸우세요'); return; }
    S.on = true; S.t -= dt;
    // 보스 체력이 5% 아래로 내려가면 다시 채운다(준 피해는 계속 센다). 2단계(사나움)는 그대로 남는다
    const total = S.dmg + (b.maxHp - b.hp);
    if (S.cards < MODES.seal.cards && total >= (S.cards + 1) * MODES.seal.cardEvery * S.max) { S.cards++; modeCard('봉인이 흔들린다!', '능력 하나를 고르세요'); return; }
    if (S.t <= 0) { S.t = 0; finishRun(false); }
    return;
  }
  if (g.mode !== 'eel') return;
  const E = g.eel; E.t += dt; E.flash = Math.max(0, E.flash - dt * 5); E.biteT = Math.max(0, E.biteT - dt);
  if (!E.first) { E.first = true; modeCard('심연의 장어', '능력 하나를 고르고 위로 달아나세요'); return; }
  if (E.dead > 0) { E.dead += dt; E.y += 260 * dt; g.shake = Math.max(g.shake, 6 * Math.max(0, 1 - E.dead)); if (E.dead > 1.8) { g.clear = true; finishRun(false); } g.cam = approachSnap(g.cam, clamp(p.y - view.worldH * .58, 0, g.levelH + TILE - view.worldH), 8, dt, .05); return; }
  const ph = E.phase = eelPhase(), feet = p.y + p.h / 2, ST = EEL.stab, third = (WORLD_W - 2 * TILE) / 3;
  // 올라온다: 늘 같은 속도(단계가 오르면 빨라진다). 화면도 이 속도로 올라간다
  E.y -= EEL.rise[ph] * dt;
  if (E.y < EEL.extend * TILE) eelExtend();
  if (!E.broke && E.y < (g.floorRow + 1) * TILE + 30) { E.broke = true; for (let c = 1; c < COLS - 1; c++) { lvl.set(c, g.floorRow, EMPTY); inkBurst((c + .5) * TILE, g.floorRow * TILE + 10, 5, '#6a5a6a', false); } g.shake = Math.max(g.shake, 10); sfx.boom(); }   // 처음 서 있던 바닥은 장어가 부수고 올라온다(탄이 바닥에 막히지 않게)
  E.chompT -= dt; if (E.chompT <= 0) { E.chompT = .9 + Math.random() * .9; if (!E.lunge && !E.warn) E.biteT = Math.max(E.biteT, .12); }   // 평소에도 입을 뻐끔거린다
  // 공격 고르기: 통째로 솟기(느리게 · 빠르게) / 얇게 치고 올라오기(한 번 · 두 번 · 훑기). 같은 공격이 두 번 이어지지 않는다
  const busy = E.warn || E.lunge || E.stabs.length;
  if (!busy) { E.lungeT -= dt; if (E.lungeT <= 0) {
    const tbl = [[['slow', 45], ['stab', 55]], [['slow', 18], ['fast', 24], ['stab', 22], ['stab2', 36]], [['slow', 14], ['fast', 24], ['stab2', 26], ['sweep', 36]]][ph].filter(a => a[0] !== E.last);
    let roll = Math.random() * tbl.reduce((a, b) => a + b[1], 0), kind = tbl[0][0]; for (const [k, w] of tbl) { if (roll < w) { kind = k; break; } roll -= w; }
    E.last = kind; sfx.roar(); g.shake = Math.max(g.shake, 5);
    const lane = x => clamp(TILE + (Math.floor((clamp(x, TILE + 1, WORLD_W - TILE - 1) - TILE) / third) + .5) * third, TILE + ST.w / 2, WORLD_W - TILE - ST.w / 2);
    if (kind === 'slow' || kind === 'fast') { const K = EEL[kind]; E.warn = { t: 0, K, fast: kind === 'fast' }; }
    else if (kind === 'stab') E.stabs.push({ x: lane(p.x), t: 0 });
    else if (kind === 'stab2') { const a = lane(p.x), o = [0, 1, 2].map(i => TILE + (i + .5) * third).filter(x => Math.abs(x - a) > 10); E.stabs.push({ x: a, t: 0 }, { x: lane(o[Math.floor(Math.random() * o.length)]), t: -.4 }); }
    else { const dir = p.x < WORLD_W / 2 ? -1 : 1; for (let i = 0; i < 3; i++) E.stabs.push({ x: lane(TILE + ((dir > 0 ? i : 2 - i) + .5) * third), t: -i * .5 }); }   // 훑기: 주인공이 있는 쪽이 마지막
  } }
  // 통째로 솟기: 붉은 경고(warn) → 솟구침(up) → 잠깐 머묾 → 내려감
  if (E.warn) { E.warn.t += dt; if (E.warn.t >= E.warn.K.warn) { E.lunge = { t: 0, K: E.warn.K }; E.warn = null; sfx.boom(); g.shake = Math.max(g.shake, 12); vibrate(40); } }
  if (E.lunge) {
    const L = E.lunge, K = L.K; L.t += dt; const a = K.up, b2 = a + EEL.hold, c = b2 + EEL.down;
    E.off = L.t < a ? K.h * (1 - Math.pow(1 - L.t / a, 2)) : L.t < b2 ? K.h : K.h * Math.max(0, 1 - (L.t - b2) / EEL.down);
    if (L.t >= a && L.t < a + .12) E.biteT = .16;
    if (L.t >= c) { E.lunge = null; E.off = 0; E.lungeT = EEL.gapT[ph] * (.8 + Math.random() * .4); }
  }
  // 얇게 치고 올라오기: 세로 띠 경고 → 그 띠로만 화면 위쪽까지 확 솟았다가 들어간다. off = 지금 솟은 높이
  const stabH = view.worldH * ST.h;
  for (const S of E.stabs) {
    const t0 = S.t; S.t += dt; const t = S.t - ST.warn;
    if (t0 < ST.warn && S.t >= ST.warn) { sfx.boom(); g.shake = Math.max(g.shake, 9); vibrate(25); }
    S.off = t < 0 ? 0 : t < ST.up ? stabH * (1 - Math.pow(1 - t / ST.up, 2)) : t < ST.up + ST.hold ? stabH : stabH * Math.max(0, 1 - (t - ST.up - ST.hold) / ST.down);
    S.done = t >= ST.up + ST.hold + ST.down;
  }
  if (E.stabs.length && E.stabs.every(S => S.done)) { E.stabs = []; E.lungeT = EEL.gapT[ph] * (.8 + Math.random() * .4); }
  // 물기: 발이 입 끝보다 아래면 크게 다치고 위로 튕겨 나온다(얇은 공격은 그 띠 안에서만)
  const line = eelLine(), inStab = S => S.off > 0 && Math.abs(p.x - S.x) < ST.w / 2 + p.w * .3 && feet > E.y - S.off + 8, hitS = E.stabs.find(inStab);
  if ((feet > line + 8 || hitS) && p.inv <= 0 && !g.god) { hurt(p.x, Math.round(EEL.bite * DIFF.dmg(g.wave))); if (g.state === 'dying') return; if (feet > line + 8) p.vy = -780; else { p.vy = Math.min(p.vy, -420); p.vx = (p.x < hitS.x ? -1 : 1) * 260; } p.inv = Math.max(p.inv, 1.1); E.biteT = .2; g.shake = Math.max(g.shake, 14); }
  else if (feet > line + 8 && (g.god || p.inv > 0) && p.vy > -200) p.vy = -640;
  // 내 탄: 입(통째 · 얇은 머리)에 닿으면 피해
  for (const b of g.bullets) { if (b.dead) continue; const S = E.stabs.find(S => S.off > 0 && Math.abs(b.x - S.x) < ST.w / 2 && b.y >= E.y - S.off - 4), top = S ? E.y - S.off : line;
    if (!S && !(b.y >= line - 4 && b.y < line + 120)) continue;
    b.dead = true; E.hp -= b.dmg; E.flash = 1; dmgNum(b.x, top - 6, b.dmg, b.crit); g.fx.push({ type: 'hit', x: b.x, y: top, r: 12, t: 0, life: .08, rot: 0 }); if (Math.random() < .3) sfx.hit();
  }
  if (E.hp <= 0) { E.hp = 0; E.dead = .01; E.warn = E.lunge = null; E.stabs = []; E.off = 0; g.ebul = []; for (const e of g.enemies) if (e.alive) killEnemy(e, false); g.whiteout = .6; g.shake = 18; sfx.bigBoom(); vibrate(80); popup(p.x, p.y - 60, '장어를 쓰러뜨렸다!', '#ffe27a', true); return; }
  const dealt = 1 - E.hp / E.maxHp;
  if (E.cards < MODES.eel.cards && dealt >= (E.cards + 1) * MODES.eel.cardEvery) { E.cards++; modeCard('장어가 움찔했다!', '능력 하나를 고르세요'); return; }
  // 2단계부터 탄을 뱉는다(주인공 쪽으로 세 갈래)
  if (ph >= 1) { E.spitT -= dt; if (E.spitT <= 0 && !E.lunge) { E.spitT = EEL.spit * (ph === 2 ? .8 : 1); const d = Math.round(18 * DIFF.dmg(g.wave)); for (const k of [-1, 0, 1]) { const tx = p.x + k * 70, x0 = clamp(p.x + k * 40, TILE + 20, WORLD_W - TILE - 20); g.ebul.push({ x: x0, y: line - 10, vx: (tx - x0) * .6, vy: -340, g: 150, r: 7, dmg: d, t: 0, col: '#ff7a9a', ghost: true }); } sfx.spit(); E.biteT = .2; } }
  // 3단계: 기둥 광선(붉은 경고 뒤) + 졸개
  if (ph >= 2) {
    E.laserT -= dt;
    if (E.laserT <= 0 && !E.lz) { E.laserT = EEL.laser; const pc = clamp(Math.floor(p.x / TILE), 1, COLS - 2), cols = [pc]; let c2; do { c2 = 1 + Math.floor(Math.random() * (COLS - 2)); } while (c2 === pc); cols.push(c2); E.lz = { t: 0, cols, fired: false }; for (const c of cols) g.fx.push({ type: 'warn', x0: c * TILE + 2, x1: (c + 1) * TILE - 2, y0: g.cam - 40, y1: line, x: 0, y: 0, t: 0, life: .7 }); }
    if (E.lz) { const Z = E.lz; Z.t += dt; if (Z.t > .7 && !Z.fired) { Z.fired = true; for (const c of Z.cols) g.fx.push({ type: 'beam', x0: c * TILE + 2, x1: (c + 1) * TILE - 2, y0: g.cam - 40, y1: line, x: 0, y: 0, t: 0, life: .32, col: '#ff5a7a' }); g.shake = Math.max(g.shake, 8); sfx.zap(); }
      if (Z.fired && Z.t < 1.02 && p.inv <= 0 && Z.cols.includes(Math.floor(p.x / TILE))) { hurt(p.x, Math.round(22 * DIFF.dmg(g.wave))); if (g.state === 'dying') return; }
      if (Z.t > 1.1) E.lz = null; }
    E.sumT -= dt; if (E.sumT <= 0) { E.sumT = EEL.summon; if (g.enemies.filter(e => e.alive).length < 5) for (let i = 0; i < 2; i++) { const x = TILE + 30 + Math.random() * (WORLD_W - 2 * TILE - 60), y = g.cam + 60 + Math.random() * 80; g.enemies.push(mkEnemy('bat', x, y, { sleep: false, ph: Math.random() * 6 })); inkBurst(x, y, 10, ENEMY.bat.col, false); } }
  }
  // 카메라: 장어에 묶인다. 평소 입 끝이 화면 높이의 EEL.view 지점에 오도록 장어 속도로 올라간다(주인공이 올라가도 장어가 화면 밖으로 내려가지 않는다)
  g.cam = clamp(E.y - view.worldH * EEL.view, 0, Math.max(0, g.levelH + TILE - view.worldH));
}
/* 모드가 끝났을 때(finishRun에서): 점수 → 보상 → 결과 창 */
function modeFinish() {
  const g = game, id = g.mode, m = modeState(id), s = Meta.s, ch = chapterOf(g.wave); g.state = 'result';
  let score, win = false, line1, stats;
  if (id === 'seal') { const S = g.seal, b = g.boss, total = S.dmg + (b ? b.maxHp - Math.max(0, b.hp) : 0); score = S.max ? Math.round(total / S.max * 100) : 0; line1 = '봉인전 끝'; stats = [[fmt(Math.round(total)), '준 피해'], [score + '%', '보스 체력 대비'], [S.cards + '장', '고른 능력']]; }
  else { const E = g.eel; win = E.hp <= 0; score = Math.round((1 - E.hp / E.maxHp) * 100); line1 = win ? '장어를 쓰러뜨렸다!' : '장어에게 삼켜졌다'; stats = [[score + '%', '깎은 체력'], [Math.round(E.t) + '초', '버틴 시간'], [E.cards + '장', '고른 능력']]; }
  const k = 1 + ch * .35, ST = MODES.seal.tier, tier = id === 'seal' ? (score >= ST[3] ? 4 : score >= ST[2] ? 3 : score >= ST[1] ? 2 : score >= ST[0] ? 1 : 0) : (win ? 4 : score >= 66 ? 3 : score >= 33 ? 2 : score >= 10 ? 1 : 0);
  const gold = Math.round([60, 250, 500, 900, 1500][tier] * k), gem = [0, 8, 15, 25, 45][tier], best = score > (m.best || 0);
  s.gold += gold; s.gem += gem; if (best) m.best = score; Meta.save();
  UI.showModeResult({ id, title: line1, win: win || (id === 'seal' && tier >= 2), stats, gold, gem, best, bestScore: m.best });
}
/* 그리기(월드 좌표, 주인공보다 앞) */
function drawModeFront() {
  const g = game, s = view.s; if (g.mode !== 'eel' || !g.eel) return;
  const E = g.eel, line = eelLine(), yL = wy(line), W = view.W, H = view.H, ST = EEL.stab;
  // 붉은 경고: 물릴 높이까지의 띠 + 빗금 + 느낌표
  if (E.warn) { const K = E.warn.K, k = E.warn.t / K.warn, y0 = wy(E.y - K.h), bl = .5 + .5 * Math.sin(E.warn.t * (E.warn.fast ? 34 : 20));
    ctx.fillStyle = `rgba(255,40,60,${.16 + .2 * bl})`; ctx.fillRect(0, y0, W, yL - y0);
    ctx.fillStyle = `rgba(255,70,90,${.5 + .4 * bl})`; ctx.fillRect(0, y0, W, 3 * s);
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, 10 * s); ctx.clip(); ctx.fillStyle = `rgba(20,6,10,${.55 + .3 * bl})`; const st = 22 * s, off = (g.t * 80 * s) % st; for (let x = -st * 2 + off; x < W + st; x += st) { ctx.beginPath(); ctx.moveTo(x, y0 + 10 * s); ctx.lineTo(x + st * .5, y0 + 10 * s); ctx.lineTo(x + st * .5 + 10 * s, y0); ctx.lineTo(x + 10 * s, y0); ctx.fill(); } ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${(E.warn.fast ? 30 : 24) * s}px ${FONT}`; textOut(E.warn.fast ? '!!' : '!', W / 2, y0 + (yL - y0) * .45, bl > .5 ? '#ffd24a' : '#ff5068', 4);
    ctx.fillStyle = `rgba(255,255,255,${.25 * (1 - k)})`; ctx.fillRect(0, y0 + (yL - y0) * (1 - k), W, 2 * s);
  }
  const im0 = E.biteT > 0 ? IMG.eel_bite : IMG.eel_open;
  // 얇게 치고 올라오기: 세로 띠 경고(아래에서 위로 차오르는 빛) → 그 띠 폭의 머리가 확 솟는다
  for (const S of E.stabs) {
    const x0 = wx(S.x - ST.w / 2), w = ST.w * s, yTop = wy(E.y - view.worldH * ST.h), yB = wy(E.y);
    if (S.t >= 0 && S.t < ST.warn) { const k = S.t / ST.warn, bl = .5 + .5 * Math.sin(S.t * 30);
      ctx.fillStyle = `rgba(255,40,60,${.14 + .2 * bl})`; ctx.fillRect(x0, yTop, w, yB - yTop);
      ctx.fillStyle = `rgba(255,90,110,${.55 + .35 * bl})`; ctx.fillRect(x0, yTop, 2.4 * s, yB - yTop); ctx.fillRect(x0 + w - 2.4 * s, yTop, 2.4 * s, yB - yTop); ctx.fillRect(x0, yTop, w, 3 * s);
      ctx.fillStyle = `rgba(255,255,255,${.3 * (1 - k)})`; ctx.fillRect(x0, yB - (yB - yTop) * k, w, 2 * s);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${24 * s}px ${FONT}`; textOut('!', x0 + w / 2, yTop + (yB - yTop) * .4, bl > .5 ? '#ffd24a' : '#ff5068', 4);
    }
    if (S.off > 0) { const im = S.t - ST.warn < ST.up + .1 ? IMG.eel_bite : IMG.eel_open, tip = wy(E.y - S.off), iw = w * 1.5, ih = ok(im) ? iw * im.naturalHeight / im.naturalWidth : 60 * s;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, -H, w, H * 3); ctx.clip();
      ctx.fillStyle = '#1c0d1e'; ctx.fillRect(x0, tip + ih * .5, w, H);
      ctx.fillStyle = 'rgba(255,90,120,.22)'; ctx.fillRect(x0, tip + ih * .5, 3 * s, H); ctx.fillRect(x0 + w - 3 * s, tip + ih * .5, 3 * s, H);
      if (ok(im)) ctx.drawImage(im, x0 + w / 2 - iw / 2, tip - ih * .08, iw, ih);
      ctx.restore();
    }
  }
  // 몸통: 화면 아래까지 어두운 살, 그 위에 머리 그림(입 끝 = line). 평소에도 빠르게 들썩이고 뻐끔거린다
  const im = im0, iw = (WORLD_W - 2 * TILE) * EEL.imgW * s, ih = ok(im) ? iw * im.naturalHeight / im.naturalWidth : 160 * s, top = yL - ih * (E.biteT > 0 ? .06 : .1), bob = Math.sin(g.t * 6.5) * 4 * s, sway = Math.sin(g.t * 2.3) * 5 * s;
  ctx.fillStyle = '#1c0d1e'; ctx.fillRect(wx(TILE), top + ih * .55 + bob, (WORLD_W - 2 * TILE) * s, H - (top + ih * .55) + 40 * s);
  if (ok(im)) { const sq = E.biteT > 0 ? 1.07 : 1 + .04 * Math.sin(g.t * 9); ctx.save(); ctx.beginPath(); ctx.rect(wx(TILE), -H, (WORLD_W - 2 * TILE) * s, H * 3); ctx.clip(); ctx.drawImage(im, W / 2 - iw * sq / 2 + sway, top + bob, iw * sq, ih); if (E.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = E.flash * .5; ctx.drawImage(im, W / 2 - iw * sq / 2 + sway, top + bob, iw * sq, ih); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } ctx.restore(); }
  const gl = ctx.createLinearGradient(0, yL - 90 * s, 0, yL); gl.addColorStop(0, 'rgba(255,60,90,0)'); gl.addColorStop(1, `rgba(255,60,90,${.16 + .08 * Math.sin(g.t * 4)})`); ctx.fillStyle = gl; ctx.fillRect(wx(TILE), yL - 90 * s, (WORLD_W - 2 * TILE) * s, 90 * s);
}
/* HUD: 봉인전 = 남은 시간 · 피해, 장어 = 체력 막대 */
function drawModeHud() {
  const g = game, s = view.s, W = view.W, top = view.safeT + 8 * s; if (!g.mode || !g.p) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (g.mode === 'seal' && g.seal && g.seal.on) { const S = g.seal, b = g.boss, total = S.dmg + (b ? b.maxHp - Math.max(0, b.hp) : 0), t = Math.ceil(S.t), low = S.t < 15;
    ctx.font = `${17 * s}px ${FONT}`; textOut(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, W / 2, top + 62 * s, low && Math.sin(g.t * 10) > 0 ? '#ff6a78' : '#ffe9b0', 3.2);
    ctx.font = `${11.5 * s}px ${FONT}`; textOut(`준 피해 ${fmt(Math.round(total))} · 보스 체력의 ${S.max ? Math.round(total / S.max * 100) : 0}%`, W / 2, top + 80 * s, '#fff', 2.6); }
  if (g.mode === 'eel' && g.eel) { const E = g.eel, by = top + 34 * s, x0 = 14 * s, bw = W - 28 * s, k = clamp(E.hp / E.maxHp, 0, 1);
    ctx.font = `${12 * s}px ${FONT}`; textOut('심연의 장어', W / 2, by - 8 * s, '#ffd0dc', 2.8);
    ctx.fillStyle = 'rgba(10,8,20,.85)'; rr(x0, by, bw, 9 * s, 4 * s); ctx.fill(); const hg = ctx.createLinearGradient(x0, 0, x0 + bw, 0); hg.addColorStop(0, '#ff5a7a'); hg.addColorStop(1, '#c21c5a'); ctx.fillStyle = hg; rr(x0 + 1.5 * s, by + 1.5 * s, Math.max(0, (bw - 3 * s) * k), 6 * s, 3 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; for (const q of [.33, .66]) ctx.fillRect(x0 + bw * q, by, 1.5 * s, 9 * s); }
}
