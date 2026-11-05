/* GOD FALL 데이터: 등급·장비·신·적·맵·카드·상자. 숫자를 고칠 때는 여기만 본다. */
'use strict';

/* ───── 등급 4단계: 신화는 뽑기에서 나오지 않고 합성으로만 만든다 ───── */
const GRADES = [
  { name: '고급', color: '#37b24d', dark: '#1d6b2c', glow: 'rgba(90,240,120,.9)' },
  { name: '희귀', color: '#3478e6', dark: '#1b3f8a', glow: 'rgba(110,170,255,.9)' },
  { name: '에픽', color: '#a040e6', dark: '#5a1d8e', glow: 'rgba(214,120,255,.95)' },
  { name: '신화', color: '#e23340', dark: '#8a141e', glow: 'rgba(255,110,110,.95)' },
];
const MYTH = 3;

/* ───── 장비 6칸. 왼쪽 3칸은 공격력, 오른쪽 3칸은 체력 ───── */
const SLOTS = [
  { id: 'weapon', name: '신의 무기', side: 'L', stat: 'atk', base: [12, 22, 38, 64], perLv: 2.2 },
  { id: 'amulet', name: '부적', side: 'L', stat: 'atk', base: [4, 8, 14, 24], perLv: .9 },
  { id: 'ring', name: '인장 반지', side: 'L', stat: 'atk', base: [4, 8, 14, 24], perLv: .9 },
  { id: 'helm', name: '투구', side: 'R', stat: 'hp', base: [20, 40, 70, 120], perLv: 4 },
  { id: 'armor', name: '갑옷', side: 'R', stat: 'hp', base: [30, 60, 100, 170], perLv: 5 },
  { id: 'boots', name: '날개 신발', side: 'R', stat: 'hp', base: [20, 40, 70, 120], perLv: 4 },
];
const SLOT_BY = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const LV_MAX = 200;   // 참고 영상의 장비 팝업 '레벨: 8/200'. 등급과 상관없이 같다

/* 장비 도안: 칸마다 2종. 같은 도안이 등급만 바뀐다(궁수의 전설 2와 같은 구조).
   skills: 그 등급이 되면 열리는 능력. [필요 등급, 설명, 효과 키, 값] */
const GEAR = {
  weapon_a: { slot: 'weapon', name: '연사의 신물', icon: null, desc: '가볍고 빠르다. 쉼 없이 쏘아 낙하를 늦춘다.',
    skills: [[1, '공격력 +8%', 'atkPct', .08], [2, '발사 간격 -12%', 'firePct', -.12], [3, '8번째 공격마다 강화탄', 'every8', 1]] },
  weapon_b: { slot: 'weapon', name: '강타의 신물', icon: null, desc: '묵직하다. 한 발이 강하고 반동이 크다.',
    skills: [[0, '발사 간격 +15%, 공격력 +15%', 'heavy', 1], [2, '치명타 확률 +12%', 'crit', .12], [3, '공격이 적을 1번 관통', 'pierce', 1]] },
  amulet_a: { slot: 'amulet', name: '청동 올빼미 부적', icon: 'amulet_a', desc: '아테나의 올빼미가 새겨진 낡은 부적.',
    skills: [[1, '파편 획득 +10%', 'shardPct', .1], [2, '공격력 +6%', 'atkPct', .06], [3, '보스 피해 +20%', 'bossPct', .2]] },
  amulet_b: { slot: 'amulet', name: '월계수 사파이어', icon: 'amulet_b', desc: '바다의 빛을 머금은 신의 목걸이.',
    skills: [[1, '치명타 확률 +5%', 'crit', .05], [2, '치명타 피해 +30%', 'critDmg', .3], [3, '신성 폭주 지속 +50%', 'highPct', .5]] },
  ring_a: { slot: 'ring', name: '올리브 인장', icon: 'ring_a', desc: '평화 협정을 찍던 은 반지.',
    skills: [[1, '밟기 피해 +30%', 'stompPct', .3], [2, '공격력 +6%', 'atkPct', .06], [3, '밟을 때 주변에 충격파', 'stompWave', 1]] },
  ring_b: { slot: 'ring', name: '헤스티아의 불씨', icon: 'ring_b', desc: '꺼지지 않는 화덕 불을 담은 반지.',
    skills: [[1, '탄창 +1', 'ammo', 1], [2, '탄창 +1', 'ammo', 1], [3, '탄이 비면 다음 공격 강화', 'lastShot', 1]] },
  helm_a: { slot: 'helm', name: '찌그러진 청동 투구', icon: 'helm_a', desc: '여러 번 맞았지만 아직 쓸 만하다.',
    skills: [[1, '최대 체력 +6%', 'hpPct', .06], [2, '맞은 뒤 무적 +20%', 'invPct', .2], [3, '웨이브 시작 시 체력 10% 회복', 'waveHeal', .1]] },
  helm_b: { slot: 'helm', name: '올림포스 깃털 투구', icon: 'helm_b', desc: '근위대장이 버리고 간 투구.',
    skills: [[1, '최대 체력 +6%', 'hpPct', .06], [2, '받는 피해 -8%', 'dmgCut', .08], [3, '치명적 피해를 1회 버팀', 'lastStand', 1]] },
  armor_a: { slot: 'armor', name: '청동 흉갑', icon: 'armor_a', desc: '무겁지만 믿음직하다.',
    skills: [[1, '받는 피해 -5%', 'dmgCut', .05], [2, '최대 체력 +8%', 'hpPct', .08], [3, '맞으면 주변 적에게 반격', 'thorns', 1]] },
  armor_b: { slot: 'armor', name: '신성 대리석 갑옷', icon: 'armor_b', desc: '신전 기둥을 깎아 만들었다.',
    skills: [[1, '최대 체력 +8%', 'hpPct', .08], [2, '회복 효과 +30%', 'healPct', .3], [3, '받는 피해 -12%', 'dmgCut', .12]] },
  boots_a: { slot: 'boots', name: '낡은 가죽 샌들', icon: 'boots_a', desc: '끈이 몇 번 끊어졌던 샌들.',
    skills: [[1, '이동 속도 +5%', 'runPct', .05], [2, '최대 체력 +6%', 'hpPct', .06], [3, '점프 게이지 회복 +30%', 'gaugePct', .3]] },
  boots_b: { slot: 'boots', name: '황금 날개 샌들', icon: 'boots_b', desc: '헤르메스의 여벌 신발이다. 말없이 빌렸다.',
    skills: [[1, '점프 게이지 회복 +15%', 'gaugePct', .15], [2, '이동 속도 +8%', 'runPct', .08], [3, '공중 점프 때 충격파', 'jumpWave', 1]] },
};
const GEAR_BY_SLOT = {}; for (const k in GEAR) (GEAR_BY_SLOT[GEAR[k].slot] = GEAR_BY_SLOT[GEAR[k].slot] || []).push(k);

/* ───── 신 6종. fire=발사 간격 배율, dmg=피해 배율, recoil=반동(작을수록 잘 뜸), shot=탄 종류 ───── */
const GODS = [
  { id: 'hermes', name: '헤르메스', rank: '레어', rankCol: '#3478e6', title: '늦은 전령', shot: 'letter', fire: 1, dmg: 1, recoil: .2, ammo: 8, weapon: '날개 편지',
    passive: '파편 획득 +15%. 공중에서 더 빠르게 움직인다.', p: { shardPct: .15, runPct: .08 } },
  { id: 'artemis', name: '아르테미스', rank: '레어', rankCol: '#3478e6', title: '달의 사냥꾼', shot: 'arrow', fire: 1.25, dmg: 1.35, recoil: .26, ammo: 8, weapon: '초승달 활',
    passive: '화살이 적을 1번 관통한다. 치명타 확률 +15%.', p: { pierce: 1, crit: .15 } },
  { id: 'dionysus', name: '디오니소스', rank: '에픽', rankCol: '#a040e6', title: '끝나도 즐거운 신', shot: 'wine', fire: 1.5, dmg: 1.3, recoil: .34, ammo: 7, weapon: '포도주 항아리',
    passive: '술이 터져 주변까지 맞힌다. 20% 확률로 피해를 흘려 넘긴다.', p: { splash: 34, dodge: .2 } },
  { id: 'hephaestus', name: '헤파이스토스', rank: '에픽', rankCol: '#a040e6', title: '아무도 안 믿는 대장장이', shot: 'bomb', fire: 2.4, dmg: 2.6, recoil: .08, ammo: 5, weapon: '대장간 망치',
    passive: '불씨 폭탄이 넓게 터지고 블록을 부순다. 반동이 가장 강하다.', p: { splash: 52, breaker: 1 } },
  { id: 'hades', name: '하데스', rank: '전설', rankCol: '#e0a020', title: '지친 명계 관리자', shot: 'soul', fire: 1.3, dmg: 1.05, recoil: .24, ammo: 8, weapon: '영혼 등불',
    passive: '영혼불이 적을 따라간다. 처치할 때마다 체력 1 회복.', p: { homing: 1, leech: 1 } },
  { id: 'zeus', name: '제우스', rank: '전설', rankCol: '#e0a020', title: '스스로 위엄 있는 왕', shot: 'bolt', fire: 1.35, dmg: 1.15, recoil: .24, ammo: 8, weapon: '번개',
    passive: '번개가 가까운 적 2마리에게 옮겨 간다. 콤보 8마다 낙뢰.', p: { chain: 2, comboStrike: 1 } },
];
const GOD_BY = Object.fromEntries(GODS.map(g => [g.id, g]));
/* 신 성장: 레벨 1~4. 올릴 때마다 공격력·체력이 오르고 고유 능력이 강해진다(GOD_LV = 레벨 2·3·4 효과) */
const GOD_LV_MAX = 4, GOD_UNLOCK = 50;
const GOD_LV_COST = { '레어': [100, 200, 400], '에픽': [100, 200, 400], '전설': [50, 100, 200] };   // 전설은 조각이 귀해 적게 든다
const GOD_LV_BONUS = .15;   // 레벨 1개당 공격력·체력
const GOD_LV = {
  hermes: [['점프 게이지 회복 +20%', { gaugePct: .2 }], ['판 보상 골드 +20%', { goldPct: .2 }], ['탄창 +2', { ammo: 2 }]],
  artemis: [['치명타 피해 +30%', { critDmg: .3 }], ['발사 간격 -12%', { firePct: -.12 }], ['화살 관통 +1', { pierce: 1 }]],
  dionysus: [['회피 확률 +10%', { dodge: .1 }], ['폭발 범위 +16', { splash: 16 }], ['웨이브 시작 시 체력 5% 회복', { waveHeal: .05 }]],
  hephaestus: [['탄창 +1', { ammo: 1 }], ['공격력 +10%', { atkPct: .1 }], ['폭발 범위 +20', { splash: 20 }]],
  hades: [['체력 +10%', { hpPct: .1 }], ['처치 회복 +1', { leech: 1 }], ['판마다 한 번, 쓰러질 때 체력 1로 버틴다', { lastStand: 1 }]],
  zeus: [['보스 피해 +15%', { bossPct: .15 }], ['번개 전이 +1', { chain: 1 }], ['치명타 확률 +10%', { crit: .1 }]],
};
/* 신의 소환(캐릭터 뽑기). 조각을 주고, 조각으로 해금·레벨 업한다. 임시값 */
const GOD_CHEST = { id: 'god', name: '신의 소환', icon: 'chest_god', cur: 'gem', one: 150, ten: 1350, free: 24 * 3600, pity: 10, tint: '#7a3fb0',
  rate: { '레어': .55, '에픽': .35, '전설': .1 }, shard: { '레어': 15, '에픽': 12, '전설': 10 }, desc: '신의 조각을 얻습니다. 해금과 레벨 업에 씁니다' };
/* 신 전용 무기: 무기만 신마다 따로다. 뽑기에서 어느 신의 무기가 나올지는 등급으로 정한다(신 1명당 확률, 합 100%). 임시값 */
const WEAPON_RATE = { '레어': .25, '에픽': .15, '전설': .1 };
/* 계정 보너스: 출전하지 않은 신도 키울수록 모두가 강해진다. 값은 공격력·체력 %(소수). 임시값 */
const ACCOUNT = { unlock: .01, perLv: .02, weaponGrade: [.01, .02, .04, .08], weaponLv: .0005 };
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

/* ───── 상자. rate = [고급, 희귀, 에픽]. 신화는 어떤 상자에서도 나오지 않는다 ───── */
const CHESTS = [
  { id: 'silver', name: '실버 상자', icon: 'chest_silver', cur: 'gold', one: 800, ten: 7200, rate: [.82, .18, 0], shard: [.10, 3], free: 4 * 3600, tint: '#2e5f8e', desc: '고급·희귀 장비' },
  { id: 'obsidian', name: '흑요석 상자', icon: 'chest_obsidian', cur: 'gem', one: 150, ten: 1350, rate: [.5, .42, .08], shard: [.25, 6], free: 24 * 3600, pity: 5, tint: '#4a2670', desc: '5회 안에 에픽 1개 확정' },
  { id: 'prism', name: '환채석 상자', icon: 'chest_prism', cur: 'gem', one: 400, ten: 3600, rate: [0, .68, .32], shard: [.5, 10], pity: 4, tint: '#a0621a', desc: '희귀 이상, 4회 안에 에픽 확정' },
];

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
const BOSSES = [
  { name: '심연의 입', sub: '올림포스를 삼킨 것', frames: ['b1_shut', 'b1_open'], w: 150, h: 112, col: ['#2b1626', '#e8dfc9', '#e88a80'], weights: { erupt: 4, dive: 2, sweep: 2, hop: 4, spit: 3, summon: 1 }, hpMul: 1 },
  { name: '망자의 종', sub: '스틱스 밑바닥을 떠도는 것', frames: ['b2_shut', 'b2_open'], w: 150, h: 130, col: ['#123036', '#a8ffd8', '#5ad8a8'], weights: { sweep: 4, dive: 2, erupt: 2, laser: 3, split: 3, ring: 3, summon: 2 }, hpMul: 1.25, float: true, laser: 'v', split: 'star' },
  { name: '티탄의 심장', sub: '아직도 뛰고 있다', frames: ['b3_shut', 'b3_open'], w: 150, h: 130, col: ['#3a1212', '#ff9a50', '#c23c1e'], weights: { erupt: 3, dive: 2, laser: 4, split: 3, floor: 4, ring: 2, spit: 3, summon: 1 }, hpMul: 1.55, laser: 'h', split: 'cross' },
  { name: '얼어붙은 왕', sub: '코키토스 얼음 속에서 눈을 뜬 것', frames: ['b4_shut', 'b4_open'], w: 150, h: 130, col: ['#12263a', '#bfeaff', '#5ad0f0'], weights: { sweep: 4, erupt: 3, dive: 2, laser: 3, split: 3, ring: 3, summon: 1 }, hpMul: 1.3, laser: 'h', split: 'cross' },
  { name: '썩은 어머니', sub: '낙원을 먹어 치운 곰팡이', frames: ['b5_shut', 'b5_open'], w: 160, h: 130, col: ['#1e2610', '#e4f08a', '#b8d040'], weights: { spit: 4, floor: 3, erupt: 3, dive: 2, split: 4, summon: 2, hop: 2 }, hpMul: 1.4, split: 'star' },
  { name: '첫 번째 어둠', sub: '빛이 생기기 전부터 있던 것', frames: ['b6_shut', 'b6_open'], w: 160, h: 140, col: ['#160f26', '#e8ccff', '#b070f0'], weights: { dive: 3, sweep: 3, erupt: 3, laser: 4, split: 4, ring: 3, summon: 1 }, hpMul: 1.5, float: true, laser: 'v', split: 'star' },
];

/* 샛길 문: 웨이브마다 최대 1개, 보스 웨이브에는 없다. 파편이 모인 뒤 만나도록 웨이브 뒤쪽에 둔다.
   mini = 문이 함정(중간 보스)일 확률. 겉모습은 보통 문과 같다 */
const DOOR = { chance: .8, from: .6, to: .88, mini: .1 };
/* 중간 보스: 그 챕터 보스의 작은 판. 움직임은 진짜 보스와 같은 속도, 공격은 약하다.
   power = 피해 배율, tempo = 공격 박자 배율(예고·탄속·대기), hp = 진짜 보스 체력 대비, minShots = 최소 몇 발을 맞혀야 잡히는지 */
const MINI = { power: .4, tempo: .55, hp: .55, minShots: 24,
  byBoss: [
    { n: 1, scale: .48, weights: { hop: 4, spit: 3 } },
    { n: 1, scale: .48, weights: { laser: 2, ring: 3 } },
    { n: 2, scale: .384, weights: { spit: 3, hop: 2 } },
    { n: 1, scale: .48, weights: { sweep: 2, ring: 3, split: 2 } },
    { n: 3, scale: .32, weights: { hop: 3, spit: 2 } },
    { n: 2, scale: .384, weights: { laser: 2, split: 2 } },
  ] };

/* ───── 난이도 곡선: 웨이브가 오를수록 적과 보스가 강해진다 ───── */
const DIFF = {
  hp: w => (1 + .24 * (w - 1)) * Math.pow(1.045, w - 1),
  // 2026-11-04 사용자 판단 "더 쉽게": 웨이브 1~5의 부담만 낮추고 웨이브 6부터는 그대로 둔다
  dmg: w => (w < 6 ? .75 + .05 * (w - 1) : 1) * (1 + .11 * (w - 1)),
  speed: w => 1 + Math.min(.6, .05 * (w - 1)),
  spacing: w => Math.max(74, 148 - w * 8 + Math.max(0, 6 - w) * 6),     // 적 사이 세로 간격(다운웰 수준으로 촘촘하게)
  rows: w => Math.min(170, 92 + w * 6),
  bossHp: w => 900 * DIFF.hp(w) * (w <= 3 ? .7 : w <= 6 ? .85 : 1),
  spike: w => w < 6 ? .08 + w * .05 : Math.min(.5, .18 + w * .04),
};
/* 판 보상은 '이번 판에 통과한 웨이브·처치·보스'로만 계산한다. 시작 웨이브 번호만으로는 아무것도 받지 못한다.
   깊은 웨이브일수록 한 칸의 값이 크고, 높은 챕터일수록 스크롤이 많다(높은 챕터를 깨는 편이 이득). */
const REWARD = {
  waveGold: w => 16 + 3 * w, bossGold: w => 100 + 5 * w, killGold: 1.5,
  scrollPerWave: 1, scrollPerBoss: 3, scrollChapter: .25, scrollMax: 16,
  gearEveryWaves: 2, gearMax: 5,
  gemPerBoss: 10, gemFirstClear: 100,   // 같은 보스를 되풀이해 보석을 모으지 못하게 한다. 챕터 첫 클리어에 몰아 준다
};

/* ───── 카드 등급 ───── */
const TIER = {
  일반: { col: '#37b24d', dark: '#10381a', hi: '#a6f3b5', weight: 60 },
  희귀: { col: '#3478e6', dark: '#10244e', hi: '#a9ccff', weight: 30 },
  영웅: { col: '#b23ef0', dark: '#2a0f4a', hi: '#efb0ff', weight: 13 },
  신화: { col: '#e8a020', dark: '#4a2a06', hi: '#ffe59a', weight: 4 },
};
