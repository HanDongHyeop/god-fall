/* 챕터별 몬스터 능력·강화 개체·바닥 장판·늦게 터지는 공격(2026-11-06). 표는 data.js의 MON_SKILL·SKILL_DEF·ELITE.
   모든 능력은 예고(몸 둘레 빛 고리가 조여 들고 몸이 떤다) → 발사 순서. 죽을 때 쓰는 능력은 0.35초 뒤에 터져 피할 틈을 준다 */
'use strict';

/* 웨이브를 만든 뒤: 이 챕터에서 능력을 갖는 종에게 능력을 붙이고, 일부는 강화 개체로 만든다 */
function decorateWave(R) {
  // 챕터 안 판 1·2 → 웨이브 1·2 값, 판 4·5 → 웨이브 3 값. 심층(챕터 7~12)은 능력 개체가 더 많고 강화 개체가 1.8배
  const g = game, tbl = MON_SKILL[g.biome.id] || {}, wi = [0, 1, 1, 2, 2, 2][stageOf(g.wave) - 1], easy = chapterOf(g.wave) === 0 ? 0 : 1;
  const rate = Math.min(.95, MON_SKILL_RATE[wi] * easy * (g.deep ? 1.25 : 1)), er = ELITE.rate[wi] * easy * (g.deep ? 1.8 : 1);
  for (const e of g.enemies) {
    const sk = tbl[e.kind]; if (!sk || e.still) continue;   // 가시 장벽(멈춘 성게)은 그대로 둔다
    if (R() >= rate) continue;
    e.sk = sk; e.skT = 1.2 + R() * 1.8;
    if (R() * rate < er) makeElite(e);
  }
}
function makeElite(e) {
  const r0 = e.r; e.elite = true; e.sc = ELITE.size; e.r = Math.round(e.r * ELITE.size);
  e.hp = e.maxHp = Math.round(e.maxHp * ELITE.hp); e.gem *= ELITE.gem; e.dmg = Math.round(e.dmg * 1.2);
  if (e.kind === 'mound' || e.kind === 'tick' || e.kind === 'spit') e.y -= e.r - r0;
}
const skCol = e => (SKILL_DEF[e.sk] && SKILL_DEF[e.sk].col) || '#ff9a8a';
function monShot(e, a, v, o = {}) {
  const g = game; g.ebul.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: o.r || 6, dmg: Math.round(e.dmg * .8), t: 0, col: o.col || skCol(e), g: o.g || 0, pool: o.pool, ghost: o.ghost });
}
const shotV = () => Math.min(250, 140 + game.lvM * 5);

/* 매 프레임: 움직임 뒤, 충돌 앞 */
function monSkillTick(e, dt) {
  const g = game, p = g.p, sk = e.sk; if (!sk) return;
  if (e.beamT > 0) {   // 광선이 켜져 있는 동안
    e.beamT -= dt;
    if (p.inv <= 0 && Math.abs(p.y - e.beamY) < 7 + p.h / 2 - 4) { hurt(e.x, e.dmg); }
    return;
  }
  if (e.blinkT > 0) { e.blinkT -= dt; if (e.blinkT <= 0) endBlink(e); return; }
  if (e.chargeT > 0) { e.chargeT -= dt; if (e.chargeT <= 0) { e.spd = e.spd0; e.charging = false; } return; }
  if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) monFire(e); return; }
  if (sk === 'split' || sk === 'ring' || sk === 'burn' || sk === 'dash') return;   // 죽을 때·깨어날 때 쓰는 능력
  const on = e.y > g.cam + 20 && e.y < g.cam + view.worldH - 20;
  e.skT -= dt; if (e.skT > 0 || !on) return;
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  if (sk === 'charge') { if (p.onGround && Math.abs(p.y + p.h / 2 - (e.y + e.r)) < 10 && d < 200) { e.tele = e.teleMax = .5; sfx.rumble && sfx.rumble(); } else e.skT = .25; return; }
  if (d > (sk === 'laser' ? 380 : 330)) { e.skT = .4; return; }
  if (sk === 'blink') { startBlink(e); return; }
  e.tele = e.teleMax = sk === 'laser' ? .8 : .5;
  if (sk === 'laser') { e.beamY = e.y; g.fx.push({ type: 'warn', x0: TILE, x1: WORLD_W - TILE, y0: e.y - 7, y1: e.y + 7, x: 0, y: 0, t: 0, life: e.tele }); }
}
function monFire(e) {
  const g = game, p = g.p, sk = e.sk, v = shotV(), aim = Math.atan2(p.y - e.y, p.x - e.x), el = e.elite;
  e.skT = (SKILL_DEF[sk].cd || 3) * (el ? .8 : 1); e.pop = 1;
  if (sk === 'shot') { if (el) for (const o of [-.28, 0, .28]) monShot(e, aim + o, v); else monShot(e, aim, v); }
  else if (sk === 'fan') { const n = el ? 5 : 3; for (let i = 0; i < n; i++) monShot(e, aim + (i - (n - 1) / 2) * .3, v * .95); }
  else if (sk === 'spike') { const n = el ? 8 : 4, off = (e.rot = !e.rot) ? Math.PI / 4 : 0; for (let i = 0; i < n; i++) monShot(e, off + i / n * Math.PI * 2, v * .85, { r: 5 }); }
  else if (sk === 'drip') { const dir = -(e.wall || 1); for (let i = 0; i < (el ? 2 : 1); i++) monShot(e, dir > 0 ? -.35 - i * .3 : Math.PI + .35 + i * .3, 190, { g: 260, r: 6 }); }
  else if (sk === 'lob') {
    for (let i = 0; i < (el ? 2 : 1); i++) {
      const tx = clamp(p.x + (i ? 40 : el ? -40 : 0), TILE + 10, WORLD_W - TILE - 10), T_ = .95, G = 700, vx = (tx - e.x) / T_, vy = (p.y + 20 - e.y) / T_ - .5 * G * T_;
      g.ebul.push({ x: e.x, y: e.y - e.r, vx, vy, g: G, r: 7, dmg: Math.round(e.dmg * .8), t: 0, col: skCol(e), pool: 'poison' });
    }
  }
  else if (sk === 'laser') { e.beamT = .28; g.fx.push({ type: 'beam', x0: TILE, x1: WORLD_W - TILE, y0: e.beamY - 7, y1: e.beamY + 7, x: 0, y: 0, t: 0, life: .28, col: skCol(e) }); g.shake = Math.max(g.shake, 4); }
  else if (sk === 'charge') { e.spd0 = e.spd; e.spd = e.spd * (el ? 4.2 : 3.4); e.dir = Math.sign(p.x - e.x) || 1; e.chargeT = .75; e.charging = true; }
  if (sk !== 'charge') sfx.spit();
}
/* 그림자: 흐려지며 사라지고 → 내 아래쪽 앞에 보라 표식 → 그 자리에 나타난다(표식이 나오는 동안은 맞지 않는다) */
function startBlink(e) {
  const g = game, p = g.p, side = Math.random() < .5 ? -1 : 1;
  e.blinkT = e.elite ? .45 : .6; e.hidden = true;
  e.dest = { x: clamp(p.x + side * (70 + Math.random() * 40), TILE + 20, WORLD_W - TILE - 20), y: p.y + 60 + Math.random() * 50 };
  g.fx.push({ type: 'mark', x: e.dest.x, y: e.dest.y, r: e.r + 10, col: skCol(e), t: 0, life: e.blinkT });
  puff(e.x, e.y, 3, 10, 6);
}
function endBlink(e) {
  e.hidden = false; e.baseX = e.x = e.dest.x; e.baseY = e.y = e.dest.y; e.skT = SKILL_DEF.blink.cd * (e.elite ? .75 : 1); e.pop = 1;
  inkBurst(e.x, e.y, e.r * .8, ENEMY[e.kind].col, false);
}
/* 박쥐 돌진: 깨어나면 붉은 선을 긋고 잠깐 멈췄다가 그 선을 따라 빠르게 날아간다 */
function batDashStart(e) {
  const g = game, p = g.p, a = Math.atan2(p.y + 20 - e.y, p.x - e.x);
  e.dashT = e.elite ? .4 : .55; e.dashA = a; e.vx = 0; e.vy = 0;
  g.fx.push({ type: 'warnRay', x: e.x, y: e.y, a, w: 14 * (e.sc || 1), len: 700, t: 0, life: e.dashT });
}
function batDashTick(e, dt, spd) {
  e.dashT -= dt; if (e.dashT > 0) return true;
  const v = (170 + game.lvM * 9) * spd * (e.elite ? 2.1 : 1.8); e.vx = Math.cos(e.dashA) * v; e.vy = Math.sin(e.dashA) * v; e.dashT = 0; return false;
}
/* 죽을 때 쓰는 능력. 보스가 쓰러지며 함께 죽는 몬스터는 쓰지 않는다 */
function monDeath(e) {
  const g = game; if (!e.sk || g.state === 'bossdead') return;
  if (e.sk === 'split' && !e.child) {
    for (const s of [-1, 1]) {
      const c = mkEnemy(e.kind, clamp(e.x + s * 12, TILE + 12, WORLD_W - TILE - 12), e.y - 4, { dir: s, spd: e.spd || 40, baseX: e.x + s * 14, baseY: e.y, ph: Math.random() * 6, shootT: 2 });
      c.child = true; c.sc = (e.sc || 1) * .7; c.r = Math.max(7, Math.round(e.r * .7)); c.hp = c.maxHp = Math.max(1, Math.round(e.maxHp * .35)); c.gem = 2; c.pop = 1; c.vy = -160;
      g.enemies.push(c);
    }
  } else if (e.sk === 'ring') {
    const n = e.elite ? 10 : 6, x = e.x, y = e.y, off = Math.random();
    g.fx.push({ type: 'mark', x, y, r: 22, col: skCol(e), t: 0, life: .35 });
    later(.35, () => { for (let i = 0; i < n; i++) monShot({ x, y, dmg: e.dmg, sk: 'ring' }, off + i / n * Math.PI * 2, 120); sfx.spit(); });
  } else if (e.sk === 'burn') {
    const c = Math.floor(e.x / TILE), r = Math.floor((e.y + e.r + 4) / TILE); if (!lvl.at(c, r)) return;
    addHaz(e.x, r * TILE, e.elite ? 92 : 64, 'fire', e.dmg, 2.6);
  }
}

/* ───── 늦게 실행되는 일 ───── */
function later(t, fn) { (game.later = game.later || []).push({ t, fn }); }
/* ───── 바닥 장판: arm초 동안 깜빡이며 예고하고, 그 뒤 위에 서 있으면 다친다 ───── */
const HAZ_COL = { fire: ['#ff8a3a', '#ffd27a'], poison: ['#9ad040', '#e4f08a'], ice: ['#7ad0f0', '#e8fbff'] };
function addHaz(x, y, w, kind, dmg, life) {
  const g = game; (g.haz = g.haz || []).push({ x0: clamp(x - w / 2, TILE, WORLD_W - TILE), x1: clamp(x + w / 2, TILE, WORLD_W - TILE), y, kind, dmg: Math.round(dmg * .7), t: 0, arm: .45, life: life + .45 });
}
function tickHazLater(dt) {
  const g = game, p = g.p;
  if (g.later && g.later.length) { for (const l of g.later) { l.t -= dt; if (l.t <= 0) { l.done = true; l.fn(); } } g.later = g.later.filter(l => !l.done); }
  if (!g.haz || !g.haz.length) return;
  const feet = p.y + p.h / 2;
  for (const h of g.haz) {
    h.t += dt;
    if (h.t > h.arm && p.inv <= 0 && p.onGround && Math.abs(feet - h.y) < 8 && p.x > h.x0 - 4 && p.x < h.x1 + 4) { hurt(p.x + (p.x < (h.x0 + h.x1) / 2 ? 30 : -30), h.dmg); p.vy = -420; if (g.state === 'dying') return; }
    if (h.t > h.arm && Math.random() < dt * 14) g.fx.push({ type: 'dot', x: h.x0 + Math.random() * (h.x1 - h.x0), y: h.y - 2, vx: 0, vy: -60 - Math.random() * 90, t: 0, life: .45, r: 2.4, col: HAZ_COL[h.kind][Math.random() < .5 ? 0 : 1], g: 60 });
  }
  g.haz = g.haz.filter(h => h.t < h.life);
}
function drawHaz() {
  const g = game, s = view.s; if (!g.haz) return;
  for (const h of g.haz) {
    const x = wx(h.x0), y = wy(h.y), w = (h.x1 - h.x0) * s, c = HAZ_COL[h.kind], fade = clamp((h.life - h.t) / .3, 0, 1);
    if (h.t < h.arm) { ctx.globalAlpha = .35 + Math.abs(Math.sin(h.t * 22)) * .45; ctx.strokeStyle = c[0]; ctx.lineWidth = 2 * s; ctx.strokeRect(x, y - 7 * s, w, 7 * s); ctx.globalAlpha = 1; continue; }
    const th = (8 + Math.sin(g.t * 9 + h.x0) * 1.5) * s;
    ctx.globalAlpha = .85 * fade; ctx.fillStyle = c[0]; rr(x, y - th, w, th + 2 * s, 4 * s); ctx.fill();
    ctx.globalAlpha = .9 * fade; ctx.fillStyle = c[1]; ctx.fillRect(x + 3 * s, y - th + 1.5 * s, w - 6 * s, 2 * s);
    ctx.globalAlpha = 1;
  }
}
/* 몬스터 위·아래 장식: 강화 개체의 붉은 기운(아래), 예고 고리(위) */
function drawMonAura(e, x, y) {
  const s = view.s, g = game;
  if (e.elite) {
    const r = (e.r * 1.9 + Math.sin(g.t * 5 + e.x) * 2) * s, gl = ctx.createRadialGradient(x, y, r * .3, x, y, r);
    gl.addColorStop(0, 'rgba(255,40,70,.42)'); gl.addColorStop(1, 'rgba(255,40,70,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
}
function drawMonTele(e, x, y) {
  const s = view.s;
  if (e.tele > 0 && e.teleMax) {
    const k = 1 - e.tele / e.teleMax, r = (e.r * (2.4 - k * 1.2)) * s;
    ctx.globalAlpha = .45 + k * .5; ctx.strokeStyle = skCol(e); ctx.lineWidth = (2 + k * 2) * s; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
