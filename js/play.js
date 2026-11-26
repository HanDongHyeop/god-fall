/* 인게임: 웨이브 생성, 적 AI, 타격감, 탄, 1프레임 갱신, 세계 그리기.
   레이어: 하늘 → 먼 조각 → 먼지 → 장식 → 보스 → 지형 → 얼룩 → 문 → 포탈 → 항아리·파편 → 적 → 적 탄 → 내 탄 → 주인공 → 이펙트 → 숫자 → 경고 → HUD → 공격·점프 → 조이스틱 → 연출 띠 → 모달(DOM) */
'use strict';

/* ───── 그림 불러오기 ───── */
const MON_FILES = []; for (const k in ENEMY) MON_FILES.push(...ENEMY[k].frames);
for (const n of MON_FILES) { loadImg('m_' + n, `assets/mon/${n}.png`); loadImg('m_' + n + '_w', `assets/mon/${n}_w.png`); }
const OWN_SHAPE = ['b4', 'b5', 'b6'];   // 모양까지 다른 챕터. 흰 실루엣도 따로 있다
function loadBiomeArt(b) {
  for (const n of ['t_hard', 't_break', 't_break2', 't_wall', 't_wall_band', 'o_ledge_l', 'o_ledge_m', 'o_ledge_r', 'o_spike', 'o_jar', 'o_decor', 'o_decor2', 'o_door', 'bg_r1', 'bg_r2', 'bg_r3', 'bg_r4']) loadImg(`${b.id}_${n}`, `assets/map/${b.id}/${n}.png`);
  loadImg(`${b.id}_bg_sky`, `assets/map/${b.id}/bg_sky.jpg`);
  for (const n of BOSSES[b.boss].frames) { loadImg('m_' + n, `assets/mon/${n}.png`); loadImg('m_' + n + '_w', `assets/mon/${n}_w.png`); }
  if (b.id !== 'b1') for (const n of MON_FILES) { loadImg(`m_${b.id}_${n}`, `assets/mon/${b.id}/${n}.png`); if (OWN_SHAPE.includes(b.id)) loadImg(`m_${b.id}_${n}_w`, `assets/mon/${b.id}/${n}_w.png`); }
}
BIOMES.slice(0, 3).forEach(loadBiomeArt);
function loadChapterMon() { BIOMES.forEach(loadBiomeArt); }
/* v62 수중 구역 괴물 그림(오너: 수중 몬스터로): 박쥐 자리 = 빛 미끼 물고기, 눈알 자리 = 해파리, v64 주머니 자리 = 복어 · 그림자 자리 = 유령 오징어, v65 거머리 자리 = 곰치 · 무덤 자리 = 게. 수중 구역 판에서만 쓴다(챕터 2 · 어려움 9 · 11) */
const WATER_MON = ['bat_a', 'bat_b', 'eye_a', 'eye_b', 'sac_a', 'shade_a', 'shade_b', 'leech_a', 'leech_b', 'mound_a', 'mound_b'];   // v65 거머리 자리 = 곰치, 무덤 자리 = 게
for (const n of WATER_MON) { loadImg('m_water_' + n, `assets/mon/water/${n}.png`); loadImg('m_water_' + n + '_w', `assets/mon/water/${n}_w.png`); }
const waterMon = (n, w) => { if (game.zone !== 'water' || game.room || !WATER_MON.includes(n)) return null; const v = IMG['m_water_' + n + (w ? '_w' : '')]; return v && ok(v) ? v : null; };
const monImg = n => { const wv = waterMon(n); if (wv) return wv; const id = game.biome && game.biome.id, v = id && id !== 'b1' ? IMG[`m_${id}_${n}`] : null; return v && ok(v) ? v : IMG['m_' + n]; };
const monWhite = n => { const wv = waterMon(n, true); if (wv) return wv; const id = game.biome && game.biome.id, v = id && OWN_SHAPE.includes(id) ? IMG[`m_${id}_${n}_w`] : null; return v && ok(v) ? v : IMG['m_' + n + '_w']; };
loadImg('r_ruby', 'assets/ui/cur_shard.webp');
for (const n of ['fx_letter_w', 'fx_letter', 'fx_feather1', 'fx_feather2', 'fx_scrap', 'fx_seal', 'o_gold', 'o_rose', 'o_portal_ring', 'o_portal_in']) loadImg(n, `assets/ui/${n}.png`);
const HERO_FRAMES = ['idle', 'run_a', 'run_pass', 'run_b', 'jump', 'apex', 'tuck', 'fall_a', 'fall_b', 'throw_a', 'throw_b', 'land', 'hurt'];
function loadGod(id) { for (const f of HERO_FRAMES) { loadImg(`h_${id}_${f}`, `assets/god/${id}/${f}.png`); loadImg(`h_${id}_${f}_w`, `assets/god/${id}/${f}_w.png`); } }
loadGod(Meta.s.god);   // 출전 중인 신은 타이틀 로딩에 포함해 판 시작에 캐릭터가 비지 않게 한다
const bimg = n => IMG[game.biome.id + '_' + n];

/* ───── 런 상태 ───── */
/* 챕터는 시작 웨이브(1 + 챕터×3)로 이미 반영되어 있다. 여기서 또 더하면 맵이 어긋난다 */
// 판 구성은 data.js의 STAGES·STAGE_PLAN. 챕터 c의 s번째 판 = 통산 c*6 + s
const biomeOf = w => BIOMES[chapterOf(w) % BIOMES.length];
const sectorOf = w => chapterOf(w) + 1;
const isBossWave = w => STAGE_PLAN[stageOf(w) - 1] === 'boss';
const isRestWave = w => STAGE_PLAN[stageOf(w) - 1] === 'rest';
const isMidWave = w => STAGE_PLAN[stageOf(w) - 1] === 'mid';
const vibrate = n => { try { if (navigator.vibrate) navigator.vibrate(n); } catch (e) {} };

function runStats() {
  const st = Meta.stats(game.godId);
  game.st = st; game.god_ = st.god;
  return st;
}
function atkNow() {
  const g = game, p = g.p; let a = p.atk;
  if (has('heavy')) a *= 1.3;
  if (godMode()) a *= 1.6;
  return a;
}
function rollDamage(mul = 1) {
  const g = game, st = g.st, crit = Math.random() < st.crit;
  const d = atkNow() * .5 * g.god_.dmg * mul * (crit ? 1.5 + st.critDmg : 1);
  return { dmg: Math.max(1, Math.round(d)), crit };
}

function startRun(opt = {}) {
  sfx.init();
  const g = game;
  g.godId = opt.god || Meta.s.god; g.chapter = opt.chapter !== undefined ? opt.chapter : Meta.s.chapter;
  loadGod(g.godId);
  const st = runStats();
  g.p = newPlayer();
  const p = g.p; p.god = g.godId; p.atk = st.atk; p.maxHp = p.hp = st.hp; p.maxAmmo = p.ammo = g.god_.ammo + st.ammo;
  p.gemMul = 1 + st.shardPct; p.reviveUsed = false; p.lastStand = !!st.lastStand; p.olive = false; p.shots = 0; p.feastN = 0;
  g.wave = opt.wave || (1 + g.chapter * STAGES); g.startWave = g.wave; g.clear = false; g.cards = new Set(); g.cardList = []; g.choiceBonus = 0; g.kills = 0; g.maxCombo = 0; g.highN = 0; g.shardTotal = 0; g.bosses = 0;
  g.seed = window.__seed || ((Date.now() % 100000) | 0);
  g.contN = 0; g.timeScale = 1; g.overT = 0; g.fade = 0; g.room = null; g.saved = null; g.boss = null; g.decals = []; g.ebul = []; g.vign = 0; g.whiteout = 0; g.orbits = 0; g.cine = 0; g.banner = null;
  g.hudHp = p.hp;
  g.minis = null; g.hpFlash = 0; g.tut = false; g.pity = { hero: 0, legend: 0 }; g.petS = null; g.zone = null; g.torches = []; g.mode = opt.mode || null; g.eel = null; g.seal = null; g.runLv = 0;   // v42 도전 모드(modes.js)
  g.xp = 0; g.xpNeed = 0; g.lvPend = 0; g.hearts = []; g.themeLast = false;
  g.firstRun = !!Meta.s.ftue && !(Meta.s.total.runs > 0) && !opt.debug; g.firstLegend = false;   // v39 첫 판 = 튜토리얼을 거친 새 계정이 처음 하는 판(한 판이라도 끝냈으면 아님)
  beginWave(opt.noIntro ? 0 : DESCENT.first); g.hintT = Meta.s.seenTip ? 0 : 4;
  Meta.s.seenTip = true;
  input.blockUntil = performance.now() + 150;
  if (typeof UI !== 'undefined') UI.enterGame();
}

/* ───── 웨이브 생성 ───── */
function mkEnemy(kind, x, y, o) {
  const b = ENEMY[kind], w = game.wave;
  const e = { kind, x, y, vx: 0, vy: 0, alive: true, flash: 0, pop: 0, hbT: 0, burn: 0, fr: 0, ph: 0, stomp: b.stomp, shield: !!b.shield, r: b.r, gem: b.gem, ...o };
  e.hp = e.maxHp = Math.round(b.hp * DIFF.hp(w)); e.dmg = Math.round(b.dmg * DIFF.dmg(w));
  if (dlv(w) < 3 && e.gem) e.gem = Math.ceil(e.gem * 1.35);   // v38 챕터 1 앞쪽은 괴물을 약 25% 줄였다 → 파편은 그만큼 더(첫 좌판 값 유지)
  return e;
}
function pickKind(R, w) {
  const tbl = game.biome.enemies, pool = [];
  for (const k in tbl) {
    if ((k === 'tick' || k === 'leech') && w < 2 && game.chapter === 0) continue;
    if ((k === 'spit' || k === 'shade') && w < 3 && game.chapter === 0) continue;
    if (k === 'tick' || k === 'spit' || k === 'mound') continue;   // 땅 위 괴물은 발판에 따로 놓는다
    const n = k === 'shade' ? Math.round(tbl[k] * shadeRamp(w)) : tbl[k];   // v63 그림자는 계단처럼(챕터 1 → 2 난이도 절벽의 첫째 원인)
    for (let i = 0; i < n; i++) pool.push(k);
  }
  if (CLIFF.shadeTaste && chapterOf(w) === 0 && stageOf(w) === STAGE_PLAN.lastIndexOf('fight') + 1) for (let i = 0; i < CLIFF.shadeTaste; i++) pool.push('shade');   // v63 챕터 1 마지막 전투 판에서 그림자를 미리 맛본다
  return pool[Math.floor(R() * pool.length)];
}
/* 시작 낙하: 모든 맵 공통. 빈 수직굴을 조작 없이 떨어져 발판에 안착한 뒤에야 판이 시작된다.
   수직굴은 지형을 아래로 밀어 만들므로 벽과 배경이 실제로 위로 지나간다. 자동 시험의 수동 진행에서는 __intro를 켰을 때만 쓴다 */
const DESCENT = { first: 30, next: 12, settle: .45 };
function beginWave(rows) {
  const g = game;
  // 이전 보스전의 카메라 고정을 판마다 푼다. 다음 판 넘어갈 때만 풀면, 보스전 중 새 판을 시작할 때(디버그 판 이동 등) 카메라만 옛 보스방 바닥에 남는다
  g.camLock = false; g.bossCam = undefined; g.boss = null;
  g.introRows = (window.__manual && !window.__intro) || window.__noIntro ? 0 : rows;
  buildWave();
  if (g.mode) modeBuild();   // v42 도전 모드: 판을 모드에 맞게 고친다
  if (g.introRows > 0) { g.state = 'descend'; g.landed = false; g.descT = DESCENT.settle; g.cine = 0; input.clearAll(); g.p.y = 30; $('pause').style.visibility = 'hidden'; if (g.banner) g.banner.life = Math.max(g.banner.life, g.introRows * TILE / T.maxFall + .5); }
  else g.state = 'play';
}
function tickDescent(dt) {
  const g = game, p = g.p;
  if (!g.landed) {
    g.cine = approachSnap(g.cine, 1, 6, dt);
    // 바람 줄기: 화면 전체로 위로 스쳐 지나간다
    if (p.vy > T.maxFall * .5) for (let i = 0; i < 2; i++) g.fx.push({ type: 'streak', x: TILE + Math.random() * (WORLD_W - TILE * 2), y: g.cam + Math.random() * view.worldH, l: 26 + Math.random() * 44, t: 0, life: .12 });
    if (p.onGround) { g.landed = true; g.shake = Math.max(g.shake, 9); g.kick = 5; p.squash = .42; sfx.boom(); puff(p.x, p.y + p.h / 2 - 2, 10, 16, 7); chunks(p.x, p.y + p.h / 2, 6, [g.biome.bits, g.biome.ink], 240, 4); }
  } else {
    g.cine = approachSnap(g.cine, 0, 9, dt); g.descT -= dt;
    if (g.descT <= 0) { g.state = 'play'; g.cine = 0; $('pause').style.visibility = ''; input.blockUntil = performance.now() + 60; }
  }
}
function buildWave() {
  const g = game, w = g.wave, R = g.rand = rng(g.seed + w * 7919), mid = isMidWave(w), boss = isBossWave(w) || mid, rest = isRestWave(w), L = g.lv = dlv(w); g.lvM = Math.min(L, MOVE_L_CAP);
  g.biome = biomeOf(w); loadBiomeArt(g.biome); g.isBossWave = boss; g.isMidWave = mid; g.midStage = null; g.boss = null; g.minis = null; g.bossDone = false; g.rest = null; g.deep = chapterOf(w) >= BIOMES.length;
  g.zone = boss || rest || g.mode ? null : window.__zone !== undefined ? window.__zone : ZONE_PLAN[chapterOf(w) % ZONE_PLAN.length];   // v41 구역 규칙(zones.js). 시험에서는 window.__zone으로 고정한다(null = 규칙 없음)
  const restKind = rest ? pickRestKind(R) : null;
  const sh = g.introRows || 0;   // 시작 낙하 수직굴 높이(칸)
  g.enemies = []; g.jars = []; g.shards = []; g.bullets = []; g.fx = []; g.popups = []; g.decor = []; g.doors = []; g.ebul = []; g.decals = []; g.haz = []; g.later = []; g.cfx = []; g.dark = 0; g.darkT = 0;
  // 맨 아래 바닥은 조작 버튼에 가리지 않게 화면 위쪽으로 올린다(아래 pad칸은 땅)
  // 휴식 판은 짧다(황금 낙하만 길다). 바닥은 휴식 물건이 화면 안에 보이도록 보스방처럼 넓게 비운다
  const pad = 3, arenaRows = boss || rest ? Math.ceil(view.worldH / TILE) - pad : 0, rows = (mid ? 12 : rest ? (restKind === 'gold' ? 64 : 26) : Math.round(DIFF.rows(w) * (g.zone === 'water' ? ZONE.water.rows : 1))) + arenaRows + pad + sh, F = rows - 1 - pad; g.floorRow = F;
  lvl.rows = rows; lvl.grid = new Uint8Array(rows * COLS); lvl.hp = new Float32Array(rows * COLS);
  g.levelH = (rows - 1) * TILE;
  const tileHp = Math.round(20 * DIFF.hp(w));
  for (let r = 0; r < rows; r++) { lvl.set(0, r, HARD); lvl.set(COLS - 1, r, HARD); }
  const lastRow = boss || rest ? F - arenaRows - 2 : F - 8;
  const put = (c, r, t) => { if (c > 0 && c < COLS - 1 && r > 7 + sh && r < lastRow) { lvl.set(c, r, t); if (t === BREAK) lvl.hp[r * COLS + c] = tileHp; } };
  const landings = [], breakLands = [];   // v39 breakLands = 부서지는 돌 뭉치 위(땅 괴물을 놓을 자리)
  let r = 11 + sh;
  // 안착 발판: 맵과 상관없이 같은 자리, 양옆은 내려가는 길
  if (sh) { const cm = (COLS - 1) >> 1; for (let c = cm - 1; c <= cm + 1; c++) lvl.set(c, sh, HARD); }
  if (g.zone === 'spike') { zoneSpikeLevel(R, put, r, lastRow); r = lastRow; }   // v41 림보: 발판 없이 가시 턱 · 가시 바닥만
  while (r < lastRow - 2) {
    const roll = R(), side = R() < .5 ? 0 : 1;
    if (roll < .30) { // 벽에서 튀어나온 턱
      const len = 1 + Math.floor(R() * 3), th = R() < .35 ? 2 : 1;
      for (let i = 0; i < len; i++) for (let t = 0; t < th; t++) put(side ? COLS - 2 - i : 1 + i, r + t, HARD);
      const c = side ? COLS - 2 - Math.floor(len / 2) : 1 + Math.floor(len / 2);
      if (len >= 2) landings.push([side ? COLS - 1 - len : 1, side ? COLS - 2 : len, r]);
      if (R() < (restKind === 'gold' ? .85 : rest ? .4 : .16)) g.jars.push({ x: (c + .5) * TILE, y: r * TILE - 14, r: 13, alive: true });
      if (!rest && R() < DIFF.spike(w)) { const k = side ? COLS - 2 : 1; for (let q = 0; q < len && q < 2; q++) { const cc = side ? k - q : k + q; if (lvl.at(cc, r) === HARD) lvl.set(cc, r, SPIKE); } }
      else if (g.deep && !rest && !boss && R() < HARDM.wallTrap) for (let i = 0; i < len; i++) { const cc = side ? COLS - 2 - i : 1 + i; if (lvl.at(cc, r) === HARD) lvl.set(cc, r, TRAP); }   // v46 어려움: 벽 턱이 가시 함정 턱(밟으면 잠시 뒤 가시가 솟는다)
    } else if (roll < .58) { // 부서지는 블록 뭉치
      const c0 = 1 + Math.floor(R() * (COLS - 4)), ww = 1 + Math.floor(R() * 3), hh = 1 + Math.floor(R() * 2);
      for (let i = 0; i < ww; i++) for (let t = 0; t < hh; t++) put(c0 + i, r + t, BREAK);
      if (ww >= 2) breakLands.push([c0, c0 + ww - 1, r]);
    } else if (roll < .76) { // 통과 발판
      const c0 = 1 + Math.floor(R() * (COLS - 4)), ww = 2 + Math.floor(R() * 2);
      for (let i = 0; i < ww; i++) put(c0 + i, r, ONEWAY);
      landings.push([c0, c0 + ww - 1, r]);
    } else if (roll < .88) { // 가운데 단단한 덩어리
      const c0 = 2 + Math.floor(R() * (COLS - 5)), ww = 1 + Math.floor(R() * 2);
      for (let i = 0; i < ww; i++) put(c0 + i, r, HARD);
      if (ww === 2) landings.push([c0, c0 + 1, r]);
    }
    r += 2 + Math.floor(R() * 3);
  }
  // 샛길 문: 벽에 난 입구와 그 앞 턱
  const nDoors = (R() < DOOR.chance ? 1 : 0) + (has('member') ? 1 : 0);
  if (!boss && !rest && g.zone !== 'spike') for (let i = 0; i < nDoors; i++) {
    const rowD = Math.floor(sh + 11 + (lastRow - sh - 11) * (DOOR.from + (DOOR.to - DOOR.from) * (nDoors > 1 ? (i + R() * .7) / nDoors : R()))), side = R() < .5 ? 0 : 1;
    const c1 = side ? COLS - 2 : 1, c2 = side ? COLS - 3 : 2, c3 = side ? COLS - 4 : 3;
    for (let rr = rowD - 3; rr <= rowD; rr++) for (const cc of [c1, c2, c3]) lvl.set(cc, rr, EMPTY);
    lvl.set(c1, rowD, HARD); lvl.set(c2, rowD, HARD);
    // 함정 문: 말풍선은 다른 방으로 보인다
    // 판의 첫 웨이브에는 파편이 아직 없다: 돈이 안 드는 방만, 함정 없이
    const firstWave = w === g.startWave, guaranteed = has('member') && i === 0, pick = pickRoom(R), room = guaranteed ? 'shop' : firstWave && pick === 'shop' ? 'treasure' : pick, trap = !guaranteed && !firstWave && R() < (g.deep ? HARDM.trap : DOOR.mini);
    g.doors.push({ x: side ? WORLD_W - TILE : TILE, y: rowD * TILE - 40, side, kind: trap ? 'mini' : room, fake: trap ? room : null, used: false, row: rowD });
    g.jars = g.jars.filter(j => Math.abs(j.y - rowD * TILE) > 90);
  }
  // 끝까지 내려갈 길 보장
  const seen = new Uint8Array(rows * COLS), q = [[(COLS - 1) >> 1, 0]]; seen[(COLS - 1) >> 1] = 1; let reach = 0;
  while (q.length) {
    const [c, rr] = q.pop(); reach = Math.max(reach, rr);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = rr + dr;
      if (nc < 1 || nc >= COLS - 1 || nr < 0 || nr >= rows) continue;
      const t = lvl.at(nc, nr), i = nr * COLS + nc;
      if (seen[i] || t === HARD || t === SPIKE || t === TRAP) continue;
      seen[i] = 1; q.push([nc, nr]);
    }
  }
  if (reach < F - 1) for (let rr = reach; rr < F; rr++) lvl.set((COLS - 1) >> 1, rr, EMPTY);
  for (let rr = F; rr < rows; rr++) for (let c = 0; c < COLS; c++) lvl.set(c, rr, HARD);
  g.portal = null;
  if (boss) { g.arenaTop = F + 1 - arenaRows; buildArena(F, g.arenaTop); }
  else if (rest) { g.arenaTop = F + 1 - arenaRows; setupRest(restKind, F); }
  else g.portal = { x: WORLD_W / 2, y: F * TILE - 34, r: 34 };
  // 황금 낙하: 발판마다 항아리, 공중에는 파편 덩어리(통과 발판 위)
  if (restKind === 'gold') for (const [c0, c1, rr] of landings) for (let c = c0; c <= c1; c += 2) if (!lvl.at(c, rr - 1)) g.jars.push({ x: (c + .5) * TILE, y: rr * TILE - 14, r: 13, alive: true });
  // 공중 적: 다운웰처럼 촘촘하게
  const spacing = DIFF.spacing(w) * (g.zone === 'spike' ? ZONE.spike.spacing : 1) * (g.deep ? HARDM.spacing : 1) * FIELD_DENSE, endY = rest ? 0 : (boss ? g.arenaTop * TILE - 240 : F * TILE - 180);
  const free = (x, y) => lvl.at(Math.floor(x / TILE), Math.floor(y / TILE)) === EMPTY;
  for (let y = 380 + sh * TILE; y < endY; y += spacing * (.55 + R() * .9)) {
    const roll = R();
    if (roll < .13 && w >= 1) { // 떼 박쥐
      const cx = TILE * 2 + R() * (WORLD_W - TILE * 4), n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const x = clamp(cx + (R() - .5) * 110, TILE + 12, WORLD_W - TILE - 12), yy = y + R() * 70; if (free(x, yy)) g.enemies.push(mkEnemy('bat', x, yy, { sleep: true, ph: R() * 6 })); }
      y += 40; continue;
    }
    if (g.zone !== 'spike' && roll < .13 + Math.min(.12, L * .012)) { // 가시 장벽: 한 줄에 틈 하나
      const gap = 1 + Math.floor(R() * (COLS - 3));
      for (let c = 1; c < COLS - 1; c += 2) { if (c === gap || c === gap + 1) continue; const x = (c + .5) * TILE; if (free(x, y)) g.enemies.push(mkEnemy('urchin', x, y, { baseX: x, baseY: y, ph: R() * 6, still: true })); }
      y += 70; continue;
    }
    const c = 1 + Math.floor(R() * (COLS - 2)), x = (c + .5) * TILE;
    if (!free(x, y) && pickKind(R, w) !== 'shade') continue;
    let kind = pickKind(R, w);
    if (g.zone === 'spike' && kind !== 'eye' && kind !== 'sac' && kind !== 'bat') kind = R() < .6 ? 'eye' : 'sac';   // v41 림보: 밟을 수 있는 떠다니는 괴물만
    if (kind === 'leech') { const left = R() < .5; g.enemies.push(mkEnemy('leech', left ? TILE + 11 : WORLD_W - TILE - 11, y, { dir: R() < .5 ? -1 : 1, baseY: y, wall: left ? -1 : 1 })); }
    else if (kind === 'bat') g.enemies.push(mkEnemy('bat', x, y, { sleep: true, ph: R() * 6 }));
    else g.enemies.push(mkEnemy(kind, x, y, { baseX: x, baseY: y, ph: R() * 6 }));
  }
  // 땅 위 적과 장식
  const walkChance = rest ? -1 : Math.min(.82, .5 + L * .035) * (g.zone === 'water' ? ZONE.water.walk : 1);   // v62 수중: 바닥을 걷는 괴물은 적게
  const putWalker = (c, rr) => {
    const tb = g.biome.enemies, rollK = R(), W_ = tb.mound + tb.tick + tb.spit;
    let kind = rollK < tb.mound / W_ ? 'mound' : rollK < (tb.mound + tb.tick) / W_ ? 'tick' : 'spit';
    if (w < 2 && g.chapter === 0) kind = 'mound';
    if (kind === 'spit' && w < 3 && g.chapter === 0) kind = 'mound';
    const rad = ENEMY[kind].r;
    g.enemies.push(mkEnemy(kind, (c + .5) * TILE, rr * TILE - rad, { dir: R() < .5 ? -1 : 1, spd: (32 + g.lvM * 3) * (R() < .3 ? 1.4 : 1), shootT: 1 + R() * 2 }));
  };
  for (const [c0, c1, rr] of landings) {
    const dc = c0 + Math.floor(R() * (c1 - c0 + 1));
    if (R() < .22 && lvl.at(dc, rr) !== EMPTY && lvl.at(dc, rr) !== SPIKE && lvl.at(dc, rr - 1) === EMPTY) g.decor.push({ x: (dc + .5) * TILE, y: rr * TILE, n: R() < .5 ? 'o_decor' : 'o_decor2' });
    if (R() > walkChance) continue;
    const c = c0 + Math.floor(R() * (c1 - c0 + 1));
    if (lvl.at(c, rr) === SPIKE || lvl.at(c, rr - 1) !== EMPTY) continue;
    putWalker(c, rr);
  }
  // v39 부서지는 돌 위의 땅 괴물(사용자 요청): 돌을 미리 쏴서 부수면 괴물이 아래로 떨어져 거기서 다시 돌아다닌다(깎인 체력 그대로).
  //   옆 돌만 부서지면 다닐 길만 줄고(끝에서 돌아선다), 딛고 선 돌이 부서져야 떨어진다(updateEnemies의 땅 괴물 낙하). 들이받기(뿔 · 황소)는 머리로 돌을 부순다
  if (!rest) for (const [c0, c1, rr] of breakLands) {
    if (R() > walkChance * .75) continue;
    const c = c0 + Math.floor(R() * (c1 - c0 + 1));
    if (lvl.at(c, rr) !== BREAK || lvl.at(c, rr - 1) !== EMPTY) continue;
    putWalker(c, rr);
  }
  if (mid) { g.xpNeed = 0; g.enemies = []; g.doors = []; g.jars = []; }
  decorateWave(R);   // 챕터별 능력·강화 개체(monskill.js)
  zoneBuild(R, F, lastRow, sh);   // v41 구역 물건(횃불 · 봉인 바닥 · 조개)
  g.hearts = [];
  g.xp = 0; g.huntFull = false; g.xpNeed = !rest && !mid && g.enemies.length ? Math.max(XP.min, Math.round(g.enemies.reduce((a, e) => a + xpOf(e), 0) * XP.k)) : 0;   // v62 이번 판 괴물의 절반 남짓을 잡으면 판 끝 카드가 '빛나는 선물'
  const p = g.p;
  p.x = WORLD_W / 2; p.y = 120; p.vx = 0; p.vy = 0; p.onGround = false; p.ammo = p.maxAmmo; p.gauge = 100; p.jumps = 0; p.olive = has('olive');
  if (g.st.waveHeal) healBy(p.maxHp * g.st.waveHeal);
  g.cam = 0; g.dust = [];
  for (let i = 0; i < 28; i++) g.dust.push({ x: R() * WORLD_W, y: R() * view.worldH, z: .35 + R() * .6, r: .8 + R() * 1.6 });
  const ci = chapterInfo(chapterOf(w)), st = stageOf(w);
  g.banner = { t: 0, life: 1.9, hard: g.deep, a: g.deep ? `어려움 ${ci.no} · ${ci.B.name}` : `챕터 ${chapterOf(w) + 1} · ${ci.name}`, b: mid ? `${st} / ${STAGES} · 중간 보스` : boss ? `${st} / ${STAGES} · 보스` : rest ? `${st} / ${STAGES} · 휴식 · ${REST_TITLE[restKind]}` : `${st} / ${STAGES} 판` };
  waveBgm();
  g.traps = new Map();   // v46 가시 함정 턱 상태(zones.js)
  if (g.deep && w === g.startWave && !g.mode) { g.hardWarnAt = performance.now(); sfx.alarm && sfx.alarm(); }   // v46 어려움 판 시작 경고
}
/* v46 판 배경음: 보통은 느린 곡(b1~b6), 어려움은 빠른 곡(h1~h6) */
function waveBgm() { const g = game; if (sfx.bgmFor && g.biome) sfx.bgmFor('wave', (g.deep ? 'h' : 'b') + g.biome.id.slice(1)); }
function healBy(n, overflow = false) {
  const p = game.p; n *= 1 + (game.st.healPct || 0); p.hp += n;
  if (p.hp > p.maxHp) { if (overflow) p.maxHp = Math.round(p.hp); p.hp = Math.min(p.hp, p.maxHp); }
  p.hp = Math.round(p.hp);
}

/* ───── 타격감: 다운웰의 흰 섬광 + 참고 영상의 흰 원 → 잉크 원 ───── */
function dmgNum(x, y, n, crit) {
  game.popups.push({ x: x + (Math.random() - .5) * 14, y, text: String(n), col: crit ? '#ffe05a' : '#fff', t: 0, dmg: true, crit, vx: (Math.random() - .5) * 40 });
  if (game.popups.length > 40) game.popups.shift();
}
function hitEnemy(e, dmg, crit, fromX, fromY) {
  const st = game.st, tt = game.t;   // v36: 공작의 눈 표식(헤라) · 돌이 된 적(아테나)은 더 아프다
  if ((e.markU || 0) > tt || ((e.stoneU || 0) > tt && st.stoneDmg)) dmg = Math.round(dmg * (1 + ((e.markU || 0) > tt ? st.mark : 0) + ((e.stoneU || 0) > tt ? st.stoneDmg || 0 : 0)));
  e.hp -= dmg; e.flash = .075; e.pop = 1; e.hbT = 1.2; if (!e.still && e.baseY !== undefined) e.baseY += 2; else e.y += e.kind === 'mound' || e.kind === 'tick' || e.kind === 'spit' ? 0 : 2;
  dmgNum(e.x, e.y - e.r - 2, dmg, crit);
  game.fx.push({ type: 'hit', x: fromX, y: fromY, r: crit ? 15 : 10, t: 0, life: .1, rot: Math.random() * 3 });
  if (e.hp <= 0) killEnemy(e, false);
  else { sfx.hit(); game.hitStop = Math.max(game.hitStop, 1 / 60); game.shake = Math.max(game.shake, crit ? 3 : 1.6); }
}
function inkBurst(x, y, r, col, big) {
  const g = game, ink = col[0], hi = col[1];
  g.fx.push({ type: 'burst', x, y, r: r * (big ? 2.5 : 2.1), t: 0, life: big ? .16 : .12, ink });
  g.fx.push({ type: 'ring', x, y, r: r * (big ? 3.8 : 3), col: 'rgba(255,255,255,.95)', t: 0, life: .2 });
  for (let i = 0, n = big ? 8 : 6; i < n; i++) g.fx.push({ type: 'ray', x, y, a: i / n * 6.283 + Math.random() * .5, l: r * (big ? 3.6 : 2.8) * (.7 + Math.random() * .5), t: 0, life: .12 });
  chunks(x, y, big ? 12 : 8, [ink, ink, hi], big ? 320 : 250, big ? 5 : 4.2);
  sparks(x, y, big ? 8 : 5, '#ffffff', 280, .24);
  if (g.decals.length > 46) g.decals.shift();
  addDecal(x, y, r);
}
function addDecal(x, y, r) {
  // 벽·블록 위에만 남는 잉크 얼룩
  const g = game, blobs = [];
  for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, d = r * (.4 + Math.random() * 1.8), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d; const t = lvl.at(Math.floor(bx / TILE), Math.floor(by / TILE)); if (t === HARD || t === BREAK) blobs.push([bx, by, 2 + Math.random() * 4.5]); }
  if (blobs.length) g.decals.push({ blobs, col: g.biome.ink });
}
function killEnemy(e, byStomp) {
  const g = game, p = g.p, E = ENEMY[e.kind], st = g.st;
  e.alive = false; g.kills++;
  if (!g.tut) spawnShards(e.x, e.y, Math.round(e.gem * (godMode() ? 2 : 1) * p.gemMul));   // v31 연습 방: 재화 없음
  if (!g.tut && !g.noXp) {   // v40 경험치 · 하트
    if (!g.room) g.xp += xpOf(e);
    if (Math.random() < (e.elite ? HEART.elite : e.child || e.kind === 'bat' ? HEART.small : HEART.chance) * (g.deep ? HARDM.heart : 1)) g.hearts.push({ x: e.x, y: e.y, vx: (Math.random() - .5) * 90, vy: -170, t: 0 });
  }
  // 처치: 하얗게 커졌다가 터진다
  g.fx.push({ type: 'corpse', name: E.frames[0], x: e.x, y: e.y, h: E.h, flip: e.face, t: 0, life: .07 });
  inkBurst(e.x, e.y, e.r, E.col, byStomp);
  g.shake = Math.max(g.shake, byStomp ? 9 : 5);
  g.hitStop = Math.max(g.hitStop, byStomp ? 6 / 60 : 3 / 60);
  g.whiteout = Math.max(g.whiteout, byStomp ? .11 : .05);
  vibrate(byStomp ? 22 : 10);
  if (byStomp) sfx.stomp(p.combo); else sfx.kill(p.combo);
  if (st.leech) healBy(st.leech);
  if (has('feast') && ++p.feastN >= 8) { p.feastN = 0; const n = Math.round(p.maxHp * .08); healBy(n); popup(p.x, p.y - 30, '+' + n, '#7dffa8'); }
  if (has('corpse')) g.fx.push({ type: 'delay', x: e.x, y: e.y, t: 0, life: .3, boom: 56 });
  monDeath(e);
}
// v34 티폰의 굶주린 발: 충격파 전후 적·보스 체력 합으로 실제 피해를 잰다(쓰러진 적은 남은 체력만큼)
function foeHpSum() { const g = game; let n = 0; for (const e of g.enemies) if (e.alive) n += Math.max(0, e.hp); if (g.minis) for (const m of g.minis) if (m.alive) n += Math.max(0, m.hp); if (g.boss && g.boss.alive) n += Math.max(0, g.boss.hp); return n; }
function explode(x, y, r, opt = {}) {
  const g = game;
  g.fx.push({ type: 'burst', x, y, r, t: 0, life: .16, ink: opt.ink || '#ff8a3a' });
  g.fx.push({ type: 'ring', x, y, r: r * 1.4, col: 'rgba(255,240,200,.95)', t: 0, life: .22 });
  chunks(x, y, 10, opt.cols || ['#ffd27a', '#ff8a3a', '#ffffff'], 280);
  g.shake = Math.max(g.shake, Math.min(10, r * .14)); if (r >= 150) sfx.boom(); else sfx.pop(r);   // v38.1 헤파이스토스 · 디오니소스는 탄마다 터진다 → 큰 폭발음이 매번 겹쳐 크고 날카로웠다
  const dmg = opt.dmg !== undefined ? opt.dmg : Math.round(atkNow() * 1.2);
  if (g.minis) for (const m of g.minis) if (m.alive && Math.abs(m.x - x) < r + m.w * .4 && y > m.y - m.h && y < m.y + 12) { g.boss = m; hitBoss(Math.round(dmg * .6), false, x, y); }
  for (const e of g.enemies) if (e.alive && Math.hypot(e.x - x, e.y - y) < r + e.r) hitEnemy(e, dmg, false, e.x, e.y);
  if (!g.minis && g.boss && g.boss.alive && Math.abs(g.boss.x - x) < r + g.boss.w * .4 && y > g.boss.y - g.boss.h && y < g.boss.y + 12) hitBoss(Math.round(dmg * .6), false, x, y);
  for (const j of g.jars) if (j.alive && Math.hypot(j.x - x, j.y - y) < r + j.r) breakJar(j);
  if (opt.tiles !== false) {
    const c0 = Math.floor((x - r) / TILE), c1 = Math.floor((x + r) / TILE), r0 = Math.floor((y - r) / TILE), r1 = Math.floor((y + r) / TILE);
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) if (lvl.at(c, rr) === BREAK) breakTile(c, rr);
  }
}
function imageBits(name, x, y, world, n = 3, sp = 210) {
  const im = IMG[name]; if (!ok(im)) return;
  const sw = im.naturalWidth / n, sh = im.naturalHeight / n, ww = world / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ox = (i - (n - 1) / 2) * ww, oy = (j - (n - 1) / 2) * ww * (sh / sw), a = Math.atan2(oy - 4, ox || .01), v = sp * (.45 + Math.random() * .7);
    game.fx.push({ type: 'bit', name, sx: i * sw, sy: j * sh, sw, sh, x: x + ox, y: y + oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 950, drag: 1.2, rot: 0, vr: (Math.random() - .5) * 13, w: ww, h: ww * (sh / sw), t: 0, life: .5 + Math.random() * .25 });
  }
}
function breakTile(c, r) {
  lvl.set(c, r, EMPTY);
  const x = (c + .5) * TILE, y = (r + .5) * TILE;
  imageBits(game.biome.id + '_t_break2', x, y, TILE, 3, 220);
  game.fx.push({ type: 'hit', x, y, r: 24, t: 0, life: .1, rot: 0 });
  puff(x, y + 8, 4, 12, 7);
  game.shake = Math.max(game.shake, 3.5); game.hitStop = Math.max(game.hitStop, 1 / 60); sfx.brk();
  if (game.rand() < .4) spawnShards(x, y, 6);
}
function breakJar(j) {
  j.alive = false; spawnShards(j.x, j.y, Math.round(24 * game.p.gemMul));
  if (game.rand() < .3) { healBy(10); popup(j.x, j.y - 18, '+10', '#7dffa8'); }
  imageBits(game.biome.id + '_o_jar', j.x, j.y - 2, 26, 3, 190);
  game.fx.push({ type: 'hit', x: j.x, y: j.y, r: 18, t: 0, life: .1, rot: 0 }); puff(j.x, j.y + 8, 2, 10, 6); sfx.brk();
}
function hurt(from, dmg0) {
  const g = game, p = g.p, st = g.st;
  if (p.inv > 0 || g.god) return;
  if (g.minis) dmg0 = Math.max(1, Math.round(dmg0 * MINI.power));
  if (st.dodge && Math.random() < st.dodge) { p.inv = .5; popup(p.x, p.y - 26, '흘림', '#e5b8ff', true); sfx.flap(); return; }
  if (p.olive) { p.olive = false; p.inv = 1.2; popup(p.x, p.y - 26, '올리브 관', '#b8ffb0', true); g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 60, col: 'rgba(170,255,160,.95)', t: 0, life: .35 }); sfx.ping(); return; }
  const dmg = Math.max(1, Math.round(dmg0 * (1 - st.dmgCut)));
  // v31 연습 방(g.tut): 맞는 모습은 그대로, 체력은 줄지 않는다
  if (!g.tut) p.hp -= dmg; p.inv = (has('aegis') ? 1.8 : 1) * (has('z_thorn') ? 2 : 1) * (1 + st.invPct); p.hurtT = .34; p.spin = 0; p.attackPose = 0; p.throwT = 0; p.hitFlash = .12;
  feathers(p.x, p.y - 20, 3, 120);
  chunks(p.x, p.y - 10, 6, ['#ff6c7b', '#ffffff'], 240, 3.4);
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 64, col: 'rgba(255,90,110,.95)', t: 0, life: .25 });
  g.shake = 14; g.flash = 0; g.vign = 1; g.hitStop = 7 / 60; g.kick = -7; vibrate(45);
  p.vy = Math.min(p.vy, -260); p.vx = (p.x < from ? -1 : 1) * 160;
  popup(p.x, p.y - 30, g.tut ? '연습' : '-' + dmg, g.tut ? '#ffd6a0' : '#ff5068', true); sfx.hurt();
  if (st.thorns) for (const e of g.enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 90) hitEnemy(e, Math.round(p.atk), false, e.x, e.y);
  if (p.hp <= 0) {
    if (p.lastStand) { p.lastStand = false; p.hp = 1; popup(p.x, p.y - 50, '버텼다!', '#ffe27a', true); p.inv = 2; return; }
    if (has('thanatos') && !p.reviveUsed) { p.reviveUsed = true; p.hp = p.maxHp; p.inv = 2.6; g.whiteout = .8; g.ebul = []; explode(p.x, p.y, 190, { tiles: false, dmg: Math.round(atkNow() * 3), ink: '#3a5aa0', cols: ['#b7d4ff', '#ffffff', '#6a8ad0'] }); g.slowT = .5; popup(p.x, p.y - 50, '타나토스의 유예', '#b7d4ff', true); sfx.reward(); return; }
    p.hp = 0; gameOver();
  }
}
function gameOver() {
  const g = game; g.state = 'dying'; g.overT = 1.0; input.clearAll(); sfx.over(); g.vign = 1; g.timeScale = .3; g.whiteout = .35;
  chunks(g.p.x, g.p.y, 16, ['#ffffff', '#ff6c7b'], 340, 4);
}
/* 이어하기: 체력 절반, 탄창 가득, 3초 무적, 주변 적과 적 탄 제거. 호출 전에 비용을 낸다 */
function revive() {
  const g = game, p = g.p;
  g.state = 'play'; g.overT = 0; g.timeScale = 1; g.vign = 0; g.whiteout = .5; g.contN++; g.hitStop = 0;
  p.hp = Math.max(1, Math.round(p.maxHp * .5)); p.ammo = p.maxAmmo; p.inv = 3; p.hurtT = 0; p.vx = 0; p.vy = -260; p.onGround = false;
  g.ebul = [];
  for (const e of g.enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 170) e.alive = false;
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 170, col: 'rgba(255,240,170,.95)', t: 0, life: .45 });
  chunks(p.x, p.y, 14, ['#ffffff', '#ffe27a'], 300, 4); popup(p.x, p.y - 44, '다시 일어섰다!', '#ffe27a', true);
  input.clearAll(); input.blockUntil = performance.now() + 200; sfx.reward(); vibrate(30);
}
function finishRun(gaveUp) {
  const g = game;
  if (g.mode) { modeFinish(gaveUp); return; }   // v42 도전 모드는 점수로 정산한다(modes.js)
  g.state = 'result';
  const r = { wave: g.wave, startWave: g.startWave, kills: g.kills, bosses: g.bosses, combo: g.maxCombo, high: g.highN || 0, chapter: g.chapter, shards: g.shardTotal, gaveUp, clear: !!g.clear };
  const reward = Meta.settle(r);
  UI.showResult(r, reward);
}
/* v33: 파편은 돈일 뿐이다(이어 먹어 신성 폭주가 켜지던 것은 없앴다). sndChain은 이어 먹을 때 소리가 올라가게만 쓴다 */
/* v62 사냥 막대가 찼다: 이 판 끝 카드 창이 빛나는 선물이 된다(멈추지 않는다) */
function huntFull() {
  const g = game, p = g.p; g.huntFull = true;
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 8, r: 90, col: 'rgba(255,214,120,.95)', t: 0, life: .45 }); sparks(p.x, p.y - 10, 14, '#ffd98a', 260, .45);
  popup(p.x, p.y - 50, '빛나는 선물!', '#ffd98a', true); sfx.reward && sfx.reward();
}
/* v62 판 끝 카드 창(다운웰처럼 판 사이에서 고른다). 고르면 다음 판으로(openCards 기본 동작) */
function stageGift(mid) {
  const g = game; g.runLv++;
  if (mid) { openCards(true, { title: '중간 보스의 전리품', sub: '새로운 능력을 선택하세요!' }); return; }
  if (!g.huntFull) { openCards(false, { title: '신의 선물', sub: '새로운 능력을 선택하세요!' }); return; }
  // 빛나는 선물: 한 번 멈춘 김에 두 장(좋은 카드가 잘 나오는 사다리로). 멈추는 횟수는 늘리지 않고 한 번에 크게 세진다(시뮬레이터: 한 장씩이면 고수 챕터 1 클리어 6/11 → 3/12)
  openCards(true, { title: '빛나는 선물 1/2', sub: '괴물을 많이 잡아 두 장을 고릅니다!', after: () => openCards(true, { title: '빛나는 선물 2/2', sub: '한 장 더 고르세요!' }) });
}
/* v40 레벨업(v62부터 쓰지 않음. 디버그 · 옛 시험용으로 남김): 카드 창을 띄우고, 고르면 그 자리에서 이어서 싸운다(잠깐 무적) */
function levelUp() {
  const g = game, p = g.p; g.xp -= g.xpNeed; g.runLv++; g.lvPend = 0;
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 8, r: 90, col: 'rgba(120,220,255,.95)', t: 0, life: .4 }); sparks(p.x, p.y - 10, 12, '#8fe6ff', 260, .4);
  openCards(false, { title: '레벨 업!', sub: '새로운 능력을 선택하세요!', after: () => { g.state = 'play'; p.inv = Math.max(p.inv, .8); input.clearAll(); input.blockUntil = performance.now() + 150; } });
}
/* v40 하트: 괴물이 가끔 떨어뜨린다. 발판에 내려앉고, 몸이 닿아야 먹는다. 자석 신상이 있으면 가까이서 끌려온다 */
function heartTick(dt) {
  const g = game, p = g.p; if (!g.hearts || !g.hearts.length) return;
  for (const h of g.hearts) {
    h.t += dt;
    const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
    if (has('magnet') && d < 120) { h.x += dx / d * 300 * dt; h.y += dy / d * 300 * dt; h.vy = 0; }
    else {
      const c = Math.floor(h.x / TILE), r = Math.floor((h.y + HEART.r + 1) / TILE);
      if (h.vy >= 0 && lvl.at(c, r)) { h.y = r * TILE - HEART.r; h.vy = 0; h.vx = 0; }
      else { h.vy = Math.min(h.vy + 620 * dt, 240); h.x = clamp(h.x + h.vx * dt, TILE + 12, WORLD_W - TILE - 12); h.y += h.vy * dt; }
    }
    if (Math.abs(dx) < p.w / 2 + HEART.r && Math.abs(dy) < p.h / 2 + HEART.r && g.state === 'play') {
      h.dead = true; const hp0 = p.hp; healBy(p.maxHp * HEART.heal); const n = p.hp - hp0;
      g.hpFrom = hp0; g.hudHp = p.hp; g.hpFlash = 1;   // 체력 막대가 초록으로 차오른다
      popup(p.x, p.y - 44, n > 0 ? '+' + n : '가득', '#ff9db0', true); g.fx.push({ type: 'ring', x: h.x, y: h.y, r: 46, col: 'rgba(255,140,170,.95)', t: 0, life: .3 });
      for (let i = 0; i < 7; i++) g.fx.push({ type: 'dot', x: h.x + (Math.random() - .5) * 16, y: h.y, vx: (Math.random() - .5) * 90, vy: -70 - Math.random() * 90, t: 0, life: .55, r: 3, col: i % 2 ? '#ff6a8a' : '#ffd0dc', g: 0 });
      sfx.ping(); vibrate(15);
    }
    if (h.t > HEART.life || h.y < g.cam - 260) h.dead = true;
  }
  g.hearts = g.hearts.filter(h => !h.dead);
}
function gainShard(s) {
  const p = game.p;
  p.shards += s.v; game.shardTotal += s.v; p.sndChain = (p.sndT > 0 ? p.sndChain || 0 : 0) + s.v; p.sndT = .5; sfx.gem(p.sndChain);
  if (has('cell') && p.ammo < p.maxAmmo) p.ammo++;
}
/* ───── 탄: 신마다 모양과 판정이 다르다 ───── */
const SHOT = {
  letter: { v: 1150, r: 5, range: 300 }, arrow: { v: 1500, r: 4, range: 380 }, wine: { v: 860, r: 7, range: 280 },
  bomb: { v: 620, r: 9, range: 260 }, soul: { v: 620, r: 7, range: 340 }, bolt: { v: 1700, r: 5, range: 300 },
  // v36 새 신: 물줄기 · 공작 깃털 · 사자 충격파 · 메두사 눈빛 · 황금 음표 · 장미 꽃잎
  wave: { v: 1400, r: 6, range: 330 }, feather: { v: 1250, r: 5, range: 320 }, lion: { v: 760, r: 11, range: 290 },
  gaze: { v: 1650, r: 6, range: 360 }, note: { v: 1000, r: 6, range: 310 }, rose: { v: 1050, r: 4.5, range: 270 },
};
function fireBullet(x, y, vx, vy, up = false, ox = 0, o = {}) {
  const g = game, p = g.p, kind = o.kind || g.god_.shot, S = SHOT[kind], { dmg, crit } = rollDamage(o.mul || 1);
  const k = Math.hypot(vx, vy) / 1150;
  g.bullets.push({ x, y, px: x, py: y, vx: vx * S.v / 1150, vy: vy * S.v / 1150, y0: y, range: (has('apollo') ? 1.6 : 1) * S.range, r: S.r * (godMode() ? 1.5 : 1) * (has('heavy') ? 1.4 : 1) * (has('apollo') ? 1.3 : 1) * (o.big ? 1.6 : 1), dmg, crit, up, ox, t: 0, wob: Math.random() * 6, kind, pierce: (g.st.pierce || 0) + (has('pierce') ? 2 : 0), bounce: o.bounce || 0, hits: [], dist: 0, seekR: o.seekR || 0, seekTurn: o.seekTurn || 0 });
}
/* 낙뢰: 가장 가까운 몬스터나 보스·중간 보스(v33)에게 */
function smite(x0) {
  const g = game, top = g.cam, bot = g.cam + view.worldH; let t = null, d = 1e9;
  for (const e of g.enemies) if (e.alive && e.y > top && e.y < bot) { const q = Math.abs(e.x - g.p.x) + Math.abs(e.y - g.p.y); if (q < d) { d = q; t = e; } }
  for (const o of bigFoes()) { const P = foePt(o); if (P.y > top && P.y < bot) { const q = Math.abs(P.x - g.p.x) + Math.abs(P.y - g.p.y); if (q < d) { d = q; t = o; } } }
  if (!t) return;
  const P = foePt(t); g.fx.push({ type: 'zap', x: P.x, y: P.y, t: 0, life: .14 }); sfx.zap();
  hitFoe(t, Math.round(atkNow() * 1.2), false, P.x, P.y);
}
/* 번개 사슬: e에서 가까운 n마리로 옮겨 간다. 보스·중간 보스(v33)도 옮겨 갈 대상이다. sx·sy = 첫 번째로 뻗을 자리(보스를 맞힌 탄 자리) */
function chainFrom(e, n, dmg, sx, sy) {
  let cur = e, cp = sx !== undefined ? { x: sx, y: sy } : foePt(e); const done = [e];
  for (let i = 0; i < n; i++) {
    let best = null, bp = null, bd = 150;
    for (const o of game.enemies) if (o.alive && !done.includes(o)) { const d = Math.hypot(o.x - cp.x, o.y - cp.y); if (d < bd) { bd = d; best = o; bp = o; } }
    for (const o of bigFoes()) if (!done.includes(o)) { const P = foePt(o), d = Math.hypot(P.x - cp.x, P.y - cp.y) - P.r; if (d < bd) { bd = d; best = o; bp = P; } }
    if (!best) break;
    game.fx.push({ type: 'arc', x: cp.x, y: cp.y, x2: bp.x, y2: bp.y, t: 0, life: .12 }); done.push(best);
    hitFoe(best, Math.round(dmg * .6), false, bp.x, bp.y); cur = best; cp = { x: bp.x, y: bp.y };
  }
  if (done.length > 1) sfx.zap();
}
function onBulletHit(b, e) {
  // 신별 맞았을 때
  if (b.kind === 'wine' || b.kind === 'bomb') {
    const r = game.st.splash; explode(b.x, b.y, r, { dmg: Math.round(b.dmg * .55), tiles: !!game.st.breaker, ink: b.kind === 'wine' ? '#8a1f4a' : '#ff8a3a', cols: b.kind === 'wine' ? ['#c23c62', '#6a1838', '#ffd0dc'] : undefined });
  }
  // 폭탄처럼 블록에 맞아 터지면 맞은 적이 없다. 적에게 맞았을 때만 카드 효과를 건다
  if (e && (game.st.chain || has('chain'))) chainFrom(e, (game.st.chain || 0) + (has('chain') ? 2 : 0), b.dmg, b.x, b.y);
  if (e && has('burn') && !isBig(e)) e.burn = Math.max(e.burn || 0, 3);
  // 히드라의 독니: 맞은 자리에서 작은 탄 2발이 양옆 아래로 갈라진다(갈라진 탄은 다시 갈라지지 않는다)
  // 히드라의 독니(전설): 맞은 자리에서 적을 쫓는 독니 3발로 갈라진다(갈라진 탄은 다시 갈라지지 않는다)
  if (e && has('hydra') && !b.child) { for (const s of [-1, 0, 1]) { fireBullet(b.x, b.y + 4, s * 640, s ? 820 : 1000, false, 0, { mul: .25, seekR: 180, seekTurn: 16 }); const nb = game.bullets[game.bullets.length - 1]; nb.child = true; nb.hydra = true; if (!isBig(e)) nb.hits.push(e); nb.r *= .85; } sparks(b.x, b.y, 6, '#7dffb0', 180, .25); }
  if (b.kind === 'letter' && Math.random() < .5) paperBits(b.x, b.y, 1);
  godHit(b, e);   // v36 새 신의 맞았을 때 효과(skills.js)
}

/* ───── 1프레임 갱신 ───── */
function step(dt0) {
  const g = game;
  // 카드를 고르는 동안 뒤쪽은 완전히 멈춘다(시계·효과·흔들림 포함)
  if (g.state === 'card') { input.update(dt0); return; }
  g.t += dt0;
  input.update(dt0);
  fxUpdate(dt0);
  if (g.banner) { g.banner.t += dt0; if (g.banner.t > g.banner.life) g.banner = null; }
  g.vign = Math.max(0, g.vign - dt0 * 2.2); g.whiteout = Math.max(0, g.whiteout - dt0 * 2.4);
  g.shake = approachSnap(g.shake, 0, 16, dt0, .05); g.kick = approachSnap(g.kick, 0, 26, dt0, .02);
  if (g.fadeOut) tickFade(dt0);
  if (g.state === 'dying') { g.overT -= dt0; if (g.overT <= 0) { if (g.mode || !UI.offerContinue()) finishRun(false); return; } }   // v42 도전 모드는 이어하기 없이 바로 결과
  if (!['play', 'descend', 'intro', 'bossdead', 'dying'].includes(g.state)) return;
  if (g.state === 'play' && g.hintT > 0) g.hintT -= dt0;
  if (g.hitStop > 0) { g.hitStop -= dt0; return; }
  if (g.slowT > 0) g.slowT -= dt0;
  const dt = dt0 * g.timeScale * (g.slowT > 0 ? .35 : 1);
  tick(dt);
}
function tick(dt) {
  const g = game, p = g.p, locked = g.state !== 'play';
  const jumpHeld = !locked && (input.jumpHeld || input.keys.j);
  // 버튼 하나(v30): 문·좌판·휴식 물건 앞 바닥에서 누르면 그것을 쓰고(점프 안 함), 그 밖에는 점프. O 키(시험용)도 쓰기
  const act = locked ? null : interactNear();
  let attackTap = !locked && input.attackEdge; input.attackEdge = false;
  // 이번 누르기가 점프인지 공격인지는 누른 순간에 정한다(v35: 땅=점프, 공중=공격. 예전 v30.2~v30.4의 0.12초 탭/꾹 판정은 없앴다 — 밟은 직후 누르면 먼저 떠오르던 문제)
  if (input.jumpEdge) {
    if (!locked) {
      if (act) attackTap = true;
      else {
        // v35 다운웰 규칙: 땅(발판 끝 COYOTE 안 포함)에서 누르면 점프, 공중에서 누르면 발사. 공중 누르기는 짧은 탭도 한 발은 나간다(tapShot).
        // 공중 점프는 날개 신발 + 탄을 다 썼을 때만(그때는 쏠 탄이 없으니 누르기의 뜻이 하나) — airJump
        const air = !p.onGround && p.coyote <= 0;
        p.airJump = air && has('wings') && p.ammo <= 0 && !p.airJumped;
        p.pressFire = air && !p.airJump; p.tapShot = p.pressFire; p.buffer = BUFFER;
      }
      p.holdT = 0;
    }
    input.jumpEdge = false;
  }
  if (jumpHeld) p.holdT = (p.holdT || 0) + dt; else { p.holdT = 0; if (!p.tapShot) p.pressFire = false; }   // v35: 한 프레임 안에 뗀 탭도 한 발은 쏘게 tapShot이 남아 있는 동안은 지우지 않는다
  const st = g.st;
  // 좌우
  const zw = g.zone === 'water' && !g.room && g.state === 'play' ? ZONE.water : null;   // 시작 낙하 연출(descend)은 물속이어도 평소 속도   // v41 수중: 천천히 움직이고 천천히 떨어진다
  const axis = locked ? 0 : input.axis, run = T.run * (1 + st.runPct) * (zw ? zw.run : 1);
  const target = axis * run, acc = T.accel * dt * (zw ? zw.accel : 1);   // v62 수중: 관성(오너: 물속처럼 저항감이 있어야 한다)
  p.vx += clamp(target - p.vx, -acc, acc);
  if (Math.abs(axis) > .001) p.face = Math.sign(axis);
  // 점프 게이지(v31): 공중에서 차지 않는다. 남은 점프 칸 = (jumpMax - jumps)
  p.gauge = Math.max(0, 100 - p.jumps * gaugeCost());
  p.gaugeFlash = Math.max(0, p.gaugeFlash - dt);
  p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (p.buffer > 0) {
    const fromGround = p.coyote > 0 && p.jumps === 0;
    if (fromGround || p.airJump) {
      p.buffer = 0; p.jumps++; p.gauge = Math.max(0, 100 - p.jumps * gaugeCost()); g.stats.jumps++; p.jumpState = true;   // v30: 점프 버튼으로 뛰면 점프 상태(땅에 닿을 때까지 버튼을 누르고 있으면 공격)
      if (fromGround) {
        p.vy = -T.jumpV * Math.sqrt(1 + (st.jumpPct || 0)); p.pressFire = false; p.tapShot = false;   // 땅에서 뛴 누르기(착지 직전에 미리 누른 것 포함)는 공격이 되지 않는다
        puff(p.x, p.y + p.h / 2 - 2, 3, 11, 5); gust(p.x, p.y + p.h / 2, 24);
      } else {
        p.airJump = false; p.airJumped = true;   // v35: 날개 신발 공중 점프(탄을 다 쓴 뒤 한 번)
        const jv = T.jumpV * Math.sqrt(1 + (st.jumpPct || 0));
        p.vy = p.vy < 0 ? Math.max(p.vy - jv * T.airAdd, -jv * T.airCap) : -jv * Math.max(T.airAdd, .95);
        gust(p.x, p.y + p.h / 2 + 2, 36); feathers(p.x, p.y - 22, 3, 90); sfx.flap();
        p.spin = 1;
      }
      if (st.jumpWave) explode(p.x, p.y + 16, 46, { tiles: false, dmg: Math.round(p.atk * .6) });   // v31: 점프가 1회라 땅 점프에도 충격파
      p.coyote = 0; p.onGround = false; p.squash = -.28; sfx.jump(p.jumps - 1);
    }   // v35: 공중 누르기는 발사라 여기서 끝(버퍼는 착지 직전 누르기를 땅 점프로 받으려고 남겨 둔다)
  }
  // 공격
  p.fireT -= dt; p.attackPose = Math.max(0, p.attackPose - dt); p.throwT = Math.max(0, p.throwT - dt);
  const nearItem = g.room ? roomItemNear() : null;
  if (nearItem && attackTap) { roomBuy(nearItem); }
  // 공격(v35 다운웰 규칙): 공중에서 시작한 누르기를 누르고 있는 동안 쏜다(짧은 탭도 한 발). 땅에서 뛴 누르기는 그대로 누르고 있어도 쏘지 않는다 — 다시 눌러야 쏜다.
  // 걸어서 떨어지는 중에도, 적을 밟고 튄 뒤에도 똑같다. 바로 아래가 막혀 있으면(착지 직전·벽 턱 위) 탄이 바로 사라지므로 아끼고 쏘지 않는다
  const below = lvl.at(Math.floor(p.x / TILE), Math.floor((p.y + p.h / 2 + 22) / TILE)), firing = (jumpHeld || p.tapShot) && p.pressFire && !p.onGround && !isSolid(below);
  p.fireGlow = Math.max(0, (p.fireGlow || 0) - dt);
  if (firing && p.fireT <= 0 && p.ammo > 0) {
    const every = T.fireEvery * g.god_.fire * (1 + st.firePct) * [1, .88, .75][famLv('rate')] * (has('heavy') ? 1.2 : 1);
    p.fireT = every; p.fireGlow = every + .05; p.tapShot = false;
    const wasLast = p.ammo === 1;
    p.ammo--;
    p.attackPose = Math.max(.12, every); p.throwT = Math.max(.06, every * .5); p.shotN++; p.shots++;
    const by = p.y + p.h / 2 + 3, hand = -p.flip * HAND_X * (g.god_.hand || 1);
    const buff = (st.every8 && p.shots % 8 === 0) || (st.lastShot && wasLast);
    const mul = (g.st.unarmed ? .7 : 1) * (buff ? 2.4 : 1);
    fireVolley(p.x, by, hand, mul, buff);
    if (has('echo') && p.shots % 3 === 0) fireVolley(p.x, by - 18, hand, mul, buff);   // v33: 갈래 탄도 통째로 한 번 더
    if (has('bounce')) fireBullet(p.x, by, (p.shotN % 2 ? 1 : -1) * 640, 960, false, hand, { mul: mul * .6, bounce: 3 });
    if (has('owl')) { const [ox, oy] = petPos(0); fireBullet(ox, oy, 0, 1150, false, 0, { mul: mul * .4 * petMul(), seekR: 60, seekTurn: 10 }); if (game.petS && game.petS.pos && game.petS.pos[0]) petKick(0, ox, oy + 200, 'rgba(255,240,190,.9)'); }   // v48 올빼미가 있는 자리에서 나가고, 쏠 때 움찔한다   // 올빼미 탄도 공격력·치명·관통·번개·불꽃·독니·유도가 그대로 붙는다
    if (has('strike') && p.shots % 5 === 0) smite();
    g.fx.push({ type: 'gustHand', x: p.x + hand, y: by - 3, t: 0, life: .09 });
    if (p.shotN % 3 === 0) feathers(p.x + (Math.random() - .5) * 20, p.y - 26, 1, 40);
    sfx.shotOf(g.god_.shot);
    g.kick = Math.min(g.kick + 2.6, 6);
    // 반동: 떨어지는 중에만 낙하를 늦춘다. 올라가는 중에는 더 띄우지 않는다(저절로 쏘므로 점프 높이가 늘지 않게)
    const rec = g.god_.recoil * (has('heavy') ? .7 : 1);
    if (p.vy > 0) p.vy = zw ? p.vy * (rec + .12) - 18 : p.vy * rec - 30;   // v41 수중: 중력이 약해 쏘는 동안 거의 멈춰 버렸다(봇: 2분에 절반도 못 내려감) → 반동을 줄인다
    p.squash = Math.max(p.squash, .12);
  } else if (firing && p.ammo <= 0 && p.emptyT <= 0) { p.emptyT = .6; p.ammoFlash = .25; }
  if (p.ammo <= 0 || p.onGround) p.tapShot = false;   // 쏠 수 없으면 탭 한 발 약속은 끝
  p.emptyT = Math.max(0, p.emptyT - dt);
  // 아틀라스의 짐: 공중에서 0.6초마다 탄 1발
  if (has('atlas') && !p.onGround && p.ammo < p.maxAmmo) { p.atlasT = (p.atlasT || 0) + dt; if (p.atlasT >= .3) { p.atlasT = 0; p.ammo++; } } else p.atlasT = 0;
  if (p.ammoFlash) p.ammoFlash = Math.max(0, p.ammoFlash - dt);
  // 이동
  if (zw && p.vy < 0) p.vy *= Math.exp(-zw.drag * dt);   // v62 수중: 위로 솟을 때 물이 잡아끈다
  p.vy = Math.min(p.vy + T.grav * (zw ? zw.grav : 1) * dt, T.maxFall * (zw ? zw.maxFall : 1) * (has('z_cloak') ? .85 : 1));
  const wasGround = p.onGround; p.onGround = false;
  moveX(p, p.vx * dt);
  if (p.vy < 0 && famLv('butt') >= 2) {   // v39 들이받기: 머리가 닿는 부서지는 돌을 부순다(그 위의 괴물은 떨어진다). 올라가던 힘은 크게 줄어든다
    const hr = Math.floor((p.y + p.vy * dt - p.h / 2) / TILE), hc0 = Math.floor((p.x - p.w / 2 + 1) / TILE), hc1 = Math.floor((p.x + p.w / 2 - 1) / TILE); let n = 0;
    for (let c = hc0; c <= hc1; c++) if (lvl.at(c, hr) === BREAK) { breakTile(c, hr); n++; }
    if (n) { p.vy *= .35; p.squash = .22; g.kick = -4; g.fx.push({ type: 'ring', x: p.x, y: p.y - p.h / 2, r: 44, col: famLv('butt') >= 3 ? 'rgba(255,90,110,.95)' : 'rgba(255,214,120,.95)', t: 0, life: .2 }); }
  }
  const hit = moveY(p, p.vy * dt);
  // v31 보이지 않는 천장: 보스·중간 보스·연습 방은 위를 벽돌로 막지 않고 화면 위 끝에서 멈춘다
  if (g.room || (g.isBossWave && g.camLock) || g.tut || g.mode === 'eel') { const top = g.cam + 6; if (p.y - p.h / 2 < top) { p.y = top + p.h / 2; if (p.vy < 0) p.vy = 0; } }
  if (hit !== null && p.vy >= 0) {
    // 무적 시간에는 가시를 바닥처럼 밟는다. 좁은 틈에서 계속 튕기며 맞는 일을 막는다
    if (hit === SPIKE && p.inv <= 0 && !g.god) { hurt(p.x + (p.x % TILE < TILE / 2 ? 30 : -30), Math.round(25 * DIFF.dmg(g.wave))); p.vy = -400; if (g.state === 'dying') return; }
    else {
      if (!wasGround) { p.squash = .34; p.spin = 0; if (p.vy > 200) { p.landT = .11; puff(p.x, p.y + p.h / 2 - 2, 6, 10, 5); } sfx.land(); }
      p.vy = 0; p.onGround = true;
    }
  }
  if (p.onGround) { refill(p); p.jumpState = false; if (!ftueEasyHigh()) { if (p.combo && comboEndless()) comboLand(p); p.combo = 0; p.comboNext = 0; } }   // v33: 콤보(밟은 횟수)는 땅에 닿아야만 끊긴다
  p.squash = approachSnap(p.squash, 0, 14, dt);
  p.hurtT = Math.max(0, p.hurtT - dt); p.landT = Math.max(0, p.landT - dt); p.hitFlash = Math.max(0, (p.hitFlash || 0) - dt);
  p.flip = approachSnap(p.flip, p.face > 0 ? 1 : -1, 60, dt);
  p.tilt = approachSnap(p.tilt, (p.vx / T.run) * (p.onGround ? .1 : .14), 16, dt, .002);
  p.breath += dt;
  if (!p.onGround && p.vy > T.maxFall * .72 && Math.floor(g.t * 60) % 3 === 0) g.fx.push({ type: 'streak', x: p.x + (Math.random() < .5 ? -1 : 1) * (31 + Math.random() * 16), y: p.y - 8 + Math.random() * 30, l: 18 + Math.random() * 14, t: 0, life: .1 });
  p.inv = Math.max(0, p.inv - dt);
  if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 3.2);
  if (p.onGround && Math.abs(p.vx) > 30) p.walk += dt * 15;
  if (p.sndT > 0) p.sndT -= dt;
  // 포탈
  const po = g.portal;
  if (g.tut) { if (tutTick(dt)) return; }   // v38 첫 낙하 튜토리얼(tutorial.js): 걸음 진행 · 포탈
  else if (po && !g.room && g.state === 'play' && Math.hypot(p.x - po.x, p.y - po.y) < po.r * .8) { waveClear(); return; }
  // 신성 폭주(skills.js): 5콤보로 켜지고 HIGH.dur초(장비·카드로 늘어남) 뒤 꺼진다
  highTick(dt);
  // 샛길
  if (attackTap && !nearItem) { const d = doorNear(); if (d) { if (g.room) exitRoom(); else enterRoom(d); return; } }
  // 휴식 판: 룰렛 돌리기·샘 마시기
  if (g.rest) { if (attackTap && !nearItem) { const t = restNear(); if (t) useRest(t); } restTick(dt); }
  // 크로노스의 모래시계: 적·보스·적 탄만 느려진다
  const edt = has('kronos') ? dt * .6 : dt;
  if (g.room) { roomTick(g.room.kind === 'mini' ? edt : dt); if (!g.room || g.state === 'dying') return; }
  // 보스
  if (g.isBossWave && !g.boss && !g.bossDone && !g.room && g.state === 'play' && p.y > (g.arenaTop + 1) * TILE) { if (g.isMidWave) startMidStage(); else startBossIntro(); }
  if (g.midStage && g.minis) midStageTick(edt);
  if (g.boss && !g.minis) bossTick(edt);
  else if (g.dark) { g.dark = Math.max(0, g.dark - dt * 2); g.darkT = 0; }
  if (g.state === 'descend') tickDescent(dt); else updateEnemies(edt, jumpHeld);
  if (g.state === 'dying') return;
  updateEnemyShots(edt);
  if (g.state === 'dying') return;
  // 항아리
  for (const j of g.jars) {
    if (!j.alive) continue;
    if (p.vy > 0 && Math.abs(p.x - j.x) < j.r + p.w / 2 && Math.abs(p.y + p.h / 2 - (j.y - j.r)) < 14) { breakJar(j); p.vy = -T.stompV * .85; p.squash = -.22; p.spin = 1; feathers(p.x, p.y + 6, 2, 80); }
  }
  updateBullets(dt);
  tickWaves(edt); if (g.state === 'dying') return;
  // 궤도 구슬·천둥 폭풍(skills.js)
  orbTick(edt); stormTick(dt); petTick(edt);
  // 파편
  // v40 파편은 나온 뒤 SHARD.auto초가 지나면 어디에 있든 주인공에게 날아온다(사용자 요청). 처음엔 튀어 흩어지는 모습을 그대로 보여 준다
  for (const s of g.shards) {
    s.t += dt;
    const dx = p.x - s.x, dy = p.y - 6 - s.y, d = Math.hypot(dx, dy) || 1;
    if (s.t > SHARD.auto) { const v = 460 + (s.t - SHARD.auto) * 1600, k = Math.min(1, dt * 16); s.vx += (dx / d * v - s.vx) * k; s.vy += (dy / d * v - s.vy) * k; s.x += s.vx * dt; s.y += s.vy * dt; }
    else { s.vx *= Math.exp(-3 * dt); s.vy = s.vy * Math.exp(-3 * dt) + 26 * dt; s.x = clamp(s.x + s.vx * dt, TILE + 5, WORLD_W - TILE - 5); s.y += s.vy * dt; }
    if (d < 22 || (s.t > SHARD.auto && d < 30)) { s.dead = true; gainShard(s); }
  }
  g.shards = g.shards.filter(s => !s.dead);
  heartTick(dt); zoneTick(dt); trapTick(dt);
  // v62 판 안 레벨업 없음(오너: 카드 창이 너무 잦아 방해). 사냥 막대가 차면 알려만 주고, 카드는 판 끝(포탈)에서 고른다
  if (g.xpNeed > 0 && !g.huntFull && g.xp >= g.xpNeed && g.state === 'play' && !g.tut && !g.mode) huntFull();
  // 카메라
  if (g.bossCam !== undefined && g.isBossWave && g.camLock) g.cam = approachSnap(g.cam, g.bossCam, 7, dt, .05);
  else {
    const camTarget = clamp(p.y - view.worldH * .36, 0, Math.max(0, g.levelH + TILE - view.worldH));
    g.cam = approachSnap(g.cam, camTarget, camTarget > g.cam ? 20 : 7, dt, .05);
  }
  // 보스방: 체력 막대 뒤로 캐릭터가 숨지 않게 막대 아래에서 막는다
  if (g.boss && g.camLock && g.state === 'play') { const minY = g.cam + view.safeT / view.s + 72; if (p.y < minY) { p.y = minY; if (p.vy < 0) p.vy = 0; } }
  if (g.mode) modeTick(dt);   // v42 도전 모드(장어 · 봉인전 시계, 카메라)
}
function updateEnemies(dt, jumpHeld) {
  const g = game, p = g.p, top = g.cam - 160, bot = g.cam + view.worldH + 200, spd0 = DIFF.speed(g.wave);
  for (const e of g.enemies) {
    if (!e.alive || e.y < top || e.y > bot) continue;
    const spd = spd0 * (e.rage ? HARDM.rageSpd : 1);   // v46 분노 개체는 더 빠르다
    e.flash = Math.max(0, e.flash - dt); e.pop = Math.max(0, e.pop - dt * 9); e.hbT = Math.max(0, e.hbT - dt); if (e.buttT > 0) e.buttT -= dt;
    if (e.burn > 0) { e.burn -= dt; if (Math.floor(e.burn * 3) !== Math.floor((e.burn + dt) * 3)) hitEnemy(e, Math.max(1, Math.round(p.atk * .1)), false, e.x, e.y); if (!e.alive) continue; }
    if (e.frz > 0) { e.frz -= dt; continue; }   // 원소 구슬(얼음): 잠깐 얼어 움직이지도 닿지도 않는다
    const tt = g.t + (e.ph || 0), k = e.kind, ox0 = e.x, oy0 = e.y;
    if (k === 'mound' || k === 'tick' || k === 'spit') {
      const c = Math.floor(e.x / TILE), r = Math.floor((e.y + e.r + 2) / TILE);
      if (!lvl.at(c, r)) { e.vy = Math.min(e.vy + T.grav * dt, 400); e.y += e.vy * dt; const rr = Math.floor((e.y + e.r) / TILE); if (lvl.at(Math.floor(e.x / TILE), rr)) { if (e.vy > 160) puff(e.x, rr * TILE - 2, 4, 10, 5); e.y = rr * TILE - e.r; e.vy = 0; } }
      else if (k !== 'spit') {
        const nx2 = e.x + e.dir * e.spd * dt * (e.tele > 0 ? 0 : 1), front = Math.floor((nx2 + e.dir * e.r) / TILE);
        if (!lvl.at(front, r) || isSolid(lvl.at(front, Math.floor(e.y / TILE)))) e.dir *= -1; else e.x = nx2;
        e.face = e.dir;
      } else {
        // 뱉는 괴물: 부풀어 오른 뒤 쏜다(예고)
        e.shootT -= dt; e.swell = e.shootT < .45;
        if (e.shootT <= 0 && Math.abs(p.y - e.y) < 360) {
          e.shootT = Math.max(1.3, 2.6 - g.lvM * .08);
          const dx = p.x - e.x, dy = p.y - e.y - 10, d = Math.hypot(dx, dy) || 1, v = Math.min(300, 150 + g.lvM * 8);
          g.ebul.push({ x: e.x, y: e.y - e.r, vx: dx / d * v, vy: dy / d * v, r: 6, dmg: Math.round(e.dmg * .8), t: 0, col: '#ff9a8a' }); e.pop = 1; sfx.spit();
        }
      }
    } else if (k === 'eye') {
      const dx = p.x - e.x, dy = p.y - e.y, near = Math.hypot(dx, dy) < 280, sp = (56 + g.lvM * 5) * spd;
      if (near) { e.baseX += clamp(dx, -1, 1) * sp * dt; e.baseY += clamp(dy, -1, 1) * sp * .75 * dt; }
      if (g.zone === 'water') { if (near && Math.sin(tt * 2.2) > .55) { e.baseX += clamp(dx, -1, 1) * sp * 1.6 * dt; e.baseY += clamp(dy, -1, 1) * sp * 1.2 * dt; } e.x = e.baseX; e.y = e.baseY + Math.sin(tt * 1.6) * ZONE.water.jelly; }   // v62 수중: 해파리처럼 둥실대다 한 번씩 밀고 다가온다
      else { e.x = e.baseX; e.y = e.baseY + Math.sin(tt * 4) * 5; } e.face = Math.sign(dx) || 1;
    } else if (k === 'sac') {
      // 주머니: 몸을 숙이며 왈칵 쏠렸다가 돌아온다
      const sw = Math.sin(tt * 1.15), lurch = Math.sign(sw) * Math.pow(Math.abs(sw), .55);
      e.y = e.baseY + Math.sin(tt * 1.7) * 14; e.x = clamp(e.baseX + lurch * 26, TILE + 14, WORLD_W - TILE - 14);
    } else if (k === 'urchin') {
      if (!e.still) { e.x = clamp(e.baseX + Math.sin(tt * 1.3 * spd) * 46, TILE + 14, WORLD_W - TILE - 14); e.y = e.baseY + Math.cos(tt * 1.7) * 12; }
      else { e.y = e.baseY + Math.sin(tt * 2) * 4; }
    } else if (k === 'leech') {
      e.y += e.dir * (30 + g.lvM * 4) * spd * dt;
      if (Math.abs(e.y - e.baseY) > 110) e.dir *= -1;
      e.face = e.wall;
    } else if (k === 'shade') {
      const dx = p.x - e.baseX, dy = p.y - e.baseY, d = Math.hypot(dx, dy);
      // 그림자는 벽을 지나 쫓아오지만 자기 자리에서 SHADE.leash 넘게는 따라오지 않고 돌아간다(무리가 되어 끝까지 따라붙던 문제, bot_v21.py 측정)
      if (e.homeY === undefined) { e.homeX = e.baseX; e.homeY = e.baseY; }
      const far = Math.hypot(e.baseX - e.homeX, e.baseY - e.homeY) > SHADE.leash;
      if (d < SHADE.sight && !far) { const sp = Math.min(SHADE.maxSpd, (40 + g.lvM * 4) * spd) * (g.zone === 'water' ? ZONE.water.shade : 1); e.baseX += dx / (d || 1) * sp * dt; e.baseY += dy / (d || 1) * sp * dt; }   // v62 수중 그림자: 물 저항을 안 받는다
      else if (far || d >= SHADE.sight) { const hx = e.homeX - e.baseX, hy = e.homeY - e.baseY, hd = Math.hypot(hx, hy); if (hd > 4) { e.baseX += hx / hd * 70 * dt; e.baseY += hy / hd * 70 * dt; } }
      e.x = e.baseX + Math.sin(tt * 2.4) * 8; e.y = e.baseY; e.face = Math.sign(dx) || 1;
    } else if (k === 'bat') {
      if (e.anchor) { e.x = e.anchor.x + Math.sin(tt * 2.2) * 4; e.y = e.anchor.y + Math.sin(tt * 3.1) * 6; e.face = Math.sign(p.x - e.x) || 1; }   // v31 연습 방: 제자리를 지킨다
      else if (e.sleep) {
        if (Math.hypot(p.x - e.x, p.y - e.y) < 190 + g.lvM * 6) { e.sleep = false; const dx = p.x - e.x, dy = p.y + 30 - e.y, d = Math.hypot(dx, dy) || 1, v = (170 + g.lvM * 9) * spd; e.vx = dx / d * v; e.vy = dy / d * v; if (e.sk === 'dash') batDashStart(e); }
      } else if (e.dashT > 0 && batDashTick(e, dt, spd)) { e.x += Math.sin(tt * 40) * .6; } else {
        if (g.zone === 'water') {   // v62 수중 물고기: 헤엄 속도로 돌아오며 주인공 쪽으로 천천히 틀고, 몇 초마다 예고(붉은 줄) 뒤 돌진한다
          const Z = ZONE.water, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, cv = (Z.cruise + g.lvM * 4) * spd, v = Math.hypot(e.vx, e.vy) || 1, nv = approachSnap(v, cv, 2.5, dt, 1), tx = e.vx / v + dx / d * 1.4 * dt, ty = e.vy / v + dy / d * 1.4 * dt, tl = Math.hypot(tx, ty) || 1;
          e.vx = tx / tl * nv; e.vy = ty / tl * nv * .8;
          e.swimT = (e.swimT === undefined ? Z.fish[0] + Math.random() * (Z.fish[1] - Z.fish[0]) : e.swimT) - dt;
          if (e.swimT <= 0 && d < 420 && e.y > g.cam && e.y < g.cam + view.worldH) { e.swimT = Z.fish[0] + Math.random() * (Z.fish[1] - Z.fish[0]); batDashStart(e); }
        }
        e.x += e.vx * dt + Math.sin(tt * 12) * 1.2; e.y += e.vy * dt;
        if (e.x < TILE + 8 || e.x > WORLD_W - TILE - 8) e.vx *= -1;
        e.x = clamp(e.x, TILE + 8, WORLD_W - TILE - 8); e.face = Math.sign(e.vx) || 1;
      }
    }
    const charmed = (e.charmU || 0) > g.t;   // v36 아프로디테의 매혹: 능력을 쓰지 않는다
    if (e.sk && !charmed) { monSkillTick(e, dt); if (g.state === 'dying') return; if (!e.alive) continue; }
    // 움직임 값: 기울임·늘어남·먼지에 쓴다
    const mvx = (e.x - ox0) / Math.max(dt, .001), mvy = (e.y - oy0) / Math.max(dt, .001);
    e.mvx = approachSnap(e.mvx || 0, mvx, 12, dt, .5); e.mvy = approachSnap(e.mvy || 0, mvy, 12, dt, .5);
    if (k !== 'shade' && Math.hypot(e.mvx, e.mvy) > 26 && e.y > g.cam - 20 && e.y < g.cam + view.worldH + 20 && g.fx.length < 170 && Math.random() < dt * 9) {
      g.fx.push({ type: 'dot', x: e.x - Math.sign(e.mvx) * e.r * .6, y: e.y + e.r * (k === 'mound' || k === 'tick' ? .85 : .2), vx: -e.mvx * .25 + (Math.random() - .5) * 24, vy: -18 - Math.random() * 26, t: 0, life: .34, r: 1.5, col: ENEMY[k].col[0], g: 220 });
    }
    // 충돌(사라진 그림자는 닿지 않는다)
    if (e.hidden) continue;
    const hx = Math.abs(p.x - e.x) < e.r + p.w / 2 + (e.stomp ? 3 : -2), hy = Math.abs(p.y - e.y) < e.r + p.h / 2 - 1;
    if (!hx || !hy) continue;
    const feet = p.y + p.h / 2;
    const tLv = famLv('titan');   // v34 타이탄 묶음: 2단계부터 못 밟던 적도 밟는다
    if (p.vy > -60 && feet - e.y < e.r * 1.0) {
      if (e.stomp || tLv >= 2 || (e.charmU || 0) > g.t) {
        // 밟기: 약한 적은 한 번에, 체력이 많아진 뒤에는 크게 깎는다
        const sd = stompDmg(e);   // v32: 몬스터 크기별 정해진 횟수(data.js STOMP). 공격력·카드로 세지지 않는다
        p.vy = (jumpHeld ? -T.stompHoldV : -T.stompV) * (1 + (g.st.stompBounce || 0));
        refill(p); p.jumpState = true; p.squash = -.3; p.spin = 1; g.kick = 5; feathers(p.x, p.y + 6, 3, 110); sfx.flap();
        const hp0 = Math.max(0, e.hp);
        e.hp -= sd; e.flash = .09; e.pop = 1; e.hbT = 1.2;
        addCombo();   // v33 콤보 = 밟은 횟수
        if (e.hp <= 0) killEnemy(e, true);
        else { dmgNum(e.x, e.y - e.r, Math.round(sd), true); inkBurst(e.x, e.y, e.r * .7, ENEMY[k].col, false); sfx.stomp(p.combo); g.hitStop = Math.max(g.hitStop, 4 / 60); g.shake = Math.max(g.shake, 7); }
        if (tLv) {
          const before = tLv >= 3 ? foeHpSum() : 0;
          explode(e.x, e.y + 20, 84, { tiles: false, dmg: Math.round(atkNow() * 1.5), ink: tLv >= 3 ? '#8a1a2a' : tLv >= 2 ? '#4a2a6a' : '#8a5a2a', cols: tLv >= 3 ? ['#ff6c7b', '#ffd27a', '#ffffff'] : tLv >= 2 ? ['#c88aff', '#ffd27a', '#ffffff'] : ['#ffd27a', '#c08040', '#ffffff'] });
          if (tLv >= 3) {   // 흡혈: 밟기 + 충격파로 실제 깎은 체력의 20%
            const dealt = Math.min(sd, hp0) + Math.max(0, before - foeHpSum()), n = Math.max(1, Math.round(dealt * .2));
            healBy(n); popup(p.x, p.y - 40, '+' + n, '#ff8aa0');
            for (let i = 0; i < 5; i++) g.fx.push({ type: 'dot', x: e.x + (Math.random() - .5) * 30, y: e.y, vx: (p.x - e.x) * 2.2 + (Math.random() - .5) * 60, vy: (p.y - e.y) * 2.2 - 60, t: 0, life: .4, r: 2.4, col: '#ff4a5e', g: 0 });
          }
        }
        if (g.st.stompWave) explode(e.x, e.y, 54, { tiles: false, dmg: Math.round(p.atk * .7) });
      } else { if (p.inv <= 0) refill(p); hurt(e.x, e.dmg); p.vy = -340; if (g.state === 'dying') return; }
    } else if (p.y - e.y > e.r * .4 && famLv('butt') >= 2) {   // 가시 달린 적도 들이받을 수 있다(v31.1)
      // v31 들이받기(미노타우로스의 뿔·포세이돈의 황소): 몸이 적보다 아래에서 닿으면 다치지 않고 밟기와 같은 피해. 올라가던 힘은 멈춘다
      if (e.buttT > 0) continue;
      const lv = famLv('butt'), sd = stompDmg(e) * (lv >= 3 ? 1.5 : 1);
      e.hp -= sd; e.flash = .09; e.pop = 1; e.hbT = 1.2; e.buttT = .25; if (p.vy < 60) p.vy = 60; p.squash = .22; g.kick = -4;
      g.fx.push({ type: 'ring', x: p.x, y: p.y - p.h / 2, r: 40 + lv * 8, col: lv >= 3 ? 'rgba(255,90,110,.95)' : 'rgba(255,214,120,.95)', t: 0, life: .22 });
      chunks(p.x, p.y - p.h / 2, 6, lv >= 3 ? ['#ff6c7b', '#ffffff', '#7fe8ff'] : ['#ffd27a', '#ffffff', '#c08040'], 260, 3);
      if (lv >= 3) { const n = Math.max(1, Math.round(Math.min(sd, (e.maxHp || sd)) * .2)); healBy(n); popup(p.x, p.y - 40, '+' + n, '#ff8aa0'); }
      if (e.hp <= 0) killEnemy(e, true);
      else { dmgNum(e.x, e.y - e.r, Math.round(sd), true); sfx.stomp(p.combo); g.hitStop = Math.max(g.hitStop, 4 / 60); g.shake = Math.max(g.shake, 6); }
    } else if (p.inv <= 0 && !((e.charmU || 0) > g.t)) { refill(p); hurt(e.x, e.dmg); if (g.state === 'dying') return; }
  }
  if (g.enemies.length > 60) g.enemies = g.enemies.filter(e => e.alive);
}
function updateEnemyShots(dt) {
  const g = game, p = g.p;
  for (const b of g.ebul) {
    b.t += dt; b.vy += (b.g || 0) * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.t > 6) b.dead = true;
    // 유도 구슬(첫 번째 어둠): 도는 속도에 한계가 있어 옆으로 비키면 피한다
    if (b.home && b.t < b.home) { const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(p.y - b.y, p.x - b.x), c = Math.atan2(b.vy, b.vx); let dA = a - c; while (dA > 3.14) dA -= 6.28; while (dA < -3.14) dA += 6.28; const na = c + clamp(dA, -2.1 * dt, 2.1 * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    const bc = Math.floor(b.x / TILE), br = Math.floor(b.y / TILE), bt = lvl.at(bc, br);
    if ((isSolid(bt) || (b.pool || b.shape === 'ice') && bt === ONEWAY && b.vy > 0) && !b.ghost) {
      b.dead = true; puff(b.x, b.y, 2, 8, 4);
      // 포물선 공격(독·포자): 날아가는 동안은 닿지 않고, 떨어진 자리에서 터지며 장판을 남긴다(표식 → 낙하 → 터짐)
      if (b.pool) { if (b.vy > 0 && !lvl.at(bc, br - 1)) addHaz(b.x, br * TILE, b.poolW || 60, b.pool, b.dmg / .8, b.poolT || 2.6); g.fx.push({ type: 'ring', x: b.x, y: br * TILE - 6, r: 34, col: b.col, t: 0, life: .25 }); chunks(b.x, br * TILE - 4, 6, [b.col, '#ffffff'], 200); if (p.inv <= 0 && Math.abs(p.x - b.x) < 30 && Math.abs(p.y + p.h / 2 - br * TILE) < 26) { refill(p); hurt(b.x, b.dmg); if (g.state === 'dying') return; } }
      if (b.shape === 'ice') { chunks(b.x, br * TILE - 2, 5, ['#e8fbff', '#7ad0f0'], 180); sfx.brk(); }
      continue;
    }
    if (b.y > g.levelH + 60) b.dead = true;
    if (b.pool) continue;
    if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 11) { b.dead = true; if (p.inv <= 0) { refill(p); hurt(b.x, b.dmg); if (g.state === 'dying') return; } }
  }
  g.ebul = g.ebul.filter(b => !b.dead);
  tickHazLater(dt);
}
function updateBullets(dt) {
  const g = game;
  for (const b of g.bullets) {
    b.px = b.x; b.py = b.y;
    steerBullet(b, dt);   // 유도(skills.js): 카드·하데스·올빼미·히드라
    b.x += b.vx * dt; b.y += b.vy * dt; b.dist += Math.hypot(b.vx, b.vy) * dt; b.t += dt; b.ox *= Math.exp(-34 * dt);
    if (b.bounce > 0 && (b.x < TILE + 4 || b.x > WORLD_W - TILE - 4)) { b.vx *= -1; b.bounce--; b.x = clamp(b.x, TILE + 4, WORLD_W - TILE - 4); }
    // 휘는 탄은 날아간 거리로, 곧은 탄은 내려간 깊이로 사라진다
    if (b.sk ? b.dist > b.range * 1.25 : Math.abs(b.y - b.y0) > b.range) { b.dead = true; if (b.kind === 'bomb') onBulletHit(b, null); continue; }
    const dx = b.x - b.px, dy = b.y - b.py, seg = (cx, cy) => { const t = clamp(((cx - b.px) * dx + (cy - b.py) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(cx - (b.px + dx * t), cy - (b.py + dy * t)); };
    for (const e of g.enemies) {
      if (!e.alive || e.hidden || b.hits.includes(e) || seg(e.x, e.y) >= e.r + b.r) continue;
      if (e.shield && !g.st.breaker) {
        b.dead = true; e.flash = .05; sparks(b.x, e.y - e.r, 3, '#e8dfc9', 180, .18); sfx.ping(); g.fx.push({ type: 'hit', x: b.x, y: e.y - e.r, r: 9, t: 0, life: .08, rot: 0 });
        break;
      }
      hitEnemy(e, b.dmg, b.crit, b.x, e.y); onBulletHit(b, e); b.hits.push(e);
      if (b.pierce > 0) { b.pierce--; continue; }
      b.dead = true; break;
    }
    if (b.dead) continue;
    // 보스·중간 보스: 맞힌 보스는 hits에 넣어 같은 탄이 두 번 맞히지 않는다. 관통이 남았으면 뚫고 지나간다(v33)
    const bigHit = g.minis ? miniBulletHit(b) : g.boss && g.boss.alive && !b.hits.includes(g.boss) && bossHitTest(b) ? (hitBoss(b.dmg, b.crit, b.x, b.y), g.boss) : null;
    if (bigHit) { onBulletHit(b, bigHit); b.hits.push(bigHit); if (b.pierce > 0) b.pierce--; else { b.dead = true; continue; } }
    if (g.room && g.room.crystal && g.room.crystal.hp > 0 && seg(g.room.crystal.x, g.room.crystal.y) < 26) { crystalHit(b); b.dead = true; continue; }
    for (const j of g.jars) if (j.alive && seg(j.x, j.y) < j.r + b.r) { breakJar(j); b.dead = true; break; }
    if (b.dead) continue;
    const c = Math.floor(b.x / TILE), r = Math.floor(b.y / TILE), t = lvl.at(c, r);
    if (isSolid(t)) {
      if (b.bounce > 0) { b.vy *= -.0; }
      b.dead = true; sparks(b.x, r * TILE, 2, 'rgba(255,255,255,.9)', 130, .18); sfx.paper();
      if (b.kind === 'bomb' || b.kind === 'wine' || b.kind === 'wave') onBulletHit(b, null);
      if (t === BREAK) { const i = r * COLS + c; lvl.hp[i] -= b.dmg * (g.st.breaker ? 3 : 1); game.fx.push({ type: 'hit', x: b.x, y: r * TILE, r: 8, t: 0, life: .07, rot: 0 }); if (lvl.hp[i] <= 0) breakTile(c, r); else sfx.hit(); }
    }
  }
  g.bullets = g.bullets.filter(b => !b.dead);
}
/* 버튼 하나(v30): 바닥에 서서 문·좌판 물건·휴식 물건 앞에 있으면 점프 대신 그것을 쓴다. 버튼에 적을 말을 돌려준다 */
function interactNear() {
  const g = game, p = g.p; if (!p || !p.onGround || g.state !== 'play') return null;
  if (g.room) { const it = roomItemNear(); if (it) return it.cost || it.hpCost ? '사기' : '받기'; }
  if (doorNear()) return g.room ? '나가기' : '들어가기';
  if (g.rest) { const t = restNear(); if (t) return g.rest.kind === 'wheel' ? '돌리기' : '마시기'; }
  return null;
}
function waveClear() {
  const g = game, p = g.p;
  if (has('interest')) { const n = Math.round(p.shards * .25); p.shards += n; popup(p.x, p.y - 30, `이자 +${n}`, '#ffe27a', true); }
  // 휴식 판은 카드 없이 다음 판으로, 보스 판은 챕터 클리어로 판이 끝난다
  if (isMidWave(g.wave) && !g.bossDone) return;
  if (isRestWave(g.wave)) { nextWave(); return; }
  if (isBossWave(g.wave)) { chapterClear(); return; }
  if (g.mode) { sfx.reward(); nextWave(); return; }   // 도전 모드는 카드 없이
  if (isMidWave(g.wave)) { stageGift(true); return; }
  sfx.reward(); stageGift(false);   // v62 카드는 판 끝에서 고른다(다운웰 방식). v40~v61은 싸우는 중간 레벨업이었다
}
function chapterClear() {
  const g = game; g.clear = true; g.wave++; input.clearAll(); sfx.reward();
  finishRun(false);
}
function nextWave() {
  const g = game; g.wave++; beginWave(DESCENT.next); input.blockUntil = performance.now() + 150; g.camLock = false; g.bossCam = undefined; g.timeScale = 1;
}
/* 방 비율(2026-11-06): 좌판이 너무 잦다는 의견으로 42% → 26%. 보물 동굴은 황금 수정 또는 루비 광맥 */
function pickRoom(R) { const r = R(); return r < .26 ? 'shop' : r < .56 ? 'treasure' : r < .80 ? 'altar' : 'spring'; }
