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
/* v48(2026-11-23 사용자 요청: "독뱀이 고정 자리에 붙어만 있고 공격 · 대기 모션도 탄도 안 보인다. 날아다니며 따라와야 한다")
   PET_SLOT = 머물고 싶어 하는 자리(몸 기준, 궁수의 전설 2 요정처럼 어깨 위 · 뒤쪽 한 몸길이 안팎). 동료는 이 자리를 중심으로 작게 맴돌고,
   주인공이 움직이면 PET_FLY.follow 빠르기로 뒤따라온다(빨리 떨어지면 위로 길게 늘어섰다가 따라붙는다). lag = 가장 멀리 처지는 거리, size = 그리는 크기, shotV · shotR = 탄 속도 · 크기 */
const PET_SLOT = [[-30, -34], [32, -40], [-46, -8], [48, -14], [0, -62], [-20, -78]];
const PET_FLY = { follow: 6.5, lag: 96, orbit: 9, size: 30, shotV: 330, shotR: 6.5, kick: .28 };
const petList = () => { const g = game, out = []; if (has('owl')) out.push('owl'); for (const id of g.cardList) if (PETS[id] && !out.includes(id)) out.push(id); return out; };
const petMul = () => 1 + (has('pet_up') ? .4 : 0) + (has('pet_rage') ? .5 : 0);
const petHaste = () => has('pet_rage') ? .7 : 1;
const hasPet = () => has('owl') || PET_IDS.some(has);
/* 동료가 머물고 싶어 하는 자리(작게 맴돈다) */
function petHome(i) { const g = game, p = g.p, s = PET_SLOT[i % PET_SLOT.length], t = g.t; return [p.x + (p.face || 1) * s[0] + Math.cos(t * 1.1 + i * 1.9) * PET_FLY.orbit, p.y + s[1] + Math.sin(t * 1.7 + i * 2.3) * PET_FLY.orbit * .8]; }
/* 지금 있는 자리: petMove가 매 프레임 따라가게 한 값. 아직 없으면 머무는 자리 */
function petPos(i) { const g = game, st = g.petS, q = st && st.pos && st.pos[i]; if (q) return [q.x, q.y]; return petHome(i); }
function petMove(dt, n) {
  const g = game, st = g.petS; st.pos = st.pos || [];
  for (let i = 0; i < n; i++) {
    const [hx, hy] = petHome(i); let q = st.pos[i]; if (!q) q = st.pos[i] = { x: hx, y: hy, vx: 0, vy: 0, kick: 0, kx: 0, ky: 0, face: 1 };
    const ox = q.x, oy = q.y, k = Math.min(1, dt * PET_FLY.follow); q.x += (hx - q.x) * k; q.y += (hy - q.y) * k;
    const dx = q.x - hx, dy = q.y - hy, d = Math.hypot(dx, dy); if (d > PET_FLY.lag) { q.x = hx + dx / d * PET_FLY.lag; q.y = hy + dy / d * PET_FLY.lag; }   // 너무 멀리 처지지는 않는다
    q.vx = (q.x - ox) / Math.max(dt, .001); q.vy = (q.y - oy) / Math.max(dt, .001); q.kick = Math.max(0, q.kick - dt / PET_FLY.kick);
    if (Math.abs(q.vx) > 24) q.face = q.vx > 0 ? 1 : -1;
  }
  st.pos.length = n;
}
/* 공격하는 순간: 대상 반대쪽으로 움찔 밀리고(kick) 대상 쪽을 본다. 입 앞에 번쩍임 */
function petKick(i, tx, ty, col) { const g = game, q = g.petS.pos[i]; if (!q) return; const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy) || 1; q.kick = 1; q.kx = -dx / d; q.ky = -dy / d; q.face = dx >= 0 ? 1 : -1; g.fx.push({ type: 'ring', x: q.x + dx / d * 12, y: q.y + dy / d * 12, r: 13, col, t: 0, life: .16 }); }
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
  petMove(dt, list.length);
  for (let i = 0; i < list.length; i++) {
    const id = list[i], P = PETS[id]; if (!P) continue;
    const every = P.every * haste, [x, y] = petPos(i);
    st.t[id] = Math.min(every, (st.t[id] === undefined ? every * .5 : st.t[id]) + dt);
    if (st.t[id] < every) continue;
    const o = petTarget(x, y, P.el === 'laser' ? PET_RANGE + 80 : PET_RANGE); if (!o) continue;
    st.t[id] = 0;
    const { dmg, crit } = rollDamage(P.mul * k), T = foePt(o);
    petKick(i, T.x, T.y, P.el === 'psn' ? 'rgba(190,120,255,.95)' : P.el === 'fire' ? 'rgba(255,170,90,.95)' : P.el === 'ice' ? 'rgba(160,230,255,.95)' : 'rgba(255,240,150,.95)');
    if (P.el === 'bolt') { g.fx.push({ type: 'arc', x, y, x2: T.x, y2: T.y, t: 0, life: .22 }); g.fx.push({ type: 'ring', x: T.x, y: T.y, r: 26, col: 'rgba(255,240,150,.95)', t: 0, life: .22 }); petHit(o, P, 'bolt', dmg, crit, T.x, T.y); sparks(T.x, T.y, 9, P.col[0], 220, .3); sfx.zap(); }
    else if (P.el === 'laser') { const a = Math.atan2(T.y - y, T.x - x); st.beams.push({ i, a, len: 460, t: 0, life: .42, n: 0, dmg, crit, col: P.col }); sfx.zap(); }
    else { st.shots.push({ x, y, o, el: P.el, P, dmg, crit, t: 0, v: PET_FLY.shotV, sp: Math.random() * 6 }); if (sfx.spit && Math.random() < .6) sfx.spit(); }
  }
  // 날아가는 침 · 불씨 · 얼음 조각: 대상을 끝까지 쫓는다. 대상이 사라지면 가까운 다른 적으로
  for (const s of st.shots) {
    s.t += dt;
    if (!foeAlive(s.o)) { s.o = petTarget(s.x, s.y, 200); if (!s.o) { s.dead = true; sparks(s.x, s.y, 3, s.P.col[0], 90, .2); continue; } }
    const T = foePt(s.o), dx = T.x - s.x, dy = T.y - s.y, d = Math.hypot(dx, dy) || 1, mv = s.v * dt;
    if (d <= T.r + mv + 4) { petHit(s.o, s.P, s.el, s.dmg, s.crit, T.x - dx / d * T.r * .6, T.y - dy / d * T.r * .6); s.dead = true; continue; }
    s.x += dx / d * mv; s.y += dy / d * mv; s.a = Math.atan2(dy, dx); if (s.t > 2.5) s.dead = true;
    s.tr = (s.tr || 0) + dt; if (s.tr > .035) { s.tr = 0; g.fx.push({ type: 'dot', x: s.x + (Math.random() - .5) * 5, y: s.y + (Math.random() - .5) * 5, vx: -dx / d * 30 + (Math.random() - .5) * 20, vy: -dy / d * 30 + (s.el === 'psn' ? 40 : s.el === 'fire' ? -30 : 0), t: 0, life: .32, r: s.el === 'ice' ? 2 : 2.8, col: s.el === 'ice' ? '#e8fbff' : s.P.col[0], g: 0 }); }
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
/* 그리기: 주인공 바로 뒤에 부른다(render.js). 아이콘 그림(c_아이디)을 띄운다.
   대기 = 위아래로 둥실 · 날갯짓하듯 납작해졌다 펴짐 · 가는 쪽으로 기울기 / 모으기 = 빛이 차오르고 마지막에 떨림 · 부풀기 / 공격 = 대상 반대쪽으로 움찔 + 번쩍 + 커졌다 돌아옴 */
function drawPets() {
  const g = game, p = g.p, s = view.s; if (!p) return;
  const list = petList(), st = g.petS;
  for (let i = 0; i < list.length; i++) {
    const id = list[i], im = IMG['c_' + id], P = PETS[id], q = st && st.pos && st.pos[i], [px, py] = petPos(i);
    const kick = q ? q.kick : 0, kc = kick * kick, ch = P && st ? Math.min(1, (st.t[id] || 0) / (P.every * petHaste())) : 0, wind = Math.max(0, (ch - .7) / .3);
    const X = wx(px + (q ? q.kx * 9 * kc : 0) + (wind > 0 ? (Math.random() - .5) * 1.6 * wind : 0)), Y = wy(py + (q ? q.ky * 9 * kc : 0) + Math.sin(g.t * 5.2 + i * 1.7) * 3);
    // 발밑 그림자 대신 뒤에 옅은 빛(어두운 맵에서 분리) + 모으는 빛
    if (P) { const big = P.el === 'bolt' || P.el === 'laser', r = (13 + (big ? 9 : 6) * ch + 6 * kc) * s; ctx.globalAlpha = (.14 + .3 * ch * ch + .4 * kc) * (.85 + .15 * Math.sin(g.t * 16)); ctx.fillStyle = P.col[0]; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      if (wind > 0) { ctx.strokeStyle = P.col[1]; ctx.globalAlpha = .7 * wind; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(X, Y, (22 - 9 * wind) * s, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; } }   // 조여 드는 고리 = 곧 쏜다
    if (!ok(im)) continue;
    const box = PET_FLY.size * s, k0 = Math.min(box / im.naturalWidth, box / im.naturalHeight), flap = Math.sin(g.t * 9 + i * 2.1), sc = 1 + .1 * wind + .28 * kc;
    const w = im.naturalWidth * k0 * sc * (1 + flap * .05), h = im.naturalHeight * k0 * sc * (1 - flap * .07), lean = q ? clamp(q.vx * .0016, -.3, .3) + Math.sin(g.t * 3.1 + i) * .07 : 0;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(lean); if ((q ? q.face : (p.face || 1)) < 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h);
    if (kc > .05) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = kc * .55; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  if (!st) return;
  // 탄: 독 = 보라 방울(뒤로 길쭉) · 불씨 = 깜박이는 불꽃 · 얼음 = 뾰족한 조각. 둘레에 어두운 테와 빛
  for (const b of st.shots) {
    const X = wx(b.x), Y = wy(b.y), r = PET_FLY.shotR * s, a = b.a !== undefined ? b.a : (() => { const T = foePt(b.o); return Math.atan2(T.y - b.y, T.x - b.x); })(), fl = .85 + .15 * Math.sin(g.t * 30 + b.sp);
    ctx.globalAlpha = .3; ctx.fillStyle = b.P.col[0]; ctx.beginPath(); ctx.arc(X, Y, r * 2.1, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
    if (b.el === 'ice') { ctx.fillStyle = 'rgba(10,20,40,.6)'; ctx.beginPath(); ctx.moveTo(r * 1.9, 0); ctx.lineTo(0, r * .95); ctx.lineTo(-r * 1.5, 0); ctx.lineTo(0, -r * .95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = b.P.col[0]; ctx.beginPath(); ctx.moveTo(r * 1.6, 0); ctx.lineTo(0, r * .7); ctx.lineTo(-r * 1.2, 0); ctx.lineTo(0, -r * .7); ctx.closePath(); ctx.fill(); ctx.fillStyle = b.P.col[1]; ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(0, r * .3); ctx.lineTo(-r * .5, 0); ctx.lineTo(0, -r * .3); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(14,8,26,.55)'; ctx.beginPath(); ctx.ellipse(-r * .3, 0, r * 1.75, r * 1.12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = b.P.col[0]; ctx.beginPath(); ctx.moveTo(r * 1.05, 0); ctx.quadraticCurveTo(r * .5, r * .95 * fl, -r * .3, r * .78); ctx.quadraticCurveTo(-r * 1.2, r * .4, -r * 2 * fl, 0); ctx.quadraticCurveTo(-r * 1.2, -r * .4, -r * .3, -r * .78); ctx.quadraticCurveTo(r * .5, -r * .95 * fl, r * 1.05, 0); ctx.fill();
      ctx.fillStyle = b.P.col[1]; ctx.beginPath(); ctx.ellipse(r * .15, 0, r * .5, r * .38, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  for (const b of st.beams) {
    const [px, py] = petPos(b.i), k = b.t / b.life, X0 = wx(px), Y0 = wy(py), X1 = wx(px + Math.cos(b.a) * b.len), Y1 = wy(py + Math.sin(b.a) * b.len);
    ctx.lineCap = 'round';
    for (const [w, c] of [[12, `rgba(94,232,255,${.3 * (1 - k)})`], [5, `rgba(180,245,255,${.9 * (1 - k * .6)})`], [2, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w * s * (1 - k * .5); ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
  }
}
