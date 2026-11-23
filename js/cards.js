/* 로그라이크 카드: 표와 선택 연출. 연출은 궁수의 전설 2 영상 분석 기준
   어두워짐 → 리본 낙하 → 칸 3개 + 빛기둥 → 아이콘 슬롯 회전 + 색이 등급으로 올라감 → 흰 섬광 → 깃발 카드가 펼쳐짐 → 선택 → 나머지는 떨어지고 고른 카드가 주인공에게 날아감 */
'use strict';
/* noMini = 중간 보스 전투에서 효과가 없어 함정 방 카드에 나오지 않는다(측정: tools/test/qa_v19.py). note = 카드에 빨간 글자로 적는 예외
   2026-11-12 v30 전수 조사 개편(문서 _기획/GOD FALL/12_스킬_전수조사.md): 일반 = 숫자, 희귀 = 새 모양, 영웅 = 강한 동작, 전설 = 판이 바뀌는 상시 효과.
   fam·lv = 같은 효과의 등급 사다리(효과는 skills.js). 높은 등급을 얻으면 낮은 등급은 다시 나오지 않는다.
   뺀 카드: 화산 도약·파편 불꽃·폭약 대리석(뛸 때·파편 먹을 때·블록 깰 때 터지는 연출이 판에 도움이 안 됨), 튼튼한 밑창(차이를 못 느낌),
   바람 깃털(공격 버튼이 없어짐), 올림포스의 축복(숫자만 오르는 전설 → 신의 현현으로). 아폴론 조준은 조준선을 빼고 사거리만
   v32(2026-11-13): 유도탄에 영웅 등급(사냥매의 눈)을 넣어 일반~전설 4단이 됐다(탄창 카드는 v32.1에서 되살림). 전설 '아르테미스의 표식'은 플레이 신 이름이라 '사냥 여신의 표식'으로(qa_v13 규칙)
   v33(2026-11-16, 카드표 문서 의견): 유도·구슬·관통·번개 탄·낙뢰·천둥 폭풍·들이받기가 보스·중간 보스에도 든다. 콤보 잔치 삭제(콤보 = 밟은 횟수로 바뀜).
   암브로시아 = 최대 체력 +20%(지금 체력 그대로), 헤베의 잔 = 최대 체력의 30% 회복(선택지 +1 삭제), 자석 신상 = 범위 2배만. 메아리 탄은 갈래 탄까지 통째로 한 번 더 */
const CARDS = [
  // ── 일반: 숫자가 오르는 기본기 ──
  { id: 'might', name: '힘의 팔찌', tier: '일반', desc: '공격력 +10%.', repeat: true, apply: p => { p.atk = Math.round(p.atk * 1.1); } },
  { id: 'rapid1', name: '날랜 손', tier: '일반', fam: 'rate', lv: 1, desc: '발사 간격 -12%, 탄창 +1.', apply: p => { p.maxAmmo += 1; p.ammo = p.maxAmmo; } },   // 공중 자동 공격에서는 탄이 금방 떨어져 연사만으로는 이득이 작다(측정) → 탄창을 같이 준다
  { id: 'seek1', name: '바람 길잡이', tier: '일반', fam: 'seek', lv: 1, w: 1.2, desc: '탄이 가까운 적 쪽으로 살짝 휘어 갑니다.' },
  { id: 'apollo', name: '헬리오스의 시야', tier: '일반', desc: '탄이 1.6배 멀리 날아가고 30% 커집니다.' },
  { id: 'mag', name: '탄창 확장', tier: '일반', desc: '탄창이 3칸 늘어납니다.', repeat: true, apply: p => { p.maxAmmo += 3; p.ammo = p.maxAmmo; } },
  { id: 'ambrosia', name: '암브로시아', tier: '일반', desc: '최대 체력이 20% 늘어납니다.', repeat: true, apply: p => { p.maxHp = Math.round(p.maxHp * 1.2); } },
  { id: 'hebe', name: '헤베의 잔', tier: '일반', desc: '최대 체력의 30%만큼 체력을 회복합니다.', noMini: true, apply: p => { healBy(p.maxHp * .3); } },
  { id: 'aegis', name: '아이기스 잔광', tier: '일반', desc: '맞은 뒤 무적 시간이 80% 늘어납니다.' },
  { id: 'magnet', name: '자석 신상', tier: '일반', desc: '가까이 있는 하트를 끌어당깁니다.', noMini: true },   // v40 파편이 저절로 날아오게 되어 하트를 끄는 카드로 바꿨다
  { id: 'overload', name: '신성 과부하', tier: '일반', desc: '신성 폭주 시간이 80% 늘어납니다.', noMini: true },
  // v39 기본기 5장(조금씩 세지는 카드를 늘린다: "좋은 것만 나와 너무 금방 세진다"는 의견) + 동료 신수(pets.js) 일반 3장
  { id: 'keen', name: '날 선 촉', tier: '일반', desc: '치명타 확률 +6%.', repeat: true, apply: () => { game.st.crit += .06; } },
  { id: 'hide', name: '두꺼운 가죽', tier: '일반', desc: '받는 피해 -8%.', repeat: true, apply: () => { game.st.dmgCut = Math.min(.6, (game.st.dmgCut || 0) + .08); } },
  { id: 'swift', name: '가벼운 샌들', tier: '일반', desc: '이동 속도 +12%.', apply: () => { game.st.runPct = (game.st.runPct || 0) + .12; } },
  { id: 'purse', name: '파편 주머니', tier: '일반', desc: '얻는 파편 +20%.', noMini: true, apply: p => { p.gemMul = (p.gemMul || 1) * 1.2; } },
  { id: 'snack', name: '넥타르 한 모금', tier: '일반', desc: '웨이브를 시작할 때마다 체력 6% 회복.', repeat: true, noMini: true, apply: () => { game.st.waveHeal = (game.st.waveHeal || 0) + .06; } },
  { id: 'pet_fire', name: '불씨 도롱뇽', tier: '일반', pet: true, desc: '도롱뇽이 따라다니며 가까운 적에게 불씨를 뱉습니다(피해 90%).' },
  { id: 'pet_snake', name: '새끼 히드라', tier: '일반', pet: true, desc: '새끼 히드라가 따라다니며 독을 뱉습니다(피해 60%). 맞은 적은 3초 동안 중독됩니다.' },
  { id: 'pet_bolt', name: '아기 독수리', tier: '일반', pet: true, desc: '아기 독수리가 번개를 모았다가 가까운 적에게 한 번에 내리칩니다(피해 220%).' },
  // v41 구역 전용(zone): 그 구역 챕터에서만 나온다. 구역의 규칙을 없애지는 않고 덜어 준다
  { id: 'z_lung', name: '큰 숨', tier: '일반', zone: 'water', noMini: true, desc: '산소 최대치 +40. 조개를 밟으면 숨이 더 많이 찹니다.', apply: () => { game.o2 = Math.min(o2Max(), (game.o2 || 0) + 40); } },
  { id: 'z_lamp', name: '횃불지기의 등불', tier: '일반', zone: 'dark', noMini: true, desc: '어둠 속 시야가 40% 넓어집니다.' },
  { id: 'z_cloak', name: '깃털 망토', tier: '일반', zone: 'spike', noMini: true, desc: '떨어지는 속도가 15% 느려집니다.' },
  // ── 희귀: 탄·몸에 새 모양이 붙는다 ──
  { id: 'twin', name: '두 갈래 탄', tier: '희귀', fam: 'shot', lv: 1, desc: '탄이 나란히 2발씩 나갑니다. 1발 피해는 62%.' },
  { id: 'seek2', name: '사냥꾼의 눈', tier: '희귀', fam: 'seek', lv: 2, w: 1.2, desc: '탄이 조금 떨어진 적에게도 휘어 갑니다.' },
  { id: 'orbit', name: '수호 구슬', tier: '희귀', fam: 'orb', lv: 1, desc: '구슬 2개가 몸 주위를 돌며 적을 때립니다(공격력 30%).' },
  { id: 'rapid', name: '연사', tier: '희귀', fam: 'rate', lv: 2, desc: '발사 간격 -25%, 탄창 +2.', apply: p => { const add = game.cards.has('rapid1') ? 1 : 2; /* 날랜 손(+1)을 이미 가졌으면 합쳐서 +2 */ p.maxAmmo += add; p.ammo = p.maxAmmo; } },
  { id: 'pierce', name: '관통의 창끝', tier: '희귀', desc: '공격이 적을 2번 뚫고 지나갑니다.' },
  { id: 'bounce', name: '벽 튕김', tier: '희귀', desc: '쏠 때마다 벽에서 3번 튕기는 탄이 1발 더 나갑니다(피해 60%).' },
  { id: 'burn', name: '불꽃 탄', tier: '희귀', desc: '맞은 적이 3초 동안 타며 공격력의 90%를 더 입습니다.', noMini: true, note: '보스와 중간 보스에게는 불이 붙지 않습니다' },
  { id: 'corpse', name: '망자의 폭죽', tier: '희귀', desc: '쓰러뜨린 적이 터져 주변 적에게 공격력 70% 피해를 줍니다.', noMini: true, note: '보스와 중간 보스는 폭발하지 않습니다' },
  { id: 'owl', name: '아테나의 올빼미', tier: '희귀', desc: '올빼미가 따라다니며 내가 쏠 때 적을 쫓는 탄을 같이 쏩니다(피해 40%).' },
  { id: 'titan', name: '타이탄 밟기', tier: '희귀', fam: 'titan', lv: 1, desc: '적을 밟으면 큰 충격파로 주변 적에게 공격력 150% 피해.', noMini: true, note: '밟을 수 없는 몬스터는 데미지를 줄 수 없습니다' },
  { id: 'feast', name: '포식의 제단', tier: '희귀', desc: '적을 8마리 쓰러뜨릴 때마다 체력 8% 회복.', noMini: true },
  { id: 'olive', name: '올리브 관', tier: '희귀', desc: '웨이브마다 피해를 한 번 막아 줍니다.', noMini: true, note: '고른 다음 웨이브부터 적용됩니다' },
  { id: 'interest', name: '이자 신탁', tier: '희귀', desc: '웨이브를 넘길 때 가진 파편의 25%를 더 받습니다.', noMini: true },
  { id: 'member', name: '떠돌이 회원권', tier: '희귀', desc: '웨이브마다 좌판이 나오고 30% 할인됩니다.', noMini: true },
  { id: 'pet_ice', name: '눈송이 정령', tier: '희귀', pet: true, desc: '눈송이 정령이 따라다니며 얼음 조각을 쏩니다(피해 80%). 맞은 적은 잠깐 업니다.', note: '보스와 중간 보스는 얼지 않습니다' },
  { id: 'z_gill', name: '아가미 부적', tier: '희귀', zone: 'water', noMini: true, desc: '산소가 30% 느리게 줄어듭니다.' },
  { id: 'z_pearl', name: '진주 조개잡이', tier: '희귀', zone: 'water', noMini: true, desc: '조개를 밟을 때마다 체력 4% 회복.' },
  { id: 'z_ember', name: '불씨 주머니', tier: '희귀', zone: 'dark', noMini: true, desc: '횃불을 켤 때마다 체력 5% 회복.' },
  { id: 'z_thorn', name: '굳은살', tier: '희귀', zone: 'spike', desc: '다친 뒤 무적 시간이 2배가 됩니다.' },
  { id: 'pet_up', name: '신수 조련', tier: '희귀', need: () => hasPet(), desc: '따라다니는 동료의 피해 +40%.' },
  // ── 영웅: 강한 동작. 꼬리·막기처럼 눈에 띄는 연출이 붙는다 ──
  { id: 'pet_laser', name: '아르고스의 눈', tier: '영웅', pet: true, desc: '떠다니는 눈이 가까운 적 쪽으로 광선을 쏩니다. 지나는 길의 적 모두에게 3번(1번 피해 90%).' },
  { id: 'pet_rage', name: '신수 광폭', tier: '영웅', need: () => hasPet(), desc: '따라다니는 동료의 피해 +50%, 공격 간격 -30%.' },
  { id: 'triple', name: '세 갈래 공격', tier: '영웅', fam: 'shot', lv: 2, desc: '공격이 세 갈래로 퍼집니다. 양옆 탄 피해는 40%.' },
  { id: 'hawk', name: '사냥매의 눈', tier: '영웅', fam: 'seek', lv: 3, w: 1.2, desc: '탄이 먼 적에게도 빠르게 휘어 가며 푸른 꼬리를 남깁니다.' },
  // v31 들이받기 묶음(butt): 아래에서 위로 몸이 닿아도 적을 잡는다(밟기와 같은 피해, 다치지 않음). 전설은 흡혈까지
  { id: 'horn', name: '미노타우로스의 뿔', tier: '영웅', fam: 'butt', lv: 2, desc: '아래에서 들이받아 적을 잡고 부서지는 돌도 부숩니다(밟기와 같은 피해).' },
  { id: 'orbit2', name: '별자리 구슬', tier: '영웅', fam: 'orb', lv: 2, desc: '구슬 3개가 돌며 적을 때리고(40%) 닿은 적의 탄을 지웁니다.' },
  { id: 'chain', name: '번개 탄', tier: '영웅', desc: '맞은 적 근처 2마리에게 번개가 옮겨 갑니다.' },
  { id: 'strike', name: '낙뢰', tier: '영웅', desc: '5번 공격할 때마다 가까운 적에게 벼락(공격력 120%).' },
  { id: 'echo', name: '메아리 탄', tier: '영웅', desc: '3번 공격할 때마다 같은 공격이 한 번 더 나갑니다.' },
  { id: 'heavy', name: '무거운 일격', tier: '영웅', desc: '공격력 +30%, 탄이 1.4배 커집니다. 발사 간격은 20% 길어집니다.' },
  { id: 'ares', name: '아레스의 창끝', tier: '영웅', desc: '치명타 확률 +15%, 치명타 피해 +40%.', apply: () => { game.st.crit += .15; game.st.critDmg += .4; } },
  { id: 'wings', name: '날개 신발', tier: '영웅', desc: '탄을 다 쓰면 공중에서 한 번 더 뛸 수 있습니다.' },
  { id: 'cell', name: '신성 회로', tier: '영웅', desc: '파편을 먹을 때마다 탄이 1 찹니다.', noMini: true },
  { id: 'nike', name: '니케의 월계관', tier: '영웅', desc: '지금 체력 30% 회복. 웨이브를 시작할 때마다 체력 15% 회복.', noMini: true, apply: p => { healBy(p.maxHp * .3); game.st.waveHeal = (game.st.waveHeal || 0) + .15; } },
  // v34 타이탄 밟기 묶음(titan, 카드표 문서 제안): 영웅 = 가시·그림자처럼 못 밟던 적도 밟는다, 전설 = 거기에 흡혈
  { id: 'titan2', name: '히페리온의 발구름', tier: '영웅', fam: 'titan', lv: 2, desc: '가시 달린 적·그림자처럼 못 밟던 적도 밟아서 잡고, 밟으면 큰 충격파(공격력 150%)가 터집니다.', noMini: true },
  { id: 'giant', name: '거인의 피', tier: '영웅', desc: '최대 체력 +40%. 체력이 모두 찹니다.', apply: p => { p.maxHp = Math.round(p.maxHp * 1.4); p.hp = p.maxHp; } },
  // ── 전설: 고른 순간 몸과 화면에서 바로 보이는 상시 효과 ──
  { id: 'fan5', name: '헬리오스의 부채', tier: '전설', fam: 'shot', lv: 3, desc: '탄이 금빛 5갈래 부채꼴로 퍼집니다. 1발 피해는 44%.' },
  { id: 'seek3', name: '사냥 여신의 표식', tier: '전설', fam: 'seek', lv: 4, desc: '탄이 멀리 있는 적도 끝까지 쫓아가 맞히고, 노린 적에 표식이 뜹니다.' },
  { id: 'bull', name: '크레타의 황소', tier: '전설', fam: 'butt', lv: 3, desc: '아래에서 들이받아 적을 치고(밟기 피해 ×1.5) 부서지는 돌도 부숩니다. 준 피해의 20%를 흡혈합니다.' },
  { id: 'orbit3', name: '원소 구슬', tier: '전설', fam: 'orb', lv: 3, desc: '불·얼음·번개·바람 구슬 4개가 돌며 적을 때리고(70%) 적 탄을 지웁니다. 태우기·얼리기·감전·밀치기.', note: '보스에게는 감전만 듭니다' },
  { id: 'storm', name: '천둥 폭풍', tier: '전설', desc: '1.5초마다 화면 안 적에게 벼락(공격력 110%), 옆 2마리로 번집니다.' },
  { id: 'avatar', name: '신의 현현', tier: '전설', desc: '판 내내 신성 폭주 상태가 됩니다(공격력 ×1.6, 탄 1.5배, 파편 2배).' },
  { id: 'hydra', name: '히드라의 독니', tier: '전설', desc: '공격이 맞으면 적을 쫓는 독니 3발로 갈라집니다. 1발 피해는 25%.' },
  { id: 'thanatos', name: '타나토스의 유예', tier: '전설', desc: '판마다 한 번, 죽는 순간 체력을 모두 채워 되살아나며 주변 적을 쓸어 버립니다.' },
  { id: 'atlas', name: '아틀라스의 짐', tier: '전설', desc: '탄창 +4. 공중에서 0.3초마다 탄이 1발씩 저절로 찹니다.', apply: p => { p.maxAmmo += 4; p.ammo = p.maxAmmo; } },
  { id: 'titan3', name: '티폰의 굶주린 발', tier: '전설', fam: 'titan', lv: 3, desc: '못 밟던 적까지 밟아 큰 충격파(공격력 150%)를 내고, 밟기·충격파로 준 피해의 20%만큼 체력을 흡혈합니다.', noMini: true },
  { id: 'kronos', name: '크로노스의 모래시계', tier: '전설', desc: '적과 적의 탄이 40% 느려집니다.' },
];
const CARD_BY = Object.fromEntries(CARDS.map(c => [c.id, c]));
for (const c of CARDS) loadImg('c_' + c.id, `assets/card/${c.id}.webp`);
/* v40 카드 묶음(묶음 창에 쓰는 계열). 한 카드가 두 묶음에 들어가도 된다 */
const CARD_GROUP = {
  pet: { name: '동료', ids: ['owl', 'pet_fire', 'pet_snake', 'pet_bolt', 'pet_ice', 'pet_laser', 'pet_up', 'pet_rage'] },
  shot: { name: '탄', ids: ['twin', 'triple', 'fan5', 'bounce', 'echo', 'pierce', 'apollo', 'heavy', 'hydra', 'burn', 'chain'] },
  bolt: { name: '번개', ids: ['chain', 'strike', 'storm', 'pet_bolt', 'orbit3'] },
  body: { name: '생존', ids: ['ambrosia', 'hebe', 'aegis', 'hide', 'giant', 'nike', 'olive', 'feast', 'snack', 'thanatos', 'magnet'] },
  stomp: { name: '밟기', ids: ['titan', 'titan2', 'titan3', 'horn', 'bull', 'wings', 'overload', 'avatar', 'swift'] },
  ammo: { name: '탄창', ids: ['rapid1', 'rapid', 'mag', 'atlas', 'cell', 'might', 'keen', 'ares'] },
};
const cardPool = () => CARDS.filter(c => (c.repeat || !game.cards.has(c.id)) && !(c.fam && famLv(c.fam) >= c.lv) && !(c.need && !c.need()) && !(c.zone && c.zone !== game.zone));   // v39 need = 조건이 맞을 때만 나온다(동료 강화는 동료가 있을 때)   // 사다리: 같은 묶음의 같거나 낮은 등급은 뺀다
function applyCard(c) {
  const g = game;
  if (!c.repeat) g.cards.add(c.id);
  g.cardList.push(c.id);
  if (c.apply) c.apply(g.p);
}
const TIER_SEQ = ['일반', '희귀', '영웅', '전설'];
/* 등급 사다리: from 등급에서 시작해 확률에 걸릴 때마다 한 칸 오른다 */
/* v31 연속 보정(CARD_PITY): 카드 창에서 영웅 이상이 연속 n회(after) 안 나오면 희귀→영웅 단계가 회마다 +hero 오른다.
   전설은 영웅을 거쳐야 하므로, 전설이 연속 n회 안 나오면 영웅→전설 단계 +legend와 함께 희귀→영웅 단계도 그 절반만큼 올린다. 나오면 0으로 */
function pityUp() {
  const pt = game.pity || (game.pity = { hero: 0, legend: 0 }), P = CARD_PITY;
  const h = pt.hero >= P.after ? (pt.hero - P.after + 1) * P.hero : 0, l = pt.legend >= P.after ? (pt.legend - P.after + 1) * P.legend : 0;
  return [0, h + l * .5, l];
}
function cardUpNow(boost) { const n = Meta.clearedN(), e = CARD_EARLY.find(x => n < x[0]), b = boost ? CARD_UP.boost : CARD_UP.base; return e ? b.map((v, i) => Math.max(v, e[1][i])) : b; }
function rollTier(boost, from = 0, pity) { const up = cardUpNow(boost), cap = game.firstRun ? 2 : 3; let t = from; while (t < cap && Math.random() < up[t] + (pity ? pity[t] : 0)) t++; return t; }   // v39 첫 판은 영웅까지(전설은 첫 카드 창의 확정 1장뿐)
/* pool에서 t등급 카드를 하나 뽑아 뺀다. 그 등급이 비었으면 한 칸씩 내려가며 찾고, 그래도 없으면 위로 찾는다.
   v32: 같은 등급 안에서는 무게(CARD_W, 카드의 w)대로 뽑는다. 유도탄 묶음(seek)은 다른 카드보다 잘 나온다(일반·희귀·영웅 1.2, 전설 1.08) */
const CARD_W = { seek: 1.08 };
const cardW = c => c.w || (c.fam && CARD_W[c.fam]) || 1;   // v33: 바람 길잡이·사냥꾼의 눈·사냥매의 눈은 카드마다 1.2(사용자 의견)
function takeOfTier(pool, t) {
  for (const k of [t, t - 1, t - 2, t - 3, t + 1, t + 2, t + 3]) {
    if (k < 0 || k > 3) continue;
    const ids = pool.map((c, i) => c.tier === TIER_SEQ[k] ? i : -1).filter(i => i >= 0); if (!ids.length) continue;
    let r = Math.random() * ids.reduce((s, i) => s + cardW(pool[i]), 0);
    for (const i of ids) { r -= cardW(pool[i]); if (r < 0) return pool.splice(i, 1)[0]; }
    return pool.splice(ids[ids.length - 1], 1)[0];
  }
  return null;
}
function grantRandomCard() { const pool = game.firstRun ? cardPool().filter(c => c.tier !== '전설') : cardPool(), c = takeOfTier(pool, rollTier(false, 1)); if (c) { applyCard(c); popup(game.p.x, game.p.y - 50, c.name, TIER[c.tier].hi, true); if (c.tier === '전설') legendFx(c); } }
function pickCards(boost, filter) {
  const g = game, n = 3, out = [], pity = pityUp();
  let pool = filter ? cardPool().filter(filter) : cardPool();
  // v39 첫 판: 첫 카드 창에 전설 1장을 확정으로 보여 주고(가운데), 그 뒤로 이 판에서는 전설을 빼고 뽑는다. 사용자: "튜토리얼에서 전설이 너무 많이 나와 보스가 한 방"
  let gift = null;
  // v48: 전설 대신 '고르면 바로 눈에 보이는 영웅 카드'(FIRST_SHOW) 1장을 확정으로 낸다(사용자: 첫 선택의 피드백은 바로 오되 지금처럼 세지는 않게). 이 판에서는 전설이 나오지 않는다
  if (g.firstRun) { if (!g.firstLegend) { const L = pool.filter(c => FIRST_SHOW.includes(c.id)); if (L.length) { gift = L[Math.floor(Math.random() * L.length)]; g.firstLegend = true; pool = pool.filter(c => c !== gift); } } pool = pool.filter(c => c.tier !== '전설'); }
  while (out.length < n - (gift ? 1 : 0) && pool.length) { const c = takeOfTier(pool, rollTier(boost, 0, pity)); if (!c) break; out.push(c); }
  if (gift) out.splice(Math.min(1, out.length), 0, gift);
  // v40 묶음 창: CARD_THEME.chance 확률로 한 계열에서만 3장(연속 두 번은 없다, 첫 판의 전설 확정 창 · 조건이 걸린 창은 빼고)
  g.themeNow = null;
  if (!gift && !filter && !g.themeLast && Math.random() < CARD_THEME.chance) {
    const ok = Object.keys(CARD_GROUP).filter(k => pool.concat(out).filter(c => CARD_GROUP[k].ids.includes(c.id)).length >= n);
    if (ok.length) {
      const k = ok[Math.floor(Math.random() * ok.length)], gp = pool.concat(out).filter(c => CARD_GROUP[k].ids.includes(c.id)), pick = [];
      while (pick.length < n && gp.length) { const c = takeOfTier(gp, rollTier(boost, 0, pity)); if (!c) break; pick.push(c); }
      if (pick.length === n) { out.length = 0; out.push(...pick); g.themeNow = k; }
    }
  }
  g.themeLast = !!g.themeNow;
  const pt = game.pity, rk = out.map(c => TIER_SEQ.indexOf(c.tier));
  pt.hero = rk.some(r => r >= 2) ? 0 : pt.hero + 1; pt.legend = rk.includes(3) ? 0 : pt.legend + 1;
  return out;
}
const modal = { sel: 0, list: [], openedAt: 0, ready: false, timers: [] };
/* v31: 카드 아이콘은 <img> 주소를 바꾸지 않고, 시작 때 불러 둔 그림(IMG.c_…)을 칸의 캔버스에 그린다.
   슬롯이 0.06초마다 돌 때 주소를 바꾸면 휴대폰이 그때마다 그림을 새로 풀어 칸이 비거나 버벅였다 */
function paintTile(cv, id) {
  const im = IMG['c_' + id], x = cv.getContext('2d'); if (!x) return;
  x.clearRect(0, 0, cv.width, cv.height);
  if (!im || !im.complete || !im.naturalWidth) { if (im) im.addEventListener('load', () => { if (cv._id === id) paintTile(cv, id); }, { once: true }); cv._id = id; return; }
  const k = Math.min(cv.width / im.naturalWidth, cv.height / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
  x.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h); cv._id = id;
}
function clearCardTimers() { modal.timers.forEach(t => clearTimeout(t)); modal.timers.forEach(t => clearInterval(t)); modal.timers = []; }
/* opt.after가 있으면 고른 뒤 다음 웨이브로 넘어가지 않고 그 함수를 부른다 */
function openCards(boost, opt) {
  const g = game; g.state = 'card'; g.shake = 0; g.kick = 0; input.clearAll(); sfx.cardOpen(); modal.after = opt && opt.after || null;
  const box = $('cards'), root = $('mCard'); box.innerHTML = ''; clearCardTimers();
  root.className = 'modal on'; box.className = 'pcards';
  modal.list = pickCards(boost, opt && opt.filter);
  $('cardTitle').textContent = opt && opt.title || (boost ? '보스의 전리품' : '신의 선물');
  $('cardSub').textContent = g.themeNow ? `${CARD_GROUP[g.themeNow].name} 능력 중에서 고르세요!` : opt && opt.sub || '새로운 능력을 선택하세요!';   // v40 묶음 창이면 계열 이름을 알린다
 ; modal.sel = 0; modal.openedAt = performance.now(); modal.ready = false;
  if (typeof ftueCardTip === 'function') ftueCardTip();   // v38 새 계정: 첫 카드 창 설명
  /* 등급 승급 연출(궁수의 전설 2): 모두 일반(초록)으로 나와 아이콘이 돈다 → 단계마다 확률에 걸린 카드만 번쩍이며 한 등급 오른다.
     걸리지 않은 카드는 그 등급에서 멈춘다. 높은 등급으로 오를수록 터짐·흔들림·빛이 커진다. 실제 결과는 뽑을 때 이미 정해져 있다 */
  const ranks = modal.list.map(c => TIER_SEQ.indexOf(c.tier)), top = Math.max(0, ...ranks), STEP0 = 760, STEPN = 640;
  modal.list.forEach((c, i) => {
    const Tr = TIER[c.tier], b = document.createElement('button');
    b.className = 'pcard'; b.dataset.card = c.id; b._tier = 0;
    b.style.setProperty('--c', TIER['일반'].col); b.style.setProperty('--d', Tr.dark); b.style.setProperty('--h', Tr.hi); b.style.setProperty('--fin', Tr.col);
    b.innerHTML = `<div class="rays"></div><div class="beam"></div><div class="flag"><div class="wing"></div><div class="tag">${c.tier}</div><div class="nm">${c.name}</div><div class="sp"></div><div class="ds">${c.desc}${c.note ? `<div class="nt">${c.note}</div>` : ''}</div></div><div class="tile"><canvas class="ti" width="160" height="160"></canvas></div><div class="uring"></div><div class="white"></div>`;
    b.onclick = () => chooseCard(i);
    box.appendChild(b);
    // 슬롯 회전: 멈출 때까지 지금 등급의 아이콘이 빠르게 바뀐다
    const cv = b.querySelector('.tile .ti'), spin = () => { const now = CARDS.filter(x => x.tier === TIER_SEQ[b._tier]); paintTile(cv, now[Math.floor(Math.random() * now.length)].id); };
    spin();
    const iv = setInterval(() => {
      if (b._locked) { clearInterval(iv); return; }
      spin();
      const k = Math.floor(performance.now() / 90); if (k !== b._k) { b._k = k; sfx.cardTick(); }
    }, 60);
    modal.timers.push(iv);
  });
  const cards = [...box.children];
  // 단계 s(1..top): s등급까지 오를 카드는 승급, 이미 끝난 카드(s-1등급)는 멈춘다. 마지막에 남은 카드를 멈춘다
  for (let s = 1; s <= top + 1; s++) modal.timers.push(setTimeout(() => {
    let upN = 0;
    cards.forEach((b, i) => { if (b._locked) return; if (ranks[i] >= s) { cardUp(b, s); upN++; } else lockCard(b, i); });
    if (upN) cardStageFx(s);
  }, STEP0 + (s - 1) * STEPN));
  modal.timers.push(setTimeout(() => { modal.ready = true; root.classList.add('ready'); }, STEP0 + top * STEPN + 700));
}
/* 한 등급 승급: 칸이 튀고 흰 섬광, 고리가 퍼지고 불꽃이 튄다. 전설은 뒤에서 금빛 햇살이 돈다 */
function cardUp(b, s) {
  const T_ = TIER[TIER_SEQ[s]]; b._tier = s; b.style.setProperty('--c', T_.col); b.style.setProperty('--uc', T_.hi);
  b.classList.remove('tup'); void b.offsetWidth; b.classList.add('tup', 'u' + s);
  sparkBurst(b.querySelector('.tile'), T_.hi, 10 + s * 7, .9 + s * .35); sfx.cardUp(s);
}
function lockCard(b, i) {
  const c = modal.list[i]; b._locked = true; paintTile(b.querySelector('.tile .ti'), c.id);
  b.style.setProperty('--c', TIER[c.tier].col); b.classList.add('lock'); sfx.cardLock(TIER_SEQ.indexOf(c.tier));
  modal.timers.push(setTimeout(() => { b.classList.add('open'); sfx.cardOpen2(); }, 200));
  modal.timers.push(setTimeout(() => { b.classList.add('done'); }, 640));
}
/* 단계 전체 효과: 화면이 그 등급 색으로 번쩍이고 카드 줄이 흔들린다(영웅부터 크게) */
function cardStageFx(s) {
  const root = $('mCard'); root.style.setProperty('--sc', TIER[TIER_SEQ[s]].col);
  root.classList.remove('stg1', 'stg2', 'stg3'); void root.offsetWidth; root.classList.add('stg' + s);
  if (s >= 2) vibrate(s === 3 ? 90 : 40);
}
function chooseCard(i) {
  if (!modal.ready) { // 연출 중 누르면 바로 끝낸다
    if (performance.now() - modal.openedAt < 250) return;
    clearCardTimers();
    [...$('cards').children].forEach((b, k) => { const c = modal.list[k], r = TIER_SEQ.indexOf(c.tier); b._locked = true; b._tier = r; if (r) b.classList.add('u' + r); b.classList.add('lock', 'open', 'done'); b.style.setProperty('--c', TIER[c.tier].col); paintTile(b.querySelector('.tile .ti'), c.id); });
    modal.ready = true; $('mCard').classList.add('ready'); return;
  }
  if (modal.picked) return; modal.picked = true;
  const c = modal.list[i]; sfx.card();
  [...$('cards').children].forEach((b, k) => b.classList.add(k === i ? 'picked' : 'drop'));
  sparkBurst($('cards').children[i], TIER[c.tier].hi, 16 + TIER_RANK[c.tier] * 4, 1.2 + TIER_RANK[c.tier] * .2);
  $('mCard').classList.add('leaving');
  setTimeout(() => {
    modal.picked = false; clearCardTimers(); $('mCard').className = 'modal';
    if (game.state !== 'card' || !game.p) return;   // v32.1: 고른 뒤 0.62초 사이에 판이 끝났으면(로비로 나감 등) 다음 웨이브를 부르지 않는다
    applyCard(c);
    const after = modal.after; modal.after = null;
    if (after) after(c); else nextWave();
    const p = game.p; popup(p.x, p.y - 44, c.name, TIER[c.tier].hi, true); cardFx(c); if (c.tier === '전설') legendFx(c);
  }, 620);
}
/* 카드를 얻은 순간: 몸에서 빛기둥과 고리. 등급이 높을수록 조금씩 크다(더 높은 등급을 위해 여유를 남긴다) */
const TIER_RANK = { '일반': 0, '희귀': 1, '영웅': 2, '전설': 3 };
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
