'use strict';
/* v38(2026-11-18) 첫 낙하 튜토리얼 — 새로 시작한 사람이 타이틀 → 인트로 뒤 가장 먼저 하는 판(헤르메스).
   예전(v31) '튜토리얼 ON/OFF' 연습 방과 시작 버튼 위 알약 버튼은 없앴다.
   세로로 내려가며 한 걸음씩 '설명(멈춤 · 딤 · 포커스) → 직접 해 보기(위쪽 할 일 알약)'로 배운다:
     ① 좌우 이동 ② 점프 ③ 틈으로 내려가기 ④ 공중에서 쏴서 블록 부수기 ⑤ 밟기 ⑥ 신성 폭주(연습: 2번 밟으면 켜짐) ⑦ 가시 괴물은 쏴서 ⑧ 포탈
   - 체력은 닳지 않는다(맞는 모습만). 괴물은 제자리에서 기다리고, 죽으면 1.2초 뒤 다시 나온다(할 일을 끝낼 때까지) → 막히지 않는다
   - 포탈에 들어가면 챕터 1이 처음부터 이어진다. 첫 판이 끝나 로비로 돌아오면 로비 안내(ui.js ftueLobby)가 이어진다
   새 계정 여부 = Meta.s.ftue(없으면 예전 계정 · 자동 시험: 아무 안내도 뜨지 않는다). 디버그 창 '튜토리얼 처음부터'로 다시 볼 수 있다 */
const TUT = { respawn: 1.2 };
/* 판 생김새(가로 9칸 중 1~7칸이 길). 줄 번호 = 위에서부터 */
const TUT_MAP = { rows: 46, start: 7, brk: [15, 16], p1: 24, p2: 33, floor: 41 };
function startTutorial(opt = {}) {
  startRun(Object.assign({}, opt, { chapter: 0, noIntro: true }));
  const g = game, p = g.p, M = TUT_MAP, rows = M.rows;
  lvl.rows = rows; g.floorRow = M.floor; lvl.grid = new Uint8Array(rows * COLS); lvl.hp = new Float32Array(rows * COLS);
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) if (r < 1 || r >= M.floor || c === 0 || c === COLS - 1) lvl.set(c, r, HARD);
  const row = (r, c0, c1, t) => { for (let c = c0; c <= c1; c++) { lvl.set(c, r, t); if (t === BREAK) lvl.hp[r * COLS + c] = 1; } };
  row(M.start, 1, 7, HARD);                       // 시작 발판: '내려가기' 설명 뒤에 오른쪽 6~7칸이 열린다(먼저 떨어져 걸음을 건너뛰지 않게)
  row(M.brk[0], 1, 7, BREAK); row(M.brk[1], 1, 7, BREAK);   // 부서지는 블록 두 줄(쏴서 뚫는다)
  row(M.p1, 1, 7, HARD);                          // 밟기 발판: 신성 폭주를 배운 뒤 오른쪽 7칸이 열린다
  row(M.p2, 1, 7, HARD);                          // 가시 괴물 발판: 가시 괴물을 잡으면 왼쪽 1칸이 열린다
  g.levelH = (rows - 1) * TILE; g.enemies = []; g.jars = []; g.shards = []; g.decor = []; g.doors = []; g.ebul = []; g.decals = []; g.bullets = []; g.haz = []; g.later = [];
  g.isBossWave = false; g.rest = null; g.room = null; g.arenaTop = 1; g.tut = true; g.state = 'play'; g.banner = null; g.descT = 0; g.cine = 0; g.hintT = 0;
  g.portal = { x: WORLD_W / 2, y: M.floor * TILE - 34, r: 34 };
  p.x = 2.5 * TILE; p.y = M.start * TILE - p.h / 2 - 1; p.vx = 0; p.vy = 0; p.onGround = true; p.inv = 0; refill(p);
  g.cam = 0; g.fade = 1; g.fadeOut = -1;
  const T = g.tutS = { i: -1, phase: 'idle', moved: 0, lastX: p.x, jumps: 0, wasGround: true, stomps: 0, highs: 0, spots: [], t: 0, opt };
  // 괴물 자리: 밟을 괴물 둘(P1 위), 가시 괴물 하나(P1의 틈 바로 아래 P2 위)
  T.spots.push({ kind: 'mound', x: 3.5 * TILE, y: M.p1 * TILE - ENEMY.mound.r, tag: 'stomp' }, { kind: 'mound', x: 5.5 * TILE, y: M.p1 * TILE - ENEMY.mound.r, tag: 'stomp' },
    { kind: 'urchin', x: 7.5 * TILE, y: M.p2 * TILE - ENEMY.urchin.r, tag: 'spike' });
  for (const s of T.spots) tutSpawn(s);
  if (typeof UI !== 'undefined') UI.enterGame();
  $('pause').style.visibility = 'hidden';   // 튜토리얼에서는 일시정지 버튼을 숨긴다(안내가 멈춤을 대신한다)
}
function tutSpawn(s) {
  const e = mkEnemy(s.kind, s.x, s.y, s.kind === 'urchin' ? { baseX: s.x, baseY: s.y, ph: 0, still: true } : { dir: 1, spd: 0, shootT: 99 });
  e.hp = e.maxHp = s.kind === 'urchin' ? 2 : 1; e.dmg = 1; e.sk = null; e.gem = 0; e.pop = 1; e.tut = true; s.e = e; s.dead = 0;
  game.enemies.push(e);
}
/* 걸음 목록. when = 시작 조건, card = 멈추고 보여 줄 설명(focus = 밝힐 곳), goal = 직접 해 볼 일과 끝 조건 */
const TUT_STEPS = [
  { id: 'move', when: () => true, focus: 'stick', text: '안녕! 나는 전령 <b>헤르메스</b>야.<br>화면 <b>왼쪽을 누른 채 좌우로</b> 밀면 움직여.', goal: '좌우로 움직여 보세요', done: T => T.moved > 90 },
  { id: 'jump', when: () => game.p.onGround, focus: 'btn', text: '오른쪽 <b>버튼</b>을 누르면 뛰어.<br>땅에서는 <b>점프</b>!', goal: '버튼을 눌러 점프', done: T => T.jumps >= 1 },
  { id: 'drop', when: () => game.p.onGround, focus: 'gap', text: '올림포스는 무너졌어. 우리는 <b>아래로</b> 내려가야 해.<br>오른쪽 <b>틈</b>으로 떨어져 보자.', goal: '오른쪽 틈으로 내려가기', open: ['start', 6, 7], done: () => game.p.y > (TUT_MAP.start + 1.2) * TILE },
  { id: 'shoot', when: () => game.p.y > (TUT_MAP.start + 2.5) * TILE, focus: 'btn', text: '<b>공중에서 버튼</b>을 누르면 아래로 공격해!<br>쏘는 동안은 천천히 떨어지고, 탄은 <b>땅에 닿으면</b> 다시 차.', goal: '공중에서 쏴서 블록 부수기', done: () => game.p.y > (TUT_MAP.brk[1] + 1.5) * TILE },
  { id: 'stomp', when: () => game.p.y > (TUT_MAP.brk[1] + 2.2) * TILE, focus: 'stomp', text: '<b>어두운 괴물</b>은 위에서 <b>밟아</b>!<br>버튼을 안 눌러도 통 튀어 올라.', goal: '괴물을 위에서 밟기', done: T => T.stomps >= 1 },
  { id: 'high', when: () => true, focus: 'stomp', text: '연달아 밟으면 <b>콤보</b>가 쌓이고, 다 차면 <b>신성 폭주</b>!<br>지금은 연습이라 <b>2번</b>만 밟아도 켜져.', goal: '한 번 더 밟아 신성 폭주 켜기', done: T => T.highs >= 1 },
  { id: 'highOn', when: () => true, focus: 'hero', text: '<b>신성 폭주</b>! 잠깐 동안 공격이 훨씬 세지고<br>파편도 2배로 얻어.', goal: '오른쪽 틈으로 내려가기', open: ['p1', 7, 7], done: () => game.p.y > (TUT_MAP.p1 + 1.2) * TILE },
  { id: 'spike', when: () => game.p.y > (TUT_MAP.p1 + 1.6) * TILE, focus: 'spike', text: '<b>붉은 가시 괴물</b>은 밟으면 다쳐.<br>위에서 <b>쏴서</b> 잡아!', goal: '가시 괴물을 쏴서 잡기', after: ['p2', 1, 1], done: T => T.spikeKills >= 1 },
  { id: 'down2', when: () => true, goal: '왼쪽 끝 틈으로 내려가기', done: () => game.p.y > (TUT_MAP.p2 + 1.2) * TILE },   // 설명 없이 할 일만
  { id: 'portal', when: () => game.p.y > (TUT_MAP.p2 + 1.5) * TILE, focus: 'portal', text: '저 <b>빛나는 문</b>으로 들어가면 다음 판이야.<br>이제 진짜 올림포스로 가자!', goal: '문으로 들어가기', done: () => false },
];
/* 밝힐 곳(무대 기준 px 사각형) */
function tutRect(kind) {
  const g = game, s = view.s, T = g.tutS, box = (x, y, w, h) => ({ x: wx(x) - w * s / 2, y: wy(y) - h * s / 2, w: w * s, h: h * s });
  if (kind === 'btn') { const b = ui.btn; return { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }; }
  if (kind === 'stick') { const z = ui.zone, w = Math.min(z.x1 - z.x0, view.W * .34), h = w; return { x: Math.max(4, ui.stickHome.x - w / 2), y: ui.stickHome.y - h / 2, w, h }; }
  if (kind === 'gap') return box(7 * TILE, (TUT_MAP.start + .5) * TILE, TILE * 2, TILE * 1.3);
  if (kind === 'hero') return box(g.p.x, g.p.y, 64, 72);
  if (kind === 'portal') return box(g.portal.x, g.portal.y, 84, 84);
  const sp = T.spots.filter(q => q.tag === kind && q.e && q.e.alive);
  if (sp.length) { const x0 = Math.min(...sp.map(q => q.e.x)), x1 = Math.max(...sp.map(q => q.e.x)), e = sp[0].e; return box((x0 + x1) / 2, e.y - 4, x1 - x0 + 56, 56); }
  return null;
}
function tutCard(st) {
  const g = game; g.state = 'guide'; input.clearAll();
  const round = st.focus === 'btn' || st.focus === 'stick' || st.focus === 'portal';
  Guide.card({ rect: () => tutRect(st.focus), round, pad: st.focus === 'btn' ? 2 : 1, text: st.text, hand: st.focus === 'btn' || st.focus === 'stick',
    onDone: () => { g.state = 'play'; input.blockUntil = performance.now() + 120; g.tutS.phase = 'goal'; if (st.goal) Guide.chip(st.goal); if (st.open) tutOpen(st.open); } });
}
/* 막아 둔 바닥을 연다(부서지는 효과) */
function tutOpen([rowKey, c0, c1]) {
  const r = TUT_MAP[rowKey];
  for (let c = c0; c <= c1; c++) { lvl.set(c, r, EMPTY); inkBurst((c + .5) * TILE, (r + .5) * TILE, 12, ['#8a86b8', '#3a3760'], false); }
  game.shake = Math.max(game.shake || 0, 5); sfx.brk();
}
/* 튜토리얼 판의 1프레임. 포탈에 들어가 끝나면 true */
function tutTick(dt) {
  const g = game, p = g.p, T = g.tutS; if (!T) return false;
  T.t += dt;
  // 직접 한 일 세기
  T.moved += Math.abs(p.x - T.lastX); T.lastX = p.x;
  if (T.wasGround && !p.onGround && p.vy < -300) T.jumps++;
  T.wasGround = p.onGround;
  if (p.high && !T.wasHigh) T.highs++;
  T.wasHigh = p.high;
  // 괴물 다시 나오기: 그 괴물로 배울 걸음을 끝내기 전까지만
  const cur = TUT_STEPS[Math.max(0, T.i)], idx = id => TUT_STEPS.findIndex(s => s.id === id);
  for (const s of T.spots) {
    if (s.e && s.e.alive) continue;
    if (s.tag === 'spike') { if (!s.counted) { s.counted = true; T.spikeKills = (T.spikeKills || 0) + 1; } continue; }
    if (T.i > idx('high')) continue;
    s.dead += dt;
    if (s.dead >= TUT.respawn && Math.abs(p.x - s.x) > 26) { tutSpawn(s); inkBurst(s.x, s.y, 10, ENEMY[s.kind].col, false); }
  }
  if (g.enemies.length > 24) g.enemies = g.enemies.filter(e => e.alive);
  // 걸음 진행
  if (T.phase === 'goal' && cur.done(T)) { Guide.chipDone(); T.phase = 'idle'; T.wait = cur.id === 'high' ? .9 : .5; if (cur.after) tutOpen(cur.after); }
  if (T.phase === 'idle') {
    if (T.wait > 0) T.wait -= dt;
    else { const nx = TUT_STEPS[T.i + 1]; if (nx && nx.when(T)) { T.i++; if (nx.text) { T.phase = 'card'; tutCard(nx); } else { T.phase = 'goal'; Guide.chip(nx.goal); } } }
  }
  // 포탈: 들어가면 챕터 1을 처음부터
  const po = g.portal;
  if (po && g.state === 'play' && Math.hypot(p.x - po.x, p.y - po.y) < po.r * .8) { exitTutorial(); return true; }
  return false;
}
function exitTutorial() {
  const g = game, opt = (g.tutS && g.tutS.opt) || {};
  g.tut = false; g.tutS = null; Guide.stop(); sfx.door(); $('pause').style.visibility = '';
  const f = Meta.s.ftue; if (f && f.stage < 1) { f.stage = 1; Meta.save(); }
  if (opt.replay) { UI.backToLobby(); UI.toast('튜토리얼을 마쳤어요'); return; }   // v38.1 설정의 '튜토리얼 다시 하기'는 로비로 돌아간다
  startRun(Object.assign({}, opt, { chapter: 0, noIntro: false }));
}
/* 새 계정 한 번짜리 안내(판 안) */
function ftueHighTip() {
  const g = game; if (g.state !== 'play') return;
  g.state = 'guide'; input.clearAll();
  Guide.card({ rect: () => tutRect('hero'), text: '연습은 여기까지! 이제 <b>신성 폭주</b>는<br><b>땅에 닿지 않고 5번</b> 연달아 밟아야 켜져.', onDone: () => { g.state = 'play'; input.blockUntil = performance.now() + 120; } });
}
function ftueCardTip() {
  const f = Meta.s.ftue; if (!f || (f.tips && f.tips.card)) return;
  (f.tips || (f.tips = {})).card = true; Meta.save();
  const wait = () => { if (game.state !== 'card') return; if (!modal.ready) { setTimeout(wait, 150); return; }
    Guide.card({ sel: '#cards', pad: 2, hand: false, text: '판을 넘을 때마다 <b>능력 카드</b>를 하나 골라.<br>초록 → 파랑 → 보라 → <b>금색</b> 순으로 강해. 초반엔 좋은 카드가 더 잘 나와!' }); };
  setTimeout(wait, 400);
}
