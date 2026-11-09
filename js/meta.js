/* 판 밖 성장: 저장, 장비·슬롯·합성·뽑기·신·재능·임무, 능력치 계산. 화면 코드 없음 */
'use strict';
const SAVE_KEY = 'gf_save_v1';
const Meta = {
  s: null,
  fresh() {
    const inv = [], add = (d, g) => { const o = { uid: 'u' + (inv.length + 1), d, g, isNew: false }; if (GEAR[d].slot === 'weapon') o.god = 'hermes'; inv.push(o); };
    // 시작 장비: 무기 하나를 끼고 시작한다. 다른 칸은 합성·교체를 익히도록 조금 준다
    add('weapon_a', 0); add('armor_a', 0); add('boots_a', 0); add('amulet_a', 0); add('ring_a', 0); add('helm_a', 0);
    add('armor_a', 0); add('armor_a', 0); add('ring_b', 0);
    return {
      v: 1, name: '올림포스 생존자', gold: REWARD.startGold, gem: REWARD.startGem, energy: 30, energyAt: Date.now(), lastDay: '', inv, nextUid: 100,
      equip: { weapon: 'u1', amulet: null, ring: null, helm: null, armor: null, boots: null },
      // 무기는 신마다 따로다. equip.weapon과 slotLv.weapon은 지금 출전한 신의 값이다
      weapons: { hermes: 'u1' }, weaponLv: { hermes: 1 },
      slotLv: { weapon: 1, amulet: 1, ring: 1, helm: 1, armor: 1, boots: 1 },
      scrolls: { weapon: 6, amulet: 6, ring: 6, helm: 6, armor: 6, boots: 6 },
      god: 'hermes', gods: { hermes: { own: true, level: 1, shard: 0 } }, talent: {},
      chapter: 0, cleared: Array(CHAPTERS).fill(false), best: Array(CHAPTERS).fill(0),
      chest: { god: { freeAt: 0, pity: 0 }, silver: { freeAt: 0, pity: 0 }, obsidian: { freeAt: 0, pity: 0 }, prism: { pity: 0 } },
      quest: { day: '', runs: 0, kills: 0, bosses: 0, combo: 0, claimed: {} }, total: { kills: 0, bosses: 0, runs: 0, bestWave: 0, bestCombo: 0, claimed: {} },
      opt: { mute: false, bgm: true }, seenTip: false,
    };
  },
  load() {
    try { const t = localStorage.getItem(SAVE_KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) { const old = !o.weapons; this.s = Object.assign(this.fresh(), o); this.migrate(old); this.tick(); return; } } } catch (e) {}
    this.s = this.fresh();
  },
  /* 예전 저장(별 0~8)을 레벨 1~4로 옮긴다. 참고 영상의 2·5·8성 = 능력 Lv.2·3·4 */
  migrate(oldWeapons) {
    const s = this.s;
    if (oldWeapons) {
      // 공용 무기 저장을 신 전용으로 옮긴다: 끼고 있던 무기는 출전 신의 것, 나머지는 헤르메스의 것
      s.weapons = { [s.god]: s.equip.weapon }; s.weaponLv = { [s.god]: s.slotLv.weapon };
      for (const it of s.inv) if (GEAR[it.d].slot === 'weapon') it.god = it.uid === s.equip.weapon ? s.god : 'hermes';
      for (const g of GODS) if (s.gods[g.id] && s.gods[g.id].own) this.grantWeapon(g.id);
    }
    // 챕터가 6 → 12개로 늘었다. best는 예전엔 통산 웨이브, 지금은 그 챕터에서 넘은 판 수(0~6)
    for (let i = 0; i < CHAPTERS; i++) { s.cleared[i] = !!s.cleared[i]; s.best[i] = s.cleared[i] ? STAGES : s.bestV === 2 ? Math.min(STAGES, s.best[i] || 0) : 0; }
    s.bestV = 2;
    s.chest.god = s.chest.god || { freeAt: 0, pity: 0 };
    for (const g of Object.values(s.gods)) if (g.level === undefined) { const a = g.star || 0; g.level = 1 + (a >= 2) + (a >= 5) + (a >= 8); delete g.star; }
    for (const k of Object.keys(s.slotLv)) s.slotLv[k] = Math.min(LV_MAX, s.slotLv[k]);
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch (e) {} },
  reset() { this.s = this.fresh(); this.save(); },
  /* 시간 흐름: 에너지 회복, 하루 초기화 */
  tick() {
    const s = this.s, now = Date.now(), ev = ENERGY.regenMin * 60 * 1000;
    if (s.energy < 30) { const n = Math.floor((now - s.energyAt) / ev); if (n > 0) { s.energy = Math.min(30, s.energy + n); s.energyAt += n * ev; } } else s.energyAt = now;
    const day = new Date().toISOString().slice(0, 10);
    if (s.quest.day !== day) s.quest = { day, runs: 0, kills: 0, bosses: 0, combo: 0, claimed: {} };
  },
  item(uid) { return this.s.inv.find(i => i.uid === uid) || null; },
  equipped(slot, god) { const u = slot === 'weapon' && god ? this.weaponOf(god) : this.s.equip[slot]; return u ? this.item(u) : null; },
  levelOf(slot, god) { return slot === 'weapon' && god ? this.weaponLvOf(god) : this.s.slotLv[slot]; },
  isEquipped(uid) { return Object.values(this.s.equip).includes(uid) || Object.values(this.s.weapons).includes(uid); },
  /* 신 전용 무기 */
  weaponOf(god) { const s = this.s; return god === s.god ? s.equip.weapon : s.weapons[god] || null; },
  weaponLvOf(god) { const s = this.s; return god === s.god ? s.slotLv.weapon : s.weaponLv[god] || 1; },
  grantWeapon(id) { const s = this.s; if (s.weapons[id]) return; const it = this.addItem('weapon_a', 0, id); it.isNew = false; s.weapons[id] = it.uid; s.weaponLv[id] = s.weaponLv[id] || 1; if (id === s.god) { s.equip.weapon = it.uid; s.slotLv.weapon = s.weaponLv[id]; } },
  rollWeaponGod() { let r = Math.random(); for (const g of GODS) { r -= WEAPON_RATE[g.rank]; if (r < 0) return g.id; } return GODS[0].id; },
  /* 계정 보너스: 이 신이 모두에게 주는 몫과 전체 합 */
  godShare(id) { const l = this.godLv(id); if (!l) return { atk: 0, hp: 0 }; const w = this.item(this.weaponOf(id)), base = ACCOUNT.unlock + (l - 1) * ACCOUNT.perLv; return { atk: base + (w ? ACCOUNT.weaponGrade[w.g] + (this.weaponLvOf(id) - 1) * ACCOUNT.weaponLv : 0), hp: base }; },
  accountBonus() { const o = { atk: 0, hp: 0 }; for (const g of GODS) { const b = this.godShare(g.id); o.atk += b.atk; o.hp += b.hp; } return o; },
  iconOf(it) { const d = it.d || it, g = GEAR[d]; return g.slot === 'weapon' ? 'w_' + (it.god || this.s.god) : g.icon; },
  /* 장비 한 개의 기본 수치 */
  itemStat(it) { const G = GEAR[it.d], S = SLOT_BY[G.slot]; return { stat: S.stat, val: S.base[it.g] }; },
  itemSkills(it) { return GEAR[it.d].skills.map(([g, t, k, v]) => ({ g, t, k, v, on: it.g >= g })); },
  lvCap() { return LV_MAX; },
  /* 슬롯 레벨 수치. 장비를 바꿔도 칸에 남는다. 장비를 빼면 보너스도 쉰다 */
  slotBonus(slot, god) { const S = SLOT_BY[slot]; return this.equipped(slot, god) ? Math.round((this.levelOf(slot, god) - 1) * S.perLv) : 0; },
  costAt(l) { return { gold: Math.round(40 + 10 * l + .45 * l * l), scroll: 1 + Math.floor(l / 10) }; },   // 레벨 l → l+1 비용
  upgradeCost(slot, god) { return this.costAt(this.levelOf(slot, god)); },
  canUpgrade(slot, god) { const c = this.upgradeCost(slot, god), s = this.s; return !!this.equipped(slot, god) && this.levelOf(slot, god) < this.lvCap(slot) && s.gold >= c.gold && s.scrolls[slot] >= c.scroll; },
  upgrade(slot, god) {
    if (!this.canUpgrade(slot, god)) return false;
    const c = this.upgradeCost(slot, god), s = this.s; s.gold -= c.gold; s.scrolls[slot] -= c.scroll;
    if (slot === 'weapon') { const id = god || s.god, l = this.weaponLvOf(id) + 1; s.weaponLv[id] = l; if (id === s.god) s.slotLv.weapon = l; } else s.slotLv[slot]++;
    this.save(); return true;
  },
  /* 무기는 그 무기의 주인 신에게 끼운다. 신이 없으면 낄 수 없다 */
  equip(uid) {
    const it = this.item(uid), s = this.s; if (!it) return false; const slot = GEAR[it.d].slot;
    if (slot === 'weapon') { const id = it.god || s.god; if (!this.godLv(id) && id !== s.god) return false; s.weapons[id] = uid; if (id === s.god) s.equip.weapon = uid; }
    else s.equip[slot] = uid;
    it.isNew = false; this.save(); return true;
  },
  unequip(slot, god) { const s = this.s; if (slot === 'weapon') { const id = god || s.god; s.weapons[id] = null; if (id === s.god) s.equip.weapon = null; } else s.equip[slot] = null; this.save(); },
  /* 내 능력치: 기본 + 장비 + 슬롯 레벨 + 등급 스킬 + 재능 + 신 */
  stats(godId) {
    const s = this.s, god = GOD_BY[godId || s.god], lv = this.godLv(god.id) || 1;
    const o = { atk: 10, hp: 100, atkPct: 0, hpPct: 0, firePct: 0, crit: .05, critDmg: .5, shardPct: 0, goldPct: 0, runPct: 0, gaugePct: 0, stompPct: 0, dmgCut: 0, invPct: 0, healPct: 0, highPct: 0, bossPct: 0, ammo: 0, waveHeal: 0, pierce: 0, heavy: 0, every8: 0, stompWave: 0, jumpWave: 0, lastShot: 0, lastStand: 0, thorns: 0, splash: 0, dodge: 0, breaker: 0, homing: 0, leech: 0, chain: 0, comboStrike: 0 };
    const addEff = (k, v) => { if (k in o) o[k] += v; };
    for (const S of SLOTS) {
      const it = this.equipped(S.id, god.id); if (!it) continue;
      o[S.stat] += S.base[it.g] + this.slotBonus(S.id, god.id);
      for (const sk of this.itemSkills(it)) if (sk.on) addEff(sk.k, sk.v);
    }
    for (const T_ of TALENTS) { const l = s.talent[T_.id] || 0, e = T_.effect(l); for (const k in e) addEff(k, e[k]); }
    for (const k in god.p) addEff(k, god.p[k]);
    GOD_LV[god.id].slice(0, lv - 1).forEach(([, e]) => { for (const k in e) addEff(k, e[k]); });
    const acc = this.accountBonus(); o.atkPct += acc.atk; o.hpPct += acc.hp;
    const star = 1 + (lv - 1) * GOD_LV_BONUS;
    if (o.heavy) { o.atkPct += .15; o.firePct += .15; }
    o.atk = Math.round(o.atk * (1 + o.atkPct) * star); o.hp = Math.round(o.hp * (1 + o.hpPct) * star);
    o.unarmed = !this.weaponOf(god.id);
    if (o.unarmed) o.atk = Math.round(o.atk * .6);
    o.power = Math.round(o.atk * 8 + o.hp * 1.2 + o.crit * 200);
    o.god = god;
    return o;
  },
  power() { return this.stats().power; },
  /* 지금 낀 것보다 나으면 초록 화살표 */
  isBetter(it) { const w = GEAR[it.d].slot === 'weapon'; if (w && !this.godLv(it.god)) return false; const cur = this.equipped(GEAR[it.d].slot, w ? it.god : null); return !cur || it.g > cur.g; },
  anyUpgrade() { return SLOTS.some(S => this.canUpgrade(S.id)); },
  /* 일괄 장착: 칸마다 지금 낀 것보다 등급이 높은 것만 끼운다(초록 화살표와 같은 기준). 무기는 해금한 신마다 그 신의 전용 무기 중 가장 높은 것 */
  bestPlan() {
    const s = this.s, plan = [], num = u => +u.slice(1);
    const pick = (list, cur) => { const b = list.sort((a, c) => c.g - a.g || num(c.uid) - num(a.uid))[0]; return b && (!cur || b.g > cur.g) ? b : null; };
    const free = slot => s.inv.filter(i => GEAR[i.d].slot === slot && !this.isEquipped(i.uid));
    for (const S of SLOTS) {
      if (S.id !== 'weapon') { const cur = this.equipped(S.id), b = pick(free(S.id), cur); if (b) plan.push({ slot: S.id, god: null, uid: b.uid, from: cur ? cur.g : -1, to: b.g }); continue; }
      for (const g of GODS) {
        if (!this.godLv(g.id) && g.id !== s.god) continue;
        const cur = this.equipped('weapon', g.id), b = pick(free('weapon').filter(i => i.god === g.id), cur);
        if (b) plan.push({ slot: 'weapon', god: g.id, uid: b.uid, from: cur ? cur.g : -1, to: b.g });
      }
    }
    return plan;
  },
  equipBest() { const p = this.bestPlan(); for (const x of p) this.equip(x.uid); return p; },
  /* 일괄 업그레이드(장비 칸 팝업): 이 칸 하나를 골드나 두루마리가 떨어질 때까지, 최대 레벨까지 올린다 */
  slotUpPlan(slot, god) {
    const s = this.s, from = this.levelOf(slot, god), cap = this.lvCap(slot); let l = from, gold = 0, scroll = 0, why = '';
    if (!this.equipped(slot, god)) return { from, to: from, gold, scroll, why: '장착 안 됨' };
    while (l < cap) { const c = this.costAt(l); if (s.gold - gold < c.gold) { why = '골드 부족'; break; } if (s.scrolls[slot] - scroll < c.scroll) { why = '두루마리 부족'; break; } gold += c.gold; scroll += c.scroll; l++; }
    if (l >= cap) why = '최대 레벨';
    return { from, to: l, gold, scroll, why };
  },
  upgradeMax(slot, god) { const p = this.slotUpPlan(slot, god); let n = 0; for (let i = p.from; i < p.to; i++) if (this.upgrade(slot, god)) n++; return { ...p, n }; },
  /* 분해: 장비를 그 부위 강화 두루마리와 골드로 바꾼다(고급 1장 · 희귀 3장 · 에픽 9장, 골드는 장당 20). 무기·신화·착용 중인 장비는 분해하지 않는다 */
  salvageGain(it) { const k = [1, 3, 9][it.g] || 0; return { slot: GEAR[it.d].slot, scroll: k, gold: 20 * k }; },
  canSalvage(it) { return !!it && it.g < MYTH && GEAR[it.d].slot !== 'weapon' && !this.isEquipped(it.uid); },
  salvage(uids) {
    const s = this.s, out = { n: 0, gold: 0, scrolls: {} };
    for (const u of uids) {
      const it = this.item(u); if (!this.canSalvage(it)) continue;
      const g = this.salvageGain(it); s.inv = s.inv.filter(o => o.uid !== u); s.scrolls[g.slot] += g.scroll; s.gold += g.gold;
      out.n++; out.gold += g.gold; out.scrolls[g.slot] = (out.scrolls[g.slot] || 0) + g.scroll;
    }
    if (out.n) this.save(); return out;
  },
  /* 일괄 분해 대상: 고른 등급만. 지금 낀 것보다 나은 장비(초록 화살표)와 바로 합성할 수 있는 3개 묶음은 남긴다 */
  salvageList(grades) {
    const groups = {};
    for (const i of this.s.inv) if (this.canSalvage(i) && grades.includes(i.g) && !this.isBetter(i)) (groups[i.d + ':' + i.g] = groups[i.d + ':' + i.g] || []).push(i);
    return Object.values(groups).flatMap(g => g.slice(Math.floor(g.length / 3) * 3));
  },
  /* 합성: 같은 장비 + 재료 2개. 에픽 → 신화는 같은 칸의 에픽이면 된다 */
  mergeNeed(it) { if (it.g >= MYTH) return null; return { n: 2, sameSlot: it.g === MYTH - 1 }; },
  mergeMats(it) {
    const need = this.mergeNeed(it); if (!need) return [];
    const slot = GEAR[it.d].slot;
    return this.s.inv.filter(o => o.uid !== it.uid && !this.isEquipped(o.uid) && o.g === it.g && (need.sameSlot ? GEAR[o.d].slot === slot : o.d === it.d) && (slot !== 'weapon' || o.god === it.god));
  },
  merge(uid, matUids) {
    const it = this.item(uid); if (!it || it.g >= MYTH) return null;
    const mats = matUids.map(u => this.item(u)).filter(Boolean);
    if (mats.length !== 2) return null;
    this.s.inv = this.s.inv.filter(o => !matUids.includes(o.uid));
    it.g++; it.isNew = true; this.save(); return it;
  },
  /* 일괄 합성: 낮은 등급부터 3개씩 묶는다. 착용 중인 장비는 재료로 쓰지 않는다 */
  mergeAll() {
    const results = []; let guard = 0, done = true;
    while (done && guard++ < 200) {
      done = false;
      for (const it of this.s.inv.slice().sort((a, b) => a.g - b.g)) {
        if (it.g >= 2) continue;   // 신화는 재료를 직접 고른다
        const m = this.mergeMats(it);
        if (m.length >= 2) { const r = this.merge(it.uid, m.slice(0, 2).map(o => o.uid)); if (r) { results.push(r); done = true; break; } }
      }
    }
    return results;
  },
  addItem(d, g, god) { const s = this.s, it = { uid: 'u' + (s.nextUid++), d, g, isNew: true }; if (GEAR[d].slot === 'weapon') it.god = god || s.god; s.inv.push(it); return it; },
  rollGrade(C, forceEpic) {
    if (forceEpic) return 2;
    let r = Math.random(); for (let i = 0; i < 3; i++) { if (r < C.rate[i]) return i; r -= C.rate[i]; } return 0;
  },
  /* 뽑기. 돌려주는 값 = 얻은 것 목록. 비용을 못 내면 null */
  pull(chestId, count, free) {
    const s = this.s, C = CHESTS.find(c => c.id === chestId); if (!C) return null;
    if (!free) { const price = count >= 10 ? C.ten : C.one; if (s[C.cur] < price) return null; s[C.cur] -= price; }
    else s.chest[chestId].freeAt = Date.now() + C.free * 1000;
    const out = [], st = s.chest[chestId], keys = Object.keys(GEAR).filter(k => C.slots.includes(GEAR[k].slot)), feat = this.featuredGod();
    for (let i = 0; i < count; i++) {
      let force = false;
      if (C.pity) { st.pity = (st.pity || 0) + 1; if (st.pity >= C.pity) force = true; }
      const g = this.rollGrade(C, force); if (g === 2) st.pity = 0;
      const d = keys[Math.floor(Math.random() * keys.length)], wgod = GEAR[d].slot !== 'weapon' ? null : C.featured && Math.random() < C.featured ? feat : this.rollWeaponGod();
      out.push({ type: 'item', item: this.addItem(d, g, wgod) });
      if (C.shard[0] && Math.random() < C.shard[0]) {
        const pool = GODS.filter(x => x.id !== 'hermes'), pick = C.featured ? GOD_BY[feat] : pool[Math.floor(Math.random() * pool.length)];
        // 전설 조각은 더 귀하다
        const amt = pick.rank === '전설' ? Math.ceil(C.shard[1] * .5) : C.shard[1];
        this.addShard(pick.id, amt); out.push({ type: 'shard', god: pick.id, n: amt });
      }
      if (C.scroll[0] && Math.random() < C.scroll[0]) {
        const sl = GEAR[d].slot, n = C.scroll[1] + Math.floor(Math.random() * (C.scroll[2] - C.scroll[1] + 1));
        s.scrolls[sl] += n; out.push({ type: 'scroll', slot: sl, n });
      }
    }
    this.save(); return out;
  },
  /* 환채석 상자의 이번 회차 신: FEATURE_DAYS일마다 순서대로 바뀐다. left = 남은 밀리초 */
  featuredGod(now = Date.now()) { const per = FEATURE_DAYS * 864e5; return GODS[Math.floor(now / per) % GODS.length].id; },
  featuredLeft(now = Date.now()) { const per = FEATURE_DAYS * 864e5; return per - now % per; },
  /* 신의 소환 */
  pullGod(count, free) {
    const s = this.s, C = GOD_CHEST, st = s.chest.god = s.chest.god || { freeAt: 0, pity: 0 };
    if (free) { if ((st.freeAt || 0) > Date.now()) return null; st.freeAt = Date.now() + C.free * 1000; }
    else { const price = count >= 10 ? C.ten : C.one; if (s.gem < price) return null; s.gem -= price; }
    const out = [];
    for (let i = 0; i < count; i++) {
      st.pity = (st.pity || 0) + 1;
      let rank = '전설'; const x = Math.random();
      if (st.pity < C.pity) rank = x < C.rate['레어'] ? '레어' : x < C.rate['레어'] + C.rate['에픽'] ? '에픽' : '전설';
      if (rank === '전설') st.pity = 0;
      const pool = GODS.filter(g => g.rank === rank), pick = pool[Math.floor(Math.random() * pool.length)], n = C.shard[rank];
      this.addShard(pick.id, n); out.push({ type: 'shard', god: pick.id, n });
    }
    this.save(); return out;
  },
  addShard(id, n) { const s = this.s, g = s.gods[id] = s.gods[id] || { own: false, level: 1, shard: 0 }; g.shard += n; },
  godInfo(id) { return this.s.gods[id] || { own: false, level: 1, shard: 0 }; },
  godLv(id) { const g = this.godInfo(id); return g.own ? (g.level || 1) : 0; },
  /* 해금 또는 레벨 업에 드는 조각. 최대 레벨이면 null */
  godCost(id) { const l = this.godLv(id); return l === 0 ? GOD_UNLOCK : l < GOD_LV_MAX ? GOD_LV_COST[GOD_BY[id].rank][l - 1] : null; },
  godReady() { return GODS.some(g => { const c = this.godCost(g.id); return c !== null && this.godInfo(g.id).shard >= c; }); },
  godUp(id) {
    const g = this.s.gods[id] = this.godInfo(id), c = this.godCost(id);
    if (c === null || g.shard < c) return false;
    g.shard -= c; if (!g.own) { g.own = true; g.level = 1; this.grantWeapon(id); } else g.level = (g.level || 1) + 1;
    this.save(); return true;
  },
  selectGod(id) { const s = this.s; if (!this.godInfo(id).own) return; s.weapons[s.god] = s.equip.weapon; s.weaponLv[s.god] = s.slotLv.weapon; s.god = id; s.equip.weapon = s.weapons[id] || null; s.slotLv.weapon = s.weaponLv[id] || 1; this.save(); },
  talentUp(id) {
    const T_ = TALENTS.find(t => t.id === id), l = this.s.talent[id] || 0;
    if (l >= T_.max) return false; const c = T_.cost(l); if (this.s.gold < c) return false;
    this.s.gold -= c; this.s.talent[id] = l + 1; this.save(); return true;
  },
  /* 임무 */
  quests() {
    const q = this.s.quest, t = this.s.total;
    return [
      { id: 'd_run', daily: true, name: '오늘 1판 통과', cur: q.runs, need: 1, gem: 15, gold: 200 },
      { id: 'd_kill', daily: true, name: '오늘 괴물 100마리 처치', cur: q.kills, need: 100, gem: 25, gold: 300 },
      { id: 'd_boss', daily: true, name: '오늘 보스 1체 처치', cur: q.bosses, need: 1, gem: 35, gold: 400 },
      { id: 'd_combo', daily: true, name: '오늘 15 콤보 달성', cur: q.combo, need: 15, gem: 25, gold: 300 },
      { id: 'a_w3', name: '챕터 1 클리어', cur: this.clearedN(), need: 1, gem: 100, gold: 500 },
      { id: 'a_w6', name: '챕터 3 클리어', cur: this.clearedN(), need: 3, gem: 200, gold: 1000 },
      { id: 'a_w9', name: '챕터 6 클리어', cur: this.clearedN(), need: 6, gem: 300, gold: 2000 },
      { id: 'a_w15', name: '심층 챕터 9 클리어', cur: this.clearedN(), need: 9, gem: 600, gold: 4000 },
      { id: 'a_w36', name: '심층 챕터 12 클리어', cur: this.clearedN(), need: 12, gem: 1000, gold: 8000 },
      { id: 'a_k1000', name: '누적 1000마리 처치', cur: t.kills, need: 1000, gem: 200, gold: 1500 },
      { id: 'a_c30', name: '30 콤보 달성', cur: t.bestCombo, need: 30, gem: 200, gold: 1500 },
    ];
  },
  questClaimed(q) { return q.daily ? !!this.s.quest.claimed[q.id] : !!this.s.total.claimed[q.id]; },
  questClaim(id) {
    const q = this.quests().find(x => x.id === id); if (!q || q.cur < q.need || this.questClaimed(q)) return false;
    (q.daily ? this.s.quest : this.s.total).claimed[id] = true; this.s.gem += q.gem; this.s.gold += q.gold; this.save(); return true;
  },
  questBadge() { return this.quests().some(q => q.cur >= q.need && !this.questClaimed(q)); },
  /* 판 시작·끝 */
  canStart() { return this.s.energy >= 5 && !!this.weaponOf(this.s.god); },
  spendEnergy() { const s = this.s; if (s.energy >= 30) s.energyAt = Date.now(); s.energy -= 5; this.save(); },
  /* 판 결과 반영. r = {wave, kills, bosses, combo, chapter} */
  /* 정산 없이 보상 크기만 계산한다. 무작위 없음. startWave가 없으면 그 챕터의 첫 웨이브로 본다 */
  runReward(r) {
    const c = r.chapter || 0, start = r.startWave !== undefined ? r.startWave : 1 + c * STAGES, cleared = Math.max(0, r.wave - start), R_ = REWARD;
    let gold = r.kills * R_.killGold, left = r.bosses;
    for (let w = start; w < r.wave; w++) gold += R_.waveGold(w);
    for (let w = start; left > 0; w++) if (isBossWave(w)) { gold += R_.bossGold(w); left--; }
    const nScroll = Math.min(R_.scrollMax, Math.round((cleared * R_.scrollPerWave + r.bosses * R_.scrollPerBoss) * (1 + R_.scrollChapter * c)));
    const nGear = Math.min(R_.gearMax, Math.floor(cleared / R_.gearEveryWaves) + r.bosses);
    return { cleared, gold, nScroll, nGear, gem: r.bosses * R_.gemPerBoss };
  },
  settle(r) {
    const s = this.s, st = this.stats(), q = s.quest, t = s.total, R = this.runReward(r), done = R.cleared > 0 || r.bosses > 0;
    const first = r.bosses > 0 && !s.cleared[r.chapter];
    const gold = Math.round(R.gold * (1 + st.goldPct));
    const gem = R.gem + (first ? REWARD.gemFirstClear : 0), scrolls = {}, drops = [];
    s.gold += gold; s.gem += gem;
    const nScroll = R.nScroll;
    for (let i = 0; i < nScroll; i++) { const sl = SLOTS[Math.floor(Math.random() * 6)].id; scrolls[sl] = (scrolls[sl] || 0) + 1; s.scrolls[sl]++; }
    // 웨이브마다 장비를 조금씩 떨어뜨린다. 보스를 잡으면 더 좋은 등급
    const keys = Object.keys(GEAR), nGear = R.nGear;
    for (let i = 0; i < nGear; i++) { const g = Math.random() < REWARD.gearEpicBoss * r.bosses ? 2 : Math.random() < REWARD.gearRare + REWARD.gearRareBoss * r.bosses ? 1 : 0; const d = keys[Math.floor(Math.random() * keys.length)]; drops.push(this.addItem(d, g, GEAR[d].slot === 'weapon' ? this.rollWeaponGod() : null)); }
    if (r.bosses) s.energy += ENERGY.clearBack;
    // 시작하자마자 포기한 판은 임무·기록에 넣지 않는다
    if (done) q.runs++;
    q.kills += r.kills; q.bosses += r.bosses; q.combo = Math.max(q.combo, r.combo);
    t.runs++; t.kills += r.kills; t.bosses += r.bosses; if (done) t.bestWave = Math.max(t.bestWave, r.wave); t.bestCombo = Math.max(t.bestCombo, r.combo);
    if (done) s.best[r.chapter] = r.clear || r.bosses > 0 ? STAGES : Math.min(STAGES, Math.max(s.best[r.chapter] || 0, R.cleared));
    // 첫 보스를 잡으면 다음 챕터가 열린다
    if (r.bosses > 0) { s.cleared[r.chapter] = true; }
    this.save();
    return { gold, gem, scrolls, drops, cleared: R.cleared, first };
  },
  clearedN() { let n = 0; while (n < CHAPTERS && this.s.cleared[n]) n++; return n; },
  chapterOpen(i) { return i === 0 || (i < CHAPTERS && !!this.s.cleared[i - 1]); },
};
Meta.load();
