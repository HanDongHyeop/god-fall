/* v41 구역 규칙(zones.js): 다운웰처럼 챕터마다 규칙 하나를 비튼다. 사용자 요청(2026-11-19): "챕터가 지나도 괴물 색만 살짝 바뀌고 지형이 다 비슷하다"
   dark  지하묘지: 어둡다(주인공 둘레만 보임). 길이 봉인 바닥으로 막혀 있고, 그 위의 횃불을 밟아 켜면 바닥이 무너져 길이 열린다. 켠 횃불은 주변을 밝히고 탄을 채운다
   water 수중: 천천히 떨어진다. 산소가 줄고 0이 되면 체력이 깎인다. 조개를 밟으면 산소가 찬다
   spike 림보: 벽과 바닥이 모두 가시. 발판이 없고 떠다니는 괴물만 있다 → 괴물을 밟으며 내려간다. 군데군데 가시 바닥에 난 틈으로 지나가야 한다
   구역은 챕터 단위(ZONE_PLAN, data.js). 구역 전용 카드(c.zone)는 그 구역에서만 나온다. 보스 판 · 휴식 판에는 규칙을 걸지 않는다 */
'use strict';
const ZONE_NAME = { dark: '지하묘지', water: '수중', spike: '가시 림보' };
const ZONE_INFO = {
  dark: { title: '지하묘지', rule: '횃불을 밟아 길을 여세요', col: '#ffb45a' },
  water: { title: '수중', rule: '조개를 밟아 숨을 채우세요', col: '#7fe0ff' },
  spike: { title: '가시 림보', rule: '괴물을 밟으며 내려가세요', col: '#ff6c8a' },
};
const ZONE = {
  dark: { sight: 118, torch: 170, every: [15, 19], gate: 2 },                                  // 시야 반지름 · 켠 횃불이 밝히는 반지름 · 봉인 바닥 간격(칸) · 열리는 틈(칸)
  water: { grav: .6, maxFall: .6, run: .86, o2: 100, drain: 4.5, clam: 40, hurt: .06, every: 1, gap: 13, rows: .5 },   // 산소 100이 약 22초. 0이면 1초마다 최대 체력의 6%. v61 rows = 판 길이 배수(천천히 떨어지고 조개를 찾느라 같은 길이에서 전투 판이 약 3배 걸려서)
  spike: { spacing: .55, net: [16, 20], gap: 3, wallDmg: 18 },                                  // 떠다니는 괴물 간격 배수 · 가시 바닥 간격(칸) · 틈(칸) · 벽 가시 피해(챕터 배수 전)
};
for (const [k, f] of [['z_torch', 'torch'], ['z_clam', 'clam_shut'], ['z_clam_open', 'clam_open']]) loadImg(k, `assets/map/zone/${f}.webp`);
const zoneOn = k => game.zone === k;
const zoneSight = () => ZONE.dark.sight * (has('z_lamp') ? 1.4 : 1);
const o2Max = () => ZONE.water.o2 + (has('z_lung') ? 40 : 0);
/* 판을 다 지은 뒤(buildWave 끝) 구역 물건을 놓는다. R = 판의 난수 */
function zoneBuild(R, F, lastRow, sh) {
  const g = game; g.torches = []; g.clams = []; g.o2 = o2Max(); g.o2T = 0; g.zoneT = 0;
  if (!g.zone) return;
  const clearRows = (r0, r1) => { for (let r = r0; r <= r1; r++) for (let c = 1; c < COLS - 1; c++) lvl.set(c, r, EMPTY); };
  const doorNear = r => g.doors.some(d => Math.abs(d.row - r) < 5);
  if (g.zone === 'dark') {
    // 봉인 바닥: 가로 한 줄을 통째로 막고, 그 위에 횃불 하나. 횃불을 켜면 틈(gate)이 무너진다
    let r = 22 + sh;
    while (r < lastRow - 8) {
      if (!doorNear(r)) {
        clearRows(r - 3, r - 1); for (let c = 1; c < COLS - 1; c++) lvl.set(c, r, HARD);
        const gc = 1 + Math.floor(R() * (COLS - 2 - ZONE.dark.gate + 1)), gate = []; for (let i = 0; i < ZONE.dark.gate; i++) gate.push(gc + i);
        let tc; do { tc = 1 + Math.floor(R() * (COLS - 2)); } while (Math.abs(tc - gc - (ZONE.dark.gate - 1) / 2) < 2.4);
        for (const c of gate) for (let q = 1; q <= 3; q++) if (r + q < lastRow) lvl.set(c, r + q, EMPTY);   // 틈 바로 아래가 돌로 막혀 있으면 열려도 못 내려간다(30판 중 2판) → 3칸을 비운다
        g.torches.push({ x: (tc + .5) * TILE, y: r * TILE, row: r, gate, lit: false, t: 0 });
        g.enemies = g.enemies.filter(e => !(e.y > (r - 3.2) * TILE && e.y < (r + 1.2) * TILE)); g.jars = g.jars.filter(j => !(j.y > (r - 3.2) * TILE && j.y < (r + 1.2) * TILE));
      }
      r += ZONE.dark.every[0] + Math.floor(R() * (ZONE.dark.every[1] - ZONE.dark.every[0] + 1));
    }
  } else if (g.zone === 'water') {
    // 조개: 발판 위(항아리 자리 + 따로 찾은 자리)에 약 10칸마다 하나
    let last = -99;
    for (let r = 14 + sh; r < lastRow - 2; r++) {
      if (r - last < ZONE.water.gap) continue;
      const cs = []; for (let c = 1; c < COLS - 1; c++) { const t = lvl.at(c, r); if ((t === HARD || t === ONEWAY) && lvl.at(c, r - 1) === EMPTY && lvl.at(c, r - 2) === EMPTY) cs.push(c); }
      if (!cs.length) continue;
      const c = cs[Math.floor(R() * cs.length)], x = (c + .5) * TILE, y = r * TILE;
      g.clams.push({ x, y, open: false, t: 0 }); last = r;
      g.jars = g.jars.filter(j => Math.hypot(j.x - x, j.y - y) > 30); g.enemies = g.enemies.filter(e => !(Math.abs(e.x - x) < 26 && e.y > y - 50 && e.y <= y));
    }
  }
}
/* 림보의 판 짜기: 발판 대신 벽에서 나온 가시 턱과, 틈이 하나 난 가시 바닥. buildWave의 발판 고리 대신 부른다 */
function zoneSpikeLevel(R, put, r0, lastRow) {
  const g = game; g.nets = [];
  let r = r0, next = r0 + 6 + Math.floor(R() * 4);
  while (r < lastRow - 2) {
    if (r >= next) {   // 가시 바닥(틈 하나)
      const gap = 1 + Math.floor(R() * (COLS - 2 - ZONE.spike.gap + 1));
      for (let c = 1; c < COLS - 1; c++) if (c < gap || c >= gap + ZONE.spike.gap) put(c, r, SPIKE);
      g.nets.push({ row: r, gap }); next = r + ZONE.spike.net[0] + Math.floor(R() * (ZONE.spike.net[1] - ZONE.spike.net[0] + 1)); r += 4; continue;
    }
    if (R() < .3) { const side = R() < .5 ? 0 : 1, len = 1 + Math.floor(R() * 2); for (let i = 0; i < len; i++) put(side ? COLS - 2 - i : 1 + i, r, SPIKE); }
    r += 3 + Math.floor(R() * 3);
  }
}
/* 1프레임. play.js tick에서 부른다 */
function zoneTick(dt) {
  const g = game, p = g.p; if (!g.zone || g.room || g.state !== 'play') return;
  g.zoneT += dt;
  const stompOn = (o, r, h) => p.vy > 0 && Math.abs(p.x - o.x) < r + p.w / 2 && Math.abs(p.y + p.h / 2 - (o.y - h)) < 14;
  if (g.zone === 'dark') {
    for (const t of g.torches) {
      if (t.lit) { t.t += dt; continue; }
      if (!stompOn(t, 14, 26) && !(Math.abs(p.x - t.x) < 16 && Math.abs(p.y - (t.y - 22)) < 30 && p.onGround === false && p.vy > 0)) continue;
      t.lit = true; t.t = 0; p.vy = -T.stompV * .9; p.squash = -.22; refill(p); sfx.boom(); vibrate(30); g.shake = Math.max(g.shake, 7);
      g.fx.push({ type: 'ring', x: t.x, y: t.y - 30, r: 120, col: 'rgba(255,190,100,.95)', t: 0, life: .45 }); sparks(t.x, t.y - 34, 14, '#ffb45a', 260, .5);
      popup(t.x, t.y - 70, '길이 열렸다!', '#ffd28a', true);
      if (has('z_ember')) { healBy(p.maxHp * .05); g.hpFrom = p.hp; g.hudHp = p.hp; g.hpFlash = 1; }
      g.later.push({ t: .35, fn: () => { for (const c of t.gate) if (lvl.at(c, t.row)) breakTile(c, t.row); g.shake = Math.max(g.shake, 9); } });
    }
  } else if (g.zone === 'water') {
    const Z = ZONE.water, max = o2Max();
    for (const c of g.clams) {
      c.t += dt; if (!c.open && Math.random() < dt * 1.6 && Math.abs(c.y - p.y) < 500) g.fx.push({ type: 'dot', x: c.x + (Math.random() - .5) * 10, y: c.y - 20, vx: 0, vy: -40, t: 0, life: .9, r: 2, col: 'rgba(200,245,255,.8)', g: 0 });   // 닫힌 조개의 공기 방울(그리기가 아니라 여기서 만든다: 카드 창이 떠 있는 동안 쌓이지 않게)
      if (c.open || !stompOn(c, 16, 20)) continue;
      c.open = true; c.t = 0; p.vy = -T.stompV * .9; p.squash = -.22; refill(p); g.o2 = Math.min(max, g.o2 + Z.clam + (has('z_lung') ? 15 : 0)); sfx.ping(); vibrate(20);
      g.fx.push({ type: 'ring', x: c.x, y: c.y - 16, r: 70, col: 'rgba(140,230,255,.95)', t: 0, life: .35 }); popup(c.x, c.y - 50, '숨 +', '#9feaff', true);
      for (let i = 0; i < 10; i++) g.fx.push({ type: 'dot', x: c.x + (Math.random() - .5) * 24, y: c.y - 14, vx: (Math.random() - .5) * 40, vy: -60 - Math.random() * 90, t: 0, life: .9, r: 2 + Math.random() * 3, col: 'rgba(200,245,255,.9)', g: 0 });
      if (has('z_pearl')) { healBy(p.maxHp * .04); g.hpFrom = p.hp; g.hudHp = p.hp; g.hpFlash = 1; }
    }
    g.o2 = Math.max(0, g.o2 - Z.drain * (has('z_gill') ? .7 : 1) * dt);
    if (g.o2 <= 0 && !g.god) { g.o2T += dt; if (g.o2T >= Z.every) { g.o2T = 0; const d = Math.max(1, Math.round(p.maxHp * Z.hurt)); p.hp -= d; p.hitFlash = .12; g.vign = 1; g.shake = Math.max(g.shake, 6); popup(p.x, p.y - 34, '숨이 막힌다 -' + d, '#8fd8ff', true); sfx.hurt(); if (p.hp <= 0) { p.hp = 0; gameOver(); return; } } } else g.o2T = 0;
    if (Math.random() < dt * 5) g.fx.push({ type: 'dot', x: p.x + (Math.random() - .5) * 14, y: p.y - 22, vx: (Math.random() - .5) * 14, vy: -50 - Math.random() * 40, t: 0, life: 1, r: 1.5 + Math.random() * 2, col: 'rgba(200,245,255,.7)', g: 0 });
  } else if (g.zone === 'spike') {
    // 벽 가시: 양쪽 벽에 몸이 닿으면 찔린다
    if (p.inv <= 0 && !g.god && (p.x - p.w / 2 <= TILE + 1.5 || p.x + p.w / 2 >= WORLD_W - TILE - 1.5)) { const left = p.x < WORLD_W / 2; hurt(left ? p.x - 30 : p.x + 30, Math.round(ZONE.spike.wallDmg * DIFF.dmg(g.wave))); p.vx = left ? 220 : -220; }
  }
}
/* 그리기: 물건(발판 앞, 괴물 뒤) */
function drawZoneObjs() {
  const g = game, s = view.s; if (!g.zone || g.room) return;
  if (g.zone === 'dark') for (const t of g.torches) {
    const x = wx(t.x), y = wy(t.y); if (y < -80 || y > view.H + 80) continue;
    const im = IMG.z_torch, h = 40 * s; if (ok(im)) { const w = h * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, x - w / 2, y - h, w, h); }
    const by = y - h * .78;
    if (t.lit) {   // 타오르는 불(몸통 2겹 + 속불)
      const fl = Math.min(1, t.t * 4), q = g.t * 9 + t.x;
      const gl = ctx.createRadialGradient(x, by - 10 * s, 2 * s, x, by - 10 * s, 46 * s); gl.addColorStop(0, 'rgba(255,190,90,.55)'); gl.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 46 * s, by - 56 * s, 92 * s, 92 * s);
      flameTongue(x, by, (26 + Math.sin(q) * 4) * s * fl, 9 * s, Math.sin(q * .7) * 2 * s, .04, '#ff6a1a', '#ffb02e', 'rgba(255,220,120,0)');
      flameTongue(x - 3 * s, by, (17 + Math.sin(q * 1.3) * 3) * s * fl, 6 * s, Math.sin(q * .9) * 2 * s, -.06, '#ffd24a', '#fff2b0', 'rgba(255,255,255,0)');
    } else {   // 꺼진 횃불: 어둠 속에서도 보이게 불씨가 깜박인다
      const a = .55 + .35 * Math.sin(g.t * 5 + t.x); ctx.fillStyle = `rgba(255,140,50,${a})`; ctx.beginPath(); ctx.arc(x - 3 * s, by - 2 * s, 2.2 * s, 0, 7); ctx.arc(x + 4 * s, by - 3 * s, 1.8 * s, 0, 7); ctx.fill();
      // 열릴 틈: 바닥에 금빛 문양
      for (const c of t.gate) { ctx.fillStyle = `rgba(255,190,90,${.28 + .16 * Math.sin(g.t * 3 + c)})`; ctx.fillRect(wx(c * TILE) + 3 * s, y + 3 * s, (TILE - 6) * s, 5 * s); }
    }
  }
  if (g.zone === 'water') for (const c of g.clams) {
    const x = wx(c.x), y = wy(c.y); if (y < -80 || y > view.H + 80) continue;
    const im = c.open ? IMG.z_clam_open : IMG.z_clam, h = (c.open ? 44 : 30) * s * (c.open ? Math.min(1, .7 + c.t * 3) : 1 + .04 * Math.sin(g.t * 3 + c.x));
    if (ok(im)) { const w = h * im.naturalWidth / im.naturalHeight; ctx.globalAlpha = c.open ? .8 : 1; ctx.drawImage(im, x - w / 2, y - h + 2 * s, w, h); ctx.globalAlpha = 1; }
  }
  if (g.zone === 'spike') {   // 양쪽 벽의 가시 띠(화면에 보이는 만큼)
    const top = Math.floor(g.cam / 14) * 14, n = Math.ceil(view.worldH / 14) + 2;
    for (let i = 0; i < n; i++) {
      const yy = wy(top + i * 14), x0 = wx(TILE), x1 = wx(WORLD_W - TILE), w = 13 * s, hh = 6.6 * s;
      for (const [bx, d] of [[x0, 1], [x1, -1]]) { ctx.fillStyle = '#3a1322'; ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx + d * w, yy + hh); ctx.lineTo(bx, yy + hh * 2); ctx.fill(); ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.moveTo(bx + d * w * .45, yy + hh * .55); ctx.lineTo(bx + d * w, yy + hh); ctx.lineTo(bx + d * w * .45, yy + hh * 1.45); ctx.fill(); }
    }
  }
}
/* 화면 전체 효과: 어둠(구멍 뚫린 막) · 물빛. 오프스크린 캔버스를 쓰지 않는다(아이폰) */
function drawZoneScreen() {
  const g = game, s = view.s, W = view.W, H = view.H, p = g.p; if (!g.zone || g.room || !p) return;
  if (g.zone === 'water') {
    const wg = ctx.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, 'rgba(40,150,210,.20)'); wg.addColorStop(1, 'rgba(10,60,140,.34)'); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(190,240,255,.10)'; ctx.lineWidth = 2 * s;   // 흔들리는 물결 빛
    for (let i = 0; i < 4; i++) { const yy = ((g.t * 14 + i * 230) % (H + 120)) - 60; ctx.beginPath(); for (let x = 0; x <= W; x += 24 * s) { const y2 = yy + Math.sin(x * .012 + g.t * 1.3 + i) * 10 * s; x ? ctx.lineTo(x, y2) : ctx.moveTo(x, y2); } ctx.stroke(); }
    if (g.o2 < o2Max() * .25) { const a = (.18 + .16 * Math.sin(g.t * 9)) * (1 - g.o2 / (o2Max() * .25)); const vg = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .65); vg.addColorStop(0, 'rgba(20,40,120,0)'); vg.addColorStop(1, `rgba(10,20,90,${a + .2})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
  }
  if (g.zone === 'dark') {
    const holes = [[wx(p.x), wy(p.y - 6), zoneSight() * s]];
    for (const t of g.torches) if (t.lit) { const y = wy(t.y - 30); if (y > -300 * s && y < H + 300 * s) holes.push([wx(t.x), y, ZONE.dark.torch * s * Math.min(1, .3 + t.t * 2)]); }
    // 어둠 = 가로 띠로 나눠 '구멍들의 합집합'을 뺀 곳만 칠한다(구멍이 겹쳐도 겹친 곳이 다시 어두워지지 않는다). 반지름을 줄여 가며 3번 겹쳐 가장자리를 부드럽게
    const band = Math.max(3, Math.round(2.2 * s));
    for (const [k, a] of [[.7, .38], [.86, .5], [1, .8]]) {
      ctx.fillStyle = `rgba(4,3,10,${a})`;
      for (let y0 = 0; y0 < H; y0 += band) {
        const yc = y0 + band / 2, iv = [];
        for (const [x, y, r0] of holes) { const r = r0 * k, dy = yc - y; if (Math.abs(dy) < r) { const hw = Math.sqrt(r * r - dy * dy); iv.push([x - hw, x + hw]); } }
        if (!iv.length) { ctx.fillRect(0, y0, W, band); continue; }
        iv.sort((p1, p2) => p1[0] - p2[0]); let cur = 0;
        for (const [l, r] of iv) { if (l > cur) ctx.fillRect(cur, y0, l - cur, band); if (r > cur) cur = r; }
        if (cur < W) ctx.fillRect(cur, y0, W - cur, band);
      }
    }
    // 꺼진 횃불의 불씨는 어둠 위에도 보인다
    for (const t of g.torches) if (!t.lit) { const x = wx(t.x), y = wy(t.y - 30); if (y < -20 || y > H + 20) continue; const a = .5 + .4 * Math.sin(g.t * 5 + t.x); ctx.fillStyle = `rgba(255,150,60,${a})`; ctx.beginPath(); ctx.arc(x, y, 3 * s, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(255,170,80,${a * .25})`; ctx.beginPath(); ctx.arc(x, y, 12 * s, 0, 7); ctx.fill(); }
  }
}
/* HUD: 구역 이름 표시 + 수중이면 산소 막대(경험치 막대 아래) */
function drawZoneHud(left, y, bw) {
  const g = game, s = view.s; if (!g.zone || g.room) return;
  if (g.zone === 'water') {
    const max = o2Max(), k = clamp(g.o2 / max, 0, 1), h = 7 * s, low = k < .25;
    ctx.fillStyle = 'rgba(10,8,20,.85)'; rr(left, y, bw, h, 3 * s); ctx.fill();
    ctx.fillStyle = low ? (Math.sin(g.t * 12) > 0 ? '#ff6a8a' : '#ffd0dc') : '#6fe0ff'; rr(left + 1 * s, y + 1 * s, Math.max(0, (bw - 2 * s) * k), h - 2 * s, 2 * s); ctx.fill();
    ctx.font = `${10 * s}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; textOut('숨', left + bw + 4 * s, y + h / 2, low ? '#ff9db0' : '#bfefff', 2.4); ctx.textAlign = 'center';
  }
}
/* 판 시작 알림: 구역 이름과 규칙 한 줄(2.6초) */
function drawZoneBanner() {
  const g = game, s = view.s, W = view.W, H = view.H; if (!g.zone || g.room || g.zoneT === undefined || g.zoneT > 2.6 || g.state === 'card') return;
  const Z = ZONE_INFO[g.zone], a = clamp(g.zoneT / .25, 0, 1) * clamp((2.6 - g.zoneT) / .4, 0, 1), y = H * .355;   // 판 알림 띠 바로 아래
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,6,16,.78)'; ctx.fillRect(0, y - 30 * s, W, 60 * s); ctx.fillStyle = Z.col; ctx.fillRect(0, y - 30 * s, W, 2 * s); ctx.fillRect(0, y + 28 * s, W, 2 * s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${22 * s}px ${FONT}`; textOut(Z.title, W / 2, y - 8 * s, Z.col, 3.6); ctx.font = `${13 * s}px ${FONT}`; textOut(Z.rule, W / 2, y + 15 * s, '#fff', 2.8);
  ctx.globalAlpha = 1;
}

/* ───── v46 어려움: 가시 함정 턱(TRAP 타일) ─────
   벽에서 튀어나온 턱 가운데 일부가 함정이다(윗면에 구멍 줄이 보인다). 밟으면 딸깍 소리와 함께 붉게 달아오르고, HARDM.spikeDelay초 뒤 가시가 솟아 spikeUp초 동안 가시 턱이 된다.
   솟아 있는 동안은 타일을 SPIKE로 바꿔 두어 기존 가시 규칙(닿으면 피해 · 무적 시간에는 바닥처럼 밟음)을 그대로 쓴다. g.traps = Map(칸 번호 → { st: 'arm' | 'up' | 'cool', t }) */
function trapTick(dt) {
  const g = game, p = g.p; if (!g.traps || g.room || g.state !== 'play' || !p) return;
  if (p.onGround) {   // 발밑 칸이 함정 턱이면 그 턱 전체(옆으로 이어진 함정 칸)를 건드린다
    const r = Math.floor((p.y + p.h / 2 + 3) / TILE);
    for (const c of new Set([Math.floor((p.x - p.w * .3) / TILE), Math.floor((p.x + p.w * .3) / TILE)])) {
      if (lvl.at(c, r) !== TRAP || g.traps.has(r * COLS + c)) continue;
      let c0 = c, c1 = c; while (lvl.at(c0 - 1, r) === TRAP) c0--; while (lvl.at(c1 + 1, r) === TRAP) c1++;
      for (let k = c0; k <= c1; k++) if (!g.traps.has(r * COLS + k)) g.traps.set(r * COLS + k, { st: 'arm', t: HARDM.spikeDelay });
      sfx.trapArm && sfx.trapArm();
    }
  }
  for (const [i, tr] of g.traps) {
    tr.t -= dt; if (tr.t > 0) continue;
    const c = i % COLS, r = (i - c) / COLS;
    if (tr.st === 'arm') { tr.st = 'up'; tr.t = HARDM.spikeUp; lvl.set(c, r, SPIKE); if (Math.abs((c + .5) * TILE - p.x) < 260 && Math.abs(r * TILE - p.y) < 420) sfx.trapUp && sfx.trapUp(); }
    else if (tr.st === 'up') { tr.st = 'cool'; tr.t = HARDM.spikeCool; lvl.set(c, r, TRAP); }
    else g.traps.delete(i);
  }
}
/* 함정 턱 그리기(render.js 타일 그리기에서 부른다): 윗면 구멍 줄 → 밟히면 붉게 달아오르며 가시 끝이 조금씩 올라온다. 솟은 뒤는 SPIKE 타일이 그린다 */
function drawTrapTile(c, r, x, y, w, h, Sp) {
  const g = game, s = view.s, tr = g.traps && g.traps.get(r * COLS + c), arm = tr && tr.st === 'arm', k = arm ? 1 - tr.t / HARDM.spikeDelay : 0;
  ctx.fillStyle = 'rgba(10,4,10,.78)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + w * (.1 + i * .22), y + 2 * s, w * .14, 3.4 * s);   // 가시가 나올 구멍
  ctx.fillStyle = tr && tr.st === 'cool' ? 'rgba(255,200,120,.5)' : 'rgba(255,70,70,.55)'; ctx.fillRect(x, y, w, 1.4 * s);
  if (arm) {
    const bl = .5 + .5 * Math.sin(g.t * (14 + k * 22));
    ctx.fillStyle = `rgba(255,40,40,${(.18 + .34 * k) * (.6 + .4 * bl)})`; ctx.fillRect(x, y, w, h);
    if (ok(Sp)) { const sh = Math.round(62 / PX * s), up = sh * (.1 + .28 * k * k); ctx.save(); ctx.beginPath(); ctx.rect(x, y - up, w, up); ctx.clip(); ctx.drawImage(Sp, x, y - up + Math.round(3 * s), w, sh); ctx.restore(); }
    if (c === 1 || lvl.at(c - 1, r) !== TRAP) { ctx.font = `${13 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let n = 1; while (lvl.at(c + n, r) === TRAP) n++; textOut('!', x + w * n / 2, y - 16 * s - bl * 2 * s, bl > .5 ? '#ff4a5a' : '#ffd24a', 3); }
  }
}
/* 어려움 판 시작 경고: 붉은 깜박임 + 빗금 띠 + 가운데 '어려움'. 1.7초 */
function drawHardWarn() {
  const g = game; if (!g.hardWarnAt || !g.deep) return;
  const t = (performance.now() - g.hardWarnAt) / 1000, life = 1.7; if (t > life) { g.hardWarnAt = 0; return; }
  const s = view.s, W = view.W, H = view.H, a = clamp(t / .15, 0, 1) * clamp((life - t) / .35, 0, 1), blink = .5 + .5 * Math.sin(t * 17);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .22, W / 2, H / 2, H * .62); vg.addColorStop(0, 'rgba(255,30,40,0)'); vg.addColorStop(1, `rgba(255,30,40,${(.3 + .28 * blink) * a})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const cy = H * .4, bh = 66 * s, sh = 13 * s;
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(22,4,8,.92)'; ctx.fillRect(0, cy - bh / 2, W, bh);
  for (const [y, dir] of [[cy - bh / 2 - sh, 1], [cy + bh / 2, -1]]) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, sh); ctx.clip(); ctx.fillStyle = '#ff3b4a'; ctx.fillRect(0, y, W, sh); ctx.fillStyle = '#1a0a0c';
    const st = 26 * s, off = (t * 90 * s * dir) % st;
    for (let x = -st * 2 + off; x < W + st; x += st) { ctx.beginPath(); ctx.moveTo(x, y + sh); ctx.lineTo(x + st * .5, y + sh); ctx.lineTo(x + st * .5 + sh, y); ctx.lineTo(x + sh, y); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const k = 1 + .05 * blink;
  ctx.font = `${Math.round(34 * s * k)}px ${FONT}`; textOut('어려움', W / 2, cy - 8 * s, blink > .5 ? '#ff3b4a' : '#ffd24a', 4.2);
  ctx.font = `${12.5 * s}px ${FONT}`; textOut('분노한 괴물 · 가시 함정 턱 · 하트 절반', W / 2, cy + 20 * s, '#fff', 2.8);
  ctx.globalAlpha = 1;
}
