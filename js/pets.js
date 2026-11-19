/* v39 동료 신수(pets.js): 카드로 얻는 작은 동료. 궁수의 전설 2의 요정(독 · 화염 · 번개 · 고드름 · 레이저)에 해당한다.
   올빼미(owl)는 내가 쏠 때 같이 쏜다(play.js). 나머지는 스스로 시간마다 화면 안의 가까운 적을 공격한다(땅에 서 있어도).
   피해 = 탄 한 발 기준 배수(mul). 내 탄 카드 효과(갈래 · 관통 · 번개 탄 …)는 붙지 않는다 → 한 장으로 확 세지지 않고 조금씩 세진다.
   동료 강화: 신수 조련(pet_up) 피해 +40% · 신수 광폭(pet_rage) 피해 +50% + 공격 간격 -30%. 올빼미 탄에도 든다 */
'use strict';
const PETS = {
  pet_snake: { every: 2.4, mul: .6, el: 'psn', col: ['#b06cff', '#ecd6ff'] },    // 독: 맞은 적이 3초 동안 중독(0.5초마다 탄의 15%)
  pet_fire: { every: 1.6, mul: .9, el: 'fire', col: ['#ff8a3a', '#ffe2a0'] },    // 불씨: 가장 자주 쏜다
  pet_bolt: { every: 3, mul: 2.2, el: 'bolt', col: ['#ffe14a', '#fffbd0'] },    // 번개: 모았다가 한 번에
  pet_ice: { every: 2.6, mul: .8, el: 'ice', col: ['#7fd8ff', '#e8fbff'] },       // 얼음: 맞은 적이 0.7초 언다(보스 제외)
  pet_laser: { every: 3.6, mul: .9, el: 'laser', col: ['#5ee8ff', '#ffffff'] },     // 광선: 지나는 길의 적 모두 3번
};
const PET_IDS = Object.keys(PETS), PET_RANGE = 330, PET_PSN = { dur: 3, tick: .5, mul: .15 };   // v39 첫 측정: 동료 1마리가 내 화력의 3~5%뿐이라 눈에 안 띄었다 → 약 2배(1마리 ≈ 10%)
const PET_SLOT = [[-24, -26], [26, -32], [-38, -2], [40, -8], [0, -52], [-16, -66]];   // 몸 기준 자리(바라보는 쪽에 따라 좌우가 뒤집힌다)
const petList = () => { const g = game, out = []; if (has('owl')) out.push('owl'); for (const id of g.cardList) if (PETS[id] && !out.includes(id)) out.push(id); return out; };
const petMul = () => 1 + (has('pet_up') ? .4 : 0) + (has('pet_rage') ? .5 : 0);
const petHaste = () => has('pet_rage') ? .7 : 1;
const hasPet = () => has('owl') || PET_IDS.some(has);
function petPos(i) { const p = game.p, s = PET_SLOT[i % PET_SLOT.length]; return [p.x + (p.face || 1) * s[0], p.y + s[1] + Math.sin(game.t * 4 + i * 1.7) * 4]; }
/* 화면 안에서 (x, y)에 가장 가까운 적(보스 · 중간 보스 포함) */
function petTarget(x, y, range = PET_RANGE) {
  const g = game, top = g.cam - 10, bot = g.cam + view.worldH + 10; let best = null, bd = range;
  for (const e of g.enemies) { if (!e.alive || e.hidden || e.y < top || e.y > bot) continue; const d = Math.hypot(e.x - x, e.y - y) - e.r; if (d < bd) { bd = d; best = e; } }
  for (const o of bigFoes()) { const P = foePt(o); if (P.y < top || P.y > bot) continue; const d = Math.hypot(P.x - x, P.y - y) - P.r; if (d < bd) { bd = d; best = o; } }
  return best;
}
const foeAlive = o => !!o && (isBig(o) ? o.alive !== false && o.hp > 0 : o.alive);
function petHit(o, P, el, dmg, crit, x, y) {
  const g = game;
  hitFoe(o, dmg, crit, x, y);
  if (el === 'psn') { if (foeAlive(o)) { o.psn = PET_PSN.dur; o.psnD = Math.max(1, Math.round(dmg / P.mul * PET_PSN.mul)); o.psnK = 0; } sparks(x, y, 5, P.col[0], 150, .28); }
  else if (el === 'fire') { sparks(x, y, 6, P.col[0], 190, .26); g.fx.push({ type: 'ring', x, y, r: 18, col: 'rgba(255,170,90,.95)', t: 0, life: .16 }); }
  else if (el === 'ice') { if (!isBig(o) && o.alive) { o.frz = Math.max(o.frz || 0, .7); g.fx.push({ type: 'ring', x: o.x, y: o.y, r: o.r + 10, col: 'rgba(160,230,255,.95)', t: 0, life: .25 }); } sparks(x, y, 5, P.col[1], 150, .26); }
}
function petTick(dt) {
  const g = game, p = g.p; if (!p) return;
  const st = g.petS || (g.petS = { t: {}, shots: [], beams: [] });
  // 중독: 일반 몬스터와 보스 · 중간 보스 모두 0.5초마다
  const psn = o => { if (!(o.psn > 0)) return; o.psn -= dt; o.psnK = (o.psnK || 0) + dt; if (o.psnK >= PET_PSN.tick) { o.psnK -= PET_PSN.tick; const P = foePt(o); hitFoe(o, o.psnD, false, P.x, P.y); if (Math.random() < .7) g.fx.push({ type: 'dot', x: P.x + (Math.random() - .5) * P.r, y: P.y - P.r * .4, vx: (Math.random() - .5) * 20, vy: -34 - Math.random() * 20, t: 0, life: .5, r: 2.6, col: '#b06cff', g: 0 }); } };
  for (const e of g.enemies) if (e.alive) psn(e);
  for (const o of bigFoes()) psn(o);
  const list = petList(), k = petMul(), haste = petHaste();
  for (let i = 0; i < list.length; i++) {
    const id = list[i], P = PETS[id]; if (!P) continue;
    const every = P.every * haste, [x, y] = petPos(i);
    st.t[id] = Math.min(every, (st.t[id] === undefined ? every * .5 : st.t[id]) + dt);
    if (st.t[id] < every) continue;
    const o = petTarget(x, y, P.el === 'laser' ? PET_RANGE + 80 : PET_RANGE); if (!o) continue;
    st.t[id] = 0;
    const { dmg, crit } = rollDamage(P.mul * k), T = foePt(o);
    if (P.el === 'bolt') { g.fx.push({ type: 'arc', x, y, x2: T.x, y2: T.y, t: 0, life: .14 }); petHit(o, P, 'bolt', dmg, crit, T.x, T.y); sparks(T.x, T.y, 6, P.col[0], 200, .25); sfx.zap(); }
    else if (P.el === 'laser') { const a = Math.atan2(T.y - y, T.x - x); st.beams.push({ i, a, len: 460, t: 0, life: .42, n: 0, dmg, crit, col: P.col }); sfx.zap(); }
    else st.shots.push({ x, y, o, el: P.el, P, dmg, crit, t: 0, v: 430 });
  }
  // 날아가는 침 · 불씨 · 얼음 조각: 대상을 끝까지 쫓는다. 대상이 사라지면 가까운 다른 적으로
  for (const s of st.shots) {
    s.t += dt;
    if (!foeAlive(s.o)) { s.o = petTarget(s.x, s.y, 200); if (!s.o) { s.dead = true; sparks(s.x, s.y, 3, s.P.col[0], 90, .2); continue; } }
    const T = foePt(s.o), dx = T.x - s.x, dy = T.y - s.y, d = Math.hypot(dx, dy) || 1, mv = s.v * dt;
    if (d <= T.r + mv + 4) { petHit(s.o, s.P, s.el, s.dmg, s.crit, T.x - dx / d * T.r * .6, T.y - dy / d * T.r * .6); s.dead = true; continue; }
    s.x += dx / d * mv; s.y += dy / d * mv; if (s.t > 2.5) s.dead = true;
  }
  if (st.shots.some(s => s.dead)) st.shots = st.shots.filter(s => !s.dead);
  // 광선: 0.12초마다 3번, 지나는 길(굵기 12)의 적 모두
  for (const b of st.beams) {
    b.t += dt; const [x, y] = petPos(b.i);
    while (b.n < 3 && b.t >= b.n * .12) {
      b.n++; const ca = Math.cos(b.a), sa = Math.sin(b.a);
      const near = (px, py, r) => { const u = (px - x) * ca + (py - y) * sa; return u > -r && u < b.len + r && Math.abs((px - x) * sa - (py - y) * ca) < r + 6; };
      for (const e of g.enemies) if (e.alive && !e.hidden && near(e.x, e.y, e.r)) { hitEnemy(e, b.dmg, b.crit, e.x, e.y); sparks(e.x, e.y, 3, b.col[0], 140, .2); }
      for (const o of bigFoes()) { const T = foePt(o); if (near(T.x, T.y, T.r)) hitFoe(o, b.dmg, b.crit, T.x, T.y); }
    }
  }
  if (st.beams.some(b => b.t >= b.life)) st.beams = st.beams.filter(b => b.t < b.life);
}
/* 그리기: 주인공 바로 뒤에 부른다(render.js). 아이콘 그림(c_아이디)을 작게 띄운다 */
function drawPets() {
  const g = game, p = g.p, s = view.s; if (!p) return;
  const list = petList(), st = g.petS;
  for (let i = 0; i < list.length; i++) {
    const id = list[i], im = IMG['c_' + id], [px, py] = petPos(i), X = wx(px), Y = wy(py), P = PETS[id];
    if (P && st) {   // 모으는 빛: 다음 공격까지 찬 만큼. 번개 · 광선은 크게
      const k = Math.min(1, (st.t[id] || 0) / (P.every * petHaste())), big = P.el === 'bolt' || P.el === 'laser';
      if (big || k > .75) { ctx.globalAlpha = (big ? .16 + .34 * k : (k - .75) * 1.6) * (.8 + .2 * Math.sin(g.t * 18)); ctx.fillStyle = P.col[0]; ctx.beginPath(); ctx.arc(X, Y, (big ? 9 + 7 * k : 12) * s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    }
    if (!ok(im)) continue;
    const box = 22 * s, q = Math.min(box / im.naturalWidth, box / im.naturalHeight), w = im.naturalWidth * q, h = im.naturalHeight * q;
    ctx.save(); ctx.translate(X, Y); if ((p.face || 1) < 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  }
  if (!st) return;
  for (const b of st.shots) {
    const X = wx(b.x), Y = wy(b.y), r = (b.el === 'fire' ? 4.6 : 4) * s, T = foePt(b.o), a = Math.atan2(T.y - b.y, T.x - b.x);
    ctx.globalAlpha = .35; ctx.fillStyle = b.P.col[0]; for (let q = 1; q <= 3; q++) { ctx.beginPath(); ctx.arc(X - Math.cos(a) * q * 5 * s, Y - Math.sin(a) * q * 5 * s, r * (1 - q * .2), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(10,10,30,.5)'; ctx.beginPath(); ctx.arc(X, Y, r * 1.25, 0, 7); ctx.fill();
    const og = ctx.createRadialGradient(X - r * .3, Y - r * .3, r * .1, X, Y, r); og.addColorStop(0, b.P.col[1]); og.addColorStop(1, b.P.col[0]); ctx.fillStyle = og; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
  }
  for (const b of st.beams) {
    const [px, py] = petPos(b.i), k = b.t / b.life, X0 = wx(px), Y0 = wy(py), X1 = wx(px + Math.cos(b.a) * b.len), Y1 = wy(py + Math.sin(b.a) * b.len);
    ctx.lineCap = 'round';
    for (const [w, c] of [[12, `rgba(94,232,255,${.3 * (1 - k)})`], [5, `rgba(180,245,255,${.9 * (1 - k * .6)})`], [2, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w * s * (1 - k * .5); ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
  }
}
