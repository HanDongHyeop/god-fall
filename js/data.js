/* GOD FALL 데이터: 등급·장비·신·적·맵·카드·상자. 숫자를 고칠 때는 여기만 본다. */
'use strict';

/* ───── 등급(v36, 2026-11-18): 궁수의 전설 2처럼 일반 → 고급 → 희귀 → 에픽 → 전설 → 신화 6단계. 신화는 합성으로만 만든다.
   신 전용 무기만 그 위에 S · SS가 있다(S부터 무기 모양이 바뀌고 SS는 같은 모양에 빛과 능력이 더해진다).
   color = 칸 바탕 위, dark = 칸 바탕 아래, glow = 빛, hi = 테두리 반짝임 */
const GRADES = [
  { name: '일반', color: '#8c93a3', dark: '#454b5c', glow: 'rgba(210,218,235,.85)', hi: '#e3e8f2' },
  { name: '고급', color: '#3fbf5a', dark: '#17602a', glow: 'rgba(90,240,120,.9)', hi: '#b4ffbf' },
  { name: '희귀', color: '#3a86f0', dark: '#173f95', glow: 'rgba(110,170,255,.9)', hi: '#bcd8ff' },
  { name: '에픽', color: '#a64af0', dark: '#4e1a8c', glow: 'rgba(214,120,255,.95)', hi: '#e8c4ff' },
  { name: '전설', color: '#f4a91c', dark: '#8a4c06', glow: 'rgba(255,200,70,.95)', hi: '#fff0b0' },
  { name: '신화', color: '#ec3a48', dark: '#7c0e1c', glow: 'rgba(255,110,110,.95)', hi: '#ffc4c4' },
  { name: 'S', color: '#ffb52e', dark: '#a8261a', glow: 'rgba(255,190,60,1)', hi: '#fff6c8', weapon: true },
  { name: 'SS', color: '#ff7ad9', dark: '#3a1aa0', glow: 'rgba(255,140,240,1)', hi: '#ffffff', weapon: true },
];
const MYTH = 5, GRADE_S = 6, GRADE_SS = 7;
const gradeName = g => g >= GRADE_S ? GRADES[g].name + ' 등급' : GRADES[g].name;

/* ───── 장비 6칸. 왼쪽 3칸은 공격력, 오른쪽 3칸은 체력 ───── */
const SLOTS = [
  { id: 'weapon', name: '신의 무기', side: 'L', stat: 'atk', base: [8, 12, 22, 38, 52, 68, 90, 120], perLv: 2.2 },   // v36 일반~신화 + S · SS
  { id: 'amulet', name: '목걸이', side: 'L', stat: 'atk', base: [3, 4, 8, 14, 19, 25], perLv: .9 },
  { id: 'ring', name: '반지', side: 'L', stat: 'atk', base: [3, 4, 8, 14, 19, 25], perLv: .9 },
  { id: 'helm', name: '투구', side: 'R', stat: 'hp', base: [14, 20, 40, 70, 95, 125], perLv: 4 },
  { id: 'armor', name: '갑옷', side: 'R', stat: 'hp', base: [20, 30, 60, 100, 135, 180], perLv: 5 },
  { id: 'boots', name: '신발', side: 'R', stat: 'hp', base: [14, 20, 40, 70, 95, 125], perLv: 4 },
];
const SLOT_BY = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const LV_MAX = 200;   // 참고 영상의 장비 팝업 '레벨: 8/200'. 등급과 상관없이 같다

/* 장비 도안(v36): 칸마다 3종. 같은 도안이 등급만 바뀐다(궁수의 전설 2와 같은 구조).
   skills: 그 등급이 되면 열리는 능력 [필요 등급, 설명, 효과 키, 값]. 희귀 · 에픽 · 전설 · 신화에서 하나씩 열린다 */
const GEAR = {
  weapon_a: { slot: 'weapon', name: '연사의 신물', icon: null, desc: '가볍고 빠르다. 쉼 없이 쏘아 낙하를 늦춘다.',
    skills: [[2, '공격력 +8%', 'atkPct', .08], [3, '발사 간격 -12%', 'firePct', -.12], [4, '8번째 공격마다 강화탄', 'every8', 1], [5, '탄창 +2', 'ammo', 2]] },
  weapon_b: { slot: 'weapon', name: '강타의 신물', icon: null, desc: '묵직하다. 한 발이 강하고 반동이 크다.',
    skills: [[0, '발사 간격 +15%, 공격력 +15%', 'heavy', 1], [3, '치명타 확률 +12%', 'crit', .12], [4, '공격이 적을 1번 관통', 'pierce', 1], [5, '보스 피해 +20%', 'bossPct', .2]] },
  weapon_c: { slot: 'weapon', name: '천둥의 신물', icon: null, desc: '맞힐 때마다 작은 번개가 튄다. 무리를 상대할 때 좋다.',
    skills: [[2, '공격력 +6%', 'atkPct', .06], [3, '번개가 가까운 적 1마리에게 옮겨 감', 'chain', 1], [4, '치명타 피해 +40%', 'critDmg', .4], [5, '번개 전이 +1', 'chain', 1]] },
  amulet_a: { slot: 'amulet', name: '청동 올빼미 부적', icon: 'amulet_a', desc: '아테나의 올빼미가 새겨진 낡은 부적.',
    skills: [[2, '파편 획득 +10%', 'shardPct', .1], [3, '공격력 +6%', 'atkPct', .06], [4, '보스 피해 +20%', 'bossPct', .2], [5, '공격력 +10%', 'atkPct', .1]] },
  amulet_b: { slot: 'amulet', name: '월계수 사파이어', icon: 'amulet_b', desc: '바다의 빛을 머금은 신의 목걸이.',
    skills: [[2, '치명타 확률 +5%', 'crit', .05], [3, '치명타 피해 +30%', 'critDmg', .3], [4, '신성 폭주 지속 +50%', 'highPct', .5], [5, '치명타 확률 +8%', 'crit', .08]] },
  amulet_c: { slot: 'amulet', name: '메두사 카메오', icon: 'amulet_c', desc: '눈을 마주치면 굳어 버린다는 목걸이.',
    skills: [[2, '보스 피해 +10%', 'bossPct', .1], [3, '치명타 확률 +5%', 'crit', .05], [4, '적을 처치하면 체력 1 회복', 'leech', 1], [5, '공격력 +12%', 'atkPct', .12]] },
  ring_a: { slot: 'ring', name: '올리브 인장', icon: 'ring_a', desc: '평화 협정을 찍던 은 반지.',
    skills: [[2, '밟기 반동 +15%', 'stompBounce', .15], [3, '공격력 +6%', 'atkPct', .06], [4, '밟을 때 주변에 충격파', 'stompWave', 1], [5, '밟기 반동 +20%', 'stompBounce', .2]] },
  ring_b: { slot: 'ring', name: '헤스티아의 불씨', icon: 'ring_b', desc: '꺼지지 않는 화덕 불을 담은 반지.',
    skills: [[2, '탄창 +1', 'ammo', 1], [3, '탄창 +1', 'ammo', 1], [4, '탄이 비면 다음 공격 강화', 'lastShot', 1], [5, '탄창 +2', 'ammo', 2]] },
  ring_c: { slot: 'ring', name: '아레스의 핏빛 반지', icon: 'ring_c', desc: '전쟁의 신이 끼던 무거운 반지.',
    skills: [[2, '공격력 +5%', 'atkPct', .05], [3, '치명타 피해 +25%', 'critDmg', .25], [4, '보스 피해 +15%', 'bossPct', .15], [5, '적을 처치하면 체력 1 회복', 'leech', 1]] },
  helm_a: { slot: 'helm', name: '찌그러진 청동 투구', icon: 'helm_a', desc: '여러 번 맞았지만 아직 쓸 만하다.',
    skills: [[2, '최대 체력 +6%', 'hpPct', .06], [3, '맞은 뒤 무적 +20%', 'invPct', .2], [4, '웨이브 시작 시 체력 10% 회복', 'waveHeal', .1], [5, '최대 체력 +12%', 'hpPct', .12]] },
  helm_b: { slot: 'helm', name: '올림포스 깃털 투구', icon: 'helm_b', desc: '근위대장이 버리고 간 투구.',
    skills: [[2, '최대 체력 +6%', 'hpPct', .06], [3, '받는 피해 -8%', 'dmgCut', .08], [4, '치명적 피해를 1회 버팀', 'lastStand', 1], [5, '받는 피해 -10%', 'dmgCut', .1]] },
  helm_c: { slot: 'helm', name: '하데스의 투명 투구', icon: 'helm_c', desc: '쓰면 그림자처럼 흐려진다.',
    skills: [[2, '회피 +5%', 'dodge', .05], [3, '맞은 뒤 무적 +25%', 'invPct', .25], [4, '회피 +8%', 'dodge', .08], [5, '치명적 피해를 1회 버팀', 'lastStand', 1]] },
  armor_a: { slot: 'armor', name: '청동 흉갑', icon: 'armor_a', desc: '무겁지만 믿음직하다.',
    skills: [[2, '받는 피해 -5%', 'dmgCut', .05], [3, '최대 체력 +8%', 'hpPct', .08], [4, '맞으면 주변 적에게 반격', 'thorns', 1], [5, '최대 체력 +12%', 'hpPct', .12]] },
  armor_b: { slot: 'armor', name: '신성 대리석 갑옷', icon: 'armor_b', desc: '신전 기둥을 깎아 만들었다.',
    skills: [[2, '최대 체력 +8%', 'hpPct', .08], [3, '회복 효과 +30%', 'healPct', .3], [4, '받는 피해 -12%', 'dmgCut', .12], [5, '웨이브 시작 시 체력 10% 회복', 'waveHeal', .1]] },
  armor_c: { slot: 'armor', name: '네메아 사자 가죽', icon: 'armor_c', desc: '화살도 칼도 뚫지 못한 사자의 가죽.',
    skills: [[2, '받는 피해 -6%', 'dmgCut', .06], [3, '최대 체력 +10%', 'hpPct', .1], [4, '맞으면 주변 적에게 반격', 'thorns', 1], [5, '받는 피해 -12%', 'dmgCut', .12]] },
  boots_a: { slot: 'boots', name: '낡은 가죽 샌들', icon: 'boots_a', desc: '끈이 몇 번 끊어졌던 샌들.',
    skills: [[2, '이동 속도 +5%', 'runPct', .05], [3, '최대 체력 +6%', 'hpPct', .06], [4, '점프 높이 +8%', 'jumpPct', .08], [5, '이동 속도 +10%', 'runPct', .1]] },
  boots_b: { slot: 'boots', name: '황금 날개 샌들', icon: 'boots_b', desc: '헤르메스의 여벌 신발이다. 말없이 빌렸다.',
    skills: [[2, '점프 높이 +5%', 'jumpPct', .05], [3, '이동 속도 +8%', 'runPct', .08], [4, '점프할 때 충격파', 'jumpWave', 1], [5, '점프 높이 +10%', 'jumpPct', .1]] },
  boots_c: { slot: 'boots', name: '탈로스의 청동 장화', icon: 'boots_c', desc: '청동 거인의 발을 본떠 만들었다.',
    skills: [[2, '밟기 반동 +10%', 'stompBounce', .1], [3, '최대 체력 +8%', 'hpPct', .08], [4, '밟을 때 주변에 충격파', 'stompWave', 1], [5, '이동 속도 +10%', 'runPct', .1]] },
};
const GEAR_BY_SLOT = {}; for (const k in GEAR) (GEAR_BY_SLOT[GEAR[k].slot] = GEAR_BY_SLOT[GEAR[k].slot] || []).push(k);

/* ───── 신 6종. fire=발사 간격 배율, dmg=피해 배율, recoil=반동(작을수록 잘 뜸), shot=탄 종류 ───── */
const GODS = [
  { id: 'hermes', name: '헤르메스', rank: '희귀', rankCol: '#3478e6', title: '늦은 전령', shot: 'letter', fire: 1, dmg: 1, recoil: .2, ammo: 8, weapon: '날개 편지',
    passive: '파편 획득 +15%. 공중에서 더 빠르게 움직인다.', p: { shardPct: .15, runPct: .08 } },
  { id: 'artemis', name: '아르테미스', rank: '영웅', rankCol: '#a040e6', title: '달의 사냥꾼', shot: 'arrow', fire: 1.25, dmg: 1.45, recoil: .26, ammo: 8, weapon: '초승달 활',
    passive: '화살이 적을 1번 관통한다. 치명타 확률 +15%.', p: { pierce: 1, crit: .15 } },
  { id: 'dionysus', name: '디오니소스', rank: '희귀', rankCol: '#3478e6', title: '끝나도 즐거운 신', shot: 'wine', fire: 1.5, dmg: 1.05, recoil: .34, ammo: 7, weapon: '포도주 항아리',
    passive: '술이 터져 주변까지 맞힌다. 20% 확률로 피해를 흘려 넘긴다.', p: { splash: 34, dodge: .2 } },
  { id: 'hephaestus', name: '헤파이스토스', rank: '희귀', rankCol: '#3478e6', title: '아무도 안 믿는 대장장이', shot: 'bomb', fire: 2.4, dmg: 2.05, recoil: .08, ammo: 5, weapon: '대장간 망치',
    passive: '불씨 폭탄이 넓게 터지고 블록을 부순다. 반동이 가장 강하다.', p: { splash: 52, breaker: 1 } },
  { id: 'hades', name: '하데스', rank: '전설', rankCol: '#e0a020', title: '지친 명계 관리자', shot: 'soul', fire: 1.3, dmg: 1.38, recoil: .24, ammo: 8, weapon: '영혼 등불',
    passive: '영혼불이 적을 따라간다. 처치할 때마다 체력 1 회복.', p: { homing: 1, leech: 1 } },
  { id: 'zeus', name: '제우스', rank: '전설', rankCol: '#e0a020', title: '스스로 위엄 있는 왕', shot: 'bolt', fire: 1.35, dmg: 1.5, recoil: .24, ammo: 8, weapon: '번개',
    passive: '번개가 가까운 적 2마리에게 옮겨 간다. 콤보 5마다 낙뢰.', p: { chain: 2, comboStrike: 1 } },
  // v36(2026-11-18) 새 신 6종. hand = 탄이 나가는 손(아테나는 방패를 반대 팔에 든다)
  { id: 'heracles', name: '헤라클레스', rank: '희귀', rankCol: '#3478e6', title: '자랑이 끝없는 영웅', shot: 'lion', fire: 2.0, dmg: 1.48, recoil: .1, ammo: 6, weapon: '올리브 몽둥이',
    passive: '사자 충격파가 적 2마리까지 꿰뚫는다. 밟기 반동 +15%.', p: { pierce: 2, stompBounce: .15 } },
  { id: 'apollo', name: '아폴론', rank: '영웅', rankCol: '#a040e6', title: '박수가 필요한 태양', shot: 'note', fire: 1, dmg: 1.2, recoil: .22, ammo: 8, weapon: '황금 리라',
    passive: '다섯 번째 음은 태양 음표(크고 피해 2.5배). 치명타 피해 +20%.', p: { sun5: 1, critDmg: .2 } },
  { id: 'hera', name: '헤라', rank: '영웅', rankCol: '#a040e6', title: '모든 걸 지켜보는 여왕', shot: 'feather', fire: 1.15, dmg: .78, recoil: .26, ammo: 8, weapon: '공작 깃털 부채',
    passive: '깃털 2개가 갈라져 날아간다. 맞은 적에게 공작의 눈 표식(3초간 받는 피해 +25%).', p: { mark: .25 } },
  { id: 'aphrodite', name: '아프로디테', rank: '영웅', rankCol: '#a040e6', title: '거울부터 보는 미의 여신', shot: 'rose', fire: 1.1, dmg: .66, recoil: .3, ammo: 8, weapon: '조개 손거울',
    passive: '장미 꽃잎 3장이 퍼진다. 맞은 적은 2초 매혹(공격을 멈추고, 가시가 있어도 밟힌다). 회피 +10%.', p: { charm: 2, dodge: .1 } },
  { id: 'poseidon', name: '포세이돈', rank: '전설', rankCol: '#e0a020', title: '형에게 지기 싫은 바다의 왕', shot: 'wave', fire: 1.3, dmg: 1.28, recoil: .2, ammo: 8, weapon: '황금 삼지창',
    passive: '물줄기가 적 1마리를 꿰뚫고, 맞은 자리에 물보라(주변 30% 피해). 신성 폭주 지속 +30%.', p: { pierce: 1, wave: 1, highPct: .3 } },
  { id: 'athena', name: '아테나', rank: '영웅', rankCol: '#a040e6', title: '계획에 없는 건 싫은 전략가', shot: 'gaze', fire: 1.35, dmg: 1.25, recoil: .24, ammo: 8, weapon: '아이기스 방패', hand: -1,
    passive: '메두사의 눈빛에 맞은 적은 1초 돌이 된다(멈추고, 닿아도 다치지 않음). 받는 피해 -10%.', p: { petrify: 1, dmgCut: .1 } },
];
const GOD_BY = Object.fromEntries(GODS.map(g => [g.id, g]));
/* 신 성장: 레벨 1~4. 올릴 때마다 공격력·체력이 오르고 고유 능력이 강해진다(GOD_LV = 레벨 2·3·4 효과) */
const GOD_LV_MAX = 4, GOD_UNLOCK = 50;
const GOD_LV_COST = { '희귀': [100, 200, 400], '영웅': [100, 200, 400], '전설': [50, 100, 200] };   // 전설은 조각이 귀해 적게 든다
const GOD_LV_BONUS = .15;   // 레벨 1개당 공격력·체력
const RANK_STAT = { '희귀': 1, '영웅': 1.08, '전설': 1.16 };   // v37 등급 기본 배율(공격력 · 체력): 등급이 높을수록 강하다
const GOD_LV = {
  hermes: [['점프 높이 +6%', { jumpPct: .06 }], ['판 보상 골드 +20%', { goldPct: .2 }], ['탄창 +2', { ammo: 2 }]],
  artemis: [['치명타 피해 +30%', { critDmg: .3 }], ['발사 간격 -12%', { firePct: -.12 }], ['화살 관통 +1', { pierce: 1 }]],
  dionysus: [['회피 확률 +10%', { dodge: .1 }], ['폭발 범위 +16', { splash: 16 }], ['웨이브 시작 시 체력 5% 회복', { waveHeal: .05 }]],
  hephaestus: [['탄창 +1', { ammo: 1 }], ['공격력 +10%', { atkPct: .1 }], ['폭발 범위 +20', { splash: 20 }]],
  hades: [['체력 +10%', { hpPct: .1 }], ['처치 회복 +1', { leech: 1 }], ['판마다 한 번, 쓰러질 때 체력 1로 버틴다', { lastStand: 1 }]],
  zeus: [['보스 피해 +15%', { bossPct: .15 }], ['번개 전이 +1', { chain: 1 }], ['치명타 확률 +10%', { crit: .1 }]],
  heracles: [['체력 +10%', { hpPct: .1 }], ['충격파 관통 +1', { pierce: 1 }], ['밟을 때 주변에 충격파', { stompWave: 1 }]],
  apollo: [['발사 간격 -10%', { firePct: -.1 }], ['치명타 확률 +10%', { crit: .1 }], ['태양 음표 피해 +100%', { sun5: 1 }]],
  hera: [['공격력 +8%', { atkPct: .08 }], ['표식 피해 +15%', { mark: .15 }], ['보스 피해 +20%', { bossPct: .2 }]],
  aphrodite: [['회피 +8%', { dodge: .08 }], ['매혹 시간 +1초', { charm: 1 }], ['웨이브 시작 시 체력 8% 회복', { waveHeal: .08 }]],
  poseidon: [['보스 피해 +15%', { bossPct: .15 }], ['물보라 범위 +40%', { wave: .4 }], ['탄창 +2', { ammo: 2 }]],
  athena: [['체력 +10%', { hpPct: .1 }], ['돌이 되는 시간 +0.5초', { petrify: .5 }], ['돌이 된 적이 받는 피해 +30%', { stoneDmg: .3 }]],
};
/* v36 신 전용 무기 S · SS: 신화 무기를 합성해 S가 되면 무기 모양이 바뀌고(SS도 같은 모양), 등급마다 신 고유 능력이 하나씩 열린다 */
const WEAPON_S = {
  hermes: { name: '황금 봉인 편지', s: ['탄창 +2 · 파편 획득 +20%', { ammo: 2, shardPct: .2 }], ss: ['공격력 +15% · 이동 속도 +10%', { atkPct: .15, runPct: .1 }] },
  artemis: { name: '보름달 활', s: ['화살 관통 +1 · 치명타 확률 +8%', { pierce: 1, crit: .08 }], ss: ['치명타 피해 +50%', { critDmg: .5 }] },
  dionysus: { name: '황금 암포라', s: ['폭발 범위 +16 · 회피 +8%', { splash: 16, dodge: .08 }], ss: ['공격력 +15% · 웨이브 시작 시 체력 8% 회복', { atkPct: .15, waveHeal: .08 }] },
  hephaestus: { name: '용암 심장 망치', s: ['폭발 범위 +20 · 탄창 +1', { splash: 20, ammo: 1 }], ss: ['공격력 +20%', { atkPct: .2 }] },
  hades: { name: '케르베로스 등불', s: ['처치 회복 +1 · 체력 +10%', { leech: 1, hpPct: .1 }], ss: ['판마다 한 번 체력 1로 버팀 · 공격력 +12%', { lastStand: 1, atkPct: .12 }] },
  zeus: { name: '독수리 번개창', s: ['번개 전이 +1 · 보스 피해 +15%', { chain: 1, bossPct: .15 }], ss: ['치명타 확률 +10% · 공격력 +12%', { crit: .1, atkPct: .12 }] },
  poseidon: { name: '파도 왕관 삼지창', s: ['물보라 범위 +30% · 탄창 +1', { wave: .3, ammo: 1 }], ss: ['보스 피해 +20% · 공격력 +12%', { bossPct: .2, atkPct: .12 }] },
  hera: { name: '여왕의 공작 부채', s: ['표식 피해 +15% · 공격력 +6%', { mark: .15, atkPct: .06 }], ss: ['표식 피해 +20% · 보스 피해 +15%', { mark: .2, bossPct: .15 }] },
  heracles: { name: '황금 사자 몽둥이', s: ['충격파 관통 +1 · 밟기 반동 +15%', { pierce: 1, stompBounce: .15 }], ss: ['공격력 +18% · 체력 +10%', { atkPct: .18, hpPct: .1 }] },
  athena: { name: '황금 아이기스', s: ['돌이 되는 시간 +0.5초 · 받는 피해 -6%', { petrify: .5, dmgCut: .06 }], ss: ['돌이 된 적이 받는 피해 +30% · 공격력 +12%', { stoneDmg: .3, atkPct: .12 }] },
  apollo: { name: '태양 리라', s: ['태양 음표 피해 +50% · 치명타 확률 +6%', { sun5: .5, crit: .06 }], ss: ['발사 간격 -10% · 치명타 피해 +40%', { firePct: -.1, critDmg: .4 }] },
  aphrodite: { name: '장미 조개 거울', s: ['매혹 시간 +1초 · 회피 +6%', { charm: 1, dodge: .06 }], ss: ['공격력 +15% · 체력 +10%', { atkPct: .15, hpPct: .1 }] },
};
/* ───── v38(2026-11-18) 캐릭터는 뽑지 않는다(궁수의 전설 2: 캐릭터 뽑기 없음 · 조각 50개로 해금 · 보석 구매 / 이벤트 보상) ─────
   GOD_GET: 얻는 길. start = 처음부터 / chapter = 그 챕터 첫 클리어 보상(무료) / gem = 보석 구매값(가진 조각만큼 깎인다: 조각 1개 = 값의 1/50)
   SHARD_SHOP: 가진 신의 조각을 보석으로 산다(레벨 업용). 신마다 하루 daily번, 한 번에 n개 */
/* 값은 우리 보석 수입 규모에 맞췄다(무과금 하루 약 100~150 → 궁수의 전설 2의 1/3쯤. 궁전2 헬릭스 3,000보석 = 무과금 약 10일치 → 영웅 1,500) */
const GOD_GET = { hermes: { start: 1 }, heracles: { chapter: 2 }, dionysus: { gem: 500 }, hephaestus: { gem: 500 }, artemis: { chapter: 5 },
  apollo: { gem: 1500 }, athena: { gem: 1500 }, hera: { gem: 1500 }, aphrodite: { gem: 1500 }, zeus: { gem: 4500 }, poseidon: { gem: 4500 }, hades: { gem: 4500 } };
const SHARD_SHOP = { n: 10, price: { '희귀': 60, '영웅': 90, '전설': 150 }, daily: 3 };
/* 골드 주머니: 보석 → 골드(보석이 강함으로 바뀌는 가장 빠른 길. 깬 챕터가 많을수록 많이 준다). 하루 daily번 */
const GOLD_SHOP = { gem: 100, gold: n => 1200 + 200 * n, daily: 5 };
/* v38 첫 플레이(새 계정) 흐름: 튜토리얼 뒤 첫 판을 마치면 주는 보상(빠르게 강해지게), 첫 신성 폭주 n번은 combo번만 밟아도 켜진다 */
const FTUE = { reward: { gold: 3000, gem: 300, scroll: 10 }, highEasy: { n: 3, combo: 2 } };
/* 신의 소환(캐릭터 뽑기) — v38부터 상점에서 뺐다. 디버그 · 예전 시험용으로 값만 남긴다 */
const GOD_CHEST = { id: 'god', name: '신의 소환', icon: 'chest_god', cur: 'gem', one: 150, ten: 1350, free: 24 * 3600, pity: 10, tint: '#7a3fb0',
  rate: { '희귀': .55, '영웅': .37, '전설': .08 }, shard: { '희귀': 15, '영웅': 12, '전설': 10 }, desc: '신의 조각을 얻습니다. 해금과 레벨 업에 씁니다' };
/* 신 전용 무기: 무기만 신마다 따로다. 뽑기에서 어느 신의 무기가 나올지는 등급으로 정한다(신 1명당 확률, 합 100%). 임시값 */
const WEAPON_RATE = { '희귀': .125, '영웅': .07, '전설': .05 }, WEAPON_MINE = .5;   // v37 신 12명(희귀 4 · 영웅 5 · 전설 3) → 4×12.5 + 5×7 + 3×5 = 100%
/* 계정 보너스: 출전하지 않은 신도 키울수록 모두가 강해진다. 값은 공격력·체력 %(소수). 임시값 */
const ACCOUNT = { unlock: .01, perLv: .02, weaponGrade: [.005, .01, .02, .04, .06, .08, .11, .15], weaponLv: .0005 };   // v36 등급 8단계(일반~SS)
/* 에너지: 궁수의 전설 2 기준. 회복은 상한에서 멈추지만 구매와 클리어 보상은 상한을 넘어 쌓인다 */
const ENERGY = { max: 30, cost: 5, regenMin: 12, buyGem: 100, buyN: 20, clearBack: 5 };
/* 이어하기: 판당 횟수와 보석 비용. 임시값 */
const CONTINUE_COST = [100, 200], CONTINUE_SEC = 10;

/* ───── 재능(골드로 올리는 영구 능력) ───── */
const TALENTS = [
  { id: 'atk', name: '신의 힘', desc: '공격력 +2', icon: 'cur_power', cost: l => 120 + l * 90, max: 30, effect: l => ({ atk: l * 2 }) },
  { id: 'hp', name: '신의 몸', desc: '체력 +8', icon: 'armor_a', cost: l => 120 + l * 90, max: 30, effect: l => ({ hp: l * 8 }) },
  { id: 'shard', name: '수집가', desc: '파편 획득 +3%', icon: 'cur_shard', cost: l => 200 + l * 140, max: 15, effect: l => ({ shardPct: l * .03 }) },
  { id: 'gold', name: '전리품', desc: '판 보상 골드 +5%', icon: 'cur_gold', cost: l => 200 + l * 140, max: 15, effect: l => ({ goldPct: l * .05 }) },
  { id: 'crit', name: '날카로운 눈', desc: '치명타 확률 +1%', icon: 'ring_b', cost: l => 300 + l * 180, max: 15, effect: l => ({ crit: l * .01 }) },
  { id: 'heal', name: '암브로시아', desc: '웨이브 시작 시 체력 +1% 회복', icon: 'amulet_a', cost: l => 300 + l * 180, max: 10, effect: l => ({ waveHeal: l * .01 }) },
];

/* ───── 상자. rate = { 등급 번호: 확률 } (v36: 0 일반 · 1 고급 · 2 희귀 · 3 에픽). 전설 이상은 합성으로만 ─────
   2026-11-06 상자마다 나오는 것을 나눴다(궁수의 전설 2: 은 상자 = 낮은 등급, 흑요석 = 전 부위 51/37/12, 신화석 = 회차마다 바뀌는 세트).
   slots = 나올 수 있는 부위, scroll = 뽑을 때마다 함께 주는 두루마리 [확률, 최소, 최대], shard = 신 조각 [확률, 개수],
   featured = 회차마다 바뀌는 '이번 신'의 무기·조각 확률이 오른다 */
const CHESTS = [
  { id: 'silver', name: '실버 상자', icon: 'chest_silver', cur: 'gold', one: 800, ten: 7200, rate: { 0: .3, 1: .55, 2: .15 }, slots: ['amulet', 'ring', 'helm', 'armor', 'boots'], scroll: [1, 1, 3], shard: [0, 0], free: 8 * 3600, tint: '#2e5f8e',
    desc: '방어구·장신구와 강화 두루마리. 무기는 나오지 않습니다', note: '일반~희귀 방어구와 장신구가 나오고, 뽑을 때마다 강화 두루마리 1~3장을 함께 줍니다.' },
  { id: 'obsidian', name: '흑요석 상자', icon: 'chest_obsidian', cur: 'gem', one: 150, ten: 1350, rate: { 1: .51, 2: .37, 3: .12 }, slots: ['weapon', 'amulet', 'ring', 'helm', 'armor', 'boots'], scroll: [.3, 1, 2], shard: [.25, 6], free: 24 * 3600, pity: 10, tint: '#4a2670',
    desc: '모든 부위 장비와 신의 조각. 10회 안에 에픽 확정', note: '6부위 장비가 모두 나옵니다. 25% 확률로 신의 조각 6개를 함께 줍니다.' },
  { id: 'prism', name: '환채석 상자', icon: 'chest_prism', cur: 'gem', one: 400, ten: 3600, rate: { 2: .7, 3: .3 }, slots: ['weapon'], scroll: [0, 0, 0], shard: [.4, 10], featured: .5, pity: 5, tint: '#a0621a',
    desc: '신 전용 무기만 나옵니다. 이번 회차 신의 무기 확률 50%', note: '희귀 이상 신 전용 무기만 나옵니다. 절반은 이번 회차 신의 무기이고, 40% 확률로 그 신의 조각 10개를 함께 줍니다. 이번 회차 신은 3일마다 바뀝니다.' },
];
const FEATURE_DAYS = 3;

/* ───── 적. 그림은 assets/mon. 위가 어두운 덩어리는 밟아도 되고, 진홍 가시·보랏빛 그림자는 밟으면 다친다 ───── */
/* 가시를 위로 늘려 그림이 커진 프레임: 위쪽으로 늘린 칸 수. 몸 크기는 그대로 그린다(tools/mon_rules.py가 만든다) */
const MON_EXT = {"b1":{"leech_a":8,"leech_b":8,"shade_a":22,"shade_b":22},"b4":{"shade_a":22,"shade_b":22},"b5":{"shade_a":22,"shade_b":22},"b6":{"shade_a":22,"shade_b":22},"b2":{"leech_a":8,"leech_b":8,"shade_a":22,"shade_b":22},"b3":{"leech_a":8,"leech_b":8,"shade_a":22,"shade_b":22}};
const ENEMY = {
  mound: { hp: 20, r: 13, stomp: true, gem: 6, dmg: 20, h: 30, frames: ['mound_a', 'mound_b'], rate: 5, col: ['#2b1626', '#7a5a70'] },
  tick: { hp: 30, r: 14, stomp: true, shield: true, gem: 10, dmg: 20, h: 32, frames: ['tick_a'], rate: 0, col: ['#c8bfa9', '#2b1626'] },
  eye: { hp: 20, r: 12, stomp: true, gem: 6, dmg: 20, h: 44, frames: ['eye_a', 'eye_b'], rate: 5, col: ['#2b1626', '#e8dfc9'] },
  sac: { hp: 30, r: 15, stomp: true, gem: 8, dmg: 20, h: 44, frames: ['sac_a'], rate: 0, col: ['#2b1626', '#e88a80'] },
  urchin: { hp: 30, r: 14, stomp: false, gem: 10, dmg: 25, h: 44, frames: ['urchin_a'], rate: 0, col: ['#2b1626', '#c23c62'] },
  leech: { hp: 20, r: 12, stomp: false, gem: 8, dmg: 25, h: 32, frames: ['leech_a', 'leech_b'], rate: 3, col: ['#2b1626', '#c23c62'] },
  shade: { hp: 26, r: 13, stomp: false, gem: 10, dmg: 25, h: 46, frames: ['shade_a', 'shade_b'], rate: 4, ghost: true, col: ['#3a2358', '#d27ae0'] },
  spit: { hp: 34, r: 14, stomp: true, gem: 12, dmg: 20, h: 38, frames: ['spit_a', 'spit_b'], rate: 0, col: ['#2b1626', '#e88a80'] },
  bat: { hp: 10, r: 9, stomp: true, gem: 3, dmg: 15, h: 24, frames: ['bat_a', 'bat_b'], rate: 9, col: ['#2b1626', '#7a5a70'] },
};

/* ───── 챕터별 몬스터 능력(2026-11-06) ─────
   궁수의 전설 2처럼 같은 종이라도 챕터가 바뀌면 다른 능력을 쓴다(같은 몬스터가 등급이 오르면 탄 수·방향·분열이 는다).
   챕터 안 웨이브 1→2→3으로 갈수록 능력을 가진 개체가 늘고, 웨이브 2부터 강화 개체(크고 붉은 기운, 체력 2.4배, 능력 강화)가 섞인다.
   능력 이름 → monskill.js. shot 조준 1발 / fan 부채꼴 3발 / spike 십자 4방향 / drip 벽에서 물방울 / lob 포물선 독(떨어진 곳에 장판)
   laser 가로 광선 / dash 붉은 선 예고 뒤 돌진 / blink 사라졌다가 내 앞에 나타남 / charge 같은 발판에서 돌진
   죽을 때: split 작은 2마리로 분열 / ring 0.35초 뒤 사방으로 탄 / burn 불 장판 */
const MON_SKILL = {
  b1: { eye: 'shot', sac: 'ring' },
  b2: { eye: 'shot', leech: 'drip', bat: 'dash', shade: 'blink', sac: 'split' },
  b3: { urchin: 'spike', spit: 'fan', mound: 'burn', sac: 'ring', tick: 'charge' },
  b4: { eye: 'fan', sac: 'split', bat: 'dash', urchin: 'spike', tick: 'charge', leech: 'drip' },
  b5: { spit: 'lob', mound: 'split', sac: 'ring', leech: 'drip', eye: 'shot', bat: 'dash' },
  b6: { shade: 'blink', eye: 'laser', urchin: 'spike', bat: 'dash', spit: 'fan', mound: 'burn' },
};
const MON_SKILL_RATE = [.3, .6, .9];          // 챕터 안 웨이브 1·2·3에서 능력을 가진 개체 비율. 챕터 1은 기본 행동만 익히는 챕터라 능력이 없다(MON_SKILL.b1은 심층 챕터 7에서 쓴다)
const ELITE = { rate: [0, .08, .16], hp: 2.4, size: 1.3, gem: 3 };
/* 재사용 대기(초)와 강화 개체일 때 바뀌는 값 */
const SKILL_DEF = {
  shot: { cd: 2.6, col: '#ff9a8a' }, fan: { cd: 2.9, col: '#ffb070' }, spike: { cd: 3, col: '#ff7a9a' }, drip: { cd: 2.3, col: '#c8e060' },
  lob: { cd: 3.2, col: '#c8e060' }, laser: { cd: 3.4, col: '#ff5aa0' }, charge: { cd: 2.4 }, blink: { cd: 3.4, col: '#d27ae0' },
  dash: {}, split: {}, ring: { col: '#ff9a8a' }, burn: { col: '#ff8a3a' },
};

/* ───── 맵 6종: 1~3 심연 계열, 4~6 새 계열 ───── */
const BIOMES = [
  { id: 'b1', name: '무너진 올림포스', sub: '신들의 집이 무너진 밤', ink: '#2a2238', tint: 'rgba(120,150,255,', fog: 'rgba(170,185,255,.20)', door: '#ffd98a',
    enemies: { mound: 5, eye: 4, sac: 3, urchin: 2, bat: 3, tick: 2, leech: 2, spit: 1, shade: 0 }, boss: 0, bits: '#c9c3d8' },
  { id: 'b2', name: '스틱스 강', sub: '죽은 자의 강이 흐르는 동굴', ink: '#14272a', tint: 'rgba(120,255,200,', fog: 'rgba(150,255,210,.16)', door: '#a8ffd8',
    enemies: { shade: 4, eye: 4, leech: 3, urchin: 2, bat: 4, mound: 3, sac: 3, tick: 2, spit: 2 }, boss: 1, bits: '#b5c4bc' },
  { id: 'b3', name: '타르타로스', sub: '티탄을 가둔 가장 깊은 곳', ink: '#2a1414', tint: 'rgba(255,150,90,', fog: 'rgba(255,170,120,.18)', door: '#ffb070',
    enemies: { urchin: 4, spit: 3, tick: 3, shade: 2, bat: 4, leech: 3, mound: 3, eye: 3, sac: 2 }, boss: 2, bits: '#c9a597' },
  { id: 'b4', name: '코키토스', sub: '눈물이 얼어붙은 강', ink: '#10202e', tint: 'rgba(140,210,255,', fog: 'rgba(170,225,255,.18)', door: '#bfe8ff',
    enemies: { eye: 5, urchin: 4, bat: 4, mound: 3, leech: 3, tick: 3, sac: 2, shade: 3, spit: 2 }, boss: 3, bits: '#a8d4ee' },
  { id: 'b5', name: '썩은 엘리시온', sub: '썩어 버린 낙원', ink: '#1a2212', tint: 'rgba(190,220,90,', fog: 'rgba(200,225,110,.16)', door: '#e4f08a',
    enemies: { spit: 5, sac: 4, mound: 4, tick: 3, urchin: 3, bat: 3, leech: 3, eye: 2, shade: 2 }, boss: 4, bits: '#b6c070' },
  { id: 'b6', name: '에레보스', sub: '태초의 어둠', ink: '#160f26', tint: 'rgba(190,120,255,', fog: 'rgba(200,150,255,.16)', door: '#e0b8ff',
    enemies: { shade: 5, urchin: 4, bat: 4, eye: 4, leech: 3, spit: 3, tick: 3, mound: 2, sac: 2 }, boss: 5, bits: '#b49ad8' },
];
/* 보스(2026-11-06 개편): 보스마다 대표 기술(sig)이 따로 있고, 공통 기술은 조금만 섞는다. p2 = 체력 절반 아래에서 더해지는 기술(궁수의 전설 2: 2단계에 소환·패턴 추가).
   minion = 소환할 때 부르는 몬스터. 대표 기술: inhale 빨아들이기 / spiral 회전 탄막 / toll 틈 있는 고리 3겹 / geyser 용암 기둥 박동 / icicle 고드름 비 / spore 포자 장판 / brood 새끼 낳기 / blink 순간이동 폭발 / orbs 유도 구슬 / dark 어둠 */
const BOSSES = [
  { name: '심연의 입', sub: '올림포스를 삼킨 것', frames: ['b1_shut', 'b1_open'], w: 150, h: 112, col: ['#2b1626', '#e8dfc9', '#e88a80'], sig: '빨아들이기', weights: { inhale: 4, hop: 3, spit: 2, erupt: 2 }, p2: { summon: 2, inhale: 1 }, minion: 'mound', hpMul: 1 },
  { name: '망자의 종', sub: '스틱스 밑바닥을 떠도는 것', frames: ['b2_shut', 'b2_open'], w: 150, h: 130, col: ['#123036', '#a8ffd8', '#5ad8a8'], sig: '종소리', weights: { toll: 4, spiral: 3, laser: 2, dive: 1 }, p2: { summon: 2, spiral: 1 }, minion: 'shade', hpMul: 1.25, float: true, laser: 'v', split: 'star' },
  { name: '티탄의 심장', sub: '아직도 뛰고 있다', frames: ['b3_shut', 'b3_open'], w: 150, h: 130, col: ['#3a1212', '#ff9a50', '#c23c1e'], sig: '박동', weights: { geyser: 4, laser: 3, floor: 2, ring: 2 }, p2: { split: 3, geyser: 1 }, minion: 'bat', hpMul: 1.55, laser: 'h', split: 'cross', float: true },   // v31: 바닥에만 있지 않고 떠서 오르내린다(뛰기 hop → 박동 고리 ring)
  { name: '얼어붙은 왕', sub: '코키토스 얼음 속에서 눈을 뜬 것', frames: ['b4_shut', 'b4_open'], w: 150, h: 130, col: ['#12263a', '#bfeaff', '#5ad0f0'], sig: '고드름 비', weights: { icicle: 4, sweep: 3, ring: 2, erupt: 1 }, p2: { split: 3, icicle: 1 }, minion: 'bat', hpMul: 1.3, laser: 'h', split: 'cross' },
  { name: '썩은 어머니', sub: '낙원을 먹어 치운 곰팡이', frames: ['b5_shut', 'b5_open'], w: 160, h: 130, col: ['#1e2610', '#e4f08a', '#b8d040'], sig: '포자', weights: { spore: 4, spit: 2, hop: 2, brood: 2 }, p2: { brood: 2, spore: 1 }, minion: 'sac', hpMul: 1.4, split: 'star' },
  { name: '첫 번째 어둠', sub: '빛이 생기기 전부터 있던 것', frames: ['b6_shut', 'b6_open'], w: 160, h: 140, col: ['#160f26', '#e8ccff', '#b070f0'], sig: '순간이동', weights: { blink: 4, orbs: 3, laser: 2, split: 2 }, p2: { dark: 3 }, minion: 'shade', hpMul: 1.5, float: true, laser: 'v', split: 'star' },
];

/* v33(2026-11-16) 신성 폭주: 몬스터를 땅에 닿지 않고 combo번 밟을 때마다 켜진다(이미 켜져 있으면 시간을 다시 가득).
   dur = 기본 지속(초, 장비 '신성 폭주 지속'·카드 '신성 과부하'로 늘어남), blink = 꺼지기 몇 초 전부터 깜박일지, beat = '빠빰'의 두 박 사이(초) */
const HIGH = { combo: 5, dur: 8, blink: 3, beat: .17 };
/* 샛길 문: 웨이브마다 최대 1개, 보스 웨이브에는 없다. 파편이 모인 뒤 만나도록 웨이브 뒤쪽에 둔다.
   mini = 문이 함정(중간 보스)일 확률. 겉모습은 보통 문과 같다 */
const DOOR = { chance: .8, from: .6, to: .88, mini: .16 };   // 2026-11-06 함정 10% → 16%
/* 중간 보스: 그 챕터 보스의 작은 판. 움직임은 진짜 보스와 같은 속도, 공격은 약하다.
   power = 피해 배율, tempo = 공격 박자 배율(예고·탄속·대기), hp = 진짜 보스 체력 대비, minShots = 최소 몇 발을 맞혀야 잡히는지 */
const MINI = { power: .4, tempo: .55, hp: .55, minShots: 24,
  byBoss: [
    { n: 1, scale: .48, weights: { hop: 3, inhale: 2, spit: 2 } },
    { n: 1, scale: .48, weights: { toll: 3, spiral: 2 } },
    { n: 2, scale: .384, weights: { geyser: 2, spit: 2, hop: 2 } },
    { n: 1, scale: .48, weights: { icicle: 3, ring: 2, sweep: 1 } },
    { n: 3, scale: .32, weights: { spore: 2, hop: 3 } },
    { n: 2, scale: .384, weights: { blink: 3, laser: 1 } },
  ] };

/* ───── 판 구성(2026-11-06 v21) ─────
   챕터 = 6판: 전투 → 전투 → 휴식 → 전투 → 전투 → 보스. 보스를 잡으면 챕터 클리어로 판이 끝난다(궁수의 전설 2처럼 챕터 단위).
   예전에는 3판마다 보스였다(사용자: 보스가 너무 빨리 나온다). 휴식 판 = 행운의 룰렛·님프의 샘·황금 낙하(rest.js).
   챕터 12개: 1~6은 맵 6종, 7~12는 같은 맵의 '심층'(더 어둡고, 능력·강화 몬스터가 많고, 더 단단하다).
   g.wave = 통산 판 번호(챕터 c의 s번째 판 = c*6 + s). 난이도는 판 번호가 아니라 난이도 단계 dlv로 잰다 */
const STAGES = 6, STAGE_PLAN = ['fight', 'fight', 'rest', 'fight', 'fight', 'boss'];
/* v41 구역 규칙(zones.js): 챕터마다 하나. 테마에 맞췄다 — 2 스틱스 강 = 수중, 4 코키토스(얼음) = 가시 림보, 6 에레보스(어둠) = 지하묘지. 1 · 3 · 5는 기본 규칙(쉬어 가는 챕터).
   심연(7~12챕터)은 기본 없이 세 규칙이 돌아간다. 보스 판 · 휴식 판에는 규칙이 없다 */
const ZONE_PLAN = [null, 'water', null, 'spike', null, 'dark', 'spike', 'dark', 'water', 'dark', 'water', 'spike'];
const CHAPTERS = 12;
/* 휴식 판(rest.js): 어떤 휴식이 나올지와 룰렛 칸(w = 무게). 카드 칸은 희귀부터 사다리로 오른다 */
const REST = {
  pick: { wheel: .45, nymph: .3, gold: .25 },
  wheel: [
    { id: 'shard', name: '파편 주머니', icon: 'r_ruby', col: '#d8344e', w: 3, apply: p => { const n = 120 + game.chapter * 30; p.shards += n; game.shardTotal += n; } },
    { id: 'heal', name: '체력 40% 회복', icon: 'c_ambrosia', col: '#2f9e48', w: 2, apply: p => healBy(p.maxHp * .4) },
    { id: 'atk', name: '공격력 +8%', icon: 'c_heavy', col: '#d8572a', w: 2, apply: p => { p.atk = Math.round(p.atk * 1.08); } },
    { id: 'hp', name: '최대 체력 +20', icon: 'c_giant', col: '#b8306e', w: 2, apply: p => { p.maxHp += 20; p.hp += 20; } },
    { id: 'ammo', name: '탄창 +2', icon: 'c_mag', col: '#2f6fd8', w: 1.5, apply: p => { p.maxAmmo += 2; p.ammo = p.maxAmmo; } },
    { id: 'card', name: '신의 선물', icon: 'c_olympus', col: '#9038d8', w: 1 },
  ],
  nymph: [
    { id: 'heal', name: '회복의 샘', sub: '체력 60% 회복', icon: 'c_ambrosia', col: '#37b24d', glow: 'rgba(120,255,160,.45)', apply: p => healBy(p.maxHp * .6) },
    { id: 'power', name: '힘의 샘', sub: '공격력 +10%', icon: 'c_heavy', col: '#e0603a', glow: 'rgba(255,140,90,.45)', apply: p => { p.atk = Math.round(p.atk * 1.1); } },
  ],
};
const DEEP_SUB = ['무너진 신전 아래, 더 깊은 곳', '강바닥 아래의 강', '사슬이 끊어진 감옥', '눈물마저 얼어 버린 밑바닥', '썩은 뿌리가 엉킨 땅속', '어둠보다 오래된 어둠'];
const chapterOf = w => Math.floor((w - 1) / STAGES), stageOf = w => (w - 1) % STAGES + 1;
/* v43 어려움 모드: 챕터 7~12(예전 '심층')는 같은 섬의 어려움 판이다. 저장 · 챕터 번호는 그대로(어려움 n = 챕터 번호 6 + n).
   open = 보통 챕터를 몇 개 더 깨야 열리나(어려움 1은 보통 3), heart = 하트가 나올 확률 배율, trap = 함정 샛길 확률,
   gemFirst = 첫 클리어 보석 배율, epic = 보스 장비 영웅 등급 확률 배율. 구역 규칙(ZONE_PLAN)과 능력 · 강화 개체(monskill.js)는 예전 심층 그대로 */
/* v46 어려움 강화(2026-11-23 사용자 요청: 능력치만 센 것이 아니라 겉모습 · 몬스터 · 기믹 · 보상으로 구분되게)
   lvFrom · lvK = 난이도 단계: 어려움 n의 시작 단계 = ch × (lvFrom + (n-1) × lvK). 어려움 1 ≈ 보통 4 시작 수준(예전에는 보통 6 뒤에서 이어졌다) — 대신 아래 것들로 어렵다
   spacing = 적 사이 간격 배율(마릿수 약 +22%), rage = 분노 개체 비율(붉은 불길 · 이동 rageSpd배 · 피해 rageDmg배), shots = 능력 탄 추가 수, cd = 능력 쿨타임 배율
   wallTrap = 벽 턱이 가시 함정 턱이 될 확률, spikeDelay = 밟고 나서 가시가 솟기까지(초), spikeUp = 솟아 있는 시간, spikeCool = 다시 밟을 수 있을 때까지
   gold = 같은 섬 보통(줄이기 전) 골드의 배수, scroll · gem = 같은 섬 보통의 배수, epic · rare = 장비 등급 확률 배수 */
const HARDM = { open: 2, heart: .5, trap: .25, gemFirst: 3, epic: 3, rare: 2, gold: 3, scroll: 3, gem: 3, lvFrom: 3.2, lvK: .9, spacing: .82, rage: .3, rageSpd: 1.25, rageDmg: 1.15, shots: 1, cd: .85, wallTrap: .4, spikeDelay: 1.2, spikeUp: 1.4, spikeCool: .9 };
/* 심연석: 어려움에서만 나오는 재화. 전설 → 신화 · 신화 → S · S → SS 합성에 든다(need[지금 등급]).
   쓰임새를 최고 등급 합성으로 정한 까닭: 보통만 돌아서는 끝까지 못 가게 해 어려움에 갈 이유를 만들고, 이미 있는 합성 사다리에 얹어 새 화면 없이 바로 쓰인다
   얻기: 어려움 판을 넘을 때마다 wave개(버림), 보스 boss + 섬 번호, 첫 클리어 first → 완주 한 번에 어려움 1 = 6개 … 어려움 6 = 11개, 첫 클리어는 +10 */
const ABYSS = { name: '심연석', wave: .5, boss: 3, first: 10, need: { 4: 10, 5: 25, 6: 50 } };
const isHard = c => c >= BIOMES.length;
const hardNeed = c => Math.min(BIOMES.length - 1, c - BIOMES.length + HARDM.open);   // 어려움 챕터 c가 열리려면 깨야 하는 보통 챕터 번호
const chapterInfo = c => { const B = BIOMES[c % BIOMES.length], deep = c >= BIOMES.length; return { B, deep, no: c % BIOMES.length + 1, name: (deep ? '어려움 · ' : '') + B.name, sub: deep ? DEEP_SUB[c % BIOMES.length] : B.sub }; };
/* 난이도 단계: 챕터 1~6은 예전 3판 구성과 같은 값(챕터 c의 첫 판 = 3c+1, 보스 = 3c+3)을 6판에 고르게 나눈다.
   심층(챕터 7~12)은 단계마다 DEEP_STEP씩 더 가파르다(tools/test/econ_v21.py 성장 시뮬레이션으로 정함) */
/* ch = 챕터 하나에 오르는 단계, deep = 심층에서 그 배율. econ_v21.py로 정했다(2026-11-06, 봇으로 잰 '깊을수록 자주 맞는 정도' 반영):
   하루 10판 기준 3챕터 1.5일, 6챕터 약 6일, 9챕터 약 12일, 12챕터 약 26일. 후반은 성장이 골드에 묶여 느려지므로 심층 기울기를 줄였다 */
const DIFF_STEP = { ch: 3.4, deep: .6 };
/* 몬스터 이동·탄 속도는 이 단계에서 멈춘다(6챕터 수준). 넘으면 그림자·외눈이 주인공(초당 235)보다 빨라져 피할 수 없다(bot_v21.py 측정, 2026-11-06) */
const MOVE_L_CAP = 16;
const FIRST_BOSS = { hp: .75, tempo: .85 };   // 챕터 1 보스만
const SHADE = { sight: 300, leash: 360, maxSpd: 140 };   // 그림자: 알아채는 거리, 자기 자리에서 따라오는 한계, 최고 속도(주인공 235)
const dlv = w => { const c = chapterOf(w), s = stageOf(w) - 1, k = c < 6 ? 1 : HARDM.lvK, base = c < 6 ? c * DIFF_STEP.ch : DIFF_STEP.ch * (HARDM.lvFrom + (c - 6) * k); return base + 1 + s * DIFF_STEP.ch / 7.5 * k; };   // v46 어려움은 보통 6 뒤가 아니라 보통 4쯤에서 다시 시작한다
/* ───── 난이도 곡선: 단계 L이 오를수록 적과 보스가 강해진다. DIFF는 판 번호를 받아 단계로 바꿔 쓴다 ───── */
const DIFF_L = {
  hp: L => (1 + .24 * (L - 1)) * Math.pow(1.045, L - 1),
  // 단계 1~5의 부담만 낮추고 단계 6부터는 그대로 둔다. 2026-11-06 봇 대조: 시작 장비로 1챕터를 못 깨서 .75 → .6에서 시작
  dmg: L => (L < 6 ? .6 + .08 * (L - 1) : 1) * (1 + .11 * (L - 1)),
  speed: L => 1 + Math.min(.6, .05 * (L - 1)),
  spacing: L => Math.max(70, 148 - L * 8 + Math.max(0, 6 - L) * 6 + Math.max(0, 3 - L) * 30),     // 적 사이 세로 간격(다운웰 수준으로 촘촘하게). v38: 챕터 1 앞쪽(단계 3 전)은 더 듬성듬성(괴물 수 약 -25%)
  rows: L => Math.round(Math.min(150, 80 + L * 5)),                     // 한 판의 길이(칸 수, 정수여야 한다): 6판이 되면서 판 하나는 조금 짧게
  bossHp: L => 900 * DIFF_L.hp(L) * (L <= 3 ? .7 : L <= 6 ? .85 : 1),
  spike: L => L < 6 ? .08 + L * .05 : Math.min(.5, .18 + L * .04),
};
const DIFF = {};
for (const k in DIFF_L) DIFF[k] = w => DIFF_L[k](dlv(w));
/* 판 보상은 '이번 판에 통과한 판·처치·보스'로만 계산한다. 시작 판 번호만으로는 아무것도 받지 못한다.
   깊은 판일수록 한 칸의 값이 크고, 높은 챕터일수록 스크롤이 많다(높은 챕터를 깨는 편이 이득). 값은 난이도 단계 L 기준 */
const REWARD = {
  waveGold: w => 16 + 3 * dlv(w), bossGold: w => 100 + 5 * dlv(w), killGold: 1.5,
  scrollPerWave: 1, scrollPerBoss: 3, scrollChapter: .25, scrollMax: 16,
  // 2026-11-06 econ_v21 시뮬레이션: 판마다 장비가 최대 5개라 합성으로 에픽이 쏟아졌다 → 궁전2처럼 판당 1~2개, 보스 처치 시 +1
  gearEveryWaves: 3, gearMax: 3, gearEpicBoss: .03, gearRare: .15, gearRareBoss: .08, gearFine: .85,   // v36 나머지는 고급 85% · 일반 15%(econ_v21: 예전 진행 속도 유지)
  normalGold: .85,   // v46 보통 골드 15% 줄임(어려움 보상과 벌리기)
  gemPerBoss: 10, gemFirstClear: 50,    // 같은 보스를 되풀이해 보석을 모으지 못하게 한다. 챕터 첫 클리어에 몰아 준다
  startGold: 2000, startGem: 150,       // 시작 보석 900 → 150: 첫날 전 부위 에픽이 되는 것을 막는다
};

/* ───── 카드 등급: 궁수의 전설 2와 같은 4단계(초록·파랑·보라·주황 금빛) ───── */
const TIER = {
  일반: { col: '#37b24d', dark: '#10381a', hi: '#a6f3b5' },
  희귀: { col: '#3478e6', dark: '#10244e', hi: '#a9ccff' },
  영웅: { col: '#b23ef0', dark: '#2a0f4a', hi: '#efb0ff' },
  전설: { col: '#f0a018', dark: '#4a2a06', hi: '#ffe59a' },
};
/* 등급 사다리(2026-11-06): 카드 한 장마다 일반에서 시작해 확률에 걸리면 한 칸씩 오른다. [일반→희귀, 희귀→영웅, 영웅→전설]
   기본: 장당 희귀 이상 45%, 영웅 이상 15.8%, 전설 4.7% → 3장 중 전설이 1장이라도 나올 확률 약 13.5%(궁수의 전설 2처럼 후하게)
   boost(보스 전리품·함정 방): 장당 희귀 이상 62%, 영웅 이상 27.9%, 전설 10.6% */
/* v31(2026-11-12) 등급 사다리 확률 상향: 희귀·영웅·전설이 잘 안 보인다는 피드백. 카드 1장 기준 영웅 이상 16%→27%, 전설 4.7%→9.5%(보스·함정 전리품 18.6%)
   + 연속 보정 CARD_PITY: 카드 창 2번 연속 영웅 이상이 없으면 다음부터 희귀→영웅 +25%p씩, 전설이 2번 연속 없으면 영웅→전설 +20%p씩(희귀→영웅도 +10%p씩) */
/* v31.1 밟기 피해는 공격력·카드·장비와 무관한 고정값(탄보다 훨씬 약하고 점점 세지지 않는다). 보스·중간 보스도 밟으면 이만큼 깎인다. 들이받기(뿔) = 같은 값, 황소 ×1.5 */
/* v32(2026-11-13) 밟기는 '몇 번 밟으면 죽는지'로 정한다(공격력·카드·챕터와 상관없이 같은 횟수).
   작은 몬스터(박쥐, 분열한 새끼) 1번 · 보통 3번 · 큰 강화 개체 5번 · 중간 보스 무리 전체 18번(마리 수로 나눔) · 보스 45번.
   피해 = 최대 체력 ÷ 횟수(올림). 탄으로 깎아 둔 만큼 덜 밟아도 된다. 들이받기도 같은 값(황소 전설은 ×1.5) */
const STOMP = { small: 1, normal: 3, elite: 5, mini: 18, boss: 45 };
const stompN = e => e.child || e.kind === 'bat' ? STOMP.small : e.elite ? STOMP.elite : STOMP.normal;
const stompDmg = e => Math.ceil((e.maxHp || e.hp) / stompN(e));
/* v48(2026-11-23 사용자: "전설이 너무 자주 나온다 · 너무 빨리 강해진다"): 카드 1장이 전설일 확률 4.2% → 1.5%(보스 · 함정 전리품 18.6% → 5.9%). 카드 창(3장)에 전설이 끼는 비율 12% → 4.5%(전리품 46% → 17%)
   FIRST_SHOW = 첫 판 첫 카드 창에 확정으로 나오는 '바로 눈에 보이는' 영웅 카드 */
const FIRST_SHOW = ['triple', 'orbit2', 'chain', 'strike', 'pet_laser', 'hawk'];
const CARD_UP = { base: [.45, .28, .12], boost: [.70, .42, .20] };   // v40 판 끝 대신 싸우는 중간에 레벨업으로 고른다(챕터당 약 4번 → 10번 안팎). 고르는 횟수가 늘어난 만큼 사다리를 낮췄다(예전 [.60, .45, .35]: 카드 1장 전설 9.5% → 4.2%)
/* v40(2026-11-19 사용자 요청) 파편 줄이기 · 자동 흡수 · 하트 · 레벨업
   SHARD: k = 나오는 양 배수, small = 작은 파편 1개 값(조각 수가 준다), auto = 나온 뒤 이 시간이 지나면 주인공에게 날아온다
   HEART: 괴물을 잡으면 chance 확률로(강화 개체 elite) 하트. 몸이 닿아야 먹는다(자동 흡수 아님). heal = 최대 체력 비율, life = 사라질 때까지 초
   XP: 잡은 괴물 경험치(박쥐 · 새끼 1, 보통 2, 강화 5)가 '이번 판 괴물 경험치 합 × k'만큼 차면 레벨업 → 카드 창. 한 판(챕터)에 cap번까지 */
const SHARD = { k: .8, small: 3, auto: .45 };
const HEART = { chance: .05, small: .02, elite: .22, heal: .08, life: 14, r: 11 };
const XP = { k: .34, min: 8, cap: 12 };
const xpOf = e => e.child || e.kind === 'bat' ? 1 : e.elite ? 5 : 2;
/* 카드 창을 묶음으로 내기(궁수의 전설 2: 화염 · 번개 · 폭탄 요정 3장처럼 같은 계열이 한꺼번에 나올 때가 있다). chance 확률로 한 묶음에서만 3장, 두 번 연속은 없다 */
const CARD_THEME = { chance: .2 };
/* v38 초반 후한 카드: 깬 챕터 수가 적을수록 등급 사다리가 잘 오른다(띵띵띵 승급 연출이 자주 보이게). [깬 챕터 수 미만, 사다리]
   챕터 1을 깨기 전: 카드 창에 영웅 이상 약 95% · 전설 약 63% / 챕터 3을 깨기 전: 영웅 약 79% · 전설 약 42% / 그 뒤 = 기본(영웅 61% · 전설 26%) */
const CARD_EARLY = [];   // v39 초반 후한 확률을 없앴다(예전 [[1, [.85, .70, .50]], [3, [.72, .56, .42]]]: 챕터 1을 깨기 전 카드 창의 63%에 전설 → 보스가 한 방). 이제 첫 판만 '첫 카드 창 전설 1장 확정 + 그 뒤 영웅까지'(cards.js firstRun), 두 번째 판부터 기본 확률
/* v38 챕터별 권장 전투력: 성장 시뮬레이션(tools/test/econ_v38.py)에서 '이 전투력이면 60판쯤 해 본 실력으로 60% 깬다'로 뽑은 값. 전투 화면에 내 전투력과 견주어 보여 준다 */
const REC_POWER = [440, 990, 1600, 2020, 2260, 2730, 2300, 2600, 3050, 3650, 4250, 4900];   // v46 어려움 6개: 새 난이도 단계를 보통 값에 견주어 잡고 몬스터 · 기믹 몫 12%를 얹었다(추정, 성장 시뮬은 다시 안 돌림)   // econ_v38 무과금 하루 10판 프로필, 클리어율 60% 지점
const CARD_PITY = { after: 4, hero: .12, legend: .05 };   // v40 고르는 횟수가 늘어 보정도 느슨하게(예전 after 2 · hero .25 · legend .2)
