/* 로그라이크 카드 효과(2026-11-12 v30 전수 조사 개편). 카드 표는 cards.js, 이 파일은 효과의 동작과 그림.
   묶음(fam) 카드는 같은 효과의 등급 사다리다. 높은 등급을 얻으면 낮은 등급은 덮어쓰이고 다시 나오지 않는다.
   등급이 오를수록 효과가 커지고 그림도 한 겹씩 더해진다(일반 = 숫자만, 희귀 = 모양, 영웅 = 꼬리·막기, 전설 = 화면에서 바로 보이는 상시 연출) */
'use strict';
const famLv = fam => { let n = 0; for (const id of game.cards) { const c = CARD_BY[id]; if (c && c.fam === fam) n = Math.max(n, c.lv); } return n; };
/* 유도: 탄이 사라지기 전까지, 탄에서 r 안에 있는 일반 몬스터 쪽으로 휜다. turn = 초당 꺾이는 각도(라디안) */
const SEEK = [null, { r: 40, turn: 4, col: '#9ff5d0' }, { r: 80, turn: 6, col: '#7fc4ff' }, { r: 240, turn: 10, col: '#e6a8ff' }];
/* 궤도 구슬: n개, 반지름 R, 크기 size, 공격력 배율 dmg, 적 탄 막기 block. 전설은 불·얼음·번개·바람 4원소 */
const ORB = [null,
  { n: 2, R: 40, size: 5.5, dmg: .4, spd: 3.6, block: false },
  { n: 3, R: 46, size: 7, dmg: .6, spd: 4, block: true },
  { n: 4, R: 56, size: 9.5, dmg: 1.4, spd: 4.4, block: true, el: ['fire', 'ice', 'bolt', 'wind'] }];
const ORB_COL = { fire: ['#ff8a3a', '#ffe2a0'], ice: ['#7fd8ff', '#e8fbff'], bolt: ['#ffe14a', '#fffbd0'], wind: ['#e8f4ff', '#ffffff'], blue: ['#4aa8ff', '#e0f4ff'] };
const godMode = () => { const p = game.p; return !!(p && (p.high || has('avatar'))); };   // 신성 폭주 상태(신의 현현은 판 내내)

/* 탄 하나를 쏠 때의 모양: 없음 1발 · 희귀 나란히 2발 · 영웅 3갈래 · 전설 5갈래 부채 */
function fireVolley(x, y, hand, mul, big) {
  const lv = famLv('shot');
  if (lv === 0) { fireBullet(x, y, 0, 1150, false, hand, { mul, big }); return; }
  if (lv === 1) { for (const d of [-7, 7]) fireBullet(x + d, y, 0, 1150, false, hand, { mul: mul * .75, big }); return; }
  if (lv === 2) { fireBullet(x, y, 0, 1150, false, hand, { mul, big }); for (const s of [-1, 1]) fireBullet(x, y, s * 330, 1100, false, hand, { mul: mul * .85, big }); return; }
  for (const vx of [-600, -300, 0, 300, 600]) { fireBullet(x, y, vx, 1100 - Math.abs(vx) * .12, false, hand, { mul: mul * .9, big }); game.bullets[game.bullets.length - 1].fan = true; }
}
/* 유도 값: 카드(바람 길잡이·사냥꾼의 눈·아르테미스의 표식), 하데스의 영혼불, 올빼미·히드라 탄 중 가장 센 것 */
function seekOf(b) {
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
  let t = null, d = s.r;
  for (const e of game.enemies) if (e.alive && !e.hidden && !b.hits.includes(e)) { const q = Math.hypot(e.x - b.x, e.y - b.y) - e.r; if (q < d) { d = q; t = e; } }
  b.tgt = t; if (!t) return;
  // 꺾는 힘은 가까울수록 커진다(속도 ÷ 남은 거리): 반경 안에 들어온 적은 빗나가지 않고 휘어 들어가 맞는다. 등급 차이는 알아채는 반경
  const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(t.y - b.y, t.x - b.x), c = Math.atan2(b.vy, b.vx), turn = s.turn + (s.prop ? 2.6 * sp / Math.max(8, d + t.r) : 0);
  let dA = a - c; while (dA > Math.PI) dA -= Math.PI * 2; while (dA < -Math.PI) dA += Math.PI * 2;
  const na = c + clamp(dA, -turn * dt, turn * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
}
/* 궤도 구슬: 몸 주위를 돌며 일반 몬스터를 때리고(보스·중간 보스 제외), 영웅부터는 적의 탄을 지운다 */
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
    if (O.block) for (const b of g.ebul) if (!b.dead && !b.pool && Math.hypot(b.x - ox, b.y - oy) < O.size + (b.r || 5) + 3) {
      b.dead = true; sparks(b.x, b.y, 5, el ? ORB_COL[el][1] : '#bfe6ff', 170, .22); g.fx.push({ type: 'ring', x: b.x, y: b.y, r: 16, col: 'rgba(200,240,255,.95)', t: 0, life: .18 }); sfx.ping();
    }
  }
}
/* 천둥 폭풍(전설): 0.8초마다 화면 안의 일반 몬스터 하나에 하늘에서 벼락, 옆 2마리로 번진다. 땅에 서 있어도 내린다 */
function stormTick(dt) {
  if (!has('storm')) return;
  const g = game, p = g.p; p.stormT = (p.stormT || 0) + dt; if (p.stormT < .8) return;
  const top = g.cam + 10, bot = g.cam + view.worldH - 10, list = g.enemies.filter(e => e.alive && !e.hidden && e.y > top && e.y < bot);
  if (!list.length) { p.stormT = .8; return; }
  p.stormT = 0;
  const e = list[Math.floor(Math.random() * list.length)];
  g.fx.push({ type: 'bolt', x: e.x, y: e.y, t: 0, life: .22, seed: Math.random() * 100 });
  g.fx.push({ type: 'ring', x: e.x, y: e.y, r: 46, col: 'rgba(255,240,140,.95)', t: 0, life: .25 });
  sparks(e.x, e.y, 10, '#fff6a8', 260, .3); g.shake = Math.max(g.shake, 4); g.whiteout = Math.max(g.whiteout, .06); sfx.zap(); sfx.boom();
  hitEnemy(e, Math.round(atkNow() * 1.6), false, e.x, e.y);
  chainFrom(e, 2, Math.round(atkNow() * 1.6));
}
/* ───── 그림 ───── */
/* 유도탄 꼬리: 일반 = 옅은 민트 실, 희귀 = 파란 줄, 전설 = 보라·금 소용돌이. 전설은 노린 적에 표식 */
function drawSeekTrail(b, x, y) {
  const s = view.s, tier = b.sk || 0; if (!tier) return;
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = -b.vx / sp, uy = -b.vy / sp, L = (tier === 3 ? 38 : tier === 2 ? 30 : 20) * s;
  ctx.lineCap = 'round';
  if (tier === 3) {
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
  if (famLv('seek') === 3) {
    const seen = new Set(); for (const b of g.bullets) if (b.tgt && b.tgt.alive) seen.add(b.tgt);
    for (const e of seen) { const x = wx(e.x), y = wy(e.y), r = (e.r + 10) * s * (1 + .15 * Math.sin(g.t * 14)); ctx.strokeStyle = 'rgba(230,160,255,.95)'; ctx.lineWidth = 2 * s;
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
  // 신의 현현: 판 내내 몸에 금빛 기운(빛살 6개가 돈다)
  if (has('avatar')) {
    const X = wx(p.x), Y = wy(p.y - 8);
    ctx.globalAlpha = .5; const ag = ctx.createRadialGradient(X, Y, 4 * s, X, Y, 44 * s); ag.addColorStop(0, 'rgba(255,230,140,.55)'); ag.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(X, Y, 44 * s, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,226,120,.8)'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a = g.t * 1.6 + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * 26 * s, Y + Math.sin(a) * 26 * s); ctx.lineTo(X + Math.cos(a) * 38 * s, Y + Math.sin(a) * 38 * s); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
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
