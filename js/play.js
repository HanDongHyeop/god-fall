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
const monImg = n => { const id = game.biome && game.biome.id, v = id && id !== 'b1' ? IMG[`m_${id}_${n}`] : null; return v && ok(v) ? v : IMG['m_' + n]; };
const monWhite = n => { const id = game.biome && game.biome.id, v = id && OWN_SHAPE.includes(id) ? IMG[`m_${id}_${n}_w`] : null; return v && ok(v) ? v : IMG['m_' + n + '_w']; };
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
const vibrate = n => { try { if (navigator.vibrate) navigator.vibrate(n); } catch (e) {} };

function runStats() {
  const st = Meta.stats(game.godId);
  game.st = st; game.god_ = st.god;
  return st;
}
function atkNow() {
  const g = game, p = g.p; let a = p.atk;
  if (has('heavy')) a *= 1.6;
  if (has('fest')) a *= p.combo >= 25 ? 1.6 : p.combo >= 15 ? 1.3 : 1;
  if (p.high) a *= 1.6;
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
  g.wave = opt.wave || (1 + g.chapter * STAGES); g.startWave = g.wave; g.clear = false; g.cards = new Set(); g.cardList = []; g.choiceBonus = 0; g.kills = 0; g.maxCombo = 0; g.shardTotal = 0; g.bosses = 0;
  g.seed = window.__seed || ((Date.now() % 100000) | 0);
  g.contN = 0; g.timeScale = 1; g.overT = 0; g.fade = 0; g.room = null; g.saved = null; g.boss = null; g.decals = []; g.ebul = []; g.vign = 0; g.whiteout = 0; g.orbits = 0; g.cine = 0; g.banner = null;
  g.hudHp = p.hp;
  g.minis = null; g.hpFlash = 0;
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
  return e;
}
function pickKind(R, w) {
  const tbl = game.biome.enemies, pool = [];
  for (const k in tbl) {
    if ((k === 'tick' || k === 'leech') && w < 2 && game.chapter === 0) continue;
    if ((k === 'spit' || k === 'shade') && w < 3 && game.chapter === 0) continue;
    if (k === 'tick' || k === 'spit' || k === 'mound') continue;   // 땅 위 괴물은 발판에 따로 놓는다
    for (let i = 0; i < tbl[k]; i++) pool.push(k);
  }
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
  const g = game, w = g.wave, R = g.rand = rng(g.seed + w * 7919), boss = isBossWave(w), rest = isRestWave(w), L = g.lv = dlv(w); g.lvM = Math.min(L, MOVE_L_CAP);
  g.biome = biomeOf(w); loadBiomeArt(g.biome); g.isBossWave = boss; g.boss = null; g.minis = null; g.bossDone = false; g.rest = null; g.deep = chapterOf(w) >= BIOMES.length;
  const restKind = rest ? pickRestKind(R) : null;
  const sh = g.introRows || 0;   // 시작 낙하 수직굴 높이(칸)
  g.enemies = []; g.jars = []; g.shards = []; g.bullets = []; g.fx = []; g.popups = []; g.decor = []; g.doors = []; g.ebul = []; g.decals = []; g.haz = []; g.later = []; g.dark = 0; g.darkT = 0;
  // 맨 아래 바닥은 조작 버튼에 가리지 않게 화면 위쪽으로 올린다(아래 pad칸은 땅)
  // 휴식 판은 짧다(황금 낙하만 길다). 바닥은 휴식 물건이 화면 안에 보이도록 보스방처럼 넓게 비운다
  const pad = 3, arenaRows = boss || rest ? Math.ceil(view.worldH / TILE) - pad : 0, rows = (rest ? (restKind === 'gold' ? 64 : 26) : DIFF.rows(w)) + arenaRows + pad + sh, F = rows - 1 - pad; g.floorRow = F;
  lvl.rows = rows; lvl.grid = new Uint8Array(rows * COLS); lvl.hp = new Float32Array(rows * COLS);
  g.levelH = (rows - 1) * TILE;
  const tileHp = Math.round(20 * DIFF.hp(w));
  for (let r = 0; r < rows; r++) { lvl.set(0, r, HARD); lvl.set(COLS - 1, r, HARD); }
  const lastRow = boss || rest ? F - arenaRows - 2 : F - 8;
  const put = (c, r, t) => { if (c > 0 && c < COLS - 1 && r > 7 + sh && r < lastRow) { lvl.set(c, r, t); if (t === BREAK) lvl.hp[r * COLS + c] = tileHp; } };
  const landings = [];
  let r = 11 + sh;
  // 안착 발판: 맵과 상관없이 같은 자리, 양옆은 내려가는 길
  if (sh) for (let c = 3; c <= 5; c++) lvl.set(c, sh, HARD);
  while (r < lastRow - 2) {
    const roll = R(), side = R() < .5 ? 0 : 1;
    if (roll < .30) { // 벽에서 튀어나온 턱
      const len = 1 + Math.floor(R() * 3), th = R() < .35 ? 2 : 1;
      for (let i = 0; i < len; i++) for (let t = 0; t < th; t++) put(side ? COLS - 2 - i : 1 + i, r + t, HARD);
      const c = side ? COLS - 2 - Math.floor(len / 2) : 1 + Math.floor(len / 2);
      if (len >= 2) landings.push([side ? COLS - 1 - len : 1, side ? COLS - 2 : len, r]);
      if (R() < (restKind === 'gold' ? .85 : rest ? .4 : .16)) g.jars.push({ x: (c + .5) * TILE, y: r * TILE - 14, r: 13, alive: true });
      if (!rest && R() < DIFF.spike(w)) { const k = side ? COLS - 2 : 1; for (let q = 0; q < len && q < 2; q++) { const cc = side ? k - q : k + q; if (lvl.at(cc, r) === HARD) lvl.set(cc, r, SPIKE); } }
    } else if (roll < .58) { // 부서지는 블록 뭉치
      const c0 = 1 + Math.floor(R() * (COLS - 4)), ww = 1 + Math.floor(R() * 3), hh = 1 + Math.floor(R() * 2);
      for (let i = 0; i < ww; i++) for (let t = 0; t < hh; t++) put(c0 + i, r + t, BREAK);
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
  if (!boss && !rest) for (let i = 0; i < nDoors; i++) {
    const rowD = Math.floor(sh + 11 + (lastRow - sh - 11) * (DOOR.from + (DOOR.to - DOOR.from) * (nDoors > 1 ? (i + R() * .7) / nDoors : R()))), side = R() < .5 ? 0 : 1;
    const c1 = side ? COLS - 2 : 1, c2 = side ? COLS - 3 : 2, c3 = side ? COLS - 4 : 3;
    for (let rr = rowD - 3; rr <= rowD; rr++) for (const cc of [c1, c2, c3]) lvl.set(cc, rr, EMPTY);
    lvl.set(c1, rowD, HARD); lvl.set(c2, rowD, HARD);
    // 함정 문: 말풍선은 다른 방으로 보인다
    // 판의 첫 웨이브에는 파편이 아직 없다: 돈이 안 드는 방만, 함정 없이
    const firstWave = w === g.startWave, guaranteed = has('member') && i === 0, pick = pickRoom(R), room = guaranteed ? 'shop' : firstWave && pick === 'shop' ? 'treasure' : pick, trap = !guaranteed && !firstWave && R() < DOOR.mini;
    g.doors.push({ x: side ? WORLD_W - TILE : TILE, y: rowD * TILE - 40, side, kind: trap ? 'mini' : room, fake: trap ? room : null, used: false, row: rowD });
    g.jars = g.jars.filter(j => Math.abs(j.y - rowD * TILE) > 90);
  }
  // 끝까지 내려갈 길 보장
  const seen = new Uint8Array(rows * COLS), q = [[4, 0]]; seen[4] = 1; let reach = 0;
  while (q.length) {
    const [c, rr] = q.pop(); reach = Math.max(reach, rr);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = rr + dr;
      if (nc < 1 || nc >= COLS - 1 || nr < 0 || nr >= rows) continue;
      const t = lvl.at(nc, nr), i = nr * COLS + nc;
      if (seen[i] || t === HARD || t === SPIKE) continue;
      seen[i] = 1; q.push([nc, nr]);
    }
  }
  if (reach < F - 1) for (let rr = reach; rr < F; rr++) lvl.set(4, rr, EMPTY);
  for (let rr = F; rr < rows; rr++) for (let c = 0; c < COLS; c++) lvl.set(c, rr, HARD);
  g.portal = null;
  if (boss) { g.arenaTop = F + 1 - arenaRows; buildArena(F, g.arenaTop); }
  else if (rest) { g.arenaTop = F + 1 - arenaRows; setupRest(restKind, F); }
  else g.portal = { x: WORLD_W / 2, y: F * TILE - 34, r: 34 };
  // 황금 낙하: 발판마다 항아리, 공중에는 파편 덩어리(통과 발판 위)
  if (restKind === 'gold') for (const [c0, c1, rr] of landings) for (let c = c0; c <= c1; c += 2) if (!lvl.at(c, rr - 1)) g.jars.push({ x: (c + .5) * TILE, y: rr * TILE - 14, r: 13, alive: true });
  // 공중 적: 다운웰처럼 촘촘하게
  const spacing = DIFF.spacing(w), endY = rest ? 0 : (boss ? g.arenaTop * TILE - 240 : F * TILE - 180);
  const free = (x, y) => lvl.at(Math.floor(x / TILE), Math.floor(y / TILE)) === EMPTY;
  for (let y = 380 + sh * TILE; y < endY; y += spacing * (.55 + R() * .9)) {
    const roll = R();
    if (roll < .13 && w >= 1) { // 떼 박쥐
      const cx = TILE * 2 + R() * (WORLD_W - TILE * 4), n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const x = clamp(cx + (R() - .5) * 110, TILE + 12, WORLD_W - TILE - 12), yy = y + R() * 70; if (free(x, yy)) g.enemies.push(mkEnemy('bat', x, yy, { sleep: true, ph: R() * 6 })); }
      y += 40; continue;
    }
    if (roll < .13 + Math.min(.12, L * .012)) { // 가시 장벽: 한 줄에 틈 하나
      const gap = 1 + Math.floor(R() * (COLS - 3));
      for (let c = 1; c < COLS - 1; c += 2) { if (c === gap || c === gap + 1) continue; const x = (c + .5) * TILE; if (free(x, y)) g.enemies.push(mkEnemy('urchin', x, y, { baseX: x, baseY: y, ph: R() * 6, still: true })); }
      y += 70; continue;
    }
    const c = 1 + Math.floor(R() * (COLS - 2)), x = (c + .5) * TILE;
    if (!free(x, y) && pickKind(R, w) !== 'shade') continue;
    const kind = pickKind(R, w);
    if (kind === 'leech') { const left = R() < .5; g.enemies.push(mkEnemy('leech', left ? TILE + 11 : WORLD_W - TILE - 11, y, { dir: R() < .5 ? -1 : 1, baseY: y, wall: left ? -1 : 1 })); }
    else if (kind === 'bat') g.enemies.push(mkEnemy('bat', x, y, { sleep: true, ph: R() * 6 }));
    else g.enemies.push(mkEnemy(kind, x, y, { baseX: x, baseY: y, ph: R() * 6 }));
  }
  // 땅 위 적과 장식
  const walkChance = rest ? -1 : Math.min(.82, .5 + L * .035);
  for (const [c0, c1, rr] of landings) {
    const dc = c0 + Math.floor(R() * (c1 - c0 + 1));
    if (R() < .22 && lvl.at(dc, rr) !== EMPTY && lvl.at(dc, rr) !== SPIKE && lvl.at(dc, rr - 1) === EMPTY) g.decor.push({ x: (dc + .5) * TILE, y: rr * TILE, n: R() < .5 ? 'o_decor' : 'o_decor2' });
    if (R() > walkChance) continue;
    const c = c0 + Math.floor(R() * (c1 - c0 + 1));
    if (lvl.at(c, rr) === SPIKE || lvl.at(c, rr - 1) !== EMPTY) continue;
    const tb = g.biome.enemies, rollK = R(), W_ = tb.mound + tb.tick + tb.spit;
    let kind = rollK < tb.mound / W_ ? 'mound' : rollK < (tb.mound + tb.tick) / W_ ? 'tick' : 'spit';
    if (w < 2 && g.chapter === 0) kind = 'mound';
    if (kind === 'spit' && w < 3 && g.chapter === 0) kind = 'mound';
    const rad = ENEMY[kind].r;
    g.enemies.push(mkEnemy(kind, (c + .5) * TILE, rr * TILE - rad, { dir: R() < .5 ? -1 : 1, spd: (32 + g.lvM * 3) * (R() < .3 ? 1.4 : 1), shootT: 1 + R() * 2 }));
  }
  decorateWave(R);   // 챕터별 능력·강화 개체(monskill.js)
  const p = g.p;
  p.x = WORLD_W / 2; p.y = 120; p.vx = 0; p.vy = 0; p.onGround = false; p.ammo = p.maxAmmo; p.gauge = 100; p.jumps = 0; p.olive = has('olive');
  if (g.st.waveHeal) healBy(p.maxHp * g.st.waveHeal);
  g.cam = 0; g.dust = [];
  for (let i = 0; i < 28; i++) g.dust.push({ x: R() * WORLD_W, y: R() * view.worldH, z: .35 + R() * .6, r: .8 + R() * 1.6 });
  const ci = chapterInfo(chapterOf(w)), st = stageOf(w);
  g.banner = { t: 0, life: 1.9, a: `챕터 ${chapterOf(w) + 1} · ${ci.name}`, b: boss ? `${st} / ${STAGES} · 보스` : rest ? `${st} / ${STAGES} · 휴식 · ${REST_TITLE[restKind]}` : `${st} / ${STAGES} 판` };
  sfx.bgmFor && sfx.bgmFor(boss ? 'wave' : 'wave', g.biome.id);
}
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
  if (!p.onGround) { p.combo++; g.maxCombo = Math.max(g.maxCombo, p.combo); p.comboPop = 1; if (st.comboStrike && p.combo % 8 === 0) smite(); }
  spawnShards(e.x, e.y, Math.round(e.gem * (p.high ? 2 : 1) * p.gemMul));
  // 처치: 하얗게 커졌다가 터진다
  g.fx.push({ type: 'corpse', name: E.frames[0], x: e.x, y: e.y, h: E.h, flip: e.face, t: 0, life: .07 });
  inkBurst(e.x, e.y, e.r, E.col, byStomp);
  const comboK = Math.min(p.combo, 30) / 30;
  g.shake = Math.max(g.shake, byStomp ? 9 : 5 + comboK * 3);
  g.hitStop = Math.max(g.hitStop, byStomp ? 6 / 60 : 3 / 60);
  g.whiteout = Math.max(g.whiteout, byStomp ? .11 : .05);
  vibrate(byStomp ? 22 : 10);
  if (byStomp) sfx.stomp(p.combo); else sfx.kill(p.combo);
  if (st.leech) healBy(st.leech);
  if (byStomp && has('feast') && ++p.feastN >= 10) { p.feastN = 0; healBy(10); popup(p.x, p.y - 30, '+10', '#7dffa8'); }
  if (has('corpse')) g.fx.push({ type: 'delay', x: e.x, y: e.y, t: 0, life: .35, boom: 40 });
  monDeath(e);
}
function explode(x, y, r, opt = {}) {
  const g = game;
  g.fx.push({ type: 'burst', x, y, r, t: 0, life: .16, ink: opt.ink || '#ff8a3a' });
  g.fx.push({ type: 'ring', x, y, r: r * 1.4, col: 'rgba(255,240,200,.95)', t: 0, life: .22 });
  chunks(x, y, 10, opt.cols || ['#ffd27a', '#ff8a3a', '#ffffff'], 280);
  g.shake = Math.max(g.shake, Math.min(10, r * .14)); sfx.boom();
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
  if (has('blockshot')) for (const a of [-1, 0, 1]) fireBullet(x, y, a * 420, 800, false, 0, { mul: .5 });
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
  p.hp -= dmg; p.inv = (has('aegis') ? 1.8 : 1) * (1 + st.invPct); p.hurtT = .34; p.spin = 0; p.attackPose = 0; p.throwT = 0; p.hitFlash = .12;
  feathers(p.x, p.y - 20, 3, 120);
  chunks(p.x, p.y - 10, 6, ['#ff6c7b', '#ffffff'], 240, 3.4);
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 64, col: 'rgba(255,90,110,.95)', t: 0, life: .25 });
  g.shake = 14; g.flash = 0; g.vign = 1; g.hitStop = 7 / 60; g.kick = -7; vibrate(45);
  p.vy = Math.min(p.vy, -260); p.vx = (p.x < from ? -1 : 1) * 160;
  popup(p.x, p.y - 30, '-' + dmg, '#ff5068', true); sfx.hurt();
  if (st.thorns) for (const e of g.enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 90) hitEnemy(e, Math.round(p.atk), false, e.x, e.y);
  if (p.hp <= 0) {
    if (p.lastStand) { p.lastStand = false; p.hp = 1; popup(p.x, p.y - 50, '버텼다!', '#ffe27a', true); p.inv = 2; return; }
    if (has('thanatos') && !p.reviveUsed) { p.reviveUsed = true; p.hp = Math.round(p.maxHp * .3); p.inv = 2.4; g.whiteout = .5; popup(p.x, p.y - 50, '타나토스의 유예', '#b7d4ff', true); sfx.reward(); return; }
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
  g.state = 'result';
  const r = { wave: g.wave, startWave: g.startWave, kills: g.kills, bosses: g.bosses, combo: g.maxCombo, chapter: g.chapter, shards: g.shardTotal, gaveUp, clear: !!g.clear };
  const reward = Meta.settle(r);
  UI.showResult(r, reward);
}
function endCombo() {
  const p = game.p, c = p.combo;
  if (c >= 8) {
    let t = `${c} 콤보! 파편 +100`;
    p.shards += 100; game.shardTotal += 100;
    if (c >= 15) { p.maxAmmo++; p.ammo = p.maxAmmo; t += ' · 탄창 +1'; }
    if (c >= 25) { healBy(10); t += ' · 체력 +10'; }
    popup(p.x, p.y - 40, t, '#ffe27a', true); sfx.reward();
    game.fx.push({ type: 'ring', x: p.x, y: p.y, r: 60, col: 'rgba(255,230,130,.95)', t: 0, life: .35 });
  }
  p.combo = 0;
}
function gainShard(s) {
  const p = game.p;
  p.shards += s.v; game.shardTotal += s.v; p.gemChain += s.v; p.gemT = (p.high ? 4 : 2.2) * (1 + game.st.highPct + (has('overload') ? .5 : 0)); sfx.gem(p.gemChain);
  if (!p.high && p.gemChain >= 100) { p.high = true; popup(p.x, p.y - 30, '신성 폭주!', '#ffe27a', true); game.fx.push({ type: 'ring', x: p.x, y: p.y, r: 70, col: 'rgba(255,230,130,.95)', t: 0, life: .4 }); sfx.reward(); }
  if (has('cell') && p.ammo < p.maxAmmo) p.ammo++;
  if (has('popping')) fireBullet(p.x, p.y - 12, 0, -1150, true, 0, { mul: .5 });
}
/* ───── 탄: 신마다 모양과 판정이 다르다 ───── */
const SHOT = {
  letter: { v: 1150, r: 5, range: 300 }, arrow: { v: 1500, r: 4, range: 380 }, wine: { v: 860, r: 7, range: 280 },
  bomb: { v: 620, r: 9, range: 260 }, soul: { v: 620, r: 7, range: 340 }, bolt: { v: 1700, r: 5, range: 300 },
};
function fireBullet(x, y, vx, vy, up = false, ox = 0, o = {}) {
  const g = game, p = g.p, kind = o.kind || g.god_.shot, S = SHOT[kind], { dmg, crit } = rollDamage(o.mul || 1);
  const k = Math.hypot(vx, vy) / 1150;
  g.bullets.push({ x, y, px: x, py: y, vx: vx * S.v / 1150, vy: vy * S.v / 1150, y0: y, range: (has('apollo') ? 2 : 1) * S.range, r: S.r * (p.high ? 1.5 : 1) * (o.big ? 1.6 : 1), dmg, crit, up, ox, t: 0, wob: Math.random() * 6, kind, pierce: (g.st.pierce || 0) + (has('pierce') ? 1 : 0), bounce: o.bounce || 0, hits: [] });
}
function smite(x0) {
  const g = game, top = g.cam, bot = g.cam + view.worldH; let t = null, d = 1e9;
  for (const e of g.enemies) if (e.alive && e.y > top && e.y < bot) { const q = Math.abs(e.x - g.p.x) + Math.abs(e.y - g.p.y); if (q < d) { d = q; t = e; } }
  if (!t) return;
  g.fx.push({ type: 'zap', x: t.x, y: t.y, t: 0, life: .14 }); sfx.zap();
  hitEnemy(t, Math.round(atkNow() * 1.2), false, t.x, t.y);
}
function chainFrom(e, n, dmg) {
  let cur = e; const done = [e];
  for (let i = 0; i < n; i++) {
    let best = null, bd = 150;
    for (const o of game.enemies) if (o.alive && !done.includes(o)) { const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < bd) { bd = d; best = o; } }
    if (!best) break;
    game.fx.push({ type: 'arc', x: cur.x, y: cur.y, x2: best.x, y2: best.y, t: 0, life: .12 }); done.push(best);
    hitEnemy(best, Math.round(dmg * .6), false, best.x, best.y); cur = best;
  }
  if (done.length > 1) sfx.zap();
}
function onBulletHit(b, e) {
  // 신별 맞았을 때
  if (b.kind === 'wine' || b.kind === 'bomb') {
    const r = game.st.splash; explode(b.x, b.y, r, { dmg: Math.round(b.dmg * .55), tiles: !!game.st.breaker, ink: b.kind === 'wine' ? '#8a1f4a' : '#ff8a3a', cols: b.kind === 'wine' ? ['#c23c62', '#6a1838', '#ffd0dc'] : undefined });
  }
  // 폭탄처럼 블록에 맞아 터지면 맞은 적이 없다. 적에게 맞았을 때만 카드 효과를 건다
  if (e && (game.st.chain || has('chain'))) chainFrom(e, (game.st.chain || 0) + (has('chain') ? 1 : 0), b.dmg);
  if (e && has('burn')) e.burn = 2.2;
  // 히드라의 독니: 맞은 자리에서 작은 탄 2발이 양옆 아래로 갈라진다(갈라진 탄은 다시 갈라지지 않는다)
  if (e && has('hydra') && !b.child) for (const s of [-1, 1]) { fireBullet(b.x, b.y + 4, s * 620, 940, false, 0, { mul: .35 }); const nb = game.bullets[game.bullets.length - 1]; nb.child = true; nb.hits.push(e); nb.r *= .8; }
  if (b.kind === 'letter' && Math.random() < .5) paperBits(b.x, b.y, 1);
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
  if (g.state === 'dying') { g.overT -= dt0; if (g.overT <= 0) { if (!UI.offerContinue()) finishRun(false); return; } }
  if (!['play', 'descend', 'intro', 'bossdead', 'dying'].includes(g.state)) return;
  if (g.state === 'play' && g.hintT > 0) g.hintT -= dt0;
  if (g.hitStop > 0) { g.hitStop -= dt0; return; }
  const dt = dt0 * g.timeScale;
  tick(dt);
}
function tick(dt) {
  const g = game, p = g.p, locked = g.state !== 'play';
  const attack = !locked && (input.attackHeld || input.keys.a), jumpHeld = !locked && (input.jumpHeld || input.keys.j);
  if (input.jumpEdge) { if (!locked) p.buffer = BUFFER; input.jumpEdge = false; }
  const attackTap = !locked && input.attackEdge; input.attackEdge = false;
  const st = g.st;
  // 좌우
  const axis = locked ? 0 : input.axis, run = T.run * (1 + st.runPct);
  const target = axis * run, acc = T.accel * dt;
  p.vx += clamp(target - p.vx, -acc, acc);
  if (Math.abs(axis) > .001) p.face = Math.sign(axis);
  // 점프 게이지
  const regen = T.gaugeRegen * (1 + (has('wings') ? .6 : 0) + st.gaugePct);
  if (p.gauge < 100) p.gauge = Math.min(100, p.gauge + regen * dt);
  p.gaugeFlash = Math.max(0, p.gaugeFlash - dt);
  p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (p.buffer > 0) {
    const fromGround = p.coyote > 0 && p.jumps === 0;
    if (p.gauge >= T.gaugeCost && p.jumps < MAX_JUMPS) {
      p.buffer = 0; p.gauge -= T.gaugeCost; p.jumps++; g.stats.jumps++;
      if (fromGround) {
        p.vy = -T.jumpV * (has('volcano') ? 1.2 : 1);
        puff(p.x, p.y + p.h / 2 - 2, 3, 11, 5); gust(p.x, p.y + p.h / 2, 24);
        if (has('volcano')) explode(p.x, p.y + 10, 56);
      } else {
        p.vy = p.vy < 0 ? Math.max(p.vy - T.jumpV * T.airAdd, -T.jumpV * T.airCap) : -T.jumpV * Math.max(T.airAdd, .95);
        gust(p.x, p.y + p.h / 2 + 2, 36); feathers(p.x, p.y - 22, 3, 90); sfx.flap();
        p.spin = 1;
        if (st.jumpWave) explode(p.x, p.y + 16, 46, { tiles: false, dmg: Math.round(p.atk * .6) });
      }
      p.coyote = 0; p.onGround = false; p.squash = -.28; sfx.jump(p.jumps - 1);
    } else if (!p.onGround && p.buffer < BUFFER - dt) { p.gaugeFlash = .25; sfx.fizzle(); p.buffer = 0; }
  }
  // 공격
  p.fireT -= dt; p.attackPose = Math.max(0, p.attackPose - dt); p.throwT = Math.max(0, p.throwT - dt);
  const nearItem = g.room ? roomItemNear() : null;
  if (nearItem && attackTap) { roomBuy(nearItem); }
  const firing = (attack || attackTap) && !nearItem;
  const gliding = attack && has('feather') && p.ammo <= 0 && !p.onGround && p.glide > 0;
  if (gliding) { p.glide -= dt; p.vy = Math.min(p.vy, 70); if (Math.random() < .5) sparks(p.x, p.y + 14, 1, 'rgba(255,255,255,.8)', 40, .25); }
  // 공격은 공중에서만 된다. 땅에서는 버튼이 어두워지고 아무것도 나가지 않는다
  if (firing && !p.onGround && p.fireT <= 0) {
    if (p.ammo > 0) {
      const every = T.fireEvery * g.god_.fire * (1 + st.firePct) * (has('rapid') ? .8 : 1) * (has('heavy') ? 1.25 : 1);
      p.fireT = every;
      const wasLast = p.ammo === 1;
      p.ammo--;
      p.attackPose = Math.max(.12, every); p.throwT = Math.max(.06, every * .5); p.shotN++; p.shots++;
      const by = p.y + p.h / 2 + 3, hand = -p.flip * HAND_X;
      const buff = (st.every8 && p.shots % 8 === 0) || (st.lastShot && wasLast);
      const mul = (g.st.unarmed ? .7 : 1) * (buff ? 2.4 : 1);
      fireBullet(p.x, by, 0, 1150, false, hand, { mul, big: buff });
      if (has('echo') && p.shots % 3 === 0) fireBullet(p.x, by - 18, 0, 1150, false, hand, { mul });
      if (has('triple')) { fireBullet(p.x, by, -330, 1100, false, hand, { mul: mul * .7 }); fireBullet(p.x, by, 330, 1100, false, hand, { mul: mul * .7 }); }
      if (has('bounce')) fireBullet(p.x, by, (p.shotN % 2 ? 1 : -1) * 640, 960, false, hand, { mul: mul * .6, bounce: 3 });
      if (has('owl')) fireBullet(p.x + p.face * -24, by - 26, 0, 1150, false, 0, { mul: .6 });
      if (has('strike') && p.shots % 6 === 0) smite();
      g.fx.push({ type: 'gustHand', x: p.x + hand, y: by - 3, t: 0, life: .09 });
      if (p.shotN % 3 === 0) feathers(p.x + (Math.random() - .5) * 20, p.y - 26, 1, 40);
      sfx.shotOf(g.god_.shot);
      g.kick = Math.min(g.kick + 2.6, 6);
      const rec = g.god_.recoil * (has('heavy') ? .7 : 1);
      p.vy = p.vy > 0 ? p.vy * rec - 30 : Math.max(p.vy - 24, -T.jumpV * T.airCap);
      p.squash = Math.max(p.squash, .12);
    } else if (p.emptyT <= 0) { p.emptyT = .5; p.ammoFlash = .25; sfx.empty(); }
  }
  p.emptyT = Math.max(0, p.emptyT - dt);
  // 아틀라스의 짐: 공중에서 0.6초마다 탄 1발
  if (has('atlas') && !p.onGround && p.ammo < p.maxAmmo) { p.atlasT = (p.atlasT || 0) + dt; if (p.atlasT >= .6) { p.atlasT = 0; p.ammo++; } } else p.atlasT = 0;
  if (p.ammoFlash) p.ammoFlash = Math.max(0, p.ammoFlash - dt);
  // 이동
  p.vy = Math.min(p.vy + T.grav * dt, T.maxFall);
  const wasGround = p.onGround; p.onGround = false;
  moveX(p, p.vx * dt);
  const hit = moveY(p, p.vy * dt);
  if (hit !== null && p.vy >= 0) {
    // 무적 시간에는 가시를 바닥처럼 밟는다. 좁은 틈에서 계속 튕기며 맞는 일을 막는다
    if (hit === SPIKE && p.inv <= 0 && !g.god) { hurt(p.x + (p.x % TILE < TILE / 2 ? 30 : -30), Math.round(25 * DIFF.dmg(g.wave))); p.vy = -400; if (g.state === 'dying') return; }
    else {
      if (!wasGround) { p.squash = .34; p.spin = 0; if (p.vy > 200) { p.landT = .11; puff(p.x, p.y + p.h / 2 - 2, 6, 10, 5); } sfx.land(); }
      p.vy = 0; p.onGround = true;
    }
  }
  if (p.onGround) { refill(p); if (p.combo) endCombo(); }
  p.squash = approachSnap(p.squash, 0, 14, dt);
  p.hurtT = Math.max(0, p.hurtT - dt); p.landT = Math.max(0, p.landT - dt); p.hitFlash = Math.max(0, (p.hitFlash || 0) - dt);
  p.flip = approachSnap(p.flip, p.face > 0 ? 1 : -1, 60, dt);
  p.tilt = approachSnap(p.tilt, (p.vx / T.run) * (p.onGround ? .1 : .14), 16, dt, .002);
  p.breath += dt;
  if (!p.onGround && p.vy > T.maxFall * .72 && Math.floor(g.t * 60) % 3 === 0) g.fx.push({ type: 'streak', x: p.x + (Math.random() < .5 ? -1 : 1) * (31 + Math.random() * 16), y: p.y - 8 + Math.random() * 30, l: 18 + Math.random() * 14, t: 0, life: .1 });
  p.inv = Math.max(0, p.inv - dt);
  if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 3.2);
  if (p.onGround && Math.abs(p.vx) > 30) p.walk += dt * 15;
  if (p.comboPop) p.comboPop = Math.max(0, p.comboPop - dt * 5);
  // 포탈
  const po = g.portal;
  if (po && !g.room && g.state === 'play' && Math.hypot(p.x - po.x, p.y - po.y) < po.r * .8) { waveClear(); return; }
  // 신성 폭주
  if (p.gemT > 0) { p.gemT -= dt; if (p.gemT <= 0) { p.high = false; p.gemChain = 0; } }
  // 샛길
  if (attackTap && !nearItem) { const d = doorNear(); if (d) { if (g.room) exitRoom(); else enterRoom(d); return; } }
  // 휴식 판: 룰렛 돌리기·샘 마시기
  if (g.rest) { if (attackTap && !nearItem) { const t = restNear(); if (t) useRest(t); } restTick(dt); }
  // 크로노스의 모래시계: 적·보스·적 탄만 느려진다
  const edt = has('kronos') ? dt * .75 : dt;
  if (g.room) { roomTick(g.room.kind === 'mini' ? edt : dt); if (!g.room || g.state === 'dying') return; }
  // 보스
  if (g.isBossWave && !g.boss && !g.bossDone && !g.room && g.state === 'play' && p.y > (g.arenaTop + 1) * TILE) startBossIntro();
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
  // 수호 구슬
  if (has('orbit')) {
    const a0 = g.t * 3.6;
    for (let i = 0; i < 3; i++) { const a = a0 + i * 2.094, ox = p.x + Math.cos(a) * 42, oy = p.y - 8 + Math.sin(a) * 42; for (const e of g.enemies) if (e.alive && Math.hypot(e.x - ox, e.y - oy) < e.r + 7 && !(e.orbT > g.t)) { e.orbT = g.t + .4; hitEnemy(e, Math.round(atkNow() * .3), false, ox, oy); } }
  }
  // 파편
  const magnet = has('magnet') ? 150 : 56;
  for (const s of g.shards) {
    s.t += dt;
    const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
    if (d < magnet && s.t > .1) { const pull = 900 * (1 - d / (magnet + 20)) + 160; s.vx += dx / (d || 1) * pull * dt * 8; s.vy += dy / (d || 1) * pull * dt * 8; const mx = 720, sp = Math.hypot(s.vx, s.vy); if (sp > mx) { s.vx *= mx / sp; s.vy *= mx / sp; } }
    else { s.vx *= Math.exp(-3 * dt); s.vy = s.vy * Math.exp(-3 * dt) + 26 * dt; }
    s.x = clamp(s.x + s.vx * dt, TILE + 5, WORLD_W - TILE - 5); s.y += s.vy * dt;
    if (d < 20) { s.dead = true; gainShard(s); }
    if (s.y < g.cam - 200) s.dead = true;
  }
  g.shards = g.shards.filter(s => !s.dead);
  // 카메라
  if (g.bossCam !== undefined && g.isBossWave && g.camLock) g.cam = approachSnap(g.cam, g.bossCam, 7, dt, .05);
  else {
    const camTarget = clamp(p.y - view.worldH * .36, 0, Math.max(0, g.levelH + TILE - view.worldH));
    g.cam = approachSnap(g.cam, camTarget, camTarget > g.cam ? 20 : 7, dt, .05);
  }
  // 보스방: 체력 막대 뒤로 캐릭터가 숨지 않게 막대 아래에서 막는다
  if (g.boss && g.camLock && g.state === 'play') { const minY = g.cam + view.safeT / view.s + 72; if (p.y < minY) { p.y = minY; if (p.vy < 0) p.vy = 0; } }
}
function updateEnemies(dt, jumpHeld) {
  const g = game, p = g.p, top = g.cam - 160, bot = g.cam + view.worldH + 200, spd = DIFF.speed(g.wave);
  for (const e of g.enemies) {
    if (!e.alive || e.y < top || e.y > bot) continue;
    e.flash = Math.max(0, e.flash - dt); e.pop = Math.max(0, e.pop - dt * 9); e.hbT = Math.max(0, e.hbT - dt);
    if (e.burn > 0) { e.burn -= dt; if (Math.floor(e.burn * 3) !== Math.floor((e.burn + dt) * 3)) hitEnemy(e, Math.max(1, Math.round(p.atk * .15)), false, e.x, e.y); if (!e.alive) continue; }
    const tt = g.t + (e.ph || 0), k = e.kind, ox0 = e.x, oy0 = e.y;
    if (k === 'mound' || k === 'tick' || k === 'spit') {
      const c = Math.floor(e.x / TILE), r = Math.floor((e.y + e.r + 2) / TILE);
      if (!lvl.at(c, r)) { e.vy = Math.min(e.vy + T.grav * dt, 400); e.y += e.vy * dt; const rr = Math.floor((e.y + e.r) / TILE); if (lvl.at(Math.floor(e.x / TILE), rr)) { e.y = rr * TILE - e.r; e.vy = 0; } }
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
      e.x = e.baseX; e.y = e.baseY + Math.sin(tt * 4) * 5; e.face = Math.sign(dx) || 1;
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
      if (d < SHADE.sight && !far) { const sp = Math.min(SHADE.maxSpd, (40 + g.lvM * 4) * spd); e.baseX += dx / (d || 1) * sp * dt; e.baseY += dy / (d || 1) * sp * dt; }
      else if (far || d >= SHADE.sight) { const hx = e.homeX - e.baseX, hy = e.homeY - e.baseY, hd = Math.hypot(hx, hy); if (hd > 4) { e.baseX += hx / hd * 70 * dt; e.baseY += hy / hd * 70 * dt; } }
      e.x = e.baseX + Math.sin(tt * 2.4) * 8; e.y = e.baseY; e.face = Math.sign(dx) || 1;
    } else if (k === 'bat') {
      if (e.sleep) {
        if (Math.hypot(p.x - e.x, p.y - e.y) < 190 + g.lvM * 6) { e.sleep = false; const dx = p.x - e.x, dy = p.y + 30 - e.y, d = Math.hypot(dx, dy) || 1, v = (170 + g.lvM * 9) * spd; e.vx = dx / d * v; e.vy = dy / d * v; if (e.sk === 'dash') batDashStart(e); }
      } else if (e.dashT > 0 && batDashTick(e, dt, spd)) { e.x += Math.sin(tt * 40) * .6; } else {
        e.x += e.vx * dt + Math.sin(tt * 12) * 1.2; e.y += e.vy * dt;
        if (e.x < TILE + 8 || e.x > WORLD_W - TILE - 8) e.vx *= -1;
        e.x = clamp(e.x, TILE + 8, WORLD_W - TILE - 8); e.face = Math.sign(e.vx) || 1;
      }
    }
    if (e.sk) { monSkillTick(e, dt); if (g.state === 'dying') return; if (!e.alive) continue; }
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
    if (p.vy > -60 && feet - e.y < e.r * 1.0) {
      if (e.stomp) {
        // 밟기: 약한 적은 한 번에, 체력이 많아진 뒤에는 크게 깎는다
        const sd = Math.max((e.maxHp || e.hp) * .65, atkNow() * 1.6 * (1 + g.st.stompPct));
        p.vy = jumpHeld ? -T.stompHoldV : -T.stompV * (has('sole') ? 1.2 : 1);
        refill(p); p.squash = -.3; p.spin = 1; g.kick = 5; feathers(p.x, p.y + 6, 3, 110); sfx.flap();
        e.hp -= sd; e.flash = .09; e.pop = 1; e.hbT = 1.2;
        if (e.hp <= 0) killEnemy(e, true);
        else { dmgNum(e.x, e.y - e.r, Math.round(sd), true); inkBurst(e.x, e.y, e.r * .7, ENEMY[k].col, false); sfx.stomp(p.combo); g.hitStop = Math.max(g.hitStop, 4 / 60); g.shake = Math.max(g.shake, 7); }
        if (has('titan')) explode(e.x, e.y + 20, 72);
        if (g.st.stompWave) explode(e.x, e.y, 54, { tiles: false, dmg: Math.round(p.atk * .7) });
      } else { if (p.inv <= 0) refill(p); hurt(e.x, e.dmg); p.vy = -340; if (g.state === 'dying') return; }
    } else if (p.inv <= 0) { refill(p); hurt(e.x, e.dmg); if (g.state === 'dying') return; }
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
    if (b.kind === 'soul' && g.st.homing) {
      let t = null, d = 200; for (const e of g.enemies) if (e.alive && !b.hits.includes(e)) { const q = Math.hypot(e.x - b.x, e.y - b.y); if (q < d) { d = q; t = e; } }
      if (t) { const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(t.y - b.y, t.x - b.x), c = Math.atan2(b.vy, b.vx); let dA = a - c; while (dA > 3.14) dA -= 6.28; while (dA < -3.14) dA += 6.28; const na = c + clamp(dA, -9 * dt, 9 * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt; b.ox *= Math.exp(-34 * dt);
    if (b.bounce > 0 && (b.x < TILE + 4 || b.x > WORLD_W - TILE - 4)) { b.vx *= -1; b.bounce--; b.x = clamp(b.x, TILE + 4, WORLD_W - TILE - 4); }
    if (Math.abs(b.y - b.y0) > b.range) { b.dead = true; if (b.kind === 'bomb') onBulletHit(b, null); continue; }
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
    if (g.minis) { if (miniBulletHit(b)) { onBulletHit(b, { x: b.x, y: b.y }); b.dead = true; continue; } }
    else if (g.boss && g.boss.alive && bossHitTest(b)) { hitBoss(b.dmg, b.crit, b.x, b.y); onBulletHit(b, { x: b.x, y: b.y }); b.dead = true; continue; }
    if (g.room && g.room.crystal && g.room.crystal.hp > 0 && seg(g.room.crystal.x, g.room.crystal.y) < 26) { crystalHit(b); b.dead = true; continue; }
    for (const j of g.jars) if (j.alive && seg(j.x, j.y) < j.r + b.r) { breakJar(j); b.dead = true; break; }
    if (b.dead) continue;
    const c = Math.floor(b.x / TILE), r = Math.floor(b.y / TILE), t = lvl.at(c, r);
    if (isSolid(t)) {
      if (b.bounce > 0) { b.vy *= -.0; }
      b.dead = true; sparks(b.x, r * TILE, 2, 'rgba(255,255,255,.9)', 130, .18); sfx.paper();
      if (b.kind === 'bomb' || b.kind === 'wine') onBulletHit(b, null);
      if (t === BREAK) { const i = r * COLS + c; lvl.hp[i] -= b.dmg * (g.st.breaker ? 3 : 1); game.fx.push({ type: 'hit', x: b.x, y: r * TILE, r: 8, t: 0, life: .07, rot: 0 }); if (lvl.hp[i] <= 0) breakTile(c, r); else sfx.hit(); }
    }
  }
  g.bullets = g.bullets.filter(b => !b.dead);
}
function waveClear() {
  const g = game, p = g.p;
  if (has('interest')) { const n = Math.round(p.shards * .1); p.shards += n; popup(p.x, p.y - 30, `이자 +${n}`, '#ffe27a', true); }
  // 휴식 판은 카드 없이 다음 판으로, 보스 판은 챕터 클리어로 판이 끝난다
  if (isRestWave(g.wave)) { nextWave(); return; }
  if (isBossWave(g.wave)) { chapterClear(); return; }
  sfx.reward(); openCards(false);
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
