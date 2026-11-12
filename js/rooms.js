/* 샛길(다운웰의 타임보이드): 벽의 입구로 들어가면 바깥 시간이 멈춘다. 상점·보물 동굴·신의 제단·치유의 샘 */
'use strict';
const ROOM_LABEL = { shop: '좌판', treasure: '보물 동굴', altar: '신의 제단', spring: '치유의 샘' };
const ROOM_TITLE = { shop: ['떠돌이 신의 좌판', '파편으로 사세요'], treasure: ['보물 동굴', '거대한 파편 덩어리를 쏘세요'], altar: ['신의 제단', '하나만 가져갈 수 있습니다'], spring: ['치유의 샘', '다가가 마시세요'] };

function enterRoom(d) {
  const g = game, p = g.p; d.used = true; sfx.door();
  g.saved = { haz: g.haz, grid: lvl.grid, hp: lvl.hp, rows: lvl.rows, enemies: g.enemies, jars: g.jars, shards: g.shards, decor: g.decor, portal: g.portal, levelH: g.levelH, cam: g.cam, px: p.x, py: p.y, doors: g.doors, ebul: g.ebul, decals: g.decals, door: d, arenaTop: g.arenaTop, isBossWave: g.isBossWave, floorRow: g.floorRow };
  g.isBossWave = false;
  const rows = Math.max(Math.ceil(view.worldH / TILE) + 1, 14), F = rows - 4; lvl.rows = rows; g.floorRow = F; lvl.grid = new Uint8Array(rows * COLS); lvl.hp = new Float32Array(rows * COLS);
  // v31: 위를 깰 수 없는 벽으로 막지 않는다(화면 밖 맨 윗줄만). 보이지 않는 천장은 화면 위 끝(playerCeil)
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) { if (r < 1 || r >= F || c === 0 || c === COLS - 1) lvl.set(c, r, HARD); }
  g.arenaTop = 1;
  if (d.kind === 'mini') buildMiniRoom(F);
  g.levelH = (rows - 1) * TILE; g.enemies = []; g.jars = []; g.shards = []; g.decor = []; g.portal = null; g.doors = []; g.ebul = []; g.decals = []; g.bullets = []; g.haz = []; g.later = [];
  const side = d.side, floorY = F * TILE;
  p.x = side ? WORLD_W - TILE - 40 : TILE + 40; p.y = floorY - p.h / 2 - 1; p.vx = 0; p.vy = 0; p.onGround = true; p.inv = 0;
  refill(p);
  const room = g.room = { kind: d.kind, floorY, side, items: [], t: 0, exit: { x: side ? WORLD_W - TILE : TILE, y: floorY - 40, side, used: false }, crystal: null, title: ROOM_TITLE[d.fake || d.kind] };
  // 값은 이번 판에 내려온 깊이로 오른다. 파편은 판마다 새로 모으기 때문
  const sec = Math.floor((g.wave - g.startWave) / 3) + 1, disc = has('member') ? .7 : 1, spots = side ? [90, 170, 250] : [110, 190, 270];
  const price = n => Math.round(n * disc);
  if (d.kind === 'mini') {
    startMini(room);
  } else if (d.kind === 'shop') {
    const stock = [
      { id: 'heal', name: '암브로시아', sub: '체력 35% 회복', icon: 'ambrosia', cost: price(70 + sec * 30), buy: () => healBy(p.maxHp * .35) },
      { id: 'ammo', name: '탄창 보강', sub: '탄창 +2', icon: 'mag', cost: price(100 + sec * 40), buy: () => { p.maxAmmo += 2; p.ammo = p.maxAmmo; } },
      { id: 'hp', name: '넥타르', sub: '최대 체력 +20', icon: 'feast', cost: price(130 + sec * 50), buy: () => { p.maxHp += 20; p.hp += 20; } },
      { id: 'atk', name: '단련', sub: '공격력 +12%', icon: 'heavy', cost: price(160 + sec * 60), buy: () => { p.atk = Math.round(p.atk * 1.12); } },
      { id: 'card', name: '신탁', sub: '무작위 카드 1장', icon: 'member', cost: price(220 + sec * 70), buy: () => grantRandomCard() },
    ];
    for (let i = stock.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [stock[i], stock[j]] = [stock[j], stock[i]]; }
    stock.slice(0, 3).forEach((it, i) => room.items.push({ ...it, x: spots[i], y: floorY }));
  } else if (d.kind === 'treasure') {
    // 황금 수정(큰 파편) 또는 루비 광맥(작은 루비가 쏟아진다). 받는 양은 같다
    const ruby = Math.random() < .5;
    room.crystal = { x: WORLD_W / 2 + (side ? -30 : 30), y: floorY - 34, hp: 4, shake: 0, ruby };
    if (ruby) room.title = ['루비 광맥', '거대한 루비를 쏘세요'];
  } else if (d.kind === 'altar') {
    // 제단은 희귀부터 시작해 같은 등급 사다리로 오른다
    const pool = cardPool().filter(c => c.tier !== '일반'), pick = [];
    while (pick.length < 3 && pool.length) { const c = takeOfTier(pool, rollTier(true, 1)); if (!c) break; pick.push(c); }
    pick.forEach((c, i) => room.items.push({ id: 'c_' + c.id, name: c.name, sub: c.desc, note: c.note, icon: c.id, cost: 0, tier: c.tier, card: c, once: true, buy: () => applyCard(c), hpCost: i === 2 ? .2 : 0 }));
    room.items.forEach((it, i) => { it.x = spots[i]; it.y = floorY; });
  } else if (d.kind === 'spring') {
    room.items.push({ id: 'spring', name: '샘물', sub: '체력 50% 회복, 탄창 +1', icon: 'ambrosia', cost: 0, once: true, buy: () => { healBy(p.maxHp * .5); p.maxAmmo++; p.ammo = p.maxAmmo; }, x: WORLD_W / 2, y: floorY });
  }
  for (const it of room.items) if (it.icon) loadImg('c_' + it.icon, `assets/card/${it.icon}.webp`);
  g.cam = Math.max(0, g.levelH + TILE - view.worldH);
  g.fade = 1; g.fadeOut = -1;
}
/* 중간 보스 방의 발판: 들어갈 때마다 새로 짠다. 같은 챕터·같은 웨이브여도 구조가 달라진다.
   모양 → 좌우 반전 → 위치·길이·재질·두께를 무작위로 고른 뒤, 모든 발판에 오르내릴 수 있는 판만 쓴다.
   h = 바닥에서 몇 칸 위(바닥 두 칸은 항상 비운다), th = 두께(위로 자란다) */
const MINI_ROOM = { minH: 3, maxH: 7, jump: 3, reachUp: [3, 3, 3, 2], reachDown: 4, upper: 5 };   // upper = 위층 발판을 아래층 모양에서 몇 칸 올려 까는지(v31 방을 화면 전체로 넓힘)
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const MINI_SHAPES = {
  // 양쪽 선반 + 가운데 높은 발판
  wings: (m, a) => { const c = ri(3, 4); return [[1, ri(2, 3), ri(3, 4), m()], [ri(5, 6), 7, ri(3, 4), m()], [c, c + ri(1, 2), ri(6, 7), a()]]; },
  // 한쪽에서 다른 쪽으로 오르는 계단
  stairs: (m) => { const out = []; let x = 1, h = 3; while (x <= 7 && h <= 7) { const w = ri(1, 2); out.push([x, Math.min(7, x + w - 1), h, m()]); x += w + ri(0, 1); h += ri(1, 2); } return out; },
  // 길게 가로지르는 다리 + 위쪽 작은 섬
  bridge: (m, a) => [[ri(2, 3), ri(5, 6), ri(3, 4), m()], [1, ri(1, 2), ri(6, 7), a()], [ri(6, 7), 7, ri(6, 7), a()]],
  // 두꺼운 기둥 여러 개
  pillars: (m, a) => { const cols = [[2, 4, 6], [1, 4, 7], [3, 5], [2, 6]][ri(0, 3)], out = cols.map(c => [c, c, ri(3, 4), m(), ri(2, 3)]); if (ri(0, 1)) out.push([3, 5, 7, a()]); return out; },
  // 좌우 벽에 번갈아 붙은 선반
  zigzag: (m) => [[1, ri(2, 4), 3, m()], [ri(4, 6), 7, ri(4, 5), m()], [1, ri(2, 4), ri(6, 7), m()]],
  // 흩어진 작은 섬
  islands: (m, a) => { const out = []; for (let i = ri(4, 6); i > 0; i--) { const c = ri(1, 6); out.push([c, c + ri(0, 1), ri(3, 7), ri(0, 1) ? m() : a()]); } return out; },
  // 위가 넓고 가운데가 뚫린 깔때기
  funnel: (m, a) => [[1, 2, ri(5, 6), m()], [6, 7, ri(5, 6), m()], [2, 3, ri(3, 4), a()], [5, 6, ri(3, 4), a()]],
  // 낮고 두꺼운 지붕 + 양옆 높은 발판
  roof: (m, a) => [[ri(2, 3), ri(5, 6), 3, m(), 2], [1, ri(1, 2), ri(5, 6), a()], [ri(6, 7), 7, ri(5, 6), a()]],
};
/* 재질은 발판마다 따로 뽑는다. 섞인 방이 기본이고, 전부 얇은 방·전부 두꺼운 방도 가끔 나온다.
   thin·thick = 그런 방이 나올 비율, 나머지는 섞인 방. oneway·hard = 섞인 방에서 발판 하나가 얇은 발판·바위일 확률, 나머지는 부서지는 블록 */
const MINI_MIX = { thin: .15, thick: .2, oneway: .45, hard: .35 };
function miniMatPicker(mode) {
  if (mode === 'thin') return () => ONEWAY;
  if (mode === 'thick') { const k = ri(0, 2); return k === 0 ? () => HARD : k === 1 ? () => BREAK : () => (ri(0, 1) ? HARD : BREAK); }
  return () => { const r = Math.random(); return r < MINI_MIX.oneway ? ONEWAY : r < MINI_MIX.oneway + MINI_MIX.hard ? HARD : BREAK; };
}
const miniLast = { shape: '', sig: '' };
/* 칸 모음 → 오르내리기 판정. 땅 점프(3칸)만으로 모든 발판에 닿고, 어디서든 바닥으로 돌아올 수 있어야 한다 */
function miniRoomOk(cells, top = 9) {
  // 같은 칸 위아래로 겹칠 때: 바위끼리 붙은 두께는 괜찮고, 그 밖에는 사이에 두 칸을 비운다(끼인 발판 방지)
  for (let c = 1; c <= 7; c++) { let last = 0, lastT = 0; for (let h = 1; h <= top; h++) { const t = cells[h + ':' + c]; if (!t) continue; if (last) { const gap = h - last - 1; if (gap === 0 ? t === ONEWAY || lastT === ONEWAY : gap < 2) return false; } last = h; lastT = t; } }
  const solid = (c, h) => { const t = cells[h + ':' + c]; return t === HARD || t === BREAK; }, free = (c, h) => c >= 1 && c <= 7 && h <= top && !solid(c, h), maxH = top - 2;
  const spots = [];
  for (let c = 1; c <= 7; c++) { spots.push({ c, s: 0 }); for (let h = 1; h <= maxH + 1; h++) if (cells[h + ':' + c] && free(c, h + 1) && free(c, h + 2)) spots.push({ c, s: h }); }
  const clearH = (c0, c1, s) => { for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) if (!free(c, s + 1) || !free(c, s + 2)) return false; return true; };
  const clearV = (c, s0, s1) => { for (let h = s0 + 1; h <= s1 + 2; h++) if (!free(c, h)) return false; return true; };
  // 점프는 높이가 정해져 있어 항상 3칸 넘게 솟는다. 지나가는 칸의 머리 위까지 비어야 한다
  const arcClear = (a, b) => { for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) for (let h = Math.max(a.s, b.s) + 1; h <= Math.min(top, a.s + 5); h++) if (!free(c, h)) return false; return true; };
  const go = (a, b) => {
    const dc = Math.abs(a.c - b.c);
    if (b.s > a.s) { const up = b.s - a.s; return up <= MINI_ROOM.jump && dc <= MINI_ROOM.reachUp[up] && clearV(a.c, a.s, b.s) && arcClear(a, b); }
    if (b.s === a.s) return dc === 1 ? clearH(a.c, b.c, a.s) : dc <= MINI_ROOM.reachUp[1] && arcClear(a, b);
    // 내려가기: 얇은 발판도 뚫고 내려갈 수 없다. 옆 칸으로 걸어 나가, 그 칸에서 처음 만나는 면에 떨어진다
    if (!dc || !clearH(a.c, b.c, a.s)) return false;
    for (let h = b.s + 1; h <= a.s; h++) if (cells[h + ':' + b.c]) return false;
    return dc <= 2 || dc <= MINI_ROOM.reachDown && arcClear(a, b);
  };
  const flood = (from) => { const seen = new Set(from); for (let more = true; more;) { more = false; for (const x of spots) { if (seen.has(x)) continue; for (const y of seen) if (go(y, x)) { seen.add(x); more = true; break; } } } return seen; };
  const floor = spots.filter(q => q.s === 0), up = flood(floor);
  if (up.size !== spots.length) return false;
  // 돌아오는 길: 어느 발판에서든 떨어지면 바닥에 닿는다
  for (const q of spots) { if (!q.s) continue; const seen = new Set([q]); let ok_ = false; for (let more = true; more && !ok_;) { more = false; for (const x of spots) { if (seen.has(x)) continue; for (const y of seen) if (go(y, x)) { seen.add(x); more = true; if (!x.s) ok_ = true; break; } } } if (!ok_) return false; }
  return spots.length > floor.length + 2;
}
let miniPick = 0;
function makeMiniLayout(top = 9) {
  miniPick = ri(0, Object.keys(MINI_SHAPES).length - 2);
  const roll = Math.random(), mode = roll < MINI_MIX.thin ? 'thin' : roll < MINI_MIX.thin + MINI_MIX.thick ? 'thick' : 'mix';
  // 모양을 먼저 뽑고 그 모양 안에서 맞는 판을 찾는다. 까다로운 모양도 고르게 나오게 한다
  const names = Object.keys(MINI_SHAPES).filter(n => n !== miniLast.shape);
  for (let tries = 0; tries < 200; tries++) {
    const shape = names[tries < 40 ? miniPick : ri(0, names.length - 1)];
    const mat_ = miniMatPicker(tries < 40 ? mode : 'mix'), flip = ri(0, 1), cells = {};
    for (const [c0, c1, h, mat, th0] of MINI_SHAPES[shape](mat_, mat_)) {
      const th = mat === ONEWAY ? 1 : th0 || ri(1, 2);
      for (let c = c0; c <= c1; c++) for (let k = 0; k < th; k++) { const hh = h + k; if (hh > MINI_ROOM.maxH) continue; cells[hh + ':' + (flip ? 8 - c : c)] = mat; }
    }
    // v31 위층: 방이 높으면 다른 모양 하나를 얇은 발판으로 MINI_ROOM.upper칸 올려 깐다(위로 올라가 싸울 자리)
    if (top >= 13 && tries < 150) {
      const up = names[ri(0, names.length - 1)], fl2 = ri(0, 1);
      for (const [c0, c1, h] of MINI_SHAPES[up](() => ONEWAY, () => ONEWAY)) { const hh = h + MINI_ROOM.upper; if (hh > top - 3) continue; for (let c = c0; c <= c1; c++) { const k = hh + ':' + (fl2 ? 8 - c : c); if (!cells[k]) cells[k] = ONEWAY; } }
    }
    const sig = Object.keys(cells).sort().map(k => k + '=' + cells[k]).join(',');
    if (sig === miniLast.sig || !miniRoomOk(cells, top)) continue;
    miniLast.shape = shape; miniLast.sig = sig;
    return { shape, sig, cells };
  }
  // 전부 실패하면 검증된 기본 구조
  const cells = {}; for (const [c0, c1, h] of [[1, 2, 3], [6, 7, 3], [3, 5, 6]]) for (let c = c0; c <= c1; c++) cells[h + ':' + c] = ONEWAY;
  miniLast.shape = 'base'; miniLast.sig = 'base';
  return { shape: 'base', sig: 'base', cells };
}
function buildMiniRoom(F) {
  const L = makeMiniLayout(Math.max(9, F - 2)), hp = Math.round(20 * DIFF.hp(game.wave));
  for (const k in L.cells) { const [h, c] = k.split(':').map(Number), r = F - h; lvl.set(c, r, L.cells[k]); if (L.cells[k] === BREAK) lvl.hp[r * COLS + c] = hp; }
  game.miniLayout = L;
}
/* 공격 사이에도 진짜 보스 빠르기로 돌아다닌다. 공격 횟수는 그대로이고, 몸에 부딪혀도 피해는 약하다 */
function miniRoam(b, dt, k) {
  const g = game, p = g.p, half = b.w * .42, minX = TILE + half, maxX = WORLD_W - TILE - half;
  b.roamT = (b.roamT === undefined ? .3 : b.roamT) - dt;
  if (b.def.float) {
    // 뜨는 보스는 플레이어 양옆을 번갈아 스쳐 지나간다
    if (b.roamT <= 0) { b.roamSide = -(b.roamSide || 1); b.roamX = clamp(p.x + b.slot * 70 + b.roamSide * (50 + Math.random() * 100), minX, maxX); b.roamY = b.floorY - 40 - Math.random() * Math.max(190, b.floorY - bossTopY() - (b.drawH || b.h) - 40); b.roamT = .38 + Math.random() * .3; }
    if (b.roamX === undefined) return;
    b.vx = approachSnap(b.vx, clamp((b.roamX - b.x) * 4, -320, 320) * k, 8, dt);
    b.x = clamp(b.x + b.vx * dt, minX, maxX); b.y = approachSnap(b.y, b.roamY, 3.2 * k, dt);
    return;
  }
  if (b.air) {
    b.vy += 1700 * dt; b.y += b.vy * dt; b.x = clamp(b.x + b.vx * dt, minX, maxX);
    if (b.y >= b.floorY && b.vy > 0) { b.y = b.floorY; b.air = false; b.vx = 0; b.sy = .84; b.sx = 1.14; b.roamT = (.08 + Math.random() * .22) / k; g.shake = Math.max(g.shake, 2.5); puff(b.x, b.floorY - 3, 2, 10, 7); if (Math.random() < .5) sfx.land(); }
  } else if (b.roamT <= 0) {
    const tx = p.x + b.slot * 80 + (Math.random() - .5) * 140;
    b.air = true; b.vy = -(380 + Math.random() * 260); b.vx = clamp((tx - b.x) * 1.5, -320, 320) * k; b.sy = 1.14; b.sx = .9;
  }
}
/* 중간 보스: 문이 함정이었다. 그 챕터 보스의 작은 판이 땅에서 올라오고, 잡기 전에는 나갈 수 없다 */
function startMini(room) {
  const g = game, p = g.p, base = BOSSES[g.biome.boss], cfg = MINI.byBoss[g.biome.boss % MINI.byBoss.length];
  room.locked = true; room.exit.used = true;
  const def = { ...base, name: '작은 ' + base.name, weights: cfg.weights, w0: base.w }, total = Math.max(DIFF.bossHp(g.wave) * base.hpMul * MINI.hp, p.atk * MINI.minShots), floorY = room.floorY;
  const w = base.w * cfg.scale, h = base.h * cfg.scale, spots = cfg.n === 1 ? [200] : cfg.n === 2 ? [170, 250] : [140, 200, 260];
  g.minis = spots.map((x0, i) => ({ def, idx: g.biome.boss, mini: true, slot: i - (cfg.n - 1) / 2, alive: true, x: room.side ? WORLD_W - x0 : x0, y: floorY + h + 20, w, h, floorY, hp: total / cfg.n, maxHp: total / cfg.n, state: 'idle', t: 0, flash: 0, pop: 0, open: 0, barK: 0, cool: 1.2, phase: 1, vy: 0, vx: 0, sx: 1, sy: 1, dir: 1, step: 0, hitC: 0 }));
  g.boss = g.minis[0]; g.state = 'intro'; room.introT = 0; input.clearAll();
}
const MINI_CARD_T = 2.65;   // 문을 연 뒤 카드 창이 뜰 때까지(공개 .7 → 등장 끝 1.4 → 보여 주기)
function miniTick(dt, r) {
  const g = game, p = g.p;
  if (g.state === 'intro') {
    r.introT += dt; const t = r.introT;
    if (t > .7 && !r.revealed) { r.revealed = true; r.title = ['함정이다!', '쓰러뜨려야 나갈 수 있습니다']; g.whiteout = .3; g.shake = 12; sfx.roar(); sfx.bgmFor && sfx.bgmFor('boss'); popup(WORLD_W / 2, r.floorY - 150, '중간 보스', '#ff8a8a', true); }
    // 다 올라온 뒤 포효하며 잠시 보여 준다. 무엇이 나왔는지 알아본 다음에 카드를 고른다
    if (t > 1.45 && !r.shown) { r.shown = true; g.shake = Math.max(g.shake, 9); sfx.roar(); for (const m of g.minis) { m.sy = 1.14; m.sx = .9; } }
    if (t > .7 && !r.carded) for (const m of g.minis) { m.sx = approachSnap(m.sx, 1, 7, dt); m.sy = approachSnap(m.sy, 1, 7, dt); const k = clamp((t - .7) / .7, 0, 1), e = 1 - Math.pow(1 - k, 3); m.y = r.floorY + (m.h + 20) * (1 - e); m.open = t > 1.1 ? 1 : 0; if (k < 1 && Math.random() < .4) puff(m.x + (Math.random() - .5) * m.w, r.floorY - 4, 1, 7, 8); m.barK = clamp((t - 1) / .6, 0, 1); }
    if (t > MINI_CARD_T && !r.carded) {
      r.carded = true; for (const m of g.minis) { m.open = 0; m.barK = 1; m.y = r.floorY; m.t = 0; }
      // 함정의 대가: 무작위 3장 중 하나(보스 전리품과 같은 가중치). 고르면 체력이 가득 찬 채로 싸운다
      const usable = c => !c.noMini;
      if (window.__noMiniCard || !cardPool().some(usable)) { fullHeal(); miniFight(); return; }
      openCards(true, { title: '함정이다!', sub: '능력을 고르면 체력이 모두 회복됩니다', filter: usable, after: () => { g.state = 'intro'; r.afterT = 0; } });
      return;
    }
    if (r.afterT !== undefined) { r.afterT += dt; if (r.afterT > .4 && !r.healed) { r.healed = true; fullHeal(); } if (r.afterT > 1.3) miniFight(); }
    return;
  }
  if (!g.minis) return;
  for (const m of g.minis) { if (!m.alive) continue; g.boss = m; bossTick(dt); if (g.state === 'dying') return; if (!g.minis) return; }
  g.boss = g.minis.find(m => m.alive) || g.boss;
}
function miniFight() { const g = game; g.state = 'play'; g.p.inv = .8; input.blockUntil = performance.now() + 60; }
/* 체력 100% 회복. 함정 방에서만 쓴다. 몸의 빛기둥·문구와 체력 막대의 초록빛으로 알린다 */
function fullHeal() {
  const g = game, p = g.p; g.hpFrom = p.hp; p.hp = p.maxHp; g.hudHp = p.hp; g.hpFlash = 1;
  popup(p.x, p.y - 62, '체력 100% 회복!', '#8dffb0', true);
  g.fx.push({ type: 'pillar', x: p.x, y: p.y, w: 44, col: '#59e88c', t: 0, life: .7 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 78, col: '#8dffb0', t: 0, life: .45 });
  sparks(p.x, p.y - 10, 18, '#8dffb0', 220, .5); sfx.reward(); vibrate(40);
}
function miniBulletHit(b) {
  const g = game;
  for (const m of g.minis || []) { if (!m.alive) continue; g.boss = m; if (bossHitTest(b)) { hitBoss(b.dmg, b.crit, b.x, b.y); return true; } }
  return false;
}
function drawMinis() {
  const g = game, cur = g.boss;
  for (const m of g.minis) if (m.alive) { g.boss = m; drawBoss(); }
  g.boss = cur;
}
function miniDie(b) {
  const g = game, p = g.p, hh = b.drawH || b.h; b.alive = false; b.hp = 0;
  inkBurst(b.x, b.y - hh * .5, 34, [b.def.col[0], b.def.col[1]], true); sfx.boom(); g.shake = Math.max(g.shake, 12); g.hitStop = Math.max(g.hitStop, 4 / 60); g.whiteout = Math.max(g.whiteout, .3);
  for (let i = 0; i < 8; i++) spawnShards(b.x + (Math.random() - .5) * b.w, b.y - Math.random() * hh, 8);
  if (g.minis.some(m => m.alive)) { g.boss = g.minis.find(m => m.alive); return; }
  miniWin();
}
function miniWin() {
  const g = game, r = g.room, p = g.p; g.whiteout = .6; g.shake = 18; sfx.bigBoom(); sfx.reward(); vibrate(80);
  g.boss = null; g.minis = null; g.ebul = []; g.fx = g.fx.filter(f => !f.wave); for (const e of g.enemies) if (e.alive) killEnemy(e, false);
  // 섬광이 걷힌 뒤 회복한다. 회복 전에는 문이 잠겨 있어 놓칠 일이 없다
  r.winT = .35; p.inv = 1.5; r.title = ['함정을 부쉈다!', '체력이 모두 회복되었습니다'];
  sfx.bgmFor && sfx.bgmFor('wave', g.biome.id);
}
function tickFade(dt) { const g = game; g.fade = clamp(g.fade + g.fadeOut * dt * 3.4, 0, 1); if (g.fade === 0 || g.fade === 1) g.fadeOut = 0; }
function exitRoom() {
  const g = game, p = g.p, s = g.saved, d = s.door; sfx.door(); g.floorRow = s.floorRow;
  lvl.grid = s.grid; lvl.hp = s.hp; lvl.rows = s.rows; g.enemies = s.enemies; g.jars = s.jars; g.shards = g.shards.length ? s.shards.concat(g.shards.map(q => (q.y = s.py - 30, q.x = s.px, q))) : s.shards; g.decor = s.decor; g.portal = s.portal; g.levelH = s.levelH; g.doors = s.doors; g.ebul = s.ebul; g.decals = s.decals; g.haz = s.haz || []; g.later = []; g.arenaTop = s.arenaTop; g.isBossWave = s.isBossWave;
  if (g.room.kind === 'mini') { g.boss = null; g.minis = null; sfx.bgmFor && sfx.bgmFor('wave', g.biome.id); }
  g.room = null; g.saved = null; g.bullets = [];
  p.x = s.px; p.y = s.py; p.x = d.side ? WORLD_W - TILE - 34 : TILE + 34; p.vx = 0; p.vy = 0; p.inv = 1.2; g.cam = s.cam;
  // 다운웰처럼 입구 근처의 적은 사라진다
  for (const e of g.enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 110) { e.sk = null; killEnemy(e, false); }
  g.fade = 1; g.fadeOut = -1; refill(p);
}
/* 바닥을 밟고 입구 앞에 서 있을 때만 드나들 수 있다. 공중이거나 그냥 지나가면 아무 일도 없다 */
const DOOR_REACH = 34;
function doorNear() {
  const g = game, p = g.p, r = g.room; if (!p || !p.onGround || g.state !== 'play') return null;
  if (r) return !r.locked && !r.exit.used && Math.abs(p.x - r.exit.x) < DOOR_REACH && p.y > r.exit.y - 40 ? r.exit : null;
  for (const d of g.doors) if (!d.used && Math.abs(p.x - d.x) < DOOR_REACH && Math.abs(p.y - d.y) < 34) return d;
  return null;
}
function drawDoorPrompt() {
  // 회복 문구와 겹치지 않게 회복 효과가 끝난 뒤 띄운다
  const d = doorNear(); if (!d || game.hpFlash > .3) return;
  const s = view.s, lab = game.room ? '버튼을 눌러 나가기' : '버튼을 눌러 들어가기';
  ctx.font = `${12 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(lab).width + 18 * s, x = clamp(wx(d.x) + (d.side ? -1 : 1) * tw * .32, tw / 2 + 6 * s, view.W - tw / 2 - 6 * s), y = wy(d.y) - 62 * s;
  ctx.fillStyle = 'rgba(10,8,22,.92)'; rr(x - tw / 2, y - 11 * s, tw, 22 * s, 7 * s); ctx.fill(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.6 * s; ctx.stroke();
  ctx.fillStyle = '#ffe9b0'; ctx.fillText(lab, x, y + .5 * s);
}
function roomItemNear() { const g = game, p = g.p, r = g.room; if (!r) return null; for (const it of r.items) if (!it.sold && Math.abs(p.x - it.x) < 24 && Math.abs(p.y - it.y) < 60 && p.onGround) return it; return null; }
function roomBuy(it) {
  const g = game, p = g.p;
  if (it.cost && p.shards < it.cost) { popup(it.x, it.y - 70, '파편이 모자랍니다', '#ff8a8a', true); sfx.empty(); return; }
  if (it.hpCost) { const c = Math.round(p.maxHp * it.hpCost); if (p.hp <= c) { popup(it.x, it.y - 70, '체력이 모자랍니다', '#ff8a8a', true); sfx.empty(); return; } p.hp -= c; popup(p.x, p.y - 30, '-' + c, '#ff5068', true); }
  p.shards -= it.cost; it.sold = true; it.buy(); sfx.buy();
  g.fx.push({ type: 'ring', x: it.x, y: it.y - 40, r: 44, col: 'rgba(255,230,140,.95)', t: 0, life: .35 }); sparks(it.x, it.y - 40, 12, '#ffe27a', 220, .4);
  popup(it.x, it.y - 74, it.name + '!', '#ffe27a', true);
  if (it.once) for (const o of g.room.items) o.sold = true;
}
function crystalHit(b) {
  const g = game, c = g.room.crystal, p = g.p;
  c.hp--; c.shake = 1; sfx.brk(); g.fx.push({ type: 'hit', x: b.x, y: b.y, r: 18, t: 0, life: .1, rot: 0 }); g.shake = Math.max(g.shake, 5); g.hitStop = Math.max(g.hitStop, 2 / 60);
  spawnShards(c.x, c.y, Math.round(10 * p.gemMul), c.ruby ? 5 : 0);
  if (c.hp <= 0) {
    g.whiteout = .5; g.shake = 14; sfx.bigBoom(); g.hitStop = 6 / 60;
    imageBits(c.ruby ? 'r_ruby' : 'o_gold', c.x, c.y, 60, 4, 300); spawnShards(c.x, c.y, Math.round(120 * p.gemMul), c.ruby ? 5 : 0);
    p.high = true; p.gemChain = 100; p.gemT = 4 * (1 + g.st.highPct); popup(c.x, c.y - 40, '신성 폭주!', '#ffe27a', true);
  }
}
function roomTick(dt) {
  const g = game, r = g.room, p = g.p; r.t += dt;
  if (r.crystal && r.crystal.shake > 0) r.crystal.shake = Math.max(0, r.crystal.shake - dt * 6);
  if (r.kind === 'mini') { miniTick(dt, r); if (g.state === 'dying') return; }
  if (r.kind === 'tut' && tutTick(dt)) return;
  if (r.winT > 0) { r.winT -= dt; if (r.winT <= 0) { r.locked = false; r.exit.used = false; fullHeal(); } }
  g.cam = Math.max(0, g.levelH + TILE - view.worldH);
}
function drawRoomBack() {
  const g = game, r = g.room, s = view.s;
  // 안쪽 벽을 어둡게 해서 바깥과 다른 공간처럼 보이게 한다
  const roomTop = Math.min(r.floorY - 9 * TILE, g.cam), rh = r.floorY - roomTop;   // v31: 방이 화면 전체로 넓어졌다
  ctx.fillStyle = 'rgba(6,5,14,.42)'; ctx.fillRect(wx(TILE), wy(roomTop), (WORLD_W - 2 * TILE) * s, rh * s);
  const gl = ctx.createRadialGradient(view.W / 2, wy(r.floorY - 40), 10 * s, view.W / 2, wy(r.floorY - 40), 170 * s);
  gl.addColorStop(0, 'rgba(255,214,140,.22)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = gl; ctx.fillRect(0, wy(roomTop), view.W, rh * s);
  if (r.crystal && r.crystal.hp > 0) {
    const c = r.crystal, im = c.ruby ? IMG.r_ruby : IMG.o_gold; if (ok(im)) { const h = (c.ruby ? 80 : 74) * s, w = h * im.naturalWidth / im.naturalHeight, jx = (Math.random() - .5) * c.shake * 6 * s; ctx.drawImage(im, wx(c.x) - w / 2 + jx, wy(c.y) - h / 2 - 2 * s, w, h); }
  }
  for (const it of r.items) {
    if (it.sold && !it.once) continue;
    const x = wx(it.x), y = wy(it.y);
    // 받침
    ctx.fillStyle = '#231d33'; rr(x - 18 * s, y - 16 * s, 36 * s, 16 * s, 3 * s); ctx.fill();
    ctx.fillStyle = it.tier ? TIER[it.tier].col : '#c9a24a'; ctx.fillRect(x - 18 * s, y - 16 * s, 36 * s, 2.4 * s);
    if (it.sold) continue;
    const bob = Math.sin(g.t * 3 + it.x) * 2 * s, im = IMG['c_' + it.icon];
    if (ok(im)) ctx.drawImage(im, x - 15 * s, y - 50 * s + bob, 30 * s, 30 * s);
  }
}
function drawRoomFront() {
  const g = game, r = g.room, s = view.s, p = g.p, top = Math.min(wy(r.floorY - 9 * TILE) + 26 * s, view.safeT + (g.minis ? 112 : 92) * s);   // v31: 넓어진 방에서는 화면 위쪽(정보 막대 아래)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${19 * s}px ${FONT}`; textOut(r.title[0], view.W / 2, top, '#ffe9b0', 3.6);
  ctx.font = `${12 * s}px ${FONT}`; textOut(r.title[1], view.W / 2, top + 21 * s, '#fff', 2.6);
  const near = roomItemNear();
  for (const it of r.items) {
    if (it.sold) continue;
    const x = clamp(wx(it.x), 44 * s, view.W - 44 * s), y = wy(it.y) - 62 * s;
    if (it.cost) { const afford = p.shards >= it.cost, im = IMG.o_rose; ctx.font = `${13 * s}px ${FONT}`; textOut(String(it.cost), x + 5 * s, y, afford ? '#fff' : '#ff8a8a', 2.8); if (ok(im)) { const h = 12 * s, w = h * im.naturalWidth / im.naturalHeight, tw = ctx.measureText(String(it.cost)).width; ctx.drawImage(im, x + 5 * s - tw / 2 - w - 2 * s, y - h / 2, w, h); } }
    else if (it.hpCost) { ctx.font = `${11.5 * s}px ${FONT}`; textOut(`체력 -${Math.round(it.hpCost * 100)}%`, x, y, '#ff8a8a', 2.6); }
  }
  if (near) {
    // 설명 상자: 대상 바로 위, 줄바꿈 포함
    ctx.font = `${10.5 * s}px ${FONT}`; const noteL = near.note ? wrapText(near.note, 182 * s).slice(0, 2) : [];
    const bw = 196 * s, bh = (58 + noteL.length * 12) * s, x = clamp(wx(near.x) - bw / 2, 8 * s, view.W - bw - 8 * s), y = wy(near.y) - (150 + noteL.length * 12) * s;
    ctx.fillStyle = 'rgba(10,8,22,.92)'; rr(x, y, bw, bh, 8 * s); ctx.fill(); ctx.strokeStyle = near.tier ? TIER[near.tier].col : '#c9a24a'; ctx.lineWidth = 2 * s; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = `${13.5 * s}px ${FONT}`; ctx.fillStyle = '#ffe9b0'; ctx.fillText(near.name, x + bw / 2, y + 13 * s);
    ctx.font = `${10.5 * s}px ${FONT}`; ctx.fillStyle = '#fff';
    const lines = wrapText(near.sub, bw - 14 * s).slice(0, 2); lines.forEach((l, i) => ctx.fillText(l, x + bw / 2, y + 28 * s + i * 12 * s));
    ctx.font = `${10 * s}px ${FONT}`; ctx.fillStyle = '#ffd24a'; ctx.fillText(lines.length > 1 ? '' : '버튼을 눌러 가져가기', x + bw / 2, y + 46 * s);
    if (noteL.length) { ctx.font = `${10.5 * s}px ${FONT}`; ctx.fillStyle = '#ff7a7a'; noteL.forEach((l, i) => ctx.fillText(l, x + bw / 2, y + 58 * s + i * 12 * s)); }
  }
}
function wrapText(t, maxW) { const out = []; let cur = ''; for (const ch of t) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); return out; }
