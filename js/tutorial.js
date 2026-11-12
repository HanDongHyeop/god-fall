'use strict';
/* v31(2026-11-12) 튜토리얼(연습 방): 로비 시작 버튼 위 '튜토리얼' 켜기/끄기(기본 꺼짐, 나중에 지울 임시 버튼).
   켜고 시작하면 정식 판보다 먼저 한 화면짜리 연습 방이 나온다.
   - 왼쪽 아래 포탈 → 들어가면 연습을 끝내고 원래 판을 처음부터 시작한다
   - 박쥐는 날아오지 않고 제자리를 지킨다. 밟거나 쏘면 죽고 3초 뒤 같은 자리에 다시 나온다. 재화는 떨어지지 않는다
   - 몸에 닿으면 맞는 모습은 그대로 나오지만 체력은 줄지 않는다
   - 위 제목 '튜토리얼 모드' / '체력이 닳지 않고 재화 습득도 불가', 중간중간 연습용 발판 */
const TUT = { on: false, respawn: 3 };
try { TUT.on = localStorage.getItem('gf_tut') === '1'; } catch (e) {}
function setTut(on) { TUT.on = !!on; try { localStorage.setItem('gf_tut', TUT.on ? '1' : '0'); } catch (e) {} }
/* 발판 [c0, c1, h(바닥 위 칸), 재질], 박쥐 [칸, 바닥 위 높이(칸)]. 점프 1회 ≈ 4칸, 발판 간격 3칸 */
const TUT_PLAT = [[5, 7, 3, 'ONEWAY'], [1, 3, 6, 'ONEWAY'], [4, 6, 9, 'ONEWAY'], [1, 2, 12, 'ONEWAY'], [6, 7, 12, 'HARD']];
const TUT_BATS = [[3.5, 1.6], [6, 4.7], [2, 7.7], [5, 10.7], [6.5, 13.6]];
function startTutorial(opt) {
  startRun(Object.assign({}, opt, { noIntro: true }));
  const g = game, p = g.p;
  const rows = Math.max(Math.ceil(view.worldH / TILE) + 1, 14), F = rows - 4; lvl.rows = rows; g.floorRow = F; lvl.grid = new Uint8Array(rows * COLS); lvl.hp = new Float32Array(rows * COLS);
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) if (r < 1 || r >= F || c === 0 || c === COLS - 1) lvl.set(c, r, HARD);
  const mat = { ONEWAY, HARD };
  for (const [c0, c1, h, m] of TUT_PLAT) { if (F - h < 2) continue; for (let c = c0; c <= c1; c++) lvl.set(c, F - h, mat[m]); }
  g.levelH = (rows - 1) * TILE; g.enemies = []; g.jars = []; g.shards = []; g.decor = []; g.doors = []; g.ebul = []; g.decals = []; g.bullets = []; g.haz = []; g.later = [];
  g.isBossWave = false; g.rest = null; g.arenaTop = 1; g.tut = true; g.state = 'play'; g.banner = null; g.descT = 0; g.cine = 0;   // 챕터 띠는 연습을 마치고 정식 판이 시작될 때 뜬다
  const floorY = F * TILE;
  g.portal = { x: TILE + 30, y: floorY - 34, r: 34, k: 1 };
  g.room = { kind: 'tut', floorY, side: 0, items: [], t: 0, exit: { x: -9999, y: -9999, side: 0, used: true }, crystal: null, title: ['튜토리얼 모드', '체력이 닳지 않고 재화 습득도 불가'], bats: [], opt };
  for (const [c, h] of TUT_BATS) { if (F - h < 2) continue; const s = { x: c * TILE + TILE / 2, y: floorY - h * TILE, dead: 0 }; g.room.bats.push(s); tutBat(s); }
  p.x = WORLD_W - TILE - 40; p.y = floorY - p.h / 2 - 1; p.vx = 0; p.vy = 0; p.onGround = true; p.inv = 0; refill(p);
  g.cam = Math.max(0, g.levelH + TILE - view.worldH);
  g.fade = 1; g.fadeOut = -1;
}
function tutBat(s) {
  const e = mkEnemy('bat', s.x, s.y, { sleep: false, ph: Math.random() * 6 });
  e.anchor = { x: s.x, y: s.y }; e.sk = null; e.gem = 0; e.pop = 1; s.e = e; s.dead = 0;
  game.enemies.push(e);
}
function tutTick(dt) {
  const g = game, r = g.room, p = g.p;
  for (const s of r.bats) {
    if (s.e && s.e.alive) continue;
    s.dead += dt;
    if (s.dead >= TUT.respawn) { tutBat(s); inkBurst(s.x, s.y, 10, ENEMY.bat.col, false); sfx.ping && sfx.ping(); }
  }
  if (g.enemies.length > 30) g.enemies = g.enemies.filter(e => e.alive);
  // 포탈: 닿으면 연습을 끝내고 원래 판을 처음부터
  const po = g.portal;
  if (po && g.state === 'play' && Math.hypot(p.x - po.x, p.y - po.y) < po.r * .8) { exitTutorial(); return true; }
  return false;
}
function exitTutorial() {
  const g = game, opt = g.room.opt || {};
  g.tut = false; g.room = null; sfx.door();
  startRun(Object.assign({}, opt, { noIntro: false }));
}
