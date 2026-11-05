/* 로비 UI: 궁수의 전설 2 구성(위쪽 재화 띠 · 아래 5칸 메뉴 · 장비 6칸 · 대장간 · 상자). 게임 규칙은 meta.js에 있고 여기는 화면만 다룬다 */
'use strict';
const uiIcon = n => `assets/ui/${n}.webp`;
/* 터지는 빛: 고리 하나와 불꽃 n개. 무대 좌표로 맨 위에 그리고 저절로 사라진다 */
function sparkBurst(el, col, n = 14, size = 1) {
  const st = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect(), w = document.createElement('div'); w.className = 'burst';
  w.style.left = (r.left + r.width / 2 - st.left) + 'px'; w.style.top = (r.top + r.height / 2 - st.top) + 'px'; w.style.setProperty('--c', col);
  let h = `<i class="brg" style="--s:${size}"></i><i class="brg b2" style="--s:${size * 1.4}"></i>`;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + Math.random() * .4, d = (14 + Math.random() * 16) * size; h += `<b class="spk" style="--x:${(Math.cos(a) * d).toFixed(1)};--y:${(Math.sin(a) * d).toFixed(1)};animation-delay:${Math.round(Math.random() * 70)}ms"></b>`; }
  w.innerHTML = h; $('stage').append(w); setTimeout(() => w.remove(), 900);
}
function powerPill(p0, p1) {
  if (p1 === p0) return; const old = document.querySelector('.powpill'); if (old) old.remove();
  const el = document.createElement('div'), up = p1 > p0; el.className = 'powpill oL'; el.innerHTML = `<img src="${uiIcon('cur_power')}" alt=""><span>${p1}</span><em class="${up ? '' : 'dn'}">${up ? '▲' : '▼'}${Math.abs(p1 - p0)}</em>`;
  $('stage').append(el); setTimeout(() => el.remove(), 1300);
}
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
const itemIconSrc = it => uiIcon(Meta.iconOf(it));
const gradeVars = g => `--c:${GRADES[g].color};--d:${GRADES[g].dark}`;
function itemTile(it, extra = '') {
  const dim = extra.includes('dim'), better = !dim && !Meta.isEquipped(it.uid) && Meta.isBetter(it);
  return `<button class="it ${extra}" data-uid="${it.uid}" style="${gradeVars(it.g)}"><img src="${itemIconSrc(it)}" alt="">${it.god ? `<img class="wgod ${Meta.godLv(it.god) ? '' : 'no'}" src="assets/god/${it.god}/big_bare.webp" alt="">` : ''}${it.isNew ? '<span class="new"></span>' : ''}${better ? '<span class="up"></span>' : ''}</button>`;
}
const UI = {
  tab: 'battle', sub: 'gear', chapterView: 0, sort: 'grade',
  boot() {
    Meta.tick();
    sfx.muted = !!Meta.s.opt.mute;
    this.chapterView = Meta.s.chapter;
    this.buildNav(); this.go('battle');
    const dev = /[?&]dev=1/.test(location.search);
    if (dev) { $('gear').style.display = 'block'; }
    $('pause').onclick = () => this.pause();
    $('bLearned').onclick = () => this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">얻은 능력</div><button class="x" data-close>✕</button>${learnedHTML()}</div>`);
    setInterval(() => { if ($('lobby').classList.contains('on')) { Meta.tick(); this.refreshTop(); } }, 5000);
    // 타이틀: 첫 터치에서 오디오를 깨우고 로비로
    const go = () => { sfx.init(); sfx.card(); $('mTitle').classList.remove('on'); $('lobby').classList.add('on'); sfx.bgmFor && sfx.bgmFor('lobby'); GODS.forEach(g => { if (Meta.godLv(g.id)) loadGod(g.id); }); loadChapterMon(); };
    // 요청이 끝나지 않아도 15초 뒤에는 넘어갈 수 있다. 늦은 그림은 도착하는 대로 나타난다
    const wait0 = performance.now(), wait = setInterval(() => { const keys = Object.keys(IMG), done = keys.filter(k => IMG[k].complete).length, ready = done >= keys.length * .85 || performance.now() - wait0 > 15000; $('tgo').textContent = ready ? '화면을 터치하세요' : `불러오는 중 ${Math.round(done / keys.length * 100)}%`; if (ready) { clearInterval(wait); $('mTitle').onclick = go; } }, 120);
    addEventListener('beforeunload', () => Meta.save());
  },
  toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 1500); },
  buildNav() {
    const items = [['shop', 'nav_shop', '상점'], ['gear', 'nav_gear', '장비'], ['battle', 'nav_battle', '전투'], ['quest', 'nav_quest', '임무'], ['talent', 'nav_talent', '재능']];
    $('nav').innerHTML = items.map(([k, ic, nm]) => `<button class="nb" data-tab="${k}"><img src="${uiIcon(ic)}" alt=""><span class="oL">${nm}</span><i class="nbadge" data-b="${k}"></i></button>`).join('');
    $('nav').onclick = e => { const b = e.target.closest('.nb'); if (b) { sfx.init(); sfx.tap(); this.go(b.dataset.tab); } };
    $('screens').innerHTML = items.map(([k]) => `<div class="screen" id="s_${k}"></div>`).join('');
    this.refreshTop();
  },
  go(tab) { this.tab = tab; [...$('nav').children].forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); for (const s of $('screens').children) s.classList.toggle('on', s.id === 's_' + tab); this.render(); },
  render() { this['r_' + this.tab](); this.refreshTop(); },
  refreshTop() {
    const s = Meta.s, st = Meta.stats();
    $('topbar').innerHTML = `<button class="ava" data-go="gods"><img src="assets/god/${s.god}/big_bare.webp" alt=""></button><div class="tb-r"><div class="tb-1"><div class="cur oL"><img src="${uiIcon('cur_energy')}" alt="">${s.energy}/30</div><div class="cur oL"><img src="${uiIcon('cur_gold')}" alt="">${fmt(s.gold)}</div><div class="cur oL"><img src="${uiIcon('cur_gem')}" alt="">${fmt(s.gem)}</div></div><div class="tb-2"><span class="oL">${s.name}</span><span class="pw oL"><img src="${uiIcon('cur_power')}" alt="">${st.power}</span><button class="set" data-go="set">⚙</button></div></div>`;
    $('topbar').onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; sfx.tap(); if (b.dataset.go === 'gods') { this.sub = 'gods'; this.go('gear'); } else this.settings(); };
    const qb = document.querySelector('.nb[data-tab=quest]'), gb = document.querySelector('.nb[data-tab=gear]');
    const setB = (el, on) => { if (!el) return; let d = el.querySelector('.badge'); if (on && !d) { d = document.createElement('i'); d.className = 'badge'; d.textContent = '!'; el.appendChild(d); d.style.right = '12%'; d.style.top = '6%'; } else if (!on && d) d.remove(); };
    setB(qb, Meta.questBadge()); setB(gb, Meta.anyUpgrade() || Meta.godReady() || s.inv.some(i => i.isNew));
  },

  /* ───── 전투 ───── */
  r_battle() {
    const v = this.chapterView, B = BIOMES[v], open = Meta.chapterOpen(v), s = Meta.s, el = $('s_battle');
    el.className = 'screen on battle';
    el.innerHTML = `<div class="ch-title oL"><span class="ch-no">${v + 1}</span>${B.name}</div><div class="ch-sub oL">${B.sub}</div><div class="ch-best oL">최고 기록: 웨이브 ${s.best[v] || 0}</div>
      <div class="isle-wrap"><img class="isle ${open ? '' : 'lock'}" src="assets/ui/isle${v + 1}.webp" alt=""><button class="arrow l oL" data-d="-1" ${v === 0 ? 'disabled' : ''}>‹</button><button class="arrow r oL" data-d="1" ${v === BIOMES.length - 1 ? 'disabled' : ''}>›</button>${open ? '' : `<div class="lockmsg oL">${BIOMES[v - 1].name} 보스를 처치하면 열립니다</div>`}</div>
      <div class="startbar"><button class="btn gold start" id="bStart" ${open ? '' : 'disabled'}><span>시작</span><small><img src="${uiIcon('cur_energy')}" alt="">×5</small></button><div class="bsub">3웨이브마다 보스가 나타납니다</div></div>`;
    el.onclick = e => {
      const a = e.target.closest('.arrow'); if (a && !a.disabled) { sfx.tap(); this.chapterView = clamp(v + +a.dataset.d, 0, BIOMES.length - 1); this.r_battle(); return; }
      if (e.target.closest('#bStart')) this.start();
    };
  },
  start() {
    const s = Meta.s; Meta.tick(); sfx.init();
    if (!Meta.chapterOpen(this.chapterView)) return;
    if (!s.equip.weapon) { this.toast('무기를 장착해야 출발할 수 있습니다'); this.sub = 'gear'; this.go('gear'); return; }
    if (s.energy < 5) { this.toast('에너지가 모자랍니다. 상점에서 채울 수 있습니다'); return; }
    Meta.spendEnergy(); s.chapter = this.chapterView; Meta.save(); sfx.start();
    startRun({ chapter: this.chapterView });
  },
  enterGame() { $('lobby').classList.remove('on'); $('pause').classList.add('on'); $('mResult').classList.remove('on'); },
  backToLobby() { game.state = 'title'; game.p = null; $('pause').classList.remove('on'); $('mResult').classList.remove('on'); $('mPause').classList.remove('on'); $('lobby').classList.add('on'); this.go('battle'); sfx.bgmFor && sfx.bgmFor('lobby'); ctx.clearRect(0, 0, view.W, view.H); },
  pause() {
    const g = game; if (g.state !== 'play') return;
    g.state = 'pause'; input.clearAll(); sfx.tap();
    const st = g.st, p = g.p;
    const el = $('mPause'); el.classList.add('on');
    el.innerHTML = `<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">일시정지</div><div class="ip-st">능력치</div><div class="ip-sk"><div>공격력 ${p.atk} · 체력 ${p.hp}/${p.maxHp} · 탄창 ${p.maxAmmo}</div><div>웨이브 ${g.wave} · 처치 ${g.kills} · 파편 ${p.shards}</div></div><div class="ip-st">얻은 능력</div>${learnedHTML()}<div class="ip-acts"><button class="btn red" id="pQuit">포기</button><button class="btn gray" id="pMute">소리 ${sfx.muted ? '켜기' : '끄기'}</button><button class="btn green" id="pGo">계속</button></div></div>`;
    $('pGo').onclick = () => { el.classList.remove('on'); g.state = 'play'; input.blockUntil = performance.now() + 120; };
    $('pMute').onclick = e => { sfx.setMute(!sfx.muted); e.target.textContent = `소리 ${sfx.muted ? '켜기' : '끄기'}`; };
    $('pQuit').onclick = () => { el.classList.remove('on'); finishRun(true); };
  },
  /* 죽은 뒤 이어하기. 횟수가 남았으면 창을 띄우고 true */
  offerContinue() {
    const g = game, n = g.contN || 0; if (n >= CONTINUE_COST.length) return false;
    g.state = 'continue'; input.clearAll();
    const cost = CONTINUE_COST[n], el = $('mCont'), can = Meta.s.gem >= cost; let left = CONTINUE_SEC, tm = 0;
    el.classList.add('on');
    el.innerHTML = `<div class="card-pop ct-pop" style="--c:#b0304a;--d:#6a1830"><div class="hd">이어하기</div><div class="ct-n oL" id="ctN">${left}</div><div class="ct-d">체력 50%와 탄창을 채우고 3초 동안 무적입니다.<br>주변 적과 탄이 사라집니다.</div><div class="ct-l">남은 횟수 ${CONTINUE_COST.length - n}회 · 보유 보석 ${fmt(Meta.s.gem)}</div><div class="ip-acts"><button class="btn gray" id="ctNo">포기</button><button class="btn green" id="ctYes" ${can ? '' : 'disabled'}><span class="pr oL"><img src="${uiIcon('cur_gem')}" alt="">${cost}</span>${can ? '' : '<span class="oL" style="font-size:calc(var(--u)*2.8)">보석 부족</span>'}</button></div></div>`;
    const close = () => { clearInterval(tm); el.classList.remove('on'); };
    const quit = () => { close(); sfx.tap(); finishRun(false); };
    tm = setInterval(() => { left--; const c = $('ctN'); if (c) c.textContent = left; if (left <= 0) quit(); else if (left <= 3) sfx.tap(); }, 1000);
    $('ctNo').onclick = quit;
    $('ctYes').onclick = () => { if (Meta.s.gem < cost) return; Meta.s.gem -= cost; Meta.save(); close(); revive(); };
    return true;
  },
  showResult(r, rw) {
    $('pause').classList.remove('on');
    const items = rw.drops.map(it => `<div class="it" style="${gradeVars(it.g)}"><img src="${itemIconSrc(it)}" alt=""></div>`).join('');
    const sc = Object.keys(rw.scrolls).map(k => `<div class="cu"><img src="${uiIcon('cur_scroll')}" alt=""><img class="mini" style="inset:auto;left:-6%;top:-6%;width:44%;height:44%" src="${uiIcon(k === 'weapon' ? 'w_' + Meta.s.god : k + '_a')}" alt=""><b class="oL">${rw.scrolls[k]}</b></div>`).join('');
    const el = $('mResult'); el.classList.add('on');
    el.innerHTML = `<div class="rs-t oL" style="color:${r.bosses ? '#ffd24a' : '#ff6a78'}">${r.bosses ? '심연을 뚫었다' : '심연에 떨어졌다'}</div>
      <div class="rs-g"><div><b class="oL">${rw.cleared}</b>통과 웨이브</div><div><b class="oL">${r.kills}</b>처치</div><div><b class="oL">${r.combo}</b>최대 콤보</div></div>
      <div class="rs-r"><h4>획득 보상</h4>${rw.first ? `<div class="rs-note first oL">첫 클리어 보너스 · 보석 +${REWARD.gemFirstClear}</div>` : ''}<div class="rs-items">${rw.gold ? `<div class="cu"><img src="${uiIcon('cur_gold')}" alt=""><b class="oL">${fmt(rw.gold)}</b></div>` : '<div class="rs-note">받은 보상이 없습니다</div>'}${rw.gem ? `<div class="cu"><img src="${uiIcon('cur_gem')}" alt=""><b class="oL">${rw.gem}</b></div>` : ''}${items}${sc}</div>${!rw.cleared && !r.bosses ? '<div class="rs-note">웨이브를 통과해야 스크롤과 장비를 받습니다</div>' : ''}</div>
      <button class="btn gold" id="rsOk" style="width:calc(var(--u)*56)">확인</button>`;
    $('rsOk').onclick = () => { sfx.tap(); this.backToLobby(); };
    sfx.reward();
  },

  /* ───── 장비 ───── */
  heroHTML() {
    const s = Meta.s, wi = Meta.equipped('weapon'), show = this.sub === 'gods' && this.godView ? this.godView : s.god, src = `assets/god/${show}/${Meta.godLv(show) && Meta.equipped('weapon', show) ? 'big_armed' : 'big_bare'}.webp`;
    return `<div class="aura" style="--ac:${wi ? GRADES[wi.g].glow : 'transparent'}"></div><div class="hero ${this._swap ? 'swap' : ''}"><img src="${src}" alt=""></div>`;
  },
  slotHTML(S) {
    const it = Meta.equipped(S.id), lv = Meta.s.slotLv[S.id], up = Meta.canUpgrade(S.id);
    if (!it) return `<button class="slot empty" data-slot="${S.id}"><span class="lv oL">Lv.${lv}</span><img class="ph" src="${uiIcon(S.id === 'weapon' ? 'w_' + Meta.s.god : S.id + '_a')}" alt=""></button>`;
    return `<button class="slot" data-slot="${S.id}"><span class="lv oL">Lv.${lv}</span><span class="it" style="position:absolute;inset:0;${gradeVars(it.g)}"><img src="${itemIconSrc(it)}" alt=""></span>${up ? '<span class="up"></span>' : ''}</button>`;
  },
  r_gear() {
    const s = Meta.s, godsTab = this.sub === 'gods', el = $('s_gear'), st = Meta.stats(godsTab && this.godView ? this.godView : s.god); el.className = 'screen on';
    const side = godsTab ? this.godPanelHTML() : `<div class="col l">${SLOTS.filter(x => x.side === 'L').map(x => this.slotHTML(x)).join('')}</div><div class="col r">${SLOTS.filter(x => x.side === 'R').map(x => this.slotHTML(x)).join('')}</div>`;
    const stage = `<div class="hero-stage ${godsTab ? 'gods-on' : ''}">${this.heroHTML()}${side}<div class="statbar oL"><img src="${uiIcon('cur_power')}" alt=""><span><span class="sl">공격력</span>${st.atk}</span><span style="width:calc(var(--u)*1)"></span><img src="${uiIcon('armor_a')}" alt=""><span><span class="sl">체력</span>${st.hp}</span><button class="iw" id="bInfo">i</button></div></div>`;
    const tabs = `<div class="sub-tabs"><button class="st oL ${this.sub === 'gods' ? 'on' : ''}" data-sub="gods">캐릭터</button><button class="st oL ${this.sub === 'gear' ? 'on' : ''}" data-sub="gear">장비${s.inv.some(i => i.isNew) ? '<i class="badge" style="top:8%;right:30%">!</i>' : ''}</button></div>`;
    el.innerHTML = stage + tabs + (this.sub === 'gear' ? this.gearPane() : this.godsPane());
    this._swap = false;
    el.onclick = e => this.gearClick(e);
  },
  gearPane() {
    const s = Meta.s, list = s.inv.filter(i => !Meta.isEquipped(i.uid));
    list.sort(this.sort === 'grade' ? (a, b) => b.g - a.g || SLOTS.findIndex(x => x.id === GEAR[a.d].slot) - SLOTS.findIndex(x => x.id === GEAR[b.d].slot) : (a, b) => SLOTS.findIndex(x => x.id === GEAR[a.d].slot) - SLOTS.findIndex(x => x.id === GEAR[b.d].slot) || b.g - a.g);
    const sc = SLOTS.map(S => `<div class="sc"><img src="${uiIcon('cur_scroll')}" alt=""><img class="mini" src="${uiIcon(S.id === 'weapon' ? 'w_' + s.god : S.id + '_a')}" alt=""><b class="oL">${s.scrolls[S.id]}</b></div>`).join('');
    return `<div class="toolbar"><button class="btn gold" id="bSort">${this.sort === 'grade' ? '등급 정렬' : '부위 정렬'}</button><button class="btn gold" id="bForge"><span>대장간</span></button></div><div class="scroll" id="gearScroll"><div class="grid">${list.map(i => itemTile(i, i.god && i.god !== s.god ? 'dim' : '')).join('') || '<div class="muted" style="grid-column:1/6;text-align:center;padding:calc(var(--u)*8)">가방이 비었습니다</div>'}</div><div class="sect">업그레이드 스크롤</div><div class="scgrid">${sc}</div></div>`;
  },
  /* 캐릭터 탭의 무대: 장비 칸 대신 고유 능력 Lv.1~4 표(참고 영상과 같은 배치) */
  godPanelHTML() {
    const cur = this.godView || Meta.s.god, G = GOD_BY[cur], lv = Meta.godLv(cur);
    const rows = [[G.passive, 1], ...GOD_LV[cur].map(([t], n) => [t, n + 2])].map(([t, n]) => `<div class="gl ${n <= lv ? 'on' : ''}"><b class="oL">Lv.${n}</b><span>${t}</span></div>`).join('');
    return `<div class="gpanel"><div class="gname oL"><span style="--rk:${G.rankCol}" class="grk">${G.rank}</span>${G.name}</div><div class="gpips">${[1, 2, 3, 4].map(n => `<i class="${n <= lv ? 'on' : ''}"></i>`).join('')}</div>${rows}</div>`;
  },
  godsPane() {
    const s = Meta.s, cur = this.godView || s.god, G = GOD_BY[cur], info = Meta.godInfo(cur), cost = Meta.godCost(cur), lv = Meta.godLv(cur);
    const cards = GODS.map(g => {
      const i = Meta.godInfo(g.id), c = Meta.godCost(g.id), l = Meta.godLv(g.id), pct = c ? Math.min(100, i.shard / c * 100) : 100;
      return `<button class="gc ${l ? '' : 'lock'} ${g.id === cur ? 'sel' : ''}" data-god="${g.id}"><img src="assets/god/${g.id}/big_bare.webp" alt="">${s.god === g.id ? '<span class="on">출전</span>' : ''}<span class="rk oL" style="--rk:${g.rankCol}">${l ? 'Lv.' + l : g.rank}</span><span class="pg oL"><i style="width:${pct}%"></i><span>${c === null ? '최대' : i.shard + '/' + c}</span></span></button>`;
    }).join('');
    const nextBonus = lv && lv < GOD_LV_MAX ? ` · 다음 레벨 +${Math.round(GOD_LV_BONUS * 100)}%` : '';
    const act = !lv ? `<button class="btn green" id="gUp" ${info.shard >= cost ? '' : 'disabled'}>해금 (조각 ${info.shard}/${cost})</button>` : `${s.god !== cur ? '<button class="btn gold" id="gSel">출전</button>' : ''}${cost !== null ? `<button class="btn green" id="gUp" ${info.shard >= cost ? '' : 'disabled'}>레벨 업 (조각 ${info.shard}/${cost})</button>` : ''}`;
    const share = Meta.godShare(cur), all = Meta.accountBonus(), pc = x => (x * 100).toFixed(x * 100 % 1 ? 1 : 0);
    const acc = `<div class="gacc oL"><b>모든 신에게 주는 보너스</b><span>이 신 공격력 +${pc(share.atk)}% · 체력 +${pc(share.hp)}%</span><span>전체 합계 공격력 +${pc(all.atk)}% · 체력 +${pc(all.hp)}%</span></div>`;
    return `<div class="scroll">${acc}<div class="sect oL" style="text-align:center;line-height:1.35;word-break:keep-all">${G.title} · 무기: ${G.weapon}<br>연사 ${Math.round(100 / G.fire)}% · 피해 ${Math.round(G.dmg * 100)}% · 탄창 ${G.ammo}${lv ? ` · 레벨 효과 +${Math.round((lv - 1) * GOD_LV_BONUS * 100)}%${nextBonus}` : ''}${lv ? '' : '<br>잠겨 있음: 상점의 신의 소환으로 조각을 모으세요'}</div><div class="god-act">${act}</div><div class="gods">${cards}</div></div>`;
  },
  gearClick(e) {
    const t = e.target, sl = t.closest('.slot'), it = t.closest('.grid .it'), st = t.closest('.st'), gc = t.closest('.gc');
    if (st) { sfx.tap(); this.sub = st.dataset.sub; this.r_gear(); return; }
    if (sl) { sfx.tap(); this.slotPop(sl.dataset.slot); return; }
    if (it) { sfx.tap(); this.itemPop(it.dataset.uid); return; }
    if (t.closest('#bSort')) { sfx.tap(); this.sort = this.sort === 'grade' ? 'slot' : 'grade'; this.r_gear(); return; }
    if (t.closest('#bForge')) { sfx.tap(); this.openForge(); return; }
    if (t.closest('#bInfo')) { sfx.tap(); this.statPop(); return; }
    if (gc) { sfx.tap(); this.godView = gc.dataset.god; this._swap = true; this.r_gear(); return; }
    if (t.closest('#gSel')) { sfx.tap(); loadGod(this.godView); Meta.selectGod(this.godView); this._swap = true; this.render(); this.toast(GOD_BY[this.godView].name + ' 출전'); return; }
    if (t.closest('#gUp')) { const id = this.godView || Meta.s.god; if (Meta.godUp(id)) { sfx.reward(); this.toast(Meta.godLv(id) > 1 ? `Lv.${Meta.godLv(id)}이 되었습니다` : '해금했습니다'); this._swap = true; this.render(); } return; }
  },
  popup(html) { const el = $('pop'); el.innerHTML = html; el.classList.add('on'); el.onclick = e => { if (e.target === el || e.target.closest('[data-close]')) { sfx.tap(); el.classList.remove('on'); } }; },
  closePop() { $('pop').classList.remove('on'); },
  itemBody(it, lvBonus) {
    const S = SLOT_BY[GEAR[it.d].slot], G = GEAR[it.d], stat = Meta.itemStat(it), lab = stat.stat === 'atk' ? '공격력' : '체력';
    const owner = S.id === 'weapon' ? it.god : null, name = owner ? `${GOD_BY[owner].weapon} · ${G.name}` : G.name;
    return { name, html: `<div class="ip-top"><div class="it" style="${gradeVars(it.g)}"><img src="${itemIconSrc(it)}" alt=""></div><div><span class="ip-lv">레벨: ${Meta.levelOf(S.id, owner)}/${LV_MAX}</span><span class="ip-gr" style="--c:${GRADES[it.g].color}">${GRADES[it.g].name} · ${owner ? GOD_BY[owner].name + ' 전용' : S.name}</span><div class="ip-ds">${G.desc}</div></div></div>${owner ? `<div class="ip-acc">장착하면 모든 신의 공격력 +${(ACCOUNT.weaponGrade[it.g] * 100).toFixed(0)}% (등급이 오를수록 커집니다)</div>` : ''}<div class="ip-st">${lab} +${stat.val}${lvBonus ? ` <span style="color:#7dffa8">(+${lvBonus})</span>` : ''}</div><div class="ip-sk">${Meta.itemSkills(it).map(k => `<div class="${k.on ? '' : 'off'}" style="--c:${GRADES[k.g].color}"><i></i><span>${k.t}${k.on ? '' : ` <small>(${GRADES[k.g].name})</small>`}</span></div>`).join('')}</div>` };
  },
  itemPop(uid) {
    const it = Meta.item(uid); it.isNew = false; Meta.save();
    const b = this.itemBody(it), slot = GEAR[it.d].slot, w = slot === 'weapon', owner = w ? it.god : null, own = !w || !!Meta.godLv(owner), cur = Meta.equipped(slot, owner), other = w && owner !== Meta.s.god;
    const note = !own ? `<div class="ip-ban">${GOD_BY[owner].name} 전용 무기입니다. ${GOD_BY[owner].name}를 해금해야 장착할 수 있습니다.</div>` : other ? `<div class="ip-ban">${GOD_BY[owner].name} 전용 무기입니다. ${GOD_BY[owner].name}로 출전하면 장착할 수 있습니다.</div>` : '';
    const usable = own && !other, label = !usable ? '장착 불가' : cur ? '교체' : '장착';
    this.popup(`<div class="card-pop" style="${gradeVars(it.g)}"><div class="hd">${b.name}</div><button class="x" data-close>✕</button>${b.html}${note}<div class="ip-acts"><button class="btn blue" id="ipForge">합성</button><button class="btn green" id="ipEq" ${usable ? '' : 'disabled'}>${label}</button></div></div>`);
    $('ipEq').onclick = () => { const p0 = Meta.power(); if (!Meta.equip(uid)) return; sfx.equip(); if (w) this._swap = true; this.closePop(); this.render(); powerPill(p0, Meta.power()); const sl = document.querySelector(`.slot[data-slot="${slot}"]`); if (sl) { sl.classList.add('upg'); sparkBurst(sl, GRADES[it.g].glow, 12, 1); } };
    $('ipForge').onclick = () => { this.closePop(); this.openForge(uid); };
  },
  /* god: 무기 칸만 쓴다. 출전하지 않은 신의 전용 무기도 여기서 올린다 */
  slotPop(slot, god) {
    const S = SLOT_BY[slot], it = Meta.equipped(slot, god), s = Meta.s;
    if (!it) { this.toast(`가방에서 ${S.name}를 골라 장착하세요`); this.sub = 'gear'; return; }
    const b = this.itemBody(it, Meta.slotBonus(slot, god)), c = Meta.upgradeCost(slot, god), cap = Meta.lvCap(slot), lv = Meta.levelOf(slot, god), maxed = lv >= cap;
    const lab = S.stat === 'atk' ? '공격력' : '체력';
    this.popup(`<div class="card-pop" style="${gradeVars(it.g)}"><div class="hd">${b.name}</div><button class="x" data-close>✕</button>${b.html}
      <div class="ip-up"><div class="row"><span>레벨 ${lv} / ${cap}</span><span style="color:#2a8c3a">다음 레벨 ${lab} +${S.perLv}</span></div>${maxed ? `<div class="row no">최대 레벨입니다</div>` : `<div class="row"><span class="${s.gold < c.gold ? 'no' : ''}"><img src="${uiIcon('cur_gold')}" alt=""> ${fmt(c.gold)}</span><span class="${s.scrolls[slot] < c.scroll ? 'no' : ''}"><img src="${uiIcon('cur_scroll')}" alt=""> ${s.scrolls[slot]} / ${c.scroll}</span></div>`}</div>
      <div class="ip-acts"><button class="btn gray" id="ipOff">해제</button><button class="btn green" id="ipUp" ${Meta.canUpgrade(slot, god) ? '' : 'disabled'}>업그레이드</button></div></div>`);
    $('ipOff').onclick = () => { Meta.unequip(slot, god); sfx.tap(); if (slot === 'weapon') this._swap = true; this.closePop(); this.render(); };
    $('ipUp').onclick = () => {
      const p0 = Meta.power(); if (!Meta.upgrade(slot, god)) { sfx.empty(); return; }
      sfx.upgrade(); this.render(); this.slotPop(slot, god);
      const pop = $('pop'), ic = pop.querySelector('.ip-top .it'), lvEl = pop.querySelector('.ip-lv'), plus = document.createElement('span');
      ic.classList.add('upg'); lvEl.classList.add('bump'); plus.className = 'ip-plus oL'; plus.textContent = `${lab} +${S.perLv}`; ic.append(plus);
      sparkBurst(ic, GRADES[it.g].glow, 16, 1); powerPill(p0, Meta.power());
    };
  },
  statPop() {
    const o = Meta.stats();
    this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">능력치</div><button class="x" data-close>✕</button><div class="ip-sk"><div>전투력 ${o.power}</div><div>모든 신 보너스: 공격력 +${(Meta.accountBonus().atk * 100).toFixed(1)}% · 체력 +${(Meta.accountBonus().hp * 100).toFixed(1)}%</div><div>공격력 ${o.atk} · 체력 ${o.hp}</div><div>치명타 확률 ${Math.round(o.crit * 100)}% · 치명타 피해 +${Math.round((.5 + o.critDmg) * 100)}%</div><div>받는 피해 -${Math.round(o.dmgCut * 100)}%</div><div>파편 획득 +${Math.round(o.shardPct * 100)}% · 이동 속도 +${Math.round(o.runPct * 100)}%</div><div>탄창 ${o.god.ammo + o.ammo}칸 · 점프 회복 +${Math.round(o.gaugePct * 100)}%</div></div><div class="note">장비 칸을 업그레이드하고, 대장간에서 합성해 더 높은 등급을 만드세요.</div></div>`);
  },

  /* ───── 대장간 ───── */
  openForge(uid) { this.fg = { target: uid && Meta.item(uid) && Meta.item(uid).g < MYTH ? uid : null, mats: [] }; $('forge').classList.add('on'); this.r_forge(); },
  r_forge() {
    const f = this.fg, tgt = f.target ? Meta.item(f.target) : null, s = Meta.s;
    let say = '합성할 대상 장비를 고르시오.';
    let list = s.inv.filter(i => !Meta.isEquipped(i.uid) && i.g < MYTH);
    if (tgt) {
      const need = Meta.mergeNeed(tgt), cands = Meta.mergeMats(tgt);
      list = cands;
      say = need.sameSlot ? `재료: 같은 부위 에픽 2개.<br>신화는 여기서만 만들 수 있소.` : `재료: 같은 장비 ${GRADES[tgt.g].name} 2개.`;
      if (cands.length < 2) say = `재료가 부족하오.<br>${need.sameSlot ? '같은 부위 에픽' : '같은 장비'} ${2 - f.mats.length}개가 더 필요하오.`;
    }
    list.sort((a, b) => b.g - a.g || SLOTS.findIndex(x => x.id === GEAR[a.d].slot) - SLOTS.findIndex(x => x.id === GEAR[b.d].slot));
    const can = tgt && f.mats.length === 2;
    const res = tgt ? `<div class="it" style="${gradeVars(tgt.g + 1)}"><img src="${itemIconSrc(tgt)}" alt=""></div>` : '';
    $('forge').innerHTML = `<div class="fg-top"><img class="fg-smith" src="assets/god/hephaestus/big_armed.webp" alt=""><div class="fg-slots"><div class="fbox ${this._fgFlash ? 'flash' : ''}" id="fgRes">${this._fgDone ? `<div class="it pop" style="${gradeVars(this._fgDone.g)}"><img src="${itemIconSrc(this._fgDone.d)}" alt=""></div>` : res}</div><div class="fg-arrow"></div><div class="fbox" id="fgT">${tgt ? `<div class="it" style="${gradeVars(tgt.g)}"><img src="${itemIconSrc(tgt)}" alt=""></div>` : ''}</div><div class="fg-mats">${[0, 1].map(i => { const m = f.mats[i] ? Meta.item(f.mats[i]) : null; return `<div class="fbox m" data-m="${i}">${m ? `<div class="it" style="${gradeVars(m.g)}"><img src="${itemIconSrc(m.d)}" alt=""></div>` : ''}</div>`; }).join('')}</div></div><div class="fg-say">${this._fgDone ? `${GRADES[this._fgDone.g].name} 등급 완성이오!` : say}</div></div>
      <div class="fg-title oL">${tgt ? '재료 장비' : '대상 장비'}</div>
      <div class="scroll fg-grid"><div class="grid">${list.map(i => itemTile(i, (f.mats.includes(i.uid) || f.target === i.uid) ? 'sel' : '')).join('') || `<div class="muted" style="grid-column:1/6;text-align:center;padding:calc(var(--u)*6)">${tgt ? '재료가 없습니다' : '합성할 장비가 없습니다'}</div>`}</div></div>
      <div class="fg-bot"><button class="back oL" id="fgBack">←</button>${tgt ? `<button class="btn gray" id="fgClr">선택 취소</button><button class="btn green" id="fgGo" ${can ? '' : 'disabled'}>합성</button>` : `<button class="btn green" id="fgAll">일괄 합성</button>`}</div>`;
    this._fgDone = null; this._fgFlash = false;
    $('forge').onclick = e => {
      const t = e.target, it = t.closest('.grid .it');
      if (t.closest('#fgBack')) { sfx.tap(); if (this.fg.target) { this.fg = { target: null, mats: [] }; this.r_forge(); } else { $('forge').classList.remove('on'); this.render(); } return; }
      if (t.closest('#fgClr')) { sfx.tap(); this.fg = { target: null, mats: [] }; this.r_forge(); return; }
      if (t.closest('#fgAll')) { const r = Meta.mergeAll(); if (r.length) { sfx.upgrade(); this.toast(`${r.length}번 합성했습니다`); this._fgDone = r[r.length - 1]; this._fgFlash = true; this.r_forge(); } else this.toast('일괄로 합성할 장비가 없습니다. 신화는 직접 고르세요'); return; }
      if (t.closest('#fgGo')) { const r = Meta.merge(this.fg.target, this.fg.mats); if (r) { sfx.bigBoom(); sfx.reward(); this._fgDone = r; this._fgFlash = true; this.fg = { target: null, mats: [] }; this.r_forge(); } return; }
      if (it) {
        sfx.tap(); const uid = it.dataset.uid, f2 = this.fg;
        if (!f2.target) { f2.target = uid; f2.mats = []; const cands = Meta.mergeMats(Meta.item(uid)); f2.mats = cands.slice(0, 2).map(o => o.uid); }
        else { const i = f2.mats.indexOf(uid); if (i >= 0) f2.mats.splice(i, 1); else if (f2.mats.length < 2) f2.mats.push(uid); }
        this.r_forge();
      }
    };
  },

  /* ───── 상점 ───── */
  r_shop() {
    const el = $('s_shop'), s = Meta.s, now = Date.now(); el.className = 'screen on shop';
    const order = ['prism', 'obsidian', 'silver'];
    const html = order.map(id => {
      const C = CHESTS.find(x => x.id === id), st = s.chest[id] || {}, ic = uiIcon('cur_' + C.cur), fr = C.free && (st.freeAt || 0) <= now;
      const left = C.free ? Math.max(0, (st.freeAt || 0) - now) : 0, tm = left ? `${Math.floor(left / 3600000)}시간 ${Math.floor(left / 60000) % 60}분 뒤 무료` : '';
      const pity = C.pity ? `<span class="pity">에픽 확정까지 ${Math.max(1, C.pity - (st.pity || 0))}회</span>` : '';
      return `<div class="chest" style="--t:${C.tint}"><div class="hd2 oL"><span>${C.name}</span><button class="info" data-rate="${id}">i</button></div><div class="bd"><img class="cimg" src="${uiIcon(C.icon)}" alt=""><div><div class="dsc">${C.desc}</div>${pity}${tm ? `<div class="pity" style="display:block;margin-top:calc(var(--u)*1)">${tm}</div>` : ''}</div></div><div class="acts">${fr ? `<button class="btn gold free" data-pull="${id}" data-n="1" data-free="1"><span>무료 1회</span></button>` : ''}<button class="btn green" data-pull="${id}" data-n="1"><span class="oL">1회 뽑기</span><span class="pr oL"><img src="${ic}" alt="">${fmt(C.one)}</span></button><button class="btn green" data-pull="${id}" data-n="10"><span class="oL">10회 뽑기</span><span class="pr oL"><img src="${ic}" alt="">${fmt(C.ten)}</span></button></div></div>`;
    }).join('');
    const GC = GOD_CHEST, gst = s.chest.god || {}, gfr = (gst.freeAt || 0) <= now, gleft = Math.max(0, (gst.freeAt || 0) - now), gic = uiIcon('cur_gem');
    const gtm = gleft ? `${Math.floor(gleft / 3600000)}시간 ${Math.floor(gleft / 60000) % 60}분 뒤 무료` : '';
    const gcard = `<div class="chest" style="--t:${GC.tint}"><div class="hd2 oL"><span>${GC.name}</span><button class="info" data-rategod="1">i</button></div><div class="bd"><img class="cimg" src="${uiIcon(GC.icon)}" alt=""><div><div class="dsc">${GC.desc}</div><span class="pity">전설 확정까지 ${Math.max(1, GC.pity - (gst.pity || 0))}회</span>${gtm ? `<div class="pity" style="display:block;margin-top:calc(var(--u)*1)">${gtm}</div>` : ''}</div></div><div class="acts">${gfr ? `<button class="btn gold free" data-pullgod="1" data-free="1"><span>무료 1회</span></button>` : ''}<button class="btn green" data-pullgod="1"><span class="oL">1회 소환</span><span class="pr oL"><img src="${gic}" alt="">${GC.one}</span></button><button class="btn green" data-pullgod="10"><span class="oL">10회 소환</span><span class="pr oL"><img src="${gic}" alt="">${GC.ten}</span></button></div></div>`;
    el.innerHTML = `<div class="scroll">${gcard}${html}<div class="chest" style="--t:#2a6a3a"><div class="hd2 oL"><span>에너지 충전</span></div><div class="dsc" style="margin:calc(var(--u)*1) 0">에너지 ${ENERGY.buyN}을 채웁니다. 상한을 넘어 쌓입니다.</div><div class="acts"><button class="btn green" id="buyEn" style="grid-column:1/3"><span class="pr oL"><img src="${uiIcon('cur_gem')}" alt="">${ENERGY.buyGem}</span></button></div></div><div style="height:calc(var(--u)*2)"></div></div>`;
    el.onclick = e => {
      const t = e.target, p = t.closest('[data-pull]'), r = t.closest('[data-rate]');
      if (r) { sfx.tap(); this.ratePop(r.dataset.rate); return; }
      if (t.closest('[data-rategod]')) { sfx.tap(); this.godRatePop(); return; }
      const pg = t.closest('[data-pullgod]');
      if (pg) { const res = Meta.pullGod(+pg.dataset.pullgod, !!pg.dataset.free); if (!res) { sfx.empty(); this.toast('보석이 모자랍니다'); return; } this.reveal('god', res); return; }
      if (t.closest('#buyEn')) { if (s.gem >= ENERGY.buyGem) { s.gem -= ENERGY.buyGem; s.energy += ENERGY.buyN; Meta.save(); sfx.reward(); this.render(); } else this.toast('보석이 모자랍니다'); return; }
      if (p) { const res = Meta.pull(p.dataset.pull, +p.dataset.n, !!p.dataset.free); if (!res) { sfx.empty(); this.toast('재화가 모자랍니다'); return; } this.reveal(p.dataset.pull, res); }
    };
  },
  godRatePop() {
    const C = GOD_CHEST, row = r => { const names = GODS.filter(g => g.rank === r).map(g => g.name).join(', '), col = GODS.find(g => g.rank === r).rankCol; return `<div class="r" style="--c:${col}"><span>${r} 조각 ${C.shard[r]}개</span><span>${Math.round(C.rate[r] * 100)}%</span></div><div class="note" style="margin:0 0 calc(var(--u)*1)">${names}</div>`; };
    this.popup(`<div class="card-pop" style="--c:#7a3fb0;--d:#4a2470"><div class="hd">${C.name} 확률</div><button class="x" data-close>✕</button><div class="rates">${['레어', '에픽', '전설'].map(row).join('')}</div><div class="note">${C.pity}회 안에 전설 조각이 확정으로 나옵니다. 해금에는 조각 ${GOD_UNLOCK}개가 듭니다.</div></div>`);
  },
  ratePop(id) {
    const C = CHESTS.find(x => x.id === id);
    this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">${C.name} 확률</div><button class="x" data-close>✕</button><div class="rates">${[0, 1, 2].filter(i => C.rate[i] > 0).map(i => `<div class="r" style="--c:${GRADES[i].color}"><span>${GRADES[i].name}</span><span>${(C.rate[i] * 100).toFixed(0)}%</span></div>`).join('')}<div class="r" style="--c:#8a7a7a"><span>${GRADES[MYTH].name}</span><span>획득 불가</span></div></div><div class="note">신화 등급은 뽑기로 나오지 않습니다. 대장간에서 같은 부위 에픽 3개를 합성해 만듭니다. 무기는 신 전용이며 같은 신의 무기끼리 합성합니다. 신 1명당 무기 확률은 레어 25%, 에픽 15%, 전설 10%입니다. ${C.pity ? `${C.pity}회 안에 에픽 1개가 확정됩니다.` : ''}</div></div>`);
  },
  reveal(id, res) {
    const C = id === 'god' ? GOD_CHEST : CHESTS.find(x => x.id === id), el = $('gacha'); el.classList.add('on');
    el.innerHTML = `<img class="ga-chest shake" src="${uiIcon(C.icon)}" alt="">`; sfx.rumble();
    const show = () => {
      sfx.bigBoom(); sfx.reward();
      const cells = res.map((r, i) => {
        if (r.type === 'item') { const it = r.item; return `<div class="ga-it ${it.g >= 2 ? 'ep' : ''}" style="--g:${GRADES[it.g].glow};animation-delay:${i * 45}ms"><div class="it" style="${gradeVars(it.g)}"><img src="${itemIconSrc(it)}" alt=""></div></div>`; }
        if (r.type === 'shard') return `<div class="ga-it" style="animation-delay:${i * 45}ms"><div class="sc" style="background:${GOD_BY[r.god].rankCol};overflow:hidden"><img style="inset:0;width:100%;height:auto" src="assets/god/${r.god}/big_bare.webp" alt=""><b class="oL">${r.n}</b></div></div>`;
        return `<div class="ga-it" style="animation-delay:${i * 45}ms"><div class="sc"><img src="${uiIcon('cur_scroll')}" alt=""><img class="mini" src="${uiIcon(r.slot === 'weapon' ? 'w_' + Meta.s.god : r.slot + '_a')}" alt=""><b class="oL">${r.n}</b></div></div>`;
      }).join('');
      el.innerHTML = `<div class="ga-flash"></div><div class="ga-title oL">획득!</div><div class="ga-grid ${res.length <= 2 ? 'few' : ''}">${cells}</div><button class="btn gold" id="gaOk" style="width:calc(var(--u)*50);margin-top:calc(var(--u)*2)">확인</button>`;
      $('gaOk').onclick = () => { sfx.tap(); el.classList.remove('on'); this.render(); };
    };
    setTimeout(show, 720);
  },

  /* ───── 임무 ───── */
  r_quest() {
    const el = $('s_quest'), Q = Meta.quests(); el.className = 'screen on bg-dark';
    const row = q => { const done = q.cur >= q.need, cl = Meta.questClaimed(q), c = Math.min(q.cur, q.need); return `<div class="qrow"><div><div class="nm">${q.name}</div><div class="bar"><i style="width:${c / q.need * 100}%"></i><span>${c} / ${q.need}</span></div><div class="rw"><span><img src="${uiIcon('cur_gem')}" alt=""> ${q.gem}</span><span><img src="${uiIcon('cur_gold')}" alt=""> ${fmt(q.gold)}</span></div></div><button class="btn ${cl ? 'gray' : 'green'}" data-q="${q.id}" ${done && !cl ? '' : 'disabled'}>${cl ? '완료' : '받기'}</button></div>`; };
    el.innerHTML = `<div class="scroll"><div class="list"><div class="h2 oL">오늘의 임무</div>${Q.filter(q => q.daily).map(row).join('')}<div class="h2 oL">업적</div>${Q.filter(q => !q.daily).map(row).join('')}</div></div>`;
    el.onclick = e => { const b = e.target.closest('[data-q]'); if (b && !b.disabled && Meta.questClaim(b.dataset.q)) { sfx.reward(); this.render(); } };
  },
  /* ───── 재능 ───── */
  r_talent() {
    const el = $('s_talent'), s = Meta.s; el.className = 'screen on bg-dark';
    el.innerHTML = `<div class="scroll"><div class="h2 oL" style="padding:calc(var(--u)*3) calc(var(--u)*3) 0">재능: 골드로 영구히 강해집니다</div><div class="tal">${TALENTS.map(t => { const l = s.talent[t.id] || 0, mx = l >= t.max, c = t.cost(l); return `<div class="tc"><img src="${uiIcon(t.icon)}" alt=""><div class="nm oL">${t.name}</div><div class="lvv">Lv.${l} / ${t.max}</div><div class="dsc">${t.desc}</div><button class="btn green" data-t="${t.id}" ${mx || s.gold < c ? 'disabled' : ''}><span class="pr oL">${mx ? '최대' : `<img src="${uiIcon('cur_gold')}" alt="">${fmt(c)}`}</span></button></div>`; }).join('')}</div></div>`;
    el.onclick = e => { const b = e.target.closest('[data-t]'); if (b && !b.disabled && Meta.talentUp(b.dataset.t)) { sfx.upgrade(); this.render(); } };
  },
  settings() {
    this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">설정</div><button class="x" data-close>✕</button><div class="ip-acts"><button class="btn blue" id="stMute">소리 ${sfx.muted ? '켜기' : '끄기'}</button></div><div class="ip-acts"><button class="btn red" id="stReset">처음부터 다시</button></div><div class="note">GOD FALL 개발판. 저장은 이 브라우저에 됩니다.</div></div>`);
    $('stMute').onclick = e => { sfx.setMute(!sfx.muted); e.target.textContent = `소리 ${sfx.muted ? '켜기' : '끄기'}`; };
    $('stReset').onclick = e => { if (e.target.dataset.k) { Meta.reset(); this.closePop(); this.go('battle'); this.toast('처음부터 시작합니다'); } else { e.target.dataset.k = 1; e.target.textContent = '한 번 더 누르면 지워집니다'; } };
  },
};

/* ───── 부팅 ───── */
loadImg('ui_skull', uiIcon('ico_skull'));
const _layout0 = layout;
layout = function () { _layout0(); stage.style.setProperty('--u', (view.W / 100) + 'px'); };
layout();
requestAnimationFrame(frame);
UI.boot();
window.GF = { game, input, ui, view, PPT, CARDS, startRun, T, lvl, TILE, COLS, step, sfx, IMG, heroFrame, Meta, UI, DIFF, ENEMY, buildWave, mkEnemy, nextWave, revive, finishRun, openCards, startBossIntro, enterRoom, exitRoom, killEnemy, hurt };
if (/[?&]debug=1/.test(location.search)) { $('optZone').checked = true; $('optHit').checked = true; }
