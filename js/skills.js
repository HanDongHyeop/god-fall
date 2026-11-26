/* 로그라이크 카드 효과(2026-11-12 v30 전수 조사 개편). 카드 표는 cards.js, 이 파일은 효과의 동작과 그림.
   묶음(fam) 카드는 같은 효과의 등급 사다리다. 높은 등급을 얻으면 낮은 등급은 덮어쓰이고 다시 나오지 않는다.
   등급이 오를수록 효과가 커지고 그림도 한 겹씩 더해진다(일반 = 숫자만, 희귀 = 모양, 영웅 = 꼬리·막기, 전설 = 화면에서 바로 보이는 상시 연출) */
'use strict';
const famLv = fam => { let n = 0; for (const id of game.cards) { const c = CARD_BY[id]; if (c && c.fam === fam) n = Math.max(n, c.lv); } return n; };
/* 유도: 탄이 사라지기 전까지, 탄에서 r 안에 있는 일반 몬스터 쪽으로 휜다. turn = 초당 꺾이는 각도(라디안) */
// v32: 영웅(사냥매의 눈) 칸을 넣어 4단. 일반 40 · 희귀 80 · 영웅 150 · 전설 240
const SEEK = [null, { r: 40, turn: 4, col: '#9ff5d0' }, { r: 80, turn: 6, col: '#7fc4ff' }, { r: 150, turn: 8, col: '#5ee8ff' }, { r: 240, turn: 10, col: '#e6a8ff' }];
/* 궤도 구슬: n개, 반지름 R, 크기 size, 공격력 배율 dmg, 적 탄 막기 block. 전설은 불·얼음·번개·바람 4원소 */
const ORB = [null,
  { n: 2, R: 40, size: 5.5, dmg: .3, spd: 3.6, block: false },
  { n: 3, R: 46, size: 7, dmg: .4, spd: 4, block: true },
  { n: 4, R: 56, size: 9.5, dmg: .7, spd: 4.4, block: true, el: ['fire', 'ice', 'bolt', 'wind'] }];
const ORB_COL = { fire: ['#ff8a3a', '#ffe2a0'], ice: ['#7fd8ff', '#e8fbff'], bolt: ['#ffe14a', '#fffbd0'], wind: ['#e8f4ff', '#ffffff'], blue: ['#4aa8ff', '#e0f4ff'] };
const godMode = () => { const p = game.p; return !!(p && (p.high || has('avatar'))); };   // 신성 폭주 상태(신의 현현은 판 내내)

/* 탄 하나를 쏠 때의 모양: 없음 1발 · 희귀 나란히 2발 · 영웅 3갈래 · 전설 5갈래 부채 */
function fireVolley(x, y, hand, mul, big) {
  const lv = famLv('shot'), g = game;
  // v36 아폴론: 다섯 번째 음은 태양 음표(크고 피해 1.5 + sun5배)
  if (g.st.sun5) { g.p.noteN = (g.p.noteN || 0) + 1; g.p.sunNote = g.p.noteN % 5 === 0; if (g.p.sunNote) { mul *= 1.5 + g.st.sun5; big = true; } }
  if (lv === 0) { godShot(x, y, 0, 1150, hand, { mul, big }); return; }
  if (lv === 1) { for (const d of [-7, 7]) godShot(x + d, y, 0, 1150, hand, { mul: mul * .62, big }); return; }
  if (lv === 2) { godShot(x, y, 0, 1150, hand, { mul, big }); for (const s of [-1, 1]) godShot(x, y, s * 330, 1100, hand, { mul: mul * .4, big }); return; }
  for (const vx of [-600, -300, 0, 300, 600]) godShot(x, y, vx, 1100 - Math.abs(vx) * .12, hand, { mul: mul * .44, big, fan: true });
}
/* v36 신마다 한 번 쏠 때 나가는 모양: 헤라는 깃털 2개(양옆으로 갈라짐), 아프로디테는 꽃잎 3장(부채꼴), 나머지는 1발 */
const GOD_SPREAD = { feather: [[-150, 0], [150, 0]], rose: [[-95, -6], [0, 0], [95, -6]] };   // v36 밸런스: 꽃잎은 가까이서 3장이 모두 맞는 산탄
function godShot(x, y, vx, vy, hand, o) {
  const sp = GOD_SPREAD[game.god_.shot], fan = o.fan;
  if (!sp) { fireBullet(x, y, vx, vy, false, hand, o); if (fan) game.bullets[game.bullets.length - 1].fan = true; return; }
  for (const [dx, dy] of sp) { fireBullet(x, y + dy, vx + dx, vy - Math.abs(dx) * .1, false, hand, o); const b = game.bullets[game.bullets.length - 1]; b.spin = dx; if (fan) b.fan = true; }
}
/* v36 새 신의 맞았을 때 효과. e = 맞은 적(보스·중간 보스 포함), 없으면 블록·바닥 */
function godHit(b, e) {
  const g = game, st = g.st, big = e && isBig(e);
  if (b.kind === 'wave' && st.wave) {   // 포세이돈: 물보라
    const r = 36 * st.wave; explode(b.x, b.y, r, { dmg: Math.round(b.dmg * .3), tiles: false, ink: '#1a5a8a', cols: ['#7fe8ff', '#e6fbff', '#2aa0d8'] });
    for (let i = 0; i < 6; i++) g.fx.push({ type: 'dot', x: b.x, y: b.y, vx: (Math.random() - .5) * 260, vy: -140 - Math.random() * 160, t: 0, life: .45, r: 2.6, col: i % 2 ? '#bff6ff' : '#4cc8f0', g: 700 });
  }
  if (!e) return;
  if (b.kind === 'feather' && st.mark) {   // 헤라: 공작의 눈 표식 3초
    if (!((e.markU || 0) > g.t)) g.fx.push({ type: 'ring', x: b.x, y: b.y, r: 22, col: 'rgba(80,230,210,.95)', t: 0, life: .25 });
    e.markU = g.t + 3;
  }
  if (b.kind === 'gaze' && st.petrify && !big) {   // 아테나: 돌이 된다(멈춤·닿아도 안전). 보스·중간 보스는 돌이 되지 않는다
    if (!(e.frz > 0)) g.fx.push({ type: 'ring', x: e.x, y: e.y, r: e.r + 12, col: 'rgba(200,214,160,.95)', t: 0, life: .3 });
    e.frz = Math.max(e.frz || 0, st.petrify); e.stoneU = g.t + st.petrify;
  }
  if (b.kind === 'rose' && st.charm && !big) {   // 아프로디테: 매혹
    if (!((e.charmU || 0) > g.t)) for (let i = 0; i < 3; i++) g.fx.push({ type: 'dot', x: e.x + (i - 1) * 8, y: e.y - e.r, vx: (i - 1) * 30, vy: -90, t: 0, life: .5, r: 2.4, col: '#ff7aa8', g: 0 });
    e.charmU = g.t + st.charm;
  }
  if (b.kind === 'lion') g.fx.push({ type: 'ring', x: b.x, y: b.y, r: 30, col: 'rgba(255,200,90,.9)', t: 0, life: .2 });
}
/* 유도 값: 카드(바람 길잡이·사냥꾼의 눈·사냥매의 눈·사냥 여신의 표식), 하데스의 영혼불, 올빼미·히드라 탄 중 가장 센 것 */
function seekOf(b) {  // 유도 반경 r, 꺾는 힘 turn. 대상은 일반 몬스터와 보스·중간 보스(v33)
  const lv = famLv('seek'); let r = 0, turn = 0, tier = lv;
  if (lv) { r = SEEK[lv].r; turn = SEEK[lv].turn; }
  let prop = !!lv;
  if (b.kind === 'soul' && game.st.homing && r < 200) { r = 200; turn = 9; prop = false; }   // 하데스 영혼불은 예전 그대로(천천히 휨)
  if (b.seekR && b.seekR > r) { r = b.seekR; turn = b.seekTurn || 12; prop = true; }
  return r ? { r, turn, tier, prop } : null;
}
function steerBullet(b, dt) {
  const s = seekOf(b); if (!s) { b.tgt = null; return; }
  b.sk = s.tier || 1;
  let t = null, d = s.r, tp = null;
  for (const e of game.enemies) if (e.alive && !e.hidden && !b.hits.includes(e)) { const q = Math.hypot(e.x - b.x, e.y - b.y) - e.r; if (q < d) { d = q; t = e; tp = e; } }
  for (const o of bigFoes()) if (!b.hits.includes(o)) { const P = foePt(o), q = Math.hypot(P.x - b.x, P.y - b.y) - P.r; if (q < d) { d = q; t = o; tp = P; } }
  b.tgt = t; if (!t) return; t = tp;
  // 꺾는 힘은 가까울수록 커진다(속도 ÷ 남은 거리): 반경 안에 들어온 적은 빗나가지 않고 휘어 들어가 맞는다. 등급 차이는 알아채는 반경
  const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(t.y - b.y, t.x - b.x), c = Math.atan2(b.vy, b.vx), turn = s.turn + (s.prop ? 2.6 * sp / Math.max(8, d + t.r) : 0);
  let dA = a - c; while (dA > Math.PI) dA -= Math.PI * 2; while (dA < -Math.PI) dA += Math.PI * 2;
  const na = c + clamp(dA, -turn * dt, turn * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
}
/* 궤도 구슬: 몸 주위를 돌며 몬스터와 보스·중간 보스(v33)를 때리고, 영웅부터는 적의 탄을 지운다. 보스에게는 원소 부가 효과 중 감전만 든다 */
function orbPos(i, O) { const p = game.p, a = game.t * O.spd + i * Math.PI * 2 / O.n; return [p.x + Math.cos(a) * O.R, p.y - 8 + Math.sin(a) * O.R]; }
function orbTick(dt) {
  const lv = famLv('orb'); if (!lv) return;
  const g = game, O = ORB[lv];
  for (let i = 0; i < O.n; i++) {
    const [ox, oy] = orbPos(i, O), el = O.el ? O.el[i] : null;
    for (const e of g.enemies) {
      if (!e.alive || e.hidden || Math.hypot(e.x - ox, e.y - oy) >= e.r + O.size + 2) continue;
      const key = 'orb' + i; if ((e[key] || 0) > g.t) continue; e[key] = g.t + .35;
      hitEnemy(e, Math.max(1, Math.round(atkNow() * O.dmg)), false, ox, oy);
      if (el === 'fire') e.burn = Math.max(e.burn || 0, 2.5);
      else if (el === 'ice') { e.frz = .7; g.fx.push({ type: 'ring', x: e.x, y: e.y, r: e.r + 10, col: 'rgba(160,230,255,.95)', t: 0, life: .25 }); }
      else if (el === 'bolt' && e.alive) chainFrom(e, 1, Math.round(atkNow() * .8));
      else if (el === 'wind' && e.alive) { const k = Math.sign(e.x - g.p.x) || 1; if (e.baseX !== undefined) e.baseX = clamp(e.baseX + k * 30, TILE + 12, WORLD_W - TILE - 12); e.x = clamp(e.x + k * 30, TILE + 12, WORLD_W - TILE - 12); }
      if (lv >= 3) sparks(ox, oy, 4, ORB_COL[el][0], 160, .25);
    }
    for (const b of bigFoes()) {
      if (!overBig(b, ox, oy, O.size)) continue;
      const key = 'orb' + i; if ((b[key] || 0) > g.t) continue; b[key] = g.t + .35;
      hitFoe(b, Math.max(1, Math.round(atkNow() * O.dmg)), false, ox, oy);
      if (el === 'bolt') chainFrom(b, 1, Math.round(atkNow() * .8), ox, oy);
      if (lv >= 3) sparks(ox, oy, 4, ORB_COL[el][0], 160, .25);
      if (!g.minis && !g.boss) break;
    }
    if (O.block) for (const b of g.ebul) if (!b.dead && !b.pool && Math.hypot(b.x - ox, b.y - oy) < O.size + (b.r || 5) + 3) {
      b.dead = true; sparks(b.x, b.y, 5, el ? ORB_COL[el][1] : '#bfe6ff', 170, .22); g.fx.push({ type: 'ring', x: b.x, y: b.y, r: 16, col: 'rgba(200,240,255,.95)', t: 0, life: .18 }); sfx.ping();
    }
  }
}
/* 천둥 폭풍(전설): 0.8초마다 화면 안의 몬스터나 보스(v33) 하나에 하늘에서 벼락, 옆 2마리로 번진다. 땅에 서 있어도 내린다 */
function stormTick(dt) {
  if (!has('storm')) return;
  const g = game, p = g.p; p.stormT = (p.stormT || 0) + dt; if (p.stormT < 1.5) return;
  const top = g.cam + 10, bot = g.cam + view.worldH - 10, list = g.enemies.filter(e => e.alive && !e.hidden && e.y > top && e.y < bot);
  for (const o of bigFoes()) { const P = foePt(o); if (P.y > top && P.y < bot) list.push(o); }
  if (!list.length) { p.stormT = 1.5; return; }
  p.stormT = 0;
  const e = list[Math.floor(Math.random() * list.length)], P = foePt(e);
  g.fx.push({ type: 'bolt', x: P.x, y: P.y, t: 0, life: .22, seed: Math.random() * 100 });
  g.fx.push({ type: 'ring', x: P.x, y: P.y, r: 46, col: 'rgba(255,240,140,.95)', t: 0, life: .25 });
  sparks(P.x, P.y, 10, '#fff6a8', 260, .3); g.shake = Math.max(g.shake, 4); g.whiteout = Math.max(g.whiteout, .06); sfx.zap(); sfx.boom();
  hitFoe(e, Math.round(atkNow() * 1.1), false, P.x, P.y);
  chainFrom(e, 2, Math.round(atkNow() * 1.1));
}
/* ───── 그림 ───── */
/* 유도탄 꼬리: 일반 = 옅은 민트 실, 희귀 = 파란 줄, 영웅 = 빛나는 하늘색 띠, 전설 = 보라·금 소용돌이. 전설은 노린 적에 표식 */
function drawSeekTrail(b, x, y) {
  const s = view.s, tier = b.sk || 0; if (!tier) return;
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = -b.vx / sp, uy = -b.vy / sp, L = (tier >= 4 ? 38 : tier === 3 ? 34 : tier === 2 ? 30 : 20) * s;
  ctx.lineCap = 'round';
  if (tier === 3) {
    ctx.strokeStyle = 'rgba(80,220,255,.35)'; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L, y + uy * L); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,250,255,.95)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L * .8, y + uy * L * .8); ctx.stroke();
  } else if (tier >= 4) {
    ctx.strokeStyle = 'rgba(200,120,255,.5)'; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L, y + uy * L); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,130,.95)'; ctx.lineWidth = 2.2 * s; ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const k = i / 8, w = Math.sin(b.t * 40 + k * 7) * 5 * s * k; ctx.lineTo(x + ux * L * k - uy * w, y + uy * L * k + ux * w); } ctx.stroke();
  } else { ctx.strokeStyle = tier === 2 ? 'rgba(120,190,255,.75)' : 'rgba(170,255,215,.6)'; ctx.lineWidth = (tier === 2 ? 5 : 3) * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L, y + uy * L); ctx.stroke(); }
}
function drawSkillsBack() {
  // 크로노스: 화면에 옅은 푸른 시간 결과 천천히 떨어지는 모래
  const g = game, s = view.s;
  if (has('kronos')) {
    ctx.fillStyle = 'rgba(60,120,255,.07)'; ctx.fillRect(0, 0, view.W, view.H);
    ctx.fillStyle = 'rgba(255,226,150,.55)';
    for (let i = 0; i < 18; i++) { const x = ((i * 97.3) % 1) * view.W + (i * 53) % view.W, y = ((g.t * 22 + i * 61) % (view.H + 20)) - 10; ctx.fillRect(x % view.W, y, 1.6 * s, 1.6 * s); }
  }
}
function drawSkillsFront() {
  const g = game, p = g.p, s = view.s; if (!p) return;
  // 유도 전설: 노리는 적에게 조여드는 표식
  if (famLv('seek') === 4) {
    const seen = new Set(); for (const b of g.bullets) if (b.tgt && b.tgt.alive) seen.add(b.tgt);
    for (const e of seen) { const P = foePt(e), x = wx(P.x), y = wy(P.y), r = (P.r + 10) * s * (1 + .15 * Math.sin(g.t * 14)); ctx.strokeStyle = 'rgba(230,160,255,.95)'; ctx.lineWidth = 2 * s;
      for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + g.t * 3; ctx.beginPath(); ctx.arc(x, y, r, a - .35, a + .35); ctx.stroke(); } }
  }
  // 궤도 구슬
  const lv = famLv('orb');
  if (lv) {
    const O = ORB[lv];
    for (let i = 0; i < O.n; i++) {
      const [ox, oy] = orbPos(i, O), el = O.el ? O.el[i] : 'blue', [c0, c1] = ORB_COL[el], X = wx(ox), Y = wy(oy), r = O.size * s;
      if (lv >= 2) { // 영웅부터 지나간 자리에 잔상
        for (let k = 1; k <= 3; k++) { const a = g.t * O.spd + i * Math.PI * 2 / O.n - k * .16, tx = wx(p.x + Math.cos(a) * O.R), ty = wy(p.y - 8 + Math.sin(a) * O.R); ctx.globalAlpha = .28 - k * .07; ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(tx, ty, r * (1 - k * .15), 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (lv >= 3) { ctx.globalAlpha = .35 + .15 * Math.sin(g.t * 9 + i); ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(X, Y, r * 1.9, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(10,10,30,.55)'; ctx.beginPath(); ctx.arc(X, Y + r * .15, r * 1.08, 0, 7); ctx.fill();
      const og = ctx.createRadialGradient(X - r * .35, Y - r * .35, r * .1, X, Y, r); og.addColorStop(0, c1); og.addColorStop(1, c0);
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
      if (el === 'bolt') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(X - r * .2, Y - r * .55); ctx.lineTo(X + r * .15, Y - r * .05); ctx.lineTo(X - r * .15, Y + r * .05); ctx.lineTo(X + r * .2, Y + r * .55); ctx.stroke(); }
      if (el === 'wind') { ctx.strokeStyle = 'rgba(120,160,200,.9)'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.arc(X, Y, r * .55, g.t * 8, g.t * 8 + 4); ctx.stroke(); }
    }
  }
  // 신의 현현: 판 내내 신성 폭주 아우라(drawAuraBack·drawAuraFront, render.js drawHero에서 그린다)
}
/* 하늘에서 내리꽂는 벼락(천둥 폭풍). 화면 위에서 대상까지 갈라진 굵은 번개 + 가지 2개 */
function drawBoltFx(f) {
  const s = view.s, k = f.t / f.life, x = wx(f.x), y = wy(f.y), seed = f.seed;
  const path = []; let yy = 0; while (yy < y) { const t = yy / Math.max(1, y); path.push([x + Math.sin(seed + yy * .05) * 22 * s * (1 - t), yy]); yy += 26 * s; } path.push([x, y]);
  for (const [w, c] of [[14, `rgba(255,230,120,${.35 * (1 - k)})`], [6, `rgba(255,250,200,${1 - k})`], [2.4, '#ffffff']]) {
    ctx.strokeStyle = c; ctx.lineWidth = w * s * (1 - k * .5); ctx.lineJoin = 'miter'; ctx.beginPath(); path.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,250,200,${1 - k})`; ctx.lineWidth = 2 * s;
  for (const d of [-1, 1]) { const [bx, by] = path[Math.floor(path.length * .6)] || [x, y]; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + d * 24 * s, by + 18 * s); ctx.lineTo(bx + d * 34 * s, by + 40 * s); ctx.stroke(); }
}
/* 전설 카드를 고른 순간: 시간이 잠깐 느려지고 금빛 섬광 + 이름 띠. 효과가 바로 몸에 붙는 것을 보여 준다 */
function legendFx(c) {
  const g = game, p = g.p;
  g.slowT = .55; g.whiteout = Math.max(g.whiteout, .45); g.shake = Math.max(g.shake, 10); vibrate(80);
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 200, col: 'rgba(255,220,120,.95)', t: 0, life: .7 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 130, col: 'rgba(255,255,255,.95)', t: 0, life: .5 });
  sparks(p.x, p.y - 10, 26, '#ffe59a', 340, .6, 3);
  g.banner = { t: 0, life: 1.8, a: '전설 능력', b: c.name, gold: true };
}

/* ───── v33(2026-11-16) 보스·중간 보스도 카드 효과를 받는다 ─────
   유도(바람 길잡이~사냥 여신의 표식)·구슬·관통·번개 탄·낙뢰·천둥 폭풍·들이받기가 보스와 중간 보스에게도 든다.
   bigFoes = 지금 때릴 수 있는 보스(중간 보스 방에서는 살아 있는 중간 보스 전부). 등장·죽는 중·숨은 중에는 빠진다 */
function bigFoes() {
  const g = game;
  if (g.minis) return g.minis.filter(m => m.alive && !m.hidden && m.state !== 'intro' && m.y - (m.drawH || m.h) * .4 < m.floorY + 4);
  const b = g.boss; return b && b.alive && !b.hidden && b.state !== 'intro' && b.state !== 'dead' && b.y - (b.drawH || b.h) * .4 < b.floorY + 4 ? [b] : [];
}
const isBig = o => !!(o && o.def && o.maxHp !== undefined && o.floorY !== undefined);
/* 맞힐 점: 보스는 몸 가운데, 반지름은 몸 너비의 36% */
function foePt(o) { if (isBig(o)) { const hh = o.drawH || o.h; return { x: o.x, y: o.y - hh * .5, r: o.w * .36 }; } return { x: o.x, y: o.y, r: o.r }; }
function hitFoe(o, dmg, crit, x, y) { if (isBig(o)) { if (game.minis) game.boss = o; hitBoss(dmg, crit, x, y); } else hitEnemy(o, dmg, crit, x, y); }
function overBig(b, x, y, pad) { const hh = b.drawH || b.h; return Math.abs(x - b.x) < b.w * .42 + pad && y > b.y - hh * .95 - pad && y < b.y + pad; }

/* ───── v33 콤보 = 몬스터를 밟은 횟수. 땅에 닿을 때만 0으로. 8번(HIGH.combo)마다 신성 폭주 ─────
   예전 콤보(공중 처치 수·착지 보상)와 파편을 이어 먹어 켜지던 신성 폭주는 없앴다(사용자: 개념이 너무 헷갈림).
   밟을 때마다 작은 'n 콤보' 글자, 5(HIGH.combo)에서 큰 글자 + 신성 폭주 '빠빰'(1박 = 콤보 글자 쾅, 2박 = 몸에서 금빛 폭발 + 화면 글자) */
const highDur = () => HIGH.dur * (1 + (game.st.highPct || 0) + (has('overload') ? .8 : 0));
/* v38 새 계정은 신성 폭주를 쉽게 배운다: 튜토리얼 판과 그 뒤 처음 3번(FTUE.highEasy)은 2번만 밟아도 켜지고, 땅에 닿아도 콤보가 이어진다 */
const ftueEasyHigh = () => { const f = Meta.s.ftue; return !!game.tut || !!(f && (f.high || 0) < FTUE.highEasy.n); };
const highNeed = () => ftueEasyHigh() ? FTUE.highEasy.combo : HIGH.combo;
/* v56 A/B '끝없는 콤보'(디버그 전환, 기본은 꺼짐): 땅에 닿을 때까지 콤보를 계속 센다.
   - 신성 폭주 중에도 세고, 5콤보를 더 채울 때마다 폭주 시간이 다시 가득 찬다(단계 p.highTier = 지금까지 채운 5콤보 묶음 수)
   - 폭주가 끝나도 콤보는 그대로. 땅에 닿으면 0이 되고, 5콤보 이상이었으면 착지 보상(COMBO_LAND)
   지금 규칙(v34.1 · v34.2: 폭주 중엔 안 셈 · 5까지만)은 사용자가 정한 것이라 기본값으로 둔다. 둘을 폰에서 바꿔 가며 비교하기 위한 전환 */
const comboEndless = () => window.__comboRule === 'endless' && !game.tut;
const COMBO_LAND = { shard: 14, heal: .04, healFrom: 3 };   // 착지 보상: 단계마다 파편 14, 3단계(15콤보)부터 단계마다 체력 4%
function comboLand(p) {
  const g = game, tier = Math.floor(p.combo / HIGH.combo); if (tier < 1) return;
  spawnShards(p.x, p.y - 12, Math.round(COMBO_LAND.shard * tier * p.gemMul));
  let txt = `착지! ${p.combo} 콤보`;
  if (tier >= COMBO_LAND.healFrom && p.hp < p.maxHp) { const h = Math.round(p.maxHp * COMBO_LAND.heal * (tier - COMBO_LAND.healFrom + 1)); p.hp = Math.min(p.maxHp, p.hp + h); txt += ` · 체력 +${h}`; }
  popup(p.x, p.y - 52, txt, '#ffe27a', true); g.fx.push({ type: 'ring', x: p.x, y: p.y - 6, r: 60 + tier * 14, col: 'rgba(255,226,120,.9)', t: 0, life: .4 }); sfx.reward(); vibrate(25);
  g.comboLandN = (g.comboLandN || 0) + 1;
}
function addCombo() {
  const g = game, p = g.p; if (!p) return;
  if (g.tut && g.tutS) g.tutS.stomps++;
  if (p.high && !has('avatar') && !comboEndless()) return;   // v34.1 신성 폭주 중에는 콤보를 세지 않는다(사용자). v34.2: 콤보는 5까지만, 폭주가 끝나면 0부터. 신의 현현(판 내내 폭주)은 1~5를 돌며 센다
  p.combo++; g.maxCombo = Math.max(g.maxCombo, p.combo);
  if (g.st.comboStrike && p.combo >= HIGH.combo) smite();   // 제우스: 콤보 5(HIGH.combo)마다 낙뢰
  const list = g.cfx || (g.cfx = []);
  for (const f of list) if (f.kind === 'n') f.dead = true;   // 작은 글자는 하나만
  if (comboEndless() && !has('avatar')) {   // v56 끝없는 콤보: 다음 문턱(처음 = highNeed, 그 뒤 5콤보마다)을 넘을 때마다 켜거나 다시 채운다
    if (p.combo >= (p.comboNext || highNeed())) {
      p.comboNext = p.combo + HIGH.combo; p.highTier = Math.max(1, Math.floor(p.combo / HIGH.combo));
      list.push({ kind: 'max', text: p.combo + ' 콤보!', t: 0, life: 1.05 }); g.highN = (g.highN || 0) + 1;
      startHigh(p.high ? 'refresh' : 'on');
    } else list.push({ kind: 'n', n: p.combo, text: p.combo + ' 콤보', t: 0, life: .8 });
    g.cfx = list.filter(f => !f.dead); return;
  }
  if (p.combo >= highNeed()) {
    { const f = Meta.s.ftue; if (!g.tut && f && (f.high || 0) < FTUE.highEasy.n && !has('avatar')) { f.high = (f.high || 0) + 1; if (f.high >= FTUE.highEasy.n) g.ftueHighTip = true; } }
    list.push({ kind: 'max', text: p.combo + ' 콤보!', t: 0, life: 1.05 }); g.highN = (g.highN || 0) + 1;   // v34.2 임무·결과 화면의 '신성 폭주 n번'
    if (!has('avatar')) startHigh(p.high ? 'refresh' : 'on');   // 신의 현현은 이미 판 내내 켜져 있다
    else p.combo = 0;   // 신의 현현: 콤보는 1~5만 돈다
  } else list.push({ kind: 'n', n: p.combo, text: p.combo + ' 콤보', t: 0, life: .8 });
  g.cfx = list.filter(f => !f.dead);
}
/* 신성 폭주 켜기. mode: 'on' = 처음 켜짐(빠빰), 'refresh' = 켜진 채로 5콤보를 또 채움(시간을 다시 가득), 'free' = 보물 동굴 수정 */
function startHigh(mode = 'on') {
  const g = game, p = g.p; if (!p) return;
  const was = p.high; p.high = true; p.highT = highDur() * (g.zone === 'water' ? .8 : 1); p.highEnd = 0;
  if (g.zone === 'water') { g.o2=o2Max(); g.o2T=0; g.o2Glow=.75; g.fx.push({type:'ring',x:p.x,y:p.y-34,r:58,col:'rgba(118,229,255,.95)',t:0,life:.5}); for(let i=0;i<12;i++)g.fx.push({type:'dot',x:p.x+(Math.random()-.5)*22,y:p.y-24,vx:(Math.random()-.5)*44,vy:-70-Math.random()*85,t:0,life:.8,r:2+Math.random()*2.5,col:'rgba(200,248,255,.95)',g:0}); }
  if (mode === 'refresh' && was) {
    p.highFlare = 1; g.fx.push({ type: 'ring', x: p.x, y: p.y - 8, r: 74, col: 'rgba(255,226,120,.95)', t: 0, life: .35 });
    sparks(p.x, p.y - 8, 14, '#ffe59a', 260, .4, 2.6); (g.cfx || (g.cfx = [])).push({ kind: 'sub', text: '신성 폭주 연장', t: 0, life: 1 }); sfx.highUp(); vibrate(20);
    return;
  }
  // 1박: 콤보 글자가 쾅 찍힌다
  p.highIn = 0; p.highBeat = 0; g.hitStop = Math.max(g.hitStop, 3 / 60); g.shake = Math.max(g.shake, 7); g.whiteout = Math.max(g.whiteout, .12);
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 8, r: 46, col: 'rgba(255,255,255,.95)', t: 0, life: .16 });
  sfx.highBeat1(); vibrate(25);
}
/* 2박: 몸에서 금빛 기둥·충격파·불꽃, 화면 위쪽에 '신성 폭주!' */
function highBeat2() {
  const g = game, p = g.p;
  g.slowT = Math.max(g.slowT || 0, .28); g.whiteout = Math.max(g.whiteout, .3); g.shake = Math.max(g.shake, 12); vibrate(60);
  g.fx.push({ type: 'pillar', x: p.x, y: p.y, w: 52, col: '#ffc23a', t: 0, life: .6 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 8, r: 120, col: 'rgba(255,214,100,.95)', t: 0, life: .45 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 8, r: 190, col: 'rgba(255,245,200,.8)', t: 0, life: .6 });
  sparks(p.x, p.y - 8, 30, '#ffe59a', 380, .6, 3); chunks(p.x, p.y - 8, 14, ['#ffd24a', '#fff6c8', '#ff9a3a'], 320, 3.6);
  (g.cfx || (g.cfx = [])).push({ kind: 'high', text: '신성 폭주!', t: 0, life: 1.5 });
  sfx.highBeat2();
}
function highTick(dt) {
  const g = game, p = g.p;
  if (p.highIn !== undefined && p.highIn < 1) { p.highIn = Math.min(1, p.highIn + dt / .38); }
  if (p.highBeat !== undefined && p.highBeat >= 0) { p.highBeat += dt; if (p.highBeat >= HIGH.beat) { p.highBeat = -1; highBeat2(); } }
  if (p.highFlare) p.highFlare = Math.max(0, p.highFlare - dt * 3);
  if (p.high && !has('avatar')) {
    p.highT -= dt;
    const fi = p.highT <= HIGH.blink ? highFlickAt(p.highT) : -1;   // 전등이 끊기는 순간 지직 소리
    if (fi >= 0 && fi !== p.highFlick) sfx.highFlick();
    p.highFlick = fi;
    if (p.highT <= 0) { p.high = false; p.highT = 0; if (!comboEndless()) p.combo = 0; else p.comboNext = p.combo + HIGH.combo;   /* v34.2 콤보는 5까지만: 폭주가 끝나면 0부터 */ p.highEnd = .35; sparks(p.x, p.y - 8, 12, '#ffe59a', 160, .45, 2); sfx.highOff(); if (g.ftueHighTip) { g.ftueHighTip = false; ftueHighTip(); } }
  }
  if (p.highEnd > 0) p.highEnd = Math.max(0, p.highEnd - dt);
  if (g.cfx) { for (const f of g.cfx) f.t += dt; g.cfx = g.cfx.filter(f => f.t < f.life); }
}
/* v34 꺼지는 전등: 꺼지기 3초 전부터 평소엔 켜져 있다가 짧게 '탁' 끊긴다(0.06~0.09초). 처음엔 한 번씩 드문드문,
   끝으로 갈수록 두 번씩·잦아지고 빛도 조금씩 약해진 뒤 꺼진다. 빠르고 규칙적인 깜박임(초당 4.5~8번)은 눈이 아프고 알아보기 어려워 뺐다.
   끊기는 때는 남은 시간 기준 고정표(HIGH_FLICK: [가운데 초, 길이 초])라 매번 같은 박자로 읽힌다 */
const HIGH_FLICK = [[2.65, .07], [2.1, .06], [1.62, .06], [1.5, .08], [1.08, .07], [.96, .06], [.74, .08], [.6, .06], [.5, .07], [.4, .06], [.3, .06], [.2, .06], [.1, .07]];
const highFlickAt = r => { for (let i = 0; i < HIGH_FLICK.length; i++) { const [c, d] = HIGH_FLICK[i]; if (Math.abs(r - c) < d / 2) return i; } return -1; };
function highAlpha() {
  const p = game.p; if (has('avatar')) return 1; const r = p.highT;
  if (r > HIGH.blink) return 1;
  if (highFlickAt(r) >= 0) return .1;
  const k = r / HIGH.blink, t = game.t;   // 1 → 0: 빛이 조금씩 약해지고, 마지막 1초는 살짝 떨린다
  return .78 + .22 * k - (r < 1 ? .06 * (1 + Math.sin(t * 31) * Math.sin(t * 9)) : 0);
}
/* 아우라(주인공 뒤): 바깥 빛 + 몸을 감싸고 위로 타오르는 불꽃 혀 두 겹(바깥 주황 큰 불꽃, 안쪽 흰빛 작은 불꽃).
   가운데(머리 위) 불꽃이 가장 길다. 오프스크린 캔버스 없이 매번 그린다(아이폰 지침) */
function flameTongue(bx, by, h, w, sw, lean, c0, c1, c2) {
  const tx = bx + sw + lean * h, ty = by - h, fg = ctx.createLinearGradient(bx, by, tx, ty);
  fg.addColorStop(0, c0); fg.addColorStop(.45, c1); fg.addColorStop(1, c2);
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(bx - w, by);
  ctx.bezierCurveTo(bx - w * 1.1, by - h * .35, tx - w * .5 - sw * .3, ty + h * .35, tx, ty);
  ctx.bezierCurveTo(tx + w * .5 - sw * .3, ty + h * .35, bx + w * 1.1, by - h * .35, bx + w, by);
  ctx.quadraticCurveTo(bx, by + w, bx - w, by); ctx.fill();
}
function drawAuraBack() {
  const g = game, p = g.p; if (!p || !godMode()) return;
  const s = view.s, X = wx(p.x), Y = wy(p.y - 6), t = g.t, A = highAlpha(), inK = p.highIn === undefined ? 1 : p.highIn, grow = .5 + .5 * (1 - Math.pow(1 - inK, 3)), fl = 1 + (p.highFlare || 0) * .4;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A;
  // 바깥 빛: 세로로 긴 둥근 빛. 원 그라디언트를 가로로 줄여 그려 가장자리가 끝까지 부드럽게 사라진다
  const R = 54 * s * grow * fl; ctx.save(); ctx.translate(X, Y - 6 * s); ctx.scale(.8, 1);
  const og = ctx.createRadialGradient(0, 0, 6 * s, 0, 0, R); og.addColorStop(0, 'rgba(255,236,170,.5)'); og.addColorStop(.5, 'rgba(255,190,60,.2)'); og.addColorStop(1, 'rgba(255,140,30,0)');
  ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
  // 바깥 겹: 주황 큰 불꽃 11개(몸 아래 반원에서 솟는다)
  const N = 11;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), a = Math.PI * u, mid = Math.sin(a), bx = X - Math.cos(a) * 19 * s * grow, by = Y + 20 * s - mid * 6 * s;
    const h = (34 + 26 * mid + 10 * Math.sin(t * 8.1 + i * 2.1)) * s * grow * fl, w = (7 + 2 * mid) * s * grow, sw = Math.sin(t * 5.3 + i * 1.7) * 6 * s;
    flameTongue(bx, by, h, w, sw, -Math.cos(a) * .22, 'rgba(255,214,110,.75)', 'rgba(255,150,40,.42)', 'rgba(255,90,20,0)');
  }
  // 안쪽 겹: 흰빛 작은 불꽃 7개
  for (let i = 0; i < 7; i++) {
    const u = i / 6, a = Math.PI * (.12 + .76 * u), mid = Math.sin(a), bx = X - Math.cos(a) * 13 * s * grow, by = Y + 16 * s - mid * 4 * s;
    const h = (22 + 18 * mid + 7 * Math.sin(t * 10.3 + i * 2.7)) * s * grow * fl, w = 5 * s * grow, sw = Math.sin(t * 6.7 + i * 2.3) * 4 * s;
    flameTongue(bx, by, h, w, sw, -Math.cos(a) * .18, 'rgba(255,255,235,.85)', 'rgba(255,236,150,.5)', 'rgba(255,200,80,0)');
  }
  ctx.restore();
}
/* 아우라(주인공 앞): 몸 아래쪽을 감싸는 옅은 불꽃 + 위로 떠오르는 불씨. 상태를 저장하지 않고 시간으로 자리를 정한다 */
function drawAuraFront() {
  const g = game, p = g.p; if (!p) return;
  const s = view.s, X = wx(p.x), Y = wy(p.y - 6), t = g.t;
  if (godMode()) {
    const A = highAlpha(), inK = p.highIn === undefined ? 1 : p.highIn, grow = .5 + .5 * (1 - Math.pow(1 - inK, 3));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A * .5;
    for (let i = 0; i < 5; i++) {
      const u = i / 4, bx = X + (u - .5) * 30 * s * grow, by = Y + 22 * s, h = (14 + 6 * Math.sin(t * 9 + i * 1.9)) * s * grow, sw = Math.sin(t * 6 + i) * 3 * s;
      flameTongue(bx, by, h, 4.5 * s * grow, sw, 0, 'rgba(255,240,190,.7)', 'rgba(255,170,60,.35)', 'rgba(255,110,20,0)');
    }
    for (let i = 0; i < 14; i++) {
      const ph = (t * 1.05 + i * .137) % 1, x = X + Math.sin(i * 12.9 + t * 1.4) * 22 * s + Math.sin(t * 7 + i) * 2 * s, y = Y + 18 * s - ph * 78 * s, r = (2.4 * (1 - ph) + .5) * s;
      ctx.globalAlpha = A * (1 - ph) * inK; ctx.fillStyle = i % 3 ? '#ffe9a0' : '#fff7d6'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // 꺼지는 순간: 금빛이 위로 흩어진다
  if (p.highEnd > 0) { const k = 1 - p.highEnd / .35; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.strokeStyle = 'rgba(255,220,120,.9)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.ellipse(X, Y - k * 12 * s, (24 + k * 20) * s, (32 + k * 26) * s, 0, 0, 7); ctx.stroke(); ctx.restore(); }
}
/* 콤보·신성 폭주 글자(화면 맨 위층, 흰 섬광 위에 그린다). n = 밟을 때 작게, max = 5(HIGH.combo)의 배수, high = 화면 위쪽 큰 글자, sub = 연장 */
function drawComboFx() {
  const g = game, p = g.p; if (!p || !g.cfx || !g.cfx.length) return;
  const s = view.s, X = wx(p.x), Y = wy(p.y);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of g.cfx) {
    const k = f.t / f.life, out = clamp((1 - k) / .35, 0, 1);
    if (f.kind === 'n') {
      // 톡 튀어나와 살짝 떠오르며 사라진다. 8에 가까울수록 금빛
      const pop = f.t < .1 ? .55 + f.t / .1 * .75 : 1.3 - Math.min(1, (f.t - .1) / .12) * .3, q = clamp(f.n / HIGH.combo, 0, 1);
      const col = `rgb(255,${Math.round(255 - q * 40)},${Math.round(255 - q * 150)})`;
      ctx.globalAlpha = out; ctx.font = `${Math.round(17 * s * pop)}px ${FONT}`;
      textOut(f.text, X + 24 * s, Y - 56 * s - k * 16 * s, col, 3.4);
    } else if (f.kind === 'max') {
      // 크게 쾅 찍혔다가 자리를 잡고, 위로 빠지며 사라진다
      const slam = f.t < .13 ? 2.1 - f.t / .13 * 1.1 : 1 + Math.sin(Math.min(1, (f.t - .13) / .25) * Math.PI) * .08;
      ctx.globalAlpha = out; ctx.font = `${Math.round(24 * s * slam)}px ${FONT}`;
      const y = Y - 70 * s - Math.max(0, k - .55) * 40 * s;
      ctx.lineWidth = 5 * s; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,16,4,.95)'; ctx.strokeText(f.text, X, y);
      const gr = ctx.createLinearGradient(0, y - 12 * s, 0, y + 12 * s); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.5, '#ffd24a'); gr.addColorStop(1, '#ff9a2a');
      ctx.fillStyle = gr; ctx.fillText(f.text, X, y);
      if (f.t < .1) { ctx.globalAlpha = (1 - f.t / .1) * .9; ctx.fillStyle = '#fff'; ctx.fillText(f.text, X, y); }
    } else if (f.kind === 'sub') {
      ctx.globalAlpha = out * clamp(f.t / .12, 0, 1); ctx.font = `${Math.round(13 * s)}px ${FONT}`;
      textOut(f.text, X, Y - 50 * s - k * 10 * s, '#ffe9a0', 3);
    } else if (f.kind === 'high') {
      // 화면 위쪽: 빛줄기가 좌우로 뻗고 글자가 탄력 있게 커졌다가 자리 잡는다
      const cx = view.W / 2, cy = (view.safeT || 0) + (g.boss ? 118 : 96) * s, inA = clamp(f.t / .12, 0, 1), el = f.t < .3 ? 1 + Math.sin(f.t / .3 * Math.PI) * .35 * (1 - f.t / .3) + (1 - inA) * .5 : 1;
      ctx.globalAlpha = out;
      const lw = view.W * (.2 + .8 * (1 - Math.pow(1 - clamp(f.t / .3, 0, 1), 3))), lg = ctx.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0);
      lg.addColorStop(0, 'rgba(255,200,80,0)'); lg.addColorStop(.5, 'rgba(255,236,170,.9)'); lg.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = lg; ctx.fillRect(cx - lw / 2, cy - 1.5 * s, lw, 3 * s); ctx.globalAlpha = out * .5; ctx.fillRect(cx - lw * .4, cy + 20 * s, lw * .8, 1.6 * s); ctx.fillRect(cx - lw * .4, cy - 21 * s, lw * .8, 1.6 * s);
      ctx.globalAlpha = out; ctx.font = `${Math.round(34 * s * el)}px ${FONT}`;
      ctx.save(); ctx.shadowColor = 'rgba(255,190,60,.9)'; ctx.shadowBlur = 18 * s; ctx.lineWidth = 6 * s; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(60,20,0,.95)'; ctx.strokeText(f.text, cx, cy); ctx.restore();
      const gr = ctx.createLinearGradient(0, cy - 17 * s, 0, cy + 17 * s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.45, '#ffe066'); gr.addColorStop(1, '#ff8a1a');
      ctx.fillStyle = gr; ctx.fillText(f.text, cx, cy);
      // 글자 위를 한 번 훑는 빛
      if (f.t < .7) { const sx = cx - 90 * s + f.t / .7 * 180 * s; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = out * .7; const sg = ctx.createLinearGradient(sx - 14 * s, 0, sx + 14 * s, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillText(f.text, cx, cy); ctx.restore(); }
    }
  }
  ctx.restore();
}
