/* 로그라이크 카드: 표와 선택 연출. 연출은 궁수의 전설 2 영상 분석 기준
   어두워짐 → 리본 낙하 → 칸 3개 + 빛기둥 → 아이콘 슬롯 회전 + 색이 등급으로 올라감 → 흰 섬광 → 깃발 카드가 펼쳐짐 → 선택 → 나머지는 떨어지고 고른 카드가 주인공에게 날아감 */
'use strict';
/* noMini = 중간 보스 전투에서 효과가 없어 함정 방 카드에 나오지 않는다(측정: tools/test/qa_v19.py). note = 카드에 빨간 글자로 적는 예외 */
const CARDS = [
  { id: 'ambrosia', name: '암브로시아', tier: '일반', desc: '최대 체력의 40% 회복. 넘친 만큼 최대 체력이 오릅니다.', noMini: true, repeat: true, apply: () => healBy(game.p.maxHp * .4, true) },
  { id: 'hebe', name: '헤베의 잔', tier: '일반', desc: '체력 10 회복. 앞으로 카드 선택지가 1장 늘어납니다.', noMini: true, apply: () => { healBy(10); game.choiceBonus = Math.min(1, game.choiceBonus + 1); } },
  { id: 'aegis', name: '아이기스 잔광', tier: '일반', desc: '맞은 뒤 무적 시간이 80% 늘어납니다.' },
  { id: 'apollo', name: '아폴론 조준', tier: '일반', desc: '공격 사거리가 2배가 되고 조준선이 보입니다.' },
  { id: 'magnet', name: '자석 신상', tier: '일반', desc: '파편을 끌어당기는 범위가 3배가 됩니다.', noMini: true },
  { id: 'mag', name: '탄창 확장', tier: '일반', desc: '탄창이 2칸 늘어납니다. 여러 번 얻을 수 있습니다.', repeat: true, apply: p => { p.maxAmmo += 2; p.ammo = p.maxAmmo; } },
  { id: 'sole', name: '튼튼한 밑창', tier: '일반', desc: '적을 밟은 뒤 튀어 오르는 높이가 20% 늘어납니다.', noMini: true, note: '보스와 중간 보스를 밟을 때는 적용되지 않습니다' },
  { id: 'overload', name: '신성 과부하', tier: '일반', desc: '신성 폭주 지속 시간이 50% 늘어납니다.', noMini: true },
  { id: 'blockshot', name: '폭약 대리석', tier: '일반', desc: '블록이 부서질 때 아래로 파편탄이 튑니다.', noMini: true },
  { id: 'feather', name: '바람 깃털', tier: '희귀', desc: '탄이 없을 때 공격을 누르고 있으면 3초간 활공합니다.' },
  { id: 'titan', name: '타이탄 밟기', tier: '희귀', desc: '적을 밟으면 폭발해 주변 적까지 맞힙니다.', noMini: true, note: '밟을 수 없는 몬스터는 데미지를 줄 수 없습니다' },
  { id: 'owl', name: '아테나의 올빼미', tier: '희귀', desc: '올빼미가 따라다니며 내가 쏠 때 같이 쏩니다.' },
  { id: 'popping', name: '파편 불꽃', tier: '희귀', desc: '파편을 먹으면 위로 탄이 튀어 나갑니다.', noMini: true },
  { id: 'volcano', name: '화산 도약', tier: '희귀', desc: '땅 점프가 높아지고 뛸 때 폭발합니다.' },
  { id: 'feast', name: '포식의 제단', tier: '희귀', desc: '적을 10마리 밟을 때마다 체력 10을 회복합니다.', noMini: true, note: '밟아서 쓰러뜨릴 수 없는 몬스터는 세지 않습니다' },
  { id: 'olive', name: '올리브 관', tier: '희귀', desc: '웨이브마다 피해를 한 번 막아 줍니다.', noMini: true, note: '고른 다음 웨이브부터 적용됩니다' },
  { id: 'pierce', name: '관통의 창끝', tier: '희귀', desc: '공격이 적을 1번 뚫고 지나갑니다.', noMini: true, note: '보스와 중간 보스는 뚫고 지나가지 않습니다' },
  { id: 'rapid', name: '연사', tier: '희귀', desc: '발사 간격이 20% 짧아집니다.' },
  { id: 'heavy', name: '무거운 일격', tier: '희귀', desc: '공격력 +60%. 발사 간격은 25% 길어지고 반동은 커집니다.' },
  { id: 'interest', name: '이자 신탁', tier: '희귀', desc: '웨이브를 넘길 때 가진 파편의 10%를 더 받습니다.', noMini: true },
  { id: 'member', name: '떠돌이 회원권', tier: '희귀', desc: '웨이브마다 좌판이 나오고 10% 할인됩니다.', noMini: true },
  { id: 'bounce', name: '벽 튕김', tier: '희귀', desc: '공격할 때 벽에서 튕기는 탄이 한 발 더 나갑니다.' },
  { id: 'burn', name: '불꽃 탄', tier: '희귀', desc: '맞은 적이 타면서 계속 피해를 입습니다.', noMini: true, note: '보스와 중간 보스에게는 불이 붙지 않습니다' },
  { id: 'corpse', name: '망자의 폭죽', tier: '희귀', desc: '쓰러뜨린 적이 잠시 뒤 폭발합니다.', noMini: true, note: '보스와 중간 보스는 폭발하지 않습니다' },
  { id: 'cell', name: '신성 회로', tier: '영웅', desc: '파편을 먹을 때마다 탄이 1 찹니다.', noMini: true },
  { id: 'wings', name: '날개 신발', tier: '영웅', desc: '점프 게이지 회복 속도가 60% 빨라집니다.' },
  { id: 'triple', name: '세 갈래 공격', tier: '영웅', desc: '공격이 세 갈래로 퍼집니다.' },
  { id: 'fest', name: '콤보 잔치', tier: '영웅', desc: '콤보 15부터 공격력 +30%, 25부터 +60%.', noMini: true, note: '보스와 중간 보스를 때려도 콤보는 쌓이지 않습니다' },
  { id: 'chain', name: '번개 탄', tier: '영웅', desc: '맞은 적 근처로 번개가 옮겨 갑니다.', noMini: true, note: '보스와 중간 보스에게는 번개가 옮겨 가지 않습니다' },
  { id: 'orbit', name: '수호 구슬', tier: '영웅', desc: '몸 주위를 도는 구슬이 적을 때립니다.', noMini: true, note: '보스와 중간 보스는 때리지 않습니다' },
  { id: 'strike', name: '낙뢰', tier: '영웅', desc: '6번 공격할 때마다 가까운 적에게 벼락이 떨어집니다.', noMini: true, note: '보스와 중간 보스에게는 떨어지지 않습니다' },
  { id: 'thanatos', name: '타나토스의 유예', tier: '신화', desc: '판마다 한 번, 죽는 순간 체력 30%로 되살아납니다.' },
];
const CARD_BY = Object.fromEntries(CARDS.map(c => [c.id, c]));
for (const c of CARDS) loadImg('c_' + c.id, `assets/card/${c.id}.webp`);
const cardPool = () => CARDS.filter(c => c.repeat || !game.cards.has(c.id));
function applyCard(c) {
  const g = game;
  if (!c.repeat) g.cards.add(c.id);
  g.cardList.push(c.id);
  if (c.apply) c.apply(g.p);
}
function grantRandomCard() { const pool = cardPool().filter(c => c.tier !== '일반'), c = pool[Math.floor(Math.random() * pool.length)]; if (c) { applyCard(c); popup(game.p.x, game.p.y - 50, c.name, TIER[c.tier].hi, true); } }
function pickCards(boost, filter) {
  const n = 3 + game.choiceBonus, pool = filter ? cardPool().filter(filter) : cardPool(), out = [];
  while (out.length < n && pool.length) {
    let tot = 0; const wts = pool.map(c => { const w = TIER[c.tier].weight * (boost && c.tier !== '일반' ? 2.5 : 1); tot += w; return w; });
    let r = Math.random() * tot, i = 0; for (; i < pool.length; i++) { r -= wts[i]; if (r <= 0) break; }
    out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
  }
  return out;
}
const modal = { sel: 0, list: [], openedAt: 0, ready: false, timers: [] };
function clearCardTimers() { modal.timers.forEach(t => clearTimeout(t)); modal.timers.forEach(t => clearInterval(t)); modal.timers = []; }
/* opt.after가 있으면 고른 뒤 다음 웨이브로 넘어가지 않고 그 함수를 부른다 */
function openCards(boost, opt) {
  const g = game; g.state = 'card'; g.shake = 0; g.kick = 0; input.clearAll(); sfx.cardOpen(); modal.after = opt && opt.after || null;
  const box = $('cards'), root = $('mCard'); box.innerHTML = ''; clearCardTimers();
  root.className = 'modal on'; box.className = 'pcards';
  $('cardTitle').textContent = opt && opt.title || (boost ? '보스의 전리품' : '신의 선물');
  $('cardSub').textContent = opt && opt.sub || '새로운 능력을 선택하세요!';
  modal.list = pickCards(boost, opt && opt.filter); modal.sel = 0; modal.openedAt = performance.now(); modal.ready = false;
  const seq = ['일반', '희귀', '영웅', '신화'];
  modal.list.forEach((c, i) => {
    const Tr = TIER[c.tier], b = document.createElement('button');
    b.className = 'pcard'; b.dataset.card = c.id;
    b.style.setProperty('--c', TIER['일반'].col); b.style.setProperty('--d', Tr.dark); b.style.setProperty('--h', Tr.hi); b.style.setProperty('--fin', Tr.col);
    b.innerHTML = `<div class="beam"></div><div class="flag"><div class="wing"></div><div class="tag">${c.tier}</div><div class="nm">${c.name}</div><div class="sp"></div><div class="ds">${c.desc}${c.note ? `<div class="nt">${c.note}</div>` : ''}</div></div><div class="tile"><img src="assets/card/${c.id}.webp" alt=""></div><div class="white"></div>`;
    b.onclick = () => chooseCard(i);
    box.appendChild(b);
    // 슬롯 회전: 아이콘이 빠르게 바뀌고 색이 등급까지 올라간다
    const img = b.querySelector('.tile img'), ids = CARDS.map(x => x.id), stopAt = 620 + i * 170, tierIdx = seq.indexOf(c.tier);
    const t0 = performance.now();
    const iv = setInterval(() => {
      const el = performance.now() - t0, prog = clamp(el / stopAt, 0, 1), now = seq[Math.min(tierIdx, Math.floor(prog * (tierIdx + 1.01)))];
      b.style.setProperty('--c', TIER[now].col);
      if (el >= stopAt) { clearInterval(iv); img.src = `assets/card/${c.id}.webp`; b.classList.add('lock'); sfx.cardLock(tierIdx); return; }
      img.src = `assets/card/${ids[Math.floor(Math.random() * ids.length)]}.webp`; if (Math.floor(el / 90) !== b._k) { b._k = Math.floor(el / 90); sfx.cardTick(); }
    }, 60);
    modal.timers.push(iv);
    modal.timers.push(setTimeout(() => { b.classList.add('open'); sfx.cardOpen2(); }, stopAt + 200));
    modal.timers.push(setTimeout(() => { b.classList.add('done'); }, stopAt + 640));
  });
  modal.timers.push(setTimeout(() => { modal.ready = true; root.classList.add('ready'); }, 620 + 170 * 2 + 700));
}
function chooseCard(i) {
  if (!modal.ready) { // 연출 중 누르면 바로 끝낸다
    if (performance.now() - modal.openedAt < 250) return;
    clearCardTimers();
    [...$('cards').children].forEach((b, k) => { const c = modal.list[k]; b.classList.add('lock', 'open', 'done'); b.style.setProperty('--c', TIER[c.tier].col); b.querySelector('.tile img').src = `assets/card/${c.id}.webp`; });
    modal.ready = true; $('mCard').classList.add('ready'); return;
  }
  if (modal.picked) return; modal.picked = true;
  const c = modal.list[i]; sfx.card();
  [...$('cards').children].forEach((b, k) => b.classList.add(k === i ? 'picked' : 'drop'));
  sparkBurst($('cards').children[i], TIER[c.tier].hi, 16 + TIER_RANK[c.tier] * 4, 1.2 + TIER_RANK[c.tier] * .2);
  $('mCard').classList.add('leaving');
  setTimeout(() => {
    modal.picked = false; clearCardTimers(); $('mCard').className = 'modal';
    applyCard(c);
    const after = modal.after; modal.after = null;
    if (after) after(c); else nextWave();
    const p = game.p; popup(p.x, p.y - 44, c.name, TIER[c.tier].hi, true); cardFx(c);
  }, 620);
}
/* 카드를 얻은 순간: 몸에서 빛기둥과 고리. 등급이 높을수록 조금씩 크다(더 높은 등급을 위해 여유를 남긴다) */
const TIER_RANK = { '일반': 0, '희귀': 1, '영웅': 2, '신화': 3 };
function cardFx(c) {
  const g = game, p = g.p, r = TIER_RANK[c.tier], col = TIER[c.tier].col, hi = TIER[c.tier].hi;
  g.fx.push({ type: 'pillar', x: p.x, y: p.y, w: 30 + r * 10, col, t: 0, life: .55 + r * .08 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 64 + r * 14, col: hi, t: 0, life: .4 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 104 + r * 18, col, t: 0, life: .55 });
  chunks(p.x, p.y - 10, 12 + r * 5, [col, hi, '#ffffff'], 280 + r * 40, 3.4);
  g.whiteout = Math.max(g.whiteout || 0, .14 + r * .05); g.shake = Math.max(g.shake, 3 + r * 2); sfx.reward();
}
function modalKey(k) {
  const s = game.state;
  if (s === 'card') {
    const n = modal.list.length;
    if (k === 'l') { modal.sel = (modal.sel + n - 1) % n; markCard(); }
    if (k === 'r') { modal.sel = (modal.sel + 1) % n; markCard(); }
    if (k === 'a') chooseCard(Math.max(0, modal.sel));
  }
}
function markCard() { [...$('cards').children].forEach((b, i) => b.classList.toggle('sel', i === modal.sel)); }
function learnedHTML() {
  const ids = game.cardList || [];
  if (!ids.length) return '<p class="muted">아직 얻은 능력이 없습니다</p>';
  const cnt = {}; ids.forEach(i => cnt[i] = (cnt[i] || 0) + 1);
  return `<div class="learned">${Object.keys(cnt).map(i => { const c = CARD_BY[i]; return `<div class="lc" style="--c:${TIER[c.tier].col}"><img src="assets/card/${i}.webp" alt=""><div><b>${c.name}${cnt[i] > 1 ? ' ×' + cnt[i] : ''}</b><span>${c.desc}</span>${c.note ? `<span class="nt">${c.note}</span>` : ''}</div></div>`; }).join('')}</div>`;
}
