/* 보스: 챕터의 6번째 판에 맨 아래 포탈 자리에서 올라온다. 불규칙해 보이지만 표(가중치)와 예고 규칙을 따른다.
   흐름 = 인트로(조작 불가) → 대기 → 공격(예고 → 이동 → 강조) → 대기 ... → 처치 연출 → 포탈 */
'use strict';
function buildArena(F, top) {
  // 아래에서 위로 발판을 깐다. 점프 1회(3칸)로 닿는 간격
  const layout = [[[1, 2], [6, 7]], [[3, 5]], [[1, 2], [6, 7]], [[3, 5]], [[1, 2], [6, 7]]];
  for (let i = 0; i < layout.length; i++) {
    const r = F - 3 - i * 3; if (r <= top + 2) break;
    for (const [c0, c1] of layout[i]) for (let c = c0; c <= c1; c++) lvl.set(c, r, ONEWAY);
  }
}
function startBossIntro() {
  const g = game, p = g.p, b = BOSSES[g.biome.boss];
  g.state = 'intro'; input.clearAll(); g.camLock = true; g.bossCam = Math.max(0, g.levelH + TILE - view.worldH); g.bullets = [];
  const floorY = g.floorRow * TILE;
  g.boss = { def: b, idx: g.biome.boss, alive: true, x: WORLD_W / 2, y: floorY + b.h + 20, w: b.w, h: b.h, floorY, hp: DIFF.bossHp(g.wave) * b.hpMul, maxHp: DIFF.bossHp(g.wave) * b.hpMul, state: 'intro', t: 0, flash: 0, pop: 0, open: 0, barK: 0, cool: 1, phase: 1, vy: 0, vx: 0, sx: 1, sy: 1, dir: 1, last: '' };
  g.portal = { x: WORLD_W / 2, y: floorY - 34, r: 34, k: 0 };
  g.introT = 0; p.inv = 9;
  for (const e of g.enemies) e.alive = false; g.ebul = [];
  sfx.bgmFor && sfx.bgmFor('boss');
}
function drawCine() {
  const s = view.s, H = view.H, W = view.W, h = 64 * s * game.cine;
  ctx.fillStyle = '#05050c'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
  if (game.state === 'descend') { ctx.globalAlpha = game.cine; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${17 * s}px ${FONT}`; textOut('전투 준비', W / 2, H - h / 2, '#ffe9b0', 3); ctx.globalAlpha = 1; return; }
  const b = game.boss; if (!b || game.state !== 'intro') return;
  const t = game.introT; if (t < 2.05) return;
  const k = clamp((t - 2.05) / .18, 0, 1), sc = 1 + (1 - k) * 1.6, al = clamp((3.5 - t) / .25, 0, 1), y = H * .4;
  ctx.globalAlpha = al * k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(8,4,16,.74)'; ctx.fillRect(0, y - 44 * s, W, 88 * s);
  ctx.fillStyle = b.def.col[2]; ctx.fillRect(0, y - 44 * s, W, 3 * s); ctx.fillRect(0, y + 41 * s, W, 3 * s);
  ctx.save(); ctx.translate(W / 2, y - 6 * s); ctx.scale(sc, sc); ctx.font = `${36 * s}px ${FONT}`; textOut(b.def.name, 0, 0, '#fff', 5); ctx.restore();
  ctx.font = `${14 * s}px ${FONT}`; textOut(b.def.sub, W / 2, y + 26 * s, '#e8c8d8', 2.6);
  ctx.globalAlpha = 1;
}
function bossImg(b, white) { const n = b.def.frames[b.open > .5 ? 1 : 0]; return IMG['m_' + n + (white ? '_w' : '')]; }
function drawBoss() {
  const g = game, b = g.boss, s = view.s, im = bossImg(b); if (!ok(im) || b.hidden) return;
  const w = b.w * s, h = w * im.naturalHeight / im.naturalWidth, x = wx(b.x), y = wy(b.y);
  b.drawH = h / s;
  // 바닥 그림자: 높이 올라갈수록 작아진다
  const air = clamp((b.floorY - b.y) / 420, 0, 1), under = b.y > b.floorY + 4;
  if (!under) { ctx.fillStyle = `rgba(6,4,14,${.5 - air * .3})`; ctx.beginPath(); ctx.ellipse(x, wy(b.floorY), w * .46 * (1 - air * .45), 6 * s, 0, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(x, y);
  const breathe = Math.sin(g.t * 3.2) * .02, pk = b.pop * .08;
  // 영상의 보스처럼 몸 전체가 앞뒤로 기우뚱거린다
  const rock = Math.sin(g.t * 2.7) * .055 + clamp((b.vx || 0) * .00085, -.2, .2) * (b.state === 'hop' || b.mini && b.state === 'idle' ? 1 : 0) + (b.state === 'sweep' && b.step === 2 ? b.dir * .2 : 0);
  ctx.rotate(rock);
  ctx.scale(b.sx * (1 + breathe + pk), b.sy * (1 - breathe + pk));
  if (b.state === 'rage') ctx.translate((Math.random() - .5) * 4 * s, 0);
  ctx.globalAlpha = b.alpha === undefined ? 1 : b.alpha;
  ctx.drawImage(im, -w / 2, -h, w, h); ctx.globalAlpha = 1;
  if (b.flash > 0) { const wi = bossImg(b, true); if (ok(wi)) { ctx.globalAlpha = .92; ctx.drawImage(wi, -w / 2, -h, w, h); ctx.globalAlpha = 1; } }
  ctx.restore();
}
function drawBossBits() {
  const g = game, b = g.boss; if (g.minis && !g.drawingMini) { g.drawingMini = true; const cur = g.boss; for (const m of g.minis) if (m.alive) { g.boss = m; drawBossBits(); } g.boss = cur; g.drawingMini = false; return; }
  if (!b || b.state !== 'split' || b.step !== 2 || !b.bits) return;
  const im = bossImg(b), s = view.s; if (!ok(im)) return; const w = 54 * s * (b.mini ? b.w / b.def.w0 : 1), h = w * im.naturalHeight / im.naturalWidth;
  for (const q of b.bits) { ctx.save(); ctx.translate(wx(q.x), wy(q.y)); ctx.rotate(q.a + Math.PI / 2); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
}
function bossHitTest(bu) { if (game.boss.hidden) return false; const b = game.boss, hh = b.drawH || b.h; return Math.abs(bu.x - b.x) < b.w * .42 + bu.r && bu.y > b.y - hh * .95 - bu.r && bu.y < b.y && b.y - hh * .4 < b.floorY + 4; }
function hitBoss(dmg, crit, x, y) {
  const g = game, b = g.boss; if (!b || !b.alive || b.state === 'intro' || b.state === 'dead') return;
  const d = Math.round(dmg * (1 + (g.st.bossPct || 0)) * (b.open > .5 ? 1.25 : 1));
  b.hp -= d; b.flash = .06; b.pop = 1; b.hitC = (b.hitC || 0) + 1;
  dmgNum(x, y - 6, d, crit || b.open > .5);
  g.fx.push({ type: 'hit', x, y, r: crit ? 16 : 11, t: 0, life: .1, rot: Math.random() * 3 });
  chunks(x, y, 3, [b.def.col[0], b.def.col[1]], 200, 3.4);
  g.shake = Math.max(g.shake, crit ? 3.5 : 2); g.hitStop = Math.max(g.hitStop, 1 / 60); sfx.hit(); if (b.hitC % 3 === 0) sfx.bossHit();
  if (b.mini) { if (b.hp <= 0) miniDie(b); return; }
  if (b.phase === 1 && b.hp < b.maxHp * .5) { b.phase = 2; if (['erupt', 'dive', 'sweep', 'split', 'laser', 'inhale', 'spiral', 'toll', 'geyser', 'icicle', 'blink', 'spore'].includes(b.state)) b.pendRage = true; else bossSet('rage'); sfx.roar(); g.whiteout = .3; g.shake = 14; popup(WORLD_W / 2, g.cam + view.worldH * .3, '분노!', '#ff5068', true); }
  if (b.hp <= 0) bossDie();
}
function bossDie() {
  const g = game, b = g.boss; g.bossDone = true; b.hp = 0; b.hidden = false; b.alpha = 1; g.darkT = 0; g.haz = []; b.state = 'dead'; b.t = 0; g.state = 'bossdead'; g.timeScale = .28; g.bosses++; input.clearAll(); g.ebul = []; for (const e of g.enemies) if (e.alive) killEnemy(e, false);
  sfx.roar(); g.whiteout = .6; g.shake = 18; vibrate(120);
}
function bossWarn(b, x0, x1, y0, y1, life) { b.path = { x0, x1, y0, y1 }; game.fx.push({ type: 'warn', x0, x1, y0, y1, x: 0, y: 0, t: 0, life }); }
function bossSet(st) { const b = game.boss; if (st === 'idle' && b.pendRage) { st = 'rage'; b.pendRage = false; } b.state = st; b.t = 0; b.step = 0; }
function pickAttack(b) {
  const w = Object.assign({}, b.def.weights), pool = [];
  if (b.phase === 2 && !b.mini && b.def.p2) for (const k in b.def.p2) w[k] = (w[k] || 0) + b.def.p2[k];
  if (b.mini || game.darkT > 0) delete w.dark; for (const k in w) { if (k === b.last && pool.length) continue; for (let i = 0; i < w[k]; i++) pool.push(k); }
  const a = pool[Math.floor(Math.random() * pool.length)] || 'erupt'; b.last = a; return a;
}
function bossShot(x, y, vx, vy, b, gv = 0) { game.ebul.push({ x, y, vx, vy, g: gv, r: 7, dmg: Math.round(22 * DIFF.dmg(game.wave)), t: 0, col: b.def.col[2], ghost: true }); }
function bossTick(dt) {
  const g = game, b = g.boss, p = g.p; if (!b) return;
  b.t += dt; b.flash = Math.max(0, b.flash - dt); b.pop = Math.max(0, b.pop - dt * 8);
  b.sx = approachSnap(b.sx, 1, 10, dt); b.sy = approachSnap(b.sy, 1, 10, dt);
  if (!b.mini) { if (g.darkT > 0) g.darkT -= dt; g.dark = approachSnap(g.dark || 0, g.darkT > 0 ? 1 : 0, 3, dt, .01); }
  // moveK = 몸의 움직임, speedK = 공격 박자. 중간 보스는 움직임만 진짜 보스와 같고 공격은 느리다
  const moveK = (b.phase === 2 ? 1.22 : 1) * Math.min(1.4, DIFF.speed(g.wave)), speedK = moveK * (b.mini ? MINI.tempo : 1), floorY = b.floorY, topY = g.arenaTop * TILE + 40;
  const hh = b.drawH || b.h;
  if (b.state === 'intro') {
    g.introT += dt; const t = g.introT; g.cine = approachSnap(g.cine, t < 3.45 ? 1 : 0, 8, dt);
    const po = g.portal;
    if (po) { if (t < .55) po.k = clamp(t / .35, 0, 1); else if (t < 1.05) { po.k = clamp(1 - (t - .55) / .5, 0, 1); g.shake = Math.max(g.shake, 6); if (Math.random() < .5) puff(po.x + (Math.random() - .5) * 160, floorY - 2, 1, 6, 8); } else g.portal = null; }
    if (t > .95 && !b.roared) { b.roared = true; sfx.rumble(); }
    if (t > 1.05 && t < 2.05) { const k = clamp((t - 1.05) / .8, 0, 1), e = 1 - Math.pow(1 - k, 3); b.y = floorY + (hh + 20) * (1 - e); g.shake = Math.max(g.shake, 10 * (1 - k) + 4); if (Math.random() < .7) puff(b.x + (Math.random() - .5) * b.w, floorY - 4, 1, 8, 9); b.open = t > 1.6 ? 1 : 0; }
    if (t > 1.65 && !b.roar2) { b.roar2 = true; sfx.roar(); g.whiteout = .28; b.sy = 1.12; b.sx = .92; for (let i = 0; i < 6; i++) chunks(b.x + (i - 3) * 22, floorY - 6, 2, [g.biome.bits, g.biome.ink], 340, 5); }
    if (t > 2.05) { b.barK = clamp((t - 2.05) / 1.1, 0, 1); }
    if (t > 2.9) b.open = 0;
    if (t > 3.55) {
      b.state = 'idle'; b.t = 0; b.cool = .7; g.state = 'play'; g.cine = 0; p.inv = .8; b.barK = 1;
      // 위쪽을 막는다
      for (let c = 1; c < COLS - 1; c++) lvl.set(c, g.arenaTop, HARD);
      input.blockUntil = performance.now() + 60;
    }
    return;
  }
  if (b.state === 'dead') {
    // 처치 연출: 여러 번 터지고 → 큰 섬광 → 파편 비
    if (Math.floor(b.t * 14) !== Math.floor((b.t - dt) * 14)) { const x = b.x + (Math.random() - .5) * b.w, y = b.y - Math.random() * hh; inkBurst(x, y, 16 + Math.random() * 12, [b.def.col[0], b.def.col[1]], true); sfx.boom(); g.shake = Math.max(g.shake, 8); b.flash = .05; }
    b.sy = 1 - Math.min(.5, b.t * .55); b.sx = 1 + Math.min(.3, b.t * .3);
    if (b.t > .55 && !b.done) {
      b.done = true; b.alive = false; g.whiteout = .95; g.shake = 22; sfx.bigBoom(); g.timeScale = 1;
      inkBurst(b.x, b.y - hh * .5, 60, [b.def.col[0], b.def.col[1]], true);
      for (let i = 0; i < 26; i++) spawnShards(b.x + (Math.random() - .5) * b.w, b.y - Math.random() * hh, 10);
      healBy(p.maxHp * .25); popup(WORLD_W / 2, g.cam + view.worldH * .36, '보스 처치! 체력 25% 회복', '#ffe27a', true);
      g.portal = { x: WORLD_W / 2, y: floorY - 34, r: 34, k: 1 };
      g.boss = null; g.state = 'play'; p.inv = 1.5; g.camLock = true;
    }
    return;
  }
  // 몸통 판정
  const feet = p.y + p.h / 2, topB = b.y - hh * .92, overX = Math.abs(p.x - b.x) < b.w * .42 + p.w / 2, overY = p.y + p.h / 2 > topB && p.y - p.h / 2 < b.y - 4;
  if (overX && overY && b.y - hh * .5 < floorY && !b.hidden) {
    if (p.vy > -40 && feet - topB < 26) {
      // 머리 밟기: 튕겨 오르기만 한다. 보스 체력은 줄지 않고 재장전도 없다(공격으로만 잡는다)
      p.vy = input.jumpHeld || input.keys.j ? -T.stompHoldV : -T.stompV; p.squash = -.3; p.spin = 1; g.kick = 5; feathers(p.x, p.y + 6, 3, 110); sfx.land(); g.shake = Math.max(g.shake, 4);
    } else if (p.inv <= 0) { refill(p); hurt(b.x, Math.round(28 * DIFF.dmg(g.wave))); if (g.state === 'dying') return; }
  }
  const s = b.state;
  if (s === 'idle' || s === 'rage') {
    b.open = s === 'rage' && b.t < .6 ? 1 : 0;
    if (b.mini) miniRoam(b, dt, moveK);
    else if (b.def.float) { b.y = approachSnap(b.y, floorY - 150 + Math.sin(g.t * 1.3) * 60, 2, dt); b.x += Math.sin(g.t * .9) * 26 * dt; }
    if (!b.air && b.t > (s === 'rage' ? .8 : b.cool) / speedK) { bossSet(pickAttack(b)); b.cool = b.mini ? 2.7 + Math.random() * .8 : .7 + Math.random() * .7; }
    return;
  }
  if (s === 'erupt' || s === 'dive' || s === 'sweep') {
    // 사라짐 → 예고 띠 → 띠의 끝까지 곧게 돌진해 화면 밖으로 → 잠시 뒤 땅에서 다시 등장. 띠와 실제 경로가 같다
    const half = b.w * .42, minX = TILE + half, maxX = WORLD_W - TILE - half, off = 8, spd = (s === 'sweep' ? 760 : 1180) * moveK;
    if (b.step === 0) {
      b.y = approachSnap(b.y, floorY + hh + 16, 7, dt); b.open = 0;
      if (b.t > .45) {
        b.step = 1; b.t = 0; b.open = 1; sfx.rumble();
        const life = .72 / speedK;
        if (s === 'sweep') {
          const y = clamp(p.y + p.h / 2, g.cam + view.safeT / view.s + 72 + hh * .92, floorY);
          b.dir = p.x < WORLD_W / 2 ? -1 : 1; b.x = b.dir > 0 ? -b.w * .6 : WORLD_W + b.w * .6; b.y = y;
          bossWarn(b, 0, WORLD_W, y - hh * .92, y, life);
        } else {
          b.x = clamp(p.x + (Math.random() - .5) * 40, minX, maxX);
          if (s === 'dive') b.y = g.cam - off;
          bossWarn(b, b.x - half, b.x + half, g.cam - off, floorY, life);
        }
      }
    } else if (b.step === 1) {
      g.shake = Math.max(g.shake, 3);
      if (s === 'erupt' && Math.random() < .5) puff(b.x + (Math.random() - .5) * b.w * .8, floorY - 3, 1, 6, 7);
      if (b.t > .72 / speedK) { b.step = 2; b.t = 0; sfx.roar(); b.sy = 1.18; b.hitFloor = false; }
    } else if (b.step === 2) {
      let out = false;
      if (s === 'erupt') { b.y -= spd * dt; out = b.y < g.cam - off; }
      else if (s === 'dive') {
        b.y += spd * dt; out = b.y - hh > floorY;
        if (!b.hitFloor && b.y >= floorY) { b.hitFloor = true; g.shake = 18; sfx.bigBoom(); g.hitStop = Math.max(g.hitStop, 3 / 60); shockwave(b.x, floorY, b); }
      } else { b.x += b.dir * spd * dt; if (Math.floor(b.t * 30) % 2 === 0) puff(b.x - b.dir * b.w * .4, b.y - hh * .4, 1, 6, 8); out = b.dir > 0 ? b.x > WORLD_W + b.w * .6 : b.x < -b.w * .6; }
      if (out) { b.step = 3; b.t = 0; b.open = 0; b.y = floorY + hh + 16; b.x = minX + Math.random() * (maxX - minX); }
    } else if (b.step === 3) {
      if (b.t > .35 / moveK) { b.step = 4; b.t = 0; bossWarn(b, b.x - half, b.x + half, floorY - hh * .92, floorY, .5 / speedK); sfx.rumble(); }
    } else if (b.step === 4) {
      if (Math.random() < .5) puff(b.x + (Math.random() - .5) * b.w * .8, floorY - 3, 1, 6, 7);
      if (b.t > .5 / speedK) { b.step = 5; b.t = 0; b.open = 1; b.sy = 1.14; }
    } else {
      b.y -= 1000 * dt;
      if (b.y <= floorY) { b.y = floorY; b.open = 0; b.sy = .82; b.sx = 1.16; g.shake = 12; sfx.boom(); if (!b.def.float) shockwave(b.x, floorY, b); bossSet('idle'); }
    }
    return;
  }
  if (s === 'split') {
    // 분신: 별(망자의 종) 또는 십자(티탄의 심장) 모양 예고선 → 분신이 그 선을 따라 화면 밖까지 날아간다
    const cx = b.x, cy = b.y - hh * .5;
    if (b.step === 0) {
      const star = b.def.split === 'star', n = b.mini ? (star ? 3 : 2) : star ? (b.phase === 2 ? 8 : 5) : 4, a0 = star ? -Math.PI / 2 + Math.random() : (Math.random() < .5 ? 0 : Math.PI / 4);
      b.open = 1; b.sy = 1.1; b.sx = .94; b.step = 1; b.t = 0; b.rays = []; sfx.rumble();
      for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; b.rays.push(a); g.fx.push({ type: 'warnRay', x: cx, y: cy, a, w: 48, len: 1400, t: 0, life: .8 / speedK }); }
    } else if (b.step === 1) {
      b.sx = 1 + Math.sin(b.t * 34) * .04;
      if (b.t > .8 / speedK) { b.step = 2; b.t = 0; const v = 520 * speedK; b.bits = b.rays.map(a => ({ x: cx, y: cy, x0: cx, y0: cy, a, vx: Math.cos(a) * v, vy: Math.sin(a) * v })); g.shake = 11; sfx.boom(); b.pop = 1; b.flash = .1; }
    } else {
      for (const q of b.bits) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (Math.hypot(p.x - q.x, p.y - q.y) < (b.mini ? 27 * b.w / b.def.w0 : 24) + p.w / 2 && p.inv <= 0) { hurt(q.x, Math.round(22 * DIFF.dmg(g.wave))); if (g.state === 'dying') return; }
      }
      b.bits = b.bits.filter(q => q.x > -60 && q.x < WORLD_W + 60 && q.y > g.cam - 60 && q.y < g.cam + view.worldH + 60);
      if (!b.bits.length) { b.open = 0; bossSet('idle'); }
    }
    return;
  }
  if (s === 'laser') {
    // 레이저: 띠와 똑같은 자리에 발사한다. 망자의 종은 세로, 티탄의 심장은 가로
    if (b.step === 0) {
      const life = .85 / speedK; b.open = 1; b.step = 1; b.t = 0; sfx.rumble();
      const hw = b.mini ? 14 : 22; if (b.def.laser === 'v') { const xc = clamp(p.x, TILE + 22, WORLD_W - TILE - 22); bossWarn(b, xc - hw, xc + hw, g.cam - 8, floorY, life); }
      else { const hh2 = b.mini ? 13 : 20, yc = clamp(p.y, g.cam + view.safeT / view.s + 92, floorY - 20); bossWarn(b, 0, WORLD_W, yc - hh2, yc + hh2, life); }
    } else if (b.step === 1) {
      b.sy = 1 + Math.sin(b.t * 30) * .03;
      if (b.t > .85 / speedK) { b.step = 2; b.t = 0; const r = b.path; g.fx.push({ type: 'beam', x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, x: 0, y: 0, t: 0, life: .45, col: b.def.col[2] }); g.shake = 9; sfx.boom(); b.pop = 1; }
    } else {
      const r = b.path;
      if (p.inv <= 0 && p.x + p.w / 2 > r.x0 && p.x - p.w / 2 < r.x1 && p.y + p.h / 2 > r.y0 && p.y - p.h / 2 < r.y1) { hurt(p.x, Math.round(24 * DIFF.dmg(g.wave))); if (g.state === 'dying') return; }
      if (b.t > .45) { b.open = 0; bossSet('idle'); }
    }
    return;
  }
  if (s === 'hop') {
    if (b.step === 0) { b.left = b.mini ? 1 : 2 + (b.phase === 2 ? 1 : 0); b.step = 1; b.t = 0; b.sy = .84; b.sx = 1.12; }
    else if (b.step === 1) { if (b.t > .22 / moveK) { b.step = 2; b.t = 0; b.vy = -640; b.vx = clamp((p.x - b.x) * 1.5, -320, 320) * moveK; b.sy = 1.14; b.sx = .9; } }
    else if (b.step === 2) { b.vy += 1700 * dt; b.y += b.vy * dt; b.x = clamp(b.x + b.vx * dt, TILE + b.w * .42, WORLD_W - TILE - b.w * .42); if (b.y >= floorY && b.vy > 0) { b.y = floorY; b.sy = .8; b.sx = 1.18; g.shake = 12; sfx.land(); sfx.boom(); puff(b.x, floorY - 3, 5, 18, 9); if (--b.left <= 0) { shockwave(b.x, floorY, b); bossSet('idle'); } else { b.step = 1; b.t = 0; } } }
    return;
  }
  if (s === 'spit') {
    b.open = 1;
    if (b.step === 0) { b.sy = 1.08; b.sx = .94; if (b.t > .42 / speedK) { b.step = 1; b.n = b.mini ? 1 : b.phase === 2 ? 3 : 2; b.t = 0; } }
    else if (b.t > .28 / speedK) { b.t = 0; const dx = p.x - b.x, dy = (p.y - 10) - (b.y - hh * .6), a0 = Math.atan2(dy, dx), v = 240 * speedK; for (const o of [-.34, 0, .34]) bossShot(b.x, b.y - hh * .62, Math.cos(a0 + o) * v, Math.sin(a0 + o) * v, b, 60); b.sy = .92; b.pop = 1; sfx.spit(); if (--b.n <= 0) bossSet('idle'); }
    return;
  }
  if (s === 'ring') {
    b.open = 1;
    if (b.step === 0) { b.sy = 1 + Math.min(.14, b.t * .3); b.sx = 1 + Math.min(.14, b.t * .3); if (b.t > .55 / speedK) { b.step = 1; b.t = 0; b.n = b.mini ? 1 : b.phase === 2 ? 2 : 1; } }
    else if (b.t > .36) { b.t = 0; const n = b.mini ? 6 : 12, off = Math.random() * 3; for (let i = 0; i < n; i++) { if (i % 6 === 0) continue; const a = i / n * 6.283 + off, v = 170 * speedK; bossShot(b.x, b.y - hh * .5, Math.cos(a) * v, Math.sin(a) * v, b); } g.shake = 7; sfx.spit(); b.sy = .86; b.sx = 1.16; if (--b.n <= 0) bossSet('idle'); }
    return;
  }
  if (s === 'summon' || s === 'brood') {
    // 소환: 보스마다 부르는 몬스터가 다르다(땅 위 몬스터는 보스 양옆 바닥에서, 날아다니는 몬스터는 공중에서)
    b.open = 1; b.sy = 1 + Math.min(.12, b.t * .3);
    if (b.t > .55) {
      const kind = b.def.minion || 'bat', n = b.phase === 2 ? 3 : 2, ground = kind === 'mound' || kind === 'tick' || kind === 'spit';
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, x = clamp(b.x + side * (b.w * .5 + 20 + i * 18), TILE + 16, WORLD_W - TILE - 16), y = ground ? floorY - ENEMY[kind].r : floorY - 90 - Math.random() * 170;
        const e = mkEnemy(kind, x, y, { sleep: false, ph: Math.random() * 6, baseX: x, baseY: y, dir: side, spd: 40 + g.lvM * 3, shootT: 1.5 });
        if (kind === 'bat') { const d = Math.hypot(p.x - x, p.y - y) || 1, v = 150 + g.lvM * 5; e.vx = (p.x - x) / d * v; e.vy = (p.y - y) / d * v; }
        e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * .6)); e.pop = 1; g.enemies.push(e); inkBurst(x, y, 10, ENEMY[kind].col, false);
      }
      sfx.spit(); b.sy = .86; bossSet('idle');
    }
    return;
  }
  if (s === 'inhale') {
    // 빨아들이기(심연의 입): 입 앞이 붉게 예고 → 바람이 입으로 몰려 주인공이 끌려간다(반대로 뛰면 버틴다) → 입에 닿으면 깨문다 → 삼킨 돌을 위로 뱉는다
    const zone = b.w * .3, dur = (b.mini ? 1.2 : 1.7) / Math.max(.75, speedK), mouthY = b.y - hh * .45;
    if (b.step === 0) { b.open = 1; b.step = 1; b.t = 0; sfx.rumble(); bossWarn(b, b.x - zone, b.x + zone, b.y - hh * .95, b.y, dur); }
    else if (b.step === 1) {
      b.sx = 1.04 + Math.sin(b.t * 30) * .03; b.sy = .97;
      if (g.fx.length < 170 && Math.random() < dt * 40) { const side = Math.random() < .5 ? -1 : 1, y0 = mouthY + (Math.random() - .5) * 180; g.fx.push({ type: 'dot', x: b.x + side * (130 + Math.random() * 90), y: y0, vx: -side * 560, vy: (mouthY - y0) * 2.4, t: 0, life: .26, r: 2.2, col: 'rgba(255,255,255,.75)', g: 0 }); }
      const dx = b.x - p.x;
      if (b.t > .3 && Math.abs(dx) > 4) moveX(p, Math.sign(dx) * (b.mini ? 105 : 150) * clamp(1.2 - Math.abs(dx) / 400, .35, 1) * dt);
      if (b.t > .3 && p.inv <= 0 && Math.abs(dx) < zone && p.y + p.h / 2 > b.y - hh * .95) { hurt(b.x, Math.round(30 * DIFF.dmg(g.wave))); p.vy = -560; b.sy = .8; sfx.bigBoom(); if (g.state === 'dying') return; }
      if (b.t > dur) { b.step = 2; b.t = 0; const n = b.mini ? 3 : b.phase === 2 ? 7 : 5; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * .32, v = 430 * speedK; bossShot(b.x, mouthY, Math.cos(a) * v, Math.sin(a) * v, b, 640); } g.shake = 9; sfx.spit(); b.sy = 1.16; }
    } else if (b.t > .35) { b.open = 0; bossSet('idle'); }
    return;
  }
  if (s === 'spiral') {
    // 회전 탄막(망자의 종): 몸이 부풀며 예고 → 2~3갈래 탄이 돌면서 퍼진다. 갈래 사이로 돌아 들어가면 피한다
    const cx = b.x, cy = b.y - hh * .5;
    if (b.step === 0) {
      b.open = 1; b.sy = 1 + Math.min(.12, b.t * .3); b.sx = b.sy;
      if (!b.marked) { b.marked = true; g.fx.push({ type: 'mark', x: cx, y: cy, r: 34, col: b.def.col[2], t: 0, life: .55 / speedK }); }
      if (b.t > .55 / speedK) { b.step = 1; b.t = 0; b.marked = false; b.spA = Math.random() * 6.28; b.spDir = Math.random() < .5 ? -1 : 1; b.shotT = 0; }
    } else {
      const arms = b.mini ? 2 : b.phase === 2 ? 3 : 2; b.spA += b.spDir * 2.3 * dt; b.shotT -= dt;
      if (b.shotT <= 0) { b.shotT = .1 / Math.min(1.2, speedK); for (let i = 0; i < arms; i++) { const a = b.spA + i / arms * 6.283, v = 150 * speedK; bossShot(cx, cy, Math.cos(a) * v, Math.sin(a) * v, b); } sfx.spit(); }
      if (b.t > (b.mini ? 1.5 : 2.3)) { b.open = 0; bossSet('idle'); }
    }
    return;
  }
  if (s === 'toll') {
    // 종소리(망자의 종): 고리 탄이 3번 울려 퍼진다. 고리마다 틈이 하나 있고, 틈은 울릴 때마다 옆으로 옮겨 간다
    const cx = b.x, cy = b.y - hh * .5;
    if (b.step === 0) { b.open = 1; b.n = b.mini ? 2 : 3; b.k = 0; b.step = 1; b.t = .1; b.gap0 = Math.atan2(p.y - cy, p.x - cx); b.gapD = Math.random() < .5 ? -.75 : .75; sfx.rumble(); g.fx.push({ type: 'mark', x: cx, y: cy, r: 40, col: b.def.col[1], t: 0, life: .5 / speedK }); }
    else if (b.t > .58 / speedK) {
      b.t = 0; const n = b.mini ? 12 : 18, gap = b.gap0 + b.k * b.gapD, v = 135 * speedK;
      // 틈 = 주인공 쪽 방향에서 시작해 울릴 때마다 옮겨 가는 3칸
      for (let i = 0; i < n; i++) { if (i < 3) continue; const a = gap + (i - 1) / n * 6.283; bossShot(cx, cy, Math.cos(a) * v, Math.sin(a) * v, b); }
      g.fx.push({ type: 'ring', x: cx, y: cy, r: 90, col: b.def.col[1], t: 0, life: .3 }); b.sy = .86; b.sx = 1.14; g.shake = 6; sfx.spit();
      if (++b.k >= b.n) { b.open = 0; bossSet('idle'); }
    }
    return;
  }
  if (s === 'geyser') {
    // 박동(티탄의 심장): 심장이 뛸 때마다 바닥 기둥 몇 줄이 붉게 예고되고 → 용암이 솟는다. 줄은 박동마다 엇갈린다
    const H = b.mini ? 150 : 215, beat = (b.phase === 2 ? .78 : .95) / speedK, warnT = .6 / speedK;
    if (b.step === 0) { b.n = b.mini ? 2 : b.phase === 2 ? 4 : 3; b.k = 0; b.step = 1; b.t = beat; b.open = 1; b.par = Math.random() < .5 ? 1 : 0; }
    else if (b.step === 1 && b.t >= beat) {
      b.t = 0; b.step = 2; b.fired = false; const par = (b.k + b.par) % 2; b.cols = [];
      for (let c = 1; c < COLS - 1; c++) if (c % 2 === par) b.cols.push(c);
      for (const c of b.cols) g.fx.push({ type: 'warn', x0: c * TILE + 2, x1: (c + 1) * TILE - 2, y0: floorY - H, y1: floorY, x: 0, y: 0, t: 0, life: warnT });
      b.sx = 1.14; b.sy = 1.12; b.pop = 1; g.shake = Math.max(g.shake, 6); sfx.boom();
    } else if (b.step === 2) {
      if (b.t > warnT && !b.fired) { b.fired = true; for (const c of b.cols) g.fx.push({ type: 'beam', x0: c * TILE + 2, x1: (c + 1) * TILE - 2, y0: floorY - H, y1: floorY, x: 0, y: 0, t: 0, life: .32, col: '#ff8a3a' }); g.shake = Math.max(g.shake, 8); sfx.bigBoom(); }
      if (b.fired && b.t < warnT + .32 && p.inv <= 0 && p.y + p.h / 2 > floorY - H) { const pc = Math.floor(p.x / TILE); if (b.cols.includes(pc)) { hurt(p.x, Math.round(24 * DIFF.dmg(g.wave))); p.vy = -460; if (g.state === 'dying') return; } }
      if (b.t > warnT + .35) { if (++b.k >= b.n) { b.open = 0; bossSet('idle'); } else { b.step = 1; b.t = beat * .35; } }
    }
    return;
  }
  if (s === 'icicle') {
    // 고드름 비(얼어붙은 왕): 천장에서 떨어질 줄이 가늘게 예고 → 고드름이 떨어진다. 발판 밑에 숨으면 막힌다
    if (b.step === 0) { b.open = 1; b.vol = b.mini ? 1 : b.phase === 2 ? 2 : 1; b.step = 1; b.t = 0; b.sy = 1.12; sfx.rumble(); b.ice = null; }
    if (b.step === 1 && !b.ice) {
      const n = b.mini ? 4 : b.phase === 2 ? 8 : 6, xs = [];
      if (Math.random() < .7) xs.push(clamp(p.x, TILE + 14, WORLD_W - TILE - 14));   // 한 줄은 주인공 머리 위
      for (let k = 0; k < 60 && xs.length < n; k++) { const x = TILE + 14 + Math.random() * (WORLD_W - TILE * 2 - 28); if (xs.every(o => Math.abs(o - x) > 30)) xs.push(x); }
      b.ice = xs; b.t = 0; for (const x of xs) g.fx.push({ type: 'warn', x0: x - 7, x1: x + 7, y0: g.cam, y1: floorY, x: 0, y: 0, t: 0, life: .75 / speedK });
    } else if (b.step === 1 && b.t > .75 / speedK) {
      // 천장(막힌 줄) 바로 아래에서 떨어진다
      for (const x of b.ice) { const c = Math.floor(x / TILE); let r = Math.max(0, Math.floor(g.cam / TILE)); while (r < g.floorRow && lvl.at(c, r)) r++; g.ebul.push({ x, y: r * TILE + 4, vx: 0, vy: 380 * speedK, g: 900, r: 7, dmg: Math.round(22 * DIFF.dmg(g.wave)), t: 0, col: '#bfeaff', shape: 'ice' }); }
      g.shake = Math.max(g.shake, 5); sfx.spit(); b.ice = null; b.t = 0;
      if (--b.vol <= 0) b.step = 2;
    } else if (b.step === 2 && b.t > .5) { b.open = 0; bossSet('idle'); }
    return;
  }
  if (s === 'spore') {
    // 포자(썩은 어머니): 떨어질 자리에 표식 → 포자가 포물선으로 날아가 터지고 독 장판이 남는다
    const n = b.mini ? 2 : b.phase === 2 ? 5 : 3, T_ = 1.05 / Math.min(1.2, speedK), G = 700;
    if (b.step === 0) {
      b.open = 1; b.sy = 1 + Math.min(.14, b.t * .4);
      if (b.t > .45 / speedK) {
        b.step = 1; b.t = 0; const x0 = b.x, y0 = b.y - hh * .7;
        for (let i = 0; i < n; i++) {
          const tx = clamp(p.x + (i - (n - 1) / 2) * 70 + (Math.random() - .5) * 24, TILE + 16, WORLD_W - TILE - 16), c = Math.floor(tx / TILE);
          let ty = floorY; for (let r = Math.max(0, Math.floor((p.y - 10) / TILE)); r <= g.floorRow; r++) { const t = lvl.at(c, r); if (t && t !== SPIKE) { ty = r * TILE; break; } }
          g.ebul.push({ x: x0, y: y0, vx: (tx - x0) / T_, vy: (ty - 4 - y0) / T_ - .5 * G * T_, g: G, r: 8, dmg: Math.round(20 * DIFF.dmg(g.wave)), t: 0, col: '#c8e060', pool: 'poison', poolW: b.mini ? 52 : 70, poolT: b.phase === 2 ? 4 : 3 });
          g.fx.push({ type: 'mark', x: tx, y: ty - 8, r: 22, col: '#c8e060', t: 0, life: T_ });
        }
        b.sy = .84; b.sx = 1.14; sfx.spit();
      }
    } else if (b.t > .5) { b.open = 0; bossSet('idle'); }
    return;
  }
  if (s === 'blink') {
    // 순간이동(첫 번째 어둠): 흐려져 사라짐 → 주인공 옆에 큰 보라 표식 → 그 자리에 나타나며 사방으로 탄이 터진다
    if (b.step === 0) {
      b.alpha = clamp(1 - b.t / .3, 0, 1);
      if (b.t > .3) {
        b.hidden = true; b.step = 1; b.t = 0; const side = p.x < WORLD_W / 2 ? 1 : -1;
        b.dest = { x: clamp(p.x + side * (b.w * .5 + 40), TILE + b.w * .42, WORLD_W - TILE - b.w * .42), y: b.mini ? floorY : clamp(p.y + hh * .55, topY + hh, floorY) };
        g.fx.push({ type: 'mark', x: b.dest.x, y: b.dest.y - hh * .5, r: b.w * .4, col: b.def.col[2], t: 0, life: .75 / speedK }); sfx.rumble();
      }
    } else if (b.step === 1) {
      if (b.t > .75 / speedK) {
        b.x = b.dest.x; b.y = b.dest.y; b.hidden = false; b.alpha = 1; b.step = 2; b.t = 0; b.open = 1; b.sy = 1.2; b.sx = .86; g.shake = 10; sfx.boom();
        const n = b.mini ? 6 : b.phase === 2 ? 14 : 10, off = Math.random(); for (let i = 0; i < n; i++) { const a = off + i / n * 6.283, v = 165 * speedK; bossShot(b.x, b.y - hh * .5, Math.cos(a) * v, Math.sin(a) * v, b); }
        inkBurst(b.x, b.y - hh * .5, 40, [b.def.col[0], b.def.col[1]], false);
      }
    } else if (b.t > .45) { b.open = 0; bossSet('idle'); }
    return;
  }
  if (s === 'orbs' || s === 'dark') {
    // 유도 구슬: 잠깐 빛나다가 천천히 따라오는 구슬을 쏜다(도는 힘이 약해 옆으로 비키면 빗나간다). 어둠: 화면이 어두워지고 구슬이 나온다
    if (b.step === 0) { b.open = 1; if (s === 'dark') { g.darkT = 5.5; sfx.roar(); popup(WORLD_W / 2, g.cam + view.worldH * .3, '어둠이 내린다', '#d8b8ff', true); } b.step = 1; b.t = 0; g.fx.push({ type: 'mark', x: b.x, y: b.y - hh * .55, r: 30, col: b.def.col[2], t: 0, life: .45 / speedK }); }
    else if (b.step === 1 && b.t > .45 / speedK) {
      const n = b.mini ? 2 : b.phase === 2 ? 4 : 3, base = Math.atan2(p.y - (b.y - hh * .55), p.x - b.x);
      for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * .7, v = 125 * speedK; g.ebul.push({ x: b.x, y: b.y - hh * .55, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 9, dmg: Math.round(22 * DIFF.dmg(g.wave)), t: 0, col: b.def.col[1], ghost: true, home: 2.4 }); }
      sfx.spit(); b.step = 2; b.t = 0;
    } else if (b.step === 2 && b.t > .4) { b.open = 0; bossSet('idle'); }
    return;
  }
  if (s === 'floor') {
    // 바닥이 달아오른다: 발판으로 피해야 한다
    if (b.step === 0) { b.open = 1; g.fx.push({ type: 'warn', x0: TILE, x1: WORLD_W - TILE, y0: floorY - 26, y1: floorY, x: 0, y: 0, t: 0, life: .95 / speedK }); b.step = 1; b.t = 0; sfx.rumble(); }
    else if (b.step === 1) { if (b.t > .95 / speedK) { b.step = 2; b.t = 0; g.shake = 10; sfx.boom(); } }
    else if (b.step === 2) {
      if (Math.random() < .9) g.fx.push({ type: 'dot', x: TILE + Math.random() * (WORLD_W - TILE * 2), y: floorY - 2, vx: 0, vy: -120 - Math.random() * 180, t: 0, life: .5, r: 3.4, col: Math.random() < .5 ? '#ff9a50' : '#ffd27a', g: 100 });
      g.fx.push({ type: 'warn', x0: TILE, x1: WORLD_W - TILE, y0: floorY - 10, y1: floorY, x: 0, y: 0, t: 0, life: .02 });
      if (p.onGround && Math.abs(p.y + p.h / 2 - floorY) < 6 && p.inv <= 0) { hurt(p.x + (Math.random() - .5) * 20, Math.round(20 * DIFF.dmg(g.wave))); p.vy = -480; if (g.state === 'dying') return; }
      if (b.t > (b.mini ? 1.2 : 2)) { b.open = 0; bossSet('idle'); }
    }
    return;
  }
  bossSet('idle');
}
function shockwave(x, floorY, b) {
  // 양쪽으로 달려가는 충격파: 뛰어서 피한다
  const g = game;
  for (const dir of [-1, 1]) g.fx.push({ type: 'wave', x: x + dir * b.w * .4, y: floorY, vx: dir * 420, t: 0, life: 1.4, col: b.def.col[2], wave: true });
  for (let i = 0; i < 8; i++) puff(x + (i - 4) * 18, floorY - 3, 1, 8, 9);
}
function tickWaves(dt) {
  const g = game, p = g.p;
  for (const f of g.fx) {
    if (f.wave) {
      f.x += f.vx * dt; if (f.x < TILE || f.x > WORLD_W - TILE) { f.t = f.life; continue; }
      if (p.onGround && Math.abs(p.x - f.x) < 18 && Math.abs(p.y + p.h / 2 - f.y) < 8 && p.inv <= 0) { refill(p); hurt(f.x, Math.round(20 * DIFF.dmg(g.wave))); p.vy = -380; if (g.state === 'dying') return; }
    }
    if (f.type === 'delay' && !f.done && f.t >= f.life - .02) { f.done = true; explode(f.x, f.y, f.boom, { tiles: false, dmg: Math.round(p.atk * .5), ink: '#6a2a9a', cols: ['#b070e0', '#3a1a5a', '#fff'] }); }
  }
}
