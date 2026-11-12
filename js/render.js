/* 세계·HUD 그리기. 아이폰 방어: 오프스크린 캔버스를 쓰지 않고 흰 실루엣도 파일로 그린다 */
'use strict';

function drawSky() {
  const { W, H } = view, s = view.s, g = game, B = g.biome, d = clamp(g.cam / Math.max(g.levelH, 1), 0, 1), sky = bimg('bg_sky');
  ctx.fillStyle = B.ink; ctx.fillRect(0, 0, W, H);
  if (ok(sky)) {
    const h = Math.ceil(sky.naturalHeight * W / sky.naturalWidth), y0 = -Math.round(g.cam * .12 * s) % h;
    for (let y = y0; y < H; y += h) ctx.drawImage(sky, 0, y, W, h + 1);
  }
  // 몬스터와 구분되도록 가운데에 옅은 안개를 깐다. 깊어질수록 가장자리가 어두워진다
  const fg = ctx.createLinearGradient(0, 0, W, 0); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(.5, B.fog); fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
  const dk = ctx.createLinearGradient(0, 0, 0, H); dk.addColorStop(0, `rgba(6,6,16,${.04 + d * .1})`); dk.addColorStop(1, `rgba(6,6,16,${.12 + d * .2})`);
  ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
  // 먼 조각: 가운데를 비우고 양옆에만
  const par = g.cam * .3 * s, gap = 280 * s;
  for (let i = Math.floor(par / gap) - 1; i * gap - par < H + 80 * s; i++) {
    const R = rng(i * 733 + 5 + B.id.charCodeAt(1) * 91), im = bimg('bg_r' + (1 + Math.floor(R() * 4))), left = R() < .5;
    if (!ok(im)) continue;
    const w = im.naturalWidth / 3.2 * s * (.8 + R() * .3), h = w * im.naturalHeight / im.naturalWidth, x = left ? 60 * s + R() * 14 * s : W - 60 * s - R() * 14 * s, y = i * gap - par + R() * gap * .4;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .34; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  }
  ctx.globalAlpha = 1;
  const dustScroll = g.cam * s; ctx.fillStyle = B.fog.replace(/[\d.]+\)$/, '.5)');
  for (const m of g.dust) {
    const dy = ((m.y * s - dustScroll * m.z) % H + H) % H, stretch = g.p ? clamp(g.p.vy / T.maxFall, 0, 1) : 0;
    ctx.fillRect(m.x * s, dy, m.r * s, m.r * s + stretch * 13 * m.z * s);
  }
}
function drawDecor() {
  const s = view.s;
  for (const c of game.decor) {
    const im = bimg(c.n); if (!ok(im)) continue;
    const y = wy(c.y); if (y < -60 || y > view.H + 60) continue;
    const h = 36 * s, w = h * im.naturalWidth / im.naturalHeight;
    ctx.drawImage(im, wx(c.x) - w / 2, y - h + 2 * s, w, h);
  }
}
function drawTiles() {
  const s = view.s, g = game;
  const r0 = Math.floor(g.cam / TILE) - 1, r1 = Math.ceil((g.cam + view.worldH) / TILE) + 1;
  const put = (name, x, y, w, h) => { const im = bimg(name); if (ok(im)) ctx.drawImage(im, x, y, w, h); else { ctx.fillStyle = '#39324a'; ctx.fillRect(x, y, w, h); } };
  const L = bimg('o_ledge_l'), Rr = bimg('o_ledge_r'), Mm = bimg('o_ledge_m'), Sp = bimg('o_spike');
  for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
    const t = lvl.at(c, r); if (!t) continue;
    const x = Math.round(wx(c * TILE)), y = Math.round(wy(r * TILE)), w = Math.round(wx((c + 1) * TILE)) - x, h = Math.round(wy((r + 1) * TILE)) - y;
    if (t === ONEWAY) {
      const th = Math.round(40 / PX * s), l = lvl.at(c - 1, r) === ONEWAY, rt = lvl.at(c + 1, r) === ONEWAY;
      if (!ok(Mm)) { ctx.fillStyle = '#8a8598'; ctx.fillRect(x, y, w, th); continue; }
      if (!l && !rt) { ctx.drawImage(L, 0, 0, 60, 40, x, y, Math.ceil(w / 2), th); ctx.drawImage(Rr, 60, 0, 60, 40, x + Math.floor(w / 2), y, Math.ceil(w / 2), th); }
      else ctx.drawImage(!l ? L : !rt ? Rr : Mm, x, y, w, th);
      continue;
    }
    if (t === HARD || t === SPIKE) {
      const isWall = c === 0 || c === COLS - 1;
      if (isWall && t === HARD) {
        put(r % 9 === 4 ? 't_wall_band' : 't_wall', x, y, w, h);
        const iw = Math.round(5 * s), ix = c === 0 ? x + w - iw : x;
        ctx.fillStyle = 'rgba(4,4,14,.45)'; ctx.fillRect(ix, y, iw, h);
      } else put('t_hard', x, y, w, h);
      if (t === SPIKE && ok(Sp)) { const sh = Math.round(62 / PX * s); ctx.drawImage(Sp, x, y - sh + Math.round(3 * s), w, sh); }
    } else if (t === BREAK) {
      put(lvl.hp[r * COLS + c] <= Math.round(20 * DIFF.hp(g.wave)) * .5 ? 't_break2' : 't_break', x, y, w, h);
    }
  }
  // 잉크 얼룩: 지형 위에 남는다
  for (const d of g.decals) { ctx.fillStyle = d.col; ctx.globalAlpha = .7; for (const b of d.blobs) { const y = wy(b[1]); if (y < -20 || y > view.H + 20) continue; if (!lvl.at(Math.floor(b[0] / TILE), Math.floor(b[1] / TILE))) continue; ctx.beginPath(); ctx.arc(wx(b[0]), y, b[2] * s, 0, 7); ctx.fill(); } }
  ctx.globalAlpha = 1;
}
function drawDoors() {
  const s = view.s, g = game, im = bimg('o_door');
  if (!ok(im)) return;
  const list = g.room ? [g.room.exit] : g.doors;
  for (const d of list) {
    const y = wy(d.y); if (y < -90 || y > view.H + 90) continue;
    const h = 76 * s, w = h * im.naturalWidth / im.naturalHeight, x = wx(d.side ? d.x - 6 : d.x + 6), al = d.used ? .4 : 1;
    const gl = ctx.createRadialGradient(x, y + 4 * s, 4 * s, x, y + 4 * s, 58 * s);
    gl.addColorStop(0, `rgba(255,220,140,${(.3 + Math.sin(g.t * 3) * .1) * (d.used ? 0 : 1)})`); gl.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y + 4 * s, 58 * s, 0, 7); ctx.fill();
    ctx.globalAlpha = al; ctx.drawImage(im, x - w / 2, y - h / 2 + 2 * s, w, h); ctx.globalAlpha = 1;
    if (!d.used && !g.room) {
      // 안에 뭐가 있는지 알려 주는 말풍선
      const bob = Math.sin(g.t * 4) * 2 * s, lab = ROOM_LABEL[d.fake || d.kind], bx = clamp(x + (d.side ? -34 : 34) * s, 44 * s, view.W - 44 * s), by = y - 34 * s + bob;
      ctx.font = `${11 * s}px ${FONT}`; const tw = ctx.measureText(lab).width + 12 * s;
      ctx.fillStyle = 'rgba(12,12,26,.86)'; rr(bx - tw / 2, by - 9 * s, tw, 18 * s, 6 * s); ctx.fill();
      ctx.fillStyle = BIOME_DOOR(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, bx, by + .5 * s);
    }
  }
}
const BIOME_DOOR = () => game.biome.door;
function drawPortal() {
  const po = game.portal; if (!po) return;
  const s = view.s, x = wx(po.x), y = wy(po.y), r = po.r * s * 1.12 * (po.k === undefined ? 1 : po.k);
  if (y < -100 || y > view.H + 100 || r <= 0) return;
  const inn = IMG.o_portal_in, ring = IMG.o_portal_ring;
  const glow = ctx.createRadialGradient(x, y, r * .5, x, y, r * 1.5);
  glow.addColorStop(0, `rgba(190,240,255,${.5 + Math.sin(game.t * 4) * .12})`); glow.addColorStop(1, 'rgba(190,240,255,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill();
  if (ok(inn)) { ctx.save(); ctx.translate(x, y); ctx.rotate(game.t * 1.6); ctx.drawImage(inn, -r, -r, r * 2, r * 2); ctx.restore(); }
  if (ok(ring)) { const k = r * 2 / ring.naturalHeight, rw = ring.naturalWidth * k; ctx.drawImage(ring, x - rw / 2, y - r, rw, r * 2); }
}
function drawJar(j) {
  const s = view.s, im = bimg('o_jar'), y = wy(j.y); if (!ok(im) || y < -60 || y > view.H + 60) return;
  const h = 32 * s, w = h * im.naturalWidth / im.naturalHeight;
  ctx.drawImage(im, wx(j.x) - w / 2, y + 14 * s - h, w, h);
}
function drawShard(sh) {
  const s = view.s, x = wx(sh.x), y = wy(sh.y), gold = sh.v >= 10, im = gold ? IMG.o_gold : IMG.o_rose;
  if (y < -20 || y > view.H + 20 || !ok(im)) return;
  const h = (gold ? 21 : 14) * s, k = .55 + .45 * Math.abs(Math.cos(game.t * 4.5 + sh.x * .13)), w = h * im.naturalWidth / im.naturalHeight * k;
  ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
}
function drawEnemy(e) {
  const s = view.s, E = ENEMY[e.kind], x = wx(e.x), y = wy(e.y), g = game;
  if (y < -70 || y > view.H + 70) return;
  const nf = E.frames.length;
  let fi = E.rate ? Math.floor((g.t + (e.ph || 0)) * E.rate) % nf : 0;
  if (e.kind === 'spit') fi = e.swell ? 1 : 0;
  if (e.kind === 'bat' && e.sleep) fi = 0;
  const name = E.frames[fi], im = monImg(name), wim = monWhite(name); if (!ok(im)) return;
  // 가시로 늘어난 프레임은 그만큼 키워 몸 크기를 맞춘다
  const sc = e.sc || 1, ext = (MON_EXT[g.biome.id] || {})[name] || 0, h = E.h * sc * s * im.naturalHeight / (im.naturalHeight - ext), w = h * im.naturalWidth / im.naturalHeight, extH = h - E.h * sc * s;
  // 강화 개체의 붉은 기운(몸 뒤), 사라지는 그림자는 흐려진다
  drawMonAura(e, x, y + (e.kind === 'mound' || e.kind === 'tick' || e.kind === 'spit' ? -E.h * sc * s * .45 + e.r * s : 0));
  const fadeA = e.hidden ? clamp(e.blinkT / .3 - 1, 0, 1) : 1; if (fadeA <= 0) return;
  const ground = e.kind === 'mound' || e.kind === 'tick' || e.kind === 'spit';
  // 움직임: 땅 위는 눌렸다 펴지고, 공중은 둥실거리고, 맞으면 튀어 오른다
  const wob = Math.sin(g.t * (ground ? 11 : 6) + e.x * .3);
  let sx = 1 + wob * .05 + e.pop * .22, sy = 1 - wob * .05 + e.pop * .22;
  if (e.kind === 'sac' || e.kind === 'shade') { sx = 1 + wob * .07 + e.pop * .2; sy = 1 - wob * .07 + e.pop * .2; }
  if (e.kind === 'spit' && e.swell) { sx *= 1.08; sy *= .95; }
  // 발밑 그림자: 땅 위 괴물만
  if (ground) { ctx.fillStyle = 'rgba(6,4,14,.42)'; ctx.beginPath(); ctx.ellipse(x, y + e.r * s, w * .44, 3.2 * s, 0, 0, 7); ctx.fill(); }
  const mvx = e.mvx || 0, mvy = e.mvy || 0, spd = Math.hypot(mvx, mvy), st = Math.min(.22, spd * .0011);
  ctx.save(); ctx.translate(x, y + (ground ? e.r * s : 0));
  if (e.kind === 'urchin') ctx.rotate(Math.sin(g.t * 1.6 + e.x) * .25);
  // 이동 방향으로 기울고, 걸을 때는 좌우로 뒤뚱거린다. 몸은 움직이는 쪽으로 늘어난다
  else if (e.kind !== 'leech') { const lean = clamp(mvx * .0028, -.36, .36), rock = ground && spd > 6 ? Math.sin(g.t * 11 + e.x) * .13 : 0; ctx.rotate(lean + rock); }
  if (Math.abs(mvy) > Math.abs(mvx)) { sx *= 1 - st * .7; sy *= 1 + st; } else { sx *= 1 + st; sy *= 1 - st * .7; }
  if (e.kind === 'leech') { ctx.rotate(e.wall < 0 ? Math.PI / 2 : -Math.PI / 2); ctx.translate(0, 0); if (e.dir < 0) ctx.scale(-1, 1); }
  else if (e.face && e.face > 0) ctx.scale(-1, 1);
  ctx.scale(sx, sy);
  const dy = ground ? -h : -E.h * sc * s / 2 - extH;
  // 어두운 맵과 분리하는 옅은 빛
  const gr = Math.max(w, h) * .7, gl = ctx.createRadialGradient(0, dy + h / 2, gr * .25, 0, dy + h / 2, gr); gl.addColorStop(0, 'rgba(255,214,240,.2)'); gl.addColorStop(1, 'rgba(255,214,240,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, dy + h / 2, gr, 0, 7); ctx.fill();
  if (e.kind === 'shade') ctx.globalAlpha = .82 + Math.sin(g.t * 7 + e.x) * .12;
  ctx.globalAlpha *= fadeA;
  if (e.tele > 0) ctx.translate((Math.random() - .5) * 2.4 * s, 0);
  ctx.drawImage(im, -w / 2, dy, w, h);
  if (e.flash > 0 && ok(wim)) { ctx.globalAlpha = 1; ctx.drawImage(wim, -w / 2, dy, w, h); }
  ctx.restore(); ctx.globalAlpha = 1;
  drawMonTele(e, x, y + (ground ? -E.h * sc * s * .45 + e.r * s : 0));
  if ((e.hbT > 0 || e.elite) && e.hp > 0) {
    const bw = Math.max(22, e.r * 2) * s, bh = 3 * s, bx = x - bw / 2, by = y - (ground ? E.h * sc * .95 - e.r : E.h * sc * .55) * s - 6 * s;
    ctx.globalAlpha = Math.min(1, e.hbT * 3);
    ctx.fillStyle = 'rgba(10,8,18,.85)'; ctx.fillRect(bx - s, by - s, bw + 2 * s, bh + 2 * s);
    ctx.fillStyle = '#ff5068'; ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), bh); ctx.globalAlpha = 1;
  }
}
function drawEnemyShots() {
  const s = view.s;
  for (const b of game.ebul) {
    const x = wx(b.x), y = wy(b.y), r = b.r * s; if (y < -20 || y > view.H + 20) continue;
    if (b.shape === 'ice') {   // 고드름: 아래를 향한 얼음 가시
      ctx.fillStyle = 'rgba(10,20,40,.85)'; ctx.beginPath(); ctx.moveTo(x - r * 1.3, y - r * 3.2); ctx.lineTo(x + r * 1.3, y - r * 3.2); ctx.lineTo(x, y + r * 1.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.moveTo(x - r * .9, y - r * 3); ctx.lineTo(x + r * .9, y - r * 3); ctx.lineTo(x, y + r * 1.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - r * .25, y - r * 2.6, r * .3, r * 2.2); continue;
    }
    ctx.fillStyle = 'rgba(20,6,24,.9)'; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 7); ctx.fill();
    ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * .25, y - r * .25, r * .4, 0, 7); ctx.fill();
  }
}
/* 탄 = 신마다 다른 무기. 무기 등급 색이 꼬리에 묻어난다 */
function drawBullets() {
  const s = view.s, g = game, p = g.p, a = IMG.fx_letter_w, b2 = IMG.fx_letter, wi = Meta.equipped('weapon'), tint = wi ? GRADES[wi.g].glow : 'rgba(255,255,255,.7)';
  ctx.lineCap = 'round';
  for (const b of g.bullets) {
    const x = wx(b.x + b.ox), y = wy(b.y), dir = b.up ? 1 : -1, big = b.r > SHOT[b.kind].r * 1.2 ? 1.4 : 1;
    if (y < -40 || y > view.H + 40) continue;
    const ang = Math.atan2(b.vy, b.vx) - Math.PI / 2;
    const tail = 34 * s * dir * Math.min(1, b.t * 18 + .25);
    if (godMode() || b.fan) { ctx.strokeStyle = b.fan ? 'rgba(255,196,70,.6)' : 'rgba(255,214,110,.55)'; ctx.lineWidth = (b.fan ? 7 : 9) * s; const sp = Math.hypot(b.vx, b.vy) || 1; ctx.beginPath(); ctx.moveTo(x - b.vx / sp * 34 * s, y - b.vy / sp * 34 * s); ctx.lineTo(x, y); ctx.stroke(); }
    if (b.hydra) { ctx.fillStyle = 'rgba(90,255,150,.45)'; ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, 7); ctx.fill(); }
    drawSeekTrail(b, x, y);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (b.kind === 'letter') {
      ctx.strokeStyle = tint; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, -Math.abs(tail) * .85); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(-5 * s, -Math.abs(tail) * .42); ctx.lineTo(-5 * s, -3 * s); ctx.moveTo(5 * s, -Math.abs(tail) * .5); ctx.lineTo(5 * s, -3 * s); ctx.stroke();
      const flap = Math.floor(b.t * 26) % 2 === 0, im = flap ? a : b2;
      if (ok(im)) { const w = (flap ? 19 : 12.5) * s * big, h = w * im.naturalHeight / im.naturalWidth; ctx.rotate(Math.sin(b.t * 30 + b.wob) * .22); ctx.drawImage(im, -w / 2, -h / 2, w, h); }
    } else if (b.kind === 'arrow') {
      ctx.strokeStyle = tint; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(0, -44 * s); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(0, -20 * s); ctx.lineTo(0, 6 * s); ctx.stroke();
      ctx.fillStyle = '#cfd8ff'; ctx.beginPath(); ctx.moveTo(0, 11 * s * big); ctx.lineTo(-4 * s, 2 * s); ctx.lineTo(4 * s, 2 * s); ctx.fill();
    } else if (b.kind === 'wine') {
      ctx.fillStyle = 'rgba(120,20,60,.45)'; ctx.beginPath(); ctx.ellipse(0, -14 * s, 5 * s, 14 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a1838'; ctx.beginPath(); ctx.arc(0, 0, 8 * s * big, 0, 7); ctx.fill();
      ctx.fillStyle = '#c23c62'; ctx.beginPath(); ctx.arc(-1.5 * s, -1.5 * s, 5.5 * s * big, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,230,.9)'; ctx.fillRect(-3.4 * s, -4.4 * s, 2.4 * s, 2.4 * s);
    } else if (b.kind === 'bomb') {
      ctx.fillStyle = 'rgba(255,140,60,.4)'; ctx.beginPath(); ctx.ellipse(0, -16 * s, 7 * s, 18 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#26181a'; ctx.beginPath(); ctx.arc(0, 0, 10 * s * big, 0, 7); ctx.fill();
      ctx.fillStyle = Math.floor(b.t * 20) % 2 ? '#ffd27a' : '#ff8a3a'; ctx.beginPath(); ctx.arc(0, -8 * s, 3.4 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff8a3a'; ctx.fillRect(-5 * s, 2 * s, 10 * s, 2.4 * s);
    } else if (b.kind === 'soul') {
      ctx.fillStyle = 'rgba(90,170,255,.4)'; ctx.beginPath(); ctx.ellipse(0, -12 * s, 6 * s, 15 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4aa8ff'; ctx.beginPath(); ctx.arc(0, 0, 8 * s * big, 0, 7); ctx.fill();
      ctx.fillStyle = '#d8f2ff'; ctx.beginPath(); ctx.arc(0, 1 * s, 4.2 * s * big, 0, 7); ctx.fill();
    } else if (b.kind === 'bolt') {
      ctx.strokeStyle = tint; ctx.lineWidth = 5 * s; ctx.lineJoin = 'miter'; ctx.beginPath(); ctx.moveTo(0, -40 * s); ctx.lineTo(5 * s, -24 * s); ctx.lineTo(-5 * s, -12 * s); ctx.lineTo(0, 6 * s); ctx.stroke();
      ctx.strokeStyle = '#fff6a8'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(0, -40 * s); ctx.lineTo(5 * s, -24 * s); ctx.lineTo(-5 * s, -12 * s); ctx.lineTo(0, 6 * s); ctx.stroke();
    }
    ctx.restore();
  }
}
function heroFrame(p) {
  if (p.hurtT > 0) return 'hurt';
  if (p.spin > 0 && !p.onGround) return 'tuck';
  if (p.attackPose > 0) return p.throwT > 0 ? 'throw_b' : 'throw_a';
  if (p.landT > 0) return 'land';
  if (p.onGround) {
    if (Math.abs(p.vx) > 30) return ['run_a', 'run_pass', 'run_b', 'run_pass'][Math.floor(p.walk / 1.6) % 4];
    return 'idle';
  }
  if (p.vy < -130) return 'jump';
  if (p.vy < 150) return 'apex';
  return Math.floor(game.t * 11) % 2 ? 'fall_a' : 'fall_b';
}
function drawHero() {
  const g = game, p = g.p; if (!p) return;
  const s = view.s, M = HERO_META[p.god], name = heroFrame(p), im = IMG[`h_${p.god}_${name}`], wim = IMG[`h_${p.god}_${name}_w`], fr = M.frames[name] || M.frames.idle, k = s / PX;
  ctx.save();
  ctx.translate(wx(p.x), wy(p.y + p.h / 2));
  const cy = -24 * s; ctx.translate(0, cy);
  ctx.rotate(p.tilt + (p.spin > 0 && !p.onGround ? (1 - p.spin) * Math.PI * 2 * (p.face > 0 ? 1 : -1) : 0));
  ctx.translate(0, -cy);
  const breath = name === 'idle' ? Math.sin(p.breath * 3) * .014 : 0, fx = Math.abs(p.flip) < .4 ? .4 * (p.flip < 0 ? -1 : 1) : p.flip;
  ctx.scale((1 + p.squash * .6) * fx, (1 - p.squash * .6) * (1 + breath));
  const gy = p.onGround && name !== 'idle' ? M.pivy - fr.bottom : 0, dx = -M.pivx * k, dy = (-M.pivy + gy) * k, dw = M.cw * k, dh = M.ch * k;
  if (ok(im)) ctx.drawImage(im, dx, dy, dw, dh);
  // 맞은 순간은 온몸이 하얗게, 무적 시간에는 하양이 깜빡인다
  const blink = p.inv > 0 && p.hurtT <= 0 && Math.floor(g.t * 14) % 2 === 0;
  if ((p.hitFlash > 0 || blink) && ok(wim)) { ctx.globalAlpha = p.hitFlash > 0 ? 1 : .6; ctx.drawImage(wim, dx, dy, dw, dh); ctx.globalAlpha = 1; }
  ctx.restore();
  if (!p.onGround && (p.ammo < p.maxAmmo || p.ammoFlash > 0)) {
    const n = p.maxAmmo, d = Math.min(4.2, 70 / n) * s, w = d * .72, y0 = wy(p.y) - 40 * s, x0 = wx(p.x) - n * d / 2;
    ctx.fillStyle = 'rgba(12,16,30,.7)'; ctx.fillRect(x0 - 1.2 * s, y0 - 1.2 * s, n * d + 2.4 * s - (d - w), w + 2.4 * s);
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < p.ammo ? (p.ammo <= 2 ? '#ff8a6b' : '#fff2b0') : p.ammoFlash > 0 ? '#ff5068' : 'rgba(255,255,255,.14)'; ctx.fillRect(x0 + i * d, y0, w, w); }
  }
  if (p.gauge < 100 || p.gaugeFlash > 0) {
    const bw = 15 * s, bh = 3.4 * s, gap = 2 * s, x0 = wx(p.x) - bw - gap / 2, y0 = wy(p.y) - 46 * s;
    for (let i = 0; i < 2; i++) {
      const x = x0 + i * (bw + gap), fill = clamp(p.gauge / T.gaugeCost - i, 0, 1);
      ctx.fillStyle = 'rgba(12,16,30,.75)'; ctx.fillRect(x - 1, y0 - 1, bw + 2, bh + 2);
      ctx.fillStyle = p.gaugeFlash > 0 ? '#ff6c7b' : fill >= 1 ? '#8fe4ff' : '#4d8fb6'; ctx.fillRect(x, y0, bw * fill, bh);
    }
  }
  if (has('owl')) { const im2 = IMG.c_owl, ox = wx(p.x + p.face * -24), oy = wy(p.y - 26 + Math.sin(g.t * 4) * 4); if (ok(im2)) ctx.drawImage(im2, ox - 11 * s, oy - 11 * s, 22 * s, 22 * s); }
  if (godMode()) { ctx.strokeStyle = 'rgba(255,220,100,.6)'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.arc(wx(p.x), wy(p.y - 8), 32 * s + Math.sin(g.t * 12) * 2 * s, 0, 7); ctx.stroke(); }
}
/* 새 이펙트: 타격 별, 방사선, 시체 섬광, 낙뢰, 전격 */
function drawFx2() {
  const s = view.s, g = game;
  for (const f of g.fx) {
    const k = f.t / f.life, x = wx(f.x), y = wy(f.y);
    if (f.type === 'hit') {
      const r = f.r * s * (k < .4 ? .5 + k * 1.2 : 1 - (k - .4) * .9);
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot); ctx.fillStyle = '#fff'; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, q = i % 2 ? r * .36 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (f.type === 'ray') {
      const d0 = f.l * s * (.25 + k * .6), d1 = f.l * s * (.55 + k * .55), w = (3.6 * (1 - k) + .4) * s;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + Math.cos(f.a) * d0, y + Math.sin(f.a) * d0); ctx.lineTo(x + Math.cos(f.a) * d1, y + Math.sin(f.a) * d1); ctx.stroke();
    } else if (f.type === 'corpse') {
      const im = monWhite(f.name); if (!ok(im)) continue;
      const h = f.h * s * (1 + k * .35), w = h * im.naturalWidth / im.naturalHeight;
      ctx.save(); ctx.translate(x, y); if (f.flip > 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    } else if (f.type === 'zap') {
      ctx.strokeStyle = '#fff6a8'; ctx.lineWidth = (6 * (1 - k) + 1) * s; ctx.lineJoin = 'miter'; ctx.beginPath(); let yy = 0, xx = x; ctx.moveTo(xx, 0);
      const seed = f.x * 7; while (yy < y) { yy += 34 * s; xx = x + Math.sin(seed + yy) * 16 * s; ctx.lineTo(xx, Math.min(yy, y)); } ctx.stroke();
    } else if (f.type === 'bolt') { drawBoltFx(f);
    } else if (f.type === 'arc') {
      ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = (3.4 * (1 - k) + .6) * s; ctx.beginPath(); ctx.moveTo(x, y); const x2 = wx(f.x2), y2 = wy(f.y2), mx = (x + x2) / 2 + Math.sin(f.t * 80) * 8 * s, my = (y + y2) / 2 + Math.cos(f.t * 80) * 8 * s; ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
    } else if (f.type === 'warn') {
      // 보스 공격 예고 띠
      ctx.fillStyle = `rgba(255,50,70,${.14 + Math.abs(Math.sin(f.t * 16)) * .22})`; ctx.fillRect(wx(f.x0), wy(f.y0), (f.x1 - f.x0) * s, (f.y1 - f.y0) * s);
    } else if (f.type === 'mark') {
      // 나타날 자리·터질 자리 표식: 고리가 조여 든다
      const r = f.r * s * (1.6 - k * .7); ctx.globalAlpha = .5 + Math.abs(Math.sin(f.t * 18)) * .4; ctx.strokeStyle = f.col || '#ff5068'; ctx.lineWidth = 2.6 * s;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * .35, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.type === 'warnRay') {
      // 분신이 지나갈 선. 실제 경로와 같은 폭이다
      ctx.save(); ctx.translate(wx(f.x), wy(f.y)); ctx.rotate(f.a); ctx.fillStyle = `rgba(255,50,70,${.16 + Math.abs(Math.sin(f.t * 16)) * .24})`; ctx.fillRect(0, -f.w / 2 * s, f.len * s, f.w * s); ctx.restore();
    } else if (f.type === 'pillar') {
      // 카드 빛기둥: 몸에서 화면 위까지
      const fade = 1 - k, W_ = f.w * s * (1 + k * .4), X = wx(f.x);
      ctx.globalAlpha = fade * .45; ctx.fillStyle = f.col; ctx.fillRect(X - W_ / 2, 0, W_, y);
      ctx.globalAlpha = fade * .85; ctx.fillStyle = '#fff'; ctx.fillRect(X - W_ * .16, 0, W_ * .32, y);
      ctx.globalAlpha = 1;
    } else if (f.type === 'beam') {
      const X = wx(f.x0), Y = wy(f.y0), BW = (f.x1 - f.x0) * s, BH = (f.y1 - f.y0) * s, fade = clamp((f.life - f.t) / .12, 0, 1);
      ctx.globalAlpha = fade * .55; ctx.fillStyle = f.col; ctx.fillRect(X, Y, BW, BH);
      ctx.globalAlpha = fade * .9; ctx.fillStyle = '#fff'; const horiz = BW > BH; if (horiz) ctx.fillRect(X, Y + BH * .3, BW, BH * .4); else ctx.fillRect(X + BW * .3, Y, BW * .4, BH);
      ctx.globalAlpha = 1;
    } else if (f.type === 'wave') {
      const c = f.col || '#ff8a7a'; ctx.fillStyle = c; ctx.fillRect(wx(f.x) - 10 * s, wy(f.y) - 20 * s, 20 * s, 20 * s);
      ctx.fillStyle = '#fff'; ctx.fillRect(wx(f.x) - 5 * s, wy(f.y) - 12 * s, 10 * s, 12 * s);
    }
  }
  // 피해 숫자
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const m of g.popups) {
    if (!m.dmg) continue;
    const k = m.t / .6, pop = k < .22 ? 1 + (1 - k / .22) * .9 : 1, fs = (m.crit ? 17 : 12.5) * s * pop;
    ctx.font = `${fs}px ${FONT}`; ctx.lineWidth = 3.2 * s; ctx.strokeStyle = '#1a0a1e';
    const x = clamp(wx(m.x + m.vx * m.t), 30 * s, view.W - 30 * s), y = wy(m.y) - (1 - Math.pow(1 - k, 2)) * 26 * s;
    ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
    ctx.strokeText(m.text, x, y); ctx.fillStyle = m.col; ctx.fillText(m.text, x, y); ctx.globalAlpha = 1;
  }
}

/* ───── HUD: 궁수의 전설 2처럼 위쪽 띠에 모은다 ───── */
function textOut(t, x, y, col = '#fff', lw = 3) { const s = view.s; ctx.lineWidth = lw * s; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,8,20,.92)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); }
function drawHUD() {
  const g = game, p = g.p; if (!p) return;
  const s = view.s, top = view.safeT + 8 * s, W = view.W;
  // 카드를 고르는 동안에는 체력 막대 움직임도 멈춘다
  const hudLive = g.state !== 'card';
  if (hudLive) g.hudHp = approachSnap(g.hudHp === undefined ? p.hp : g.hudHp, p.hp, 5, 1 / 60, .3);
  // 체력
  const left = 46 * s, bw = 118 * s, bh = 18 * s, flash = g.hpFlash || 0, rise = flash > 0 ? 1 - Math.pow(flash, 3) : 1, hpShown = flash > 0 ? Math.round(g.hpFrom + (p.hp - g.hpFrom) * rise) : p.hp, f = clamp(hpShown / p.maxHp, 0, 1), f2 = clamp(g.hudHp / p.maxHp, 0, 1);
  if (flash > 0 && hudLive) g.hpFlash = Math.max(0, flash - 1 / 60 / 1.1);
  ctx.fillStyle = 'rgba(10,8,20,.85)'; rr(left, top, bw, bh, 6 * s); ctx.fill();
  ctx.fillStyle = '#ffe9c0'; if (f2 > f && !flash) ctx.fillRect(left + 2 * s, top + 2 * s, (bw - 4 * s) * f2, bh - 4 * s);
  const low = f < .3, hg = ctx.createLinearGradient(0, top, 0, top + bh); hg.addColorStop(0, low ? '#ff7a8a' : '#ff6a78'); hg.addColorStop(1, low ? '#c21c36' : '#d42a44');
  ctx.fillStyle = hg; ctx.fillRect(left + 2 * s, top + 2 * s, (bw - 4 * s) * f, bh - 4 * s);
  if (flash > 0) { ctx.globalAlpha = flash * .55; ctx.fillStyle = '#7dffa8'; ctx.fillRect(left + 2 * s, top + 2 * s, (bw - 4 * s) * f, bh - 4 * s); ctx.globalAlpha = flash; ctx.strokeStyle = '#8dffb0'; ctx.lineWidth = 2.6 * s; rr(left - 1 * s, top - 1 * s, bw + 2 * s, bh + 2 * s, 7 * s); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.font = `${12 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  textOut(`${hpShown} / ${p.maxHp}`, left + bw / 2, top + bh / 2 + .5 * s, '#fff', 2.6);
  // 판 표시: 챕터 안의 6칸(전투·휴식·보스). 휴식 칸은 초록 잎, 마지막은 보스 해골
  const wv = stageOf(g.wave) - 1, pipX = W * .635, pipY = top + 8 * s, gap = 14.5 * s, pr = 6.6 * s;
  for (let i = 0; i < STAGES; i++) {
    const x = pipX + (i - (STAGES - 1) / 2) * gap, done = i < wv, cur = i === wv, kind = STAGE_PLAN[i];
    ctx.fillStyle = 'rgba(10,8,20,.85)'; ctx.beginPath(); ctx.arc(x, pipY, pr, 0, 7); ctx.fill();
    if (kind === 'boss') { const sk = IMG.ui_skull; if (ok(sk)) ctx.drawImage(sk, x - pr * .85, pipY - pr * .85, pr * 1.7, pr * 1.7); if (!cur) { ctx.fillStyle = 'rgba(10,8,20,.45)'; ctx.beginPath(); ctx.arc(x, pipY, pr, 0, 7); ctx.fill(); } }
    else if (kind === 'rest') { ctx.fillStyle = done ? '#7dffa8' : cur ? '#c8ffd8' : '#2f5040'; ctx.beginPath(); ctx.ellipse(x, pipY, pr * .42, pr * .62, .6, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = done ? '#ffd24a' : cur ? '#fff' : '#3c3650'; ctx.beginPath(); ctx.arc(x, pipY, pr * .55, 0, 7); ctx.fill(); }
    if (cur) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.arc(x, pipY, pr, 0, 7); ctx.stroke(); }
  }
  const pw = 80 * s, prog = g.room ? 1 : clamp(p.y / Math.max(1, (g.isBossWave ? g.arenaTop * TILE : g.floorRow * TILE)), 0, 1);
  if (!g.boss) { ctx.fillStyle = 'rgba(10,8,20,.85)'; ctx.fillRect(pipX - pw / 2, pipY + 11 * s, pw, 4 * s); ctx.fillStyle = '#ffd24a'; ctx.fillRect(pipX - pw / 2, pipY + 11 * s, pw * prog, 4 * s); }
  // 파편
  const gx = W - 28 * s; ctx.font = `${15 * s}px ${FONT}`; ctx.textAlign = 'right';
  textOut(p.shards, gx, top + 9 * s, '#fff');
  const im = IMG.o_rose; if (ok(im)) { const h = 15 * s, w = h * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, gx + 5 * s, top + 1.5 * s, w, h); }
  // 보스 체력
  if (g.boss && g.boss.barK > 0) {
    const b = g.boss, by = top + 26 * s, bw2 = W - 28 * s, x0 = 14 * s, F = (g.minis ? clamp(g.minis.reduce((a, m) => a + Math.max(0, m.hp), 0) / g.minis.reduce((a, m) => a + m.maxHp, 0), 0, 1) : clamp(b.hp / b.maxHp, 0, 1)) * b.barK;
    ctx.font = `${12.5 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,8,20,.9)'; rr(x0, by + 12 * s, bw2, 12 * s, 5 * s); ctx.fill();
    b.barGhost = approachSnap(b.barGhost === undefined ? F : b.barGhost, F, 4, 1 / 60, .001);
    ctx.fillStyle = '#ffe9c0'; ctx.fillRect(x0 + 2 * s, by + 14 * s, (bw2 - 4 * s) * b.barGhost, 8 * s);
    const bg = ctx.createLinearGradient(0, by + 14 * s, 0, by + 22 * s); bg.addColorStop(0, '#ff5b7a'); bg.addColorStop(1, '#a01040');
    ctx.fillStyle = bg; ctx.fillRect(x0 + 2 * s, by + 14 * s, (bw2 - 4 * s) * F, 8 * s);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x0 + (bw2) * .5 - .5 * s, by + 13 * s, 1.4 * s, 10 * s);
    textOut(b.def.name, W / 2, by + 3 * s, b.flash > 0 ? '#ffd24a' : '#fff', 3);
  }
  // 콤보
  if (p.combo >= 2) {
    const pop = 1 + (p.comboPop || 0) * .4, fs = (22 + Math.min(p.combo, 30) * .5) * s * pop;
    ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center';
    const col = p.combo >= 25 ? '#ff8a5c' : p.combo >= 15 ? '#ffd24a' : p.combo >= 8 ? '#fff0a0' : '#ffffff', y = top + (g.boss ? 76 : 54) * s;
    textOut(p.combo + ' 콤보', W / 2, y, col, 4.5);
  }
  if (p.high) {
    const b2 = 130 * s, x = W / 2 - b2 / 2, y = top + (g.boss ? 92 : 72) * s, k = clamp(p.gemT / 4, 0, 1);
    ctx.fillStyle = 'rgba(8,10,20,.8)'; ctx.fillRect(x, y, b2, 6 * s); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x, y, b2 * k, 6 * s);
  } else if (p.gemChain > 0 && p.gemT > 0) {
    ctx.font = `${12 * s}px ${FONT}`; ctx.textAlign = 'center'; textOut('+' + p.gemChain, W / 2, top + (g.boss ? 94 : 74) * s, '#ffe27a');
  }
}
function drawBanner() {
  const g = game, b = g.banner; if (!b || (g.state !== 'play' && g.state !== 'descend')) return;
  const s = view.s, W = view.W, y = view.H * .26, k = b.t, inA = clamp(k / .22, 0, 1), outA = clamp((b.life - k) / .25, 0, 1), ease = 1 - Math.pow(1 - inA, 3), h = 58 * s;
  ctx.globalAlpha = outA;
  ctx.fillStyle = b.gold ? 'rgba(70,40,0,.86)' : 'rgba(8,6,18,.78)'; ctx.fillRect(W * (1 - ease), y - h / 2, W, h);
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(W * (1 - ease), y - h / 2, W, 2 * s); ctx.fillRect(W * (ease - 1), y + h / 2 - 2 * s, W, 2 * s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${13 * s}px ${FONT}`; textOut(b.a, W / 2 + (1 - ease) * 80 * s, y - 13 * s, '#ffe9b0', 2.6);
  ctx.font = `${22 * s}px ${FONT}`; textOut(b.b, W / 2 - (1 - ease) * 80 * s, y + 10 * s, '#fff', 3.4);
  ctx.globalAlpha = 1;
}
function drawHints() {
  const g = game; if (!(g.hintT > 0) || g.state !== 'play') return;
  const al = clamp(g.hintT, 0, 1), s = view.s;
  ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${13 * s}px ${FONT}`;
  for (const [t, x, y] of [['이동', ui.stickHome.x, ui.stickHome.y - ui.knobR - 12 * s], ['점프하면 자동 공격', clamp(ui.btn.x, 90 * s, view.W - 90 * s), ui.btn.y - ui.btn.r - 14 * s]]) textOut(t, x, y);
  ctx.globalAlpha = 1;
}
function render(dt) {
  const g = game;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.W, view.H);
  if (!g.p || !['play', 'descend', 'intro', 'bossdead', 'dying', 'continue', 'card', 'pause', 'result'].includes(g.state)) return;
  drawSky();
  // 심층 챕터(7~12): 배경만 더 어둡고 붉게 가라앉힌다(몬스터·지형은 그대로 밝아 구분된다)
  if (g.deep && !g.room) { ctx.fillStyle = 'rgba(14,2,10,.38)'; ctx.fillRect(0, 0, view.W, view.H); const q = ctx.createRadialGradient(view.W / 2, view.H * .45, view.H * .2, view.W / 2, view.H * .45, view.H * .75); q.addColorStop(0, 'rgba(120,0,30,0)'); q.addColorStop(1, 'rgba(90,0,24,.35)'); ctx.fillStyle = q; ctx.fillRect(0, 0, view.W, view.H); }
  ctx.save();
  if (g.shake > .05) ctx.translate((Math.random() - .5) * g.shake * view.s * .7, (Math.random() - .5) * g.shake * view.s * .7);
  ctx.translate(0, g.kick * view.s);
  drawDecor();
  if (!g.minis && g.boss && g.boss.alive !== false) drawBoss();
  // 중간 보스 방은 발판이 전투 공간이라 어두운 막 위에 그린다. 다른 방은 막이 앞쪽이다
  const miniRoom = g.room && g.room.kind === 'mini';
  if (miniRoom) drawRoomBack();
  drawSkillsBack(); drawTiles(); drawDoors(); drawRest(); drawPortal(); if (!g.minis) drawBossBits();
  if (g.room && !miniRoom) drawRoomBack();
  // 중간 보스는 발판과 어두운 막 앞에 그린다. 바닥 아래만 잘라 땅에서 올라오는 모습은 그대로 둔다
  if (g.minis) { ctx.save(); ctx.beginPath(); ctx.rect(0, -view.H, view.W, view.H + wy(g.room.floorY)); ctx.clip(); drawMinis(); ctx.restore(); drawBossBits(); }
  for (const j of g.jars) if (j.alive) drawJar(j);
  for (const s of g.shards) drawShard(s);
  drawHaz();
  for (const e of g.enemies) if (e.alive) drawEnemy(e);
  drawEnemyShots(); drawBullets();
  if (g.state !== 'dying' && g.state !== 'continue') { drawHero(); drawSkillsFront(); }
  drawFx(); drawFx2();
  if (g.room) drawRoomFront();
  drawDoorPrompt(); drawRestPrompt();
  ctx.restore();
  // 전체 화면 효과. 어둠(첫 번째 어둠의 2단계): 주인공 둘레만 보인다
  if (g.dark > 0 && g.p) { const px = wx(g.p.x), py = wy(g.p.y), q = ctx.createRadialGradient(px, py, 70 * view.s, px, py, 170 * view.s); q.addColorStop(0, 'rgba(6,2,16,0)'); q.addColorStop(1, `rgba(6,2,16,${.9 * Math.min(1, g.dark)})`); ctx.fillStyle = q; ctx.fillRect(0, 0, view.W, view.H); }
  if (g.whiteout > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(.85, g.whiteout)})`; ctx.fillRect(0, 0, view.W, view.H); }
  const low = g.p && g.p.hp / g.p.maxHp < .3 ? (.35 + Math.sin(g.t * 5) * .12) : 0, v = Math.max(g.vign, low);
  if (v > 0) {
    const q = ctx.createRadialGradient(view.W / 2, view.H / 2, view.H * .28, view.W / 2, view.H / 2, view.H * .68);
    q.addColorStop(0, 'rgba(255,20,50,0)'); q.addColorStop(1, `rgba(220,10,40,${v * .72})`); ctx.fillStyle = q; ctx.fillRect(0, 0, view.W, view.H);
  }
  if (g.cine > 0) drawCine();
  if (g.state !== 'result') { drawHUD(); if (g.state === 'play') { drawButtons(dt); drawStick(); } drawBanner(); drawHints(); drawDebug(); }
  if (g.fade > 0) { ctx.fillStyle = `rgba(4,4,12,${g.fade})`; ctx.fillRect(0, 0, view.W, view.H); }
}
