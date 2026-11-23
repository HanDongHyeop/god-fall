/* 로비 UI: 궁수의 전설 2 구성(위쪽 재화 띠 · 아래 5칸 메뉴 · 장비 6칸 · 대장간 · 상자). 게임 규칙은 meta.js에 있고 여기는 화면만 다룬다 */
'use strict';
const uiIcon = n => `assets/ui/${n}.webp`;
const GODS_PLANNED = 12;   // 캐릭터 칸 수(지금 6 + 앞으로 만들 6). 새 신을 넣으면 '준비 중' 칸이 하나씩 줄어든다
const RANK_BG = { '희귀': ['#4a7fe0', '#213a86'], '영웅': ['#9150d6', '#45207a'], '전설': ['#d9962e', '#713f10'] };   // 카드 바탕(위·아래)
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
const gradeVars = g => `--c:${GRADES[g].color};--d:${GRADES[g].dark};--h:${GRADES[g].hi}`;
/* v36 장비 칸: 등급색 보석 바탕(class g0~g7). 새 장비 = 왼쪽 위 빨간 점, 지금보다 좋음 = 오른쪽 위 초록 화살표(칸 안), S·SS = 왼쪽 위 문장.
   신 전용 무기는 흑백·얼굴 말풍선 대신 칸 아래 띠에 신 이름(지금 출전한 신이면 금빛) — RPG의 '착용 조건' 표기 */
function itemTile(it, extra = '', tag = 'button') {
  const mini = extra.includes('mini'), w = GEAR[it.d].slot === 'weapon', better = !mini && !Meta.isEquipped(it.uid) && Meta.isBetter(it);
  const own = w && !extra.includes('noown') ? `<span class="it-own ${it.god === Meta.s.god ? 'me' : ''}">${GOD_BY[it.god].name}</span>` : '';
  const sb = it.g >= GRADE_S ? `<span class="it-s">${GRADES[it.g].name}</span>` : '';
  return `<${tag} class="it g${it.g} ${w && own ? 'wp' : ''} ${extra}" ${tag === 'button' ? `data-uid="${it.uid}"` : ''} style="${gradeVars(it.g)}"><img src="${itemIconSrc(it)}" alt="">${sb}${own}${it.isNew && !mini && !sb ? '<span class="it-new"></span>' : ''}${better ? '<span class="it-up"></span>' : ''}</${tag}>`;
}
/* 탭 전환 렉(2026-11-12 v30): 탭을 누를 때마다 화면 전체를 innerHTML로 다시 만들어 그림이 새로 풀리는 동안 비어 보였다.
   같은 내용이면 손대지 않고(그림·스크롤 그대로), 장비 탭의 캐릭터·장비 두 화면은 따로 들고 있다가 갈아 끼운다 */
const setHTML = (el, h) => { if (el._h === h) return false; el._h = h; el.innerHTML = h; return true; };
const UI = {
  tab: 'battle', sub: 'gear', chapterView: 0, sort: 'grade',
  boot() {
    Meta.tick();
    sfx.muted = !!Meta.s.opt.mute;
    this.chapterView = Meta.s.chapter;
    this.buildNav(); this.warm(); this.go('battle');
    $('tver').textContent = verText();   // v38.1 타이틀 아래 빌드 표시(폰에 새 버전이 들어왔는지 눈으로 확인)
    const dev = /[?&]dev=1/.test(location.search);
    if (dev) { $('gear').style.display = 'block'; }
    $('pause').onclick = () => this.pause();
    $('bLearned').onclick = () => this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">얻은 능력</div><button class="x" data-close>✕</button>${learnedHTML()}</div>`);
    setInterval(() => { if ($('lobby').classList.contains('on')) { Meta.tick(); this.refreshTop(); } }, 5000);
    // 타이틀: 첫 터치에서 오디오를 깨우고 로비로
    const enter = () => { $('mTitle').classList.remove('on'); $('lobby').classList.add('on'); sfx.bgmFor && sfx.bgmFor('lobby'); GODS.forEach(g => { if (Meta.godLv(g.id)) loadGod(g.id); }); loadChapterMon(); };
    // 타이틀(로고)을 누르면 매번 인트로(js/intro.js)부터 시작한다(핍의 젤리광산처럼, 건너뛰기 있음). 한 번도 판을 안 한 사람은 인트로의 다이브가 그대로 챕터 1 낙하로 이어진다
    // 자동 시험에서 로비로 바로 가려면 window.__skipIntro 또는 localStorage gf_skipIntro=1
    const noIntro = () => { try { return !!window.__skipIntro || localStorage.getItem('gf_skipIntro') === '1'; } catch (e) { return !!window.__skipIntro; } };
    // v38 새 계정(저장 없음 · 판을 해 본 적 없음)은 타이틀을 누를 때 첫 플레이 흐름을 켠다: 튜토리얼 판 → 챕터 1 → 로비 안내. 자동 시험(인트로 건너뛰기)은 켜지 않는다
    const go = () => {
      sfx.init(); sfx.card(); $('mTitle').onclick = null;
      if (Meta.isNew && !Meta.s.seenTip && !noIntro() && !Meta.s.ftue) Meta.s.ftue = { stage: 0, high: 0, tips: {} };
      if (typeof Intro !== 'undefined' && !noIntro()) { const fresh = !Meta.s.seenTip; Intro.play(() => { Meta.s.introSeen = true; Meta.save(); enter(); const f = Meta.s.ftue; if (f && f.stage === 0) startTutorial({ chapter: 0 }); else if (f && f.stage === 1) this.ftueLobby(); else if (fresh) { this.chapterView = 0; this.render(); this.start(); } }); return; }
      enter();
    };
    if (typeof Intro !== 'undefined' && !noIntro()) Intro.preload();
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
  /* 부팅 때 모든 탭을 한 번 만들어 두고 그림을 미리 풀어 둔다(처음 여는 탭도 바로 뜬다) */
  warm() {
    const sub = this.sub; for (const k of ['shop', 'quest', 'talent']) this['r_' + k](); this.sub = 'gods'; this.r_gear(); this.sub = 'gear'; this.r_gear(); this.sub = sub;
    const urls = new Set([...document.querySelectorAll('#screens img, #topbar img, #nav img')].map(i => i.src));
    GODS.forEach(g => { urls.add(new URL(`assets/god/${g.id}/big_bare.webp`, location.href).href); urls.add(new URL(`assets/god/${g.id}/big_armed.webp`, location.href).href); });
    this._warm = [...urls].map(u => { const im = new Image(); im.decoding = 'async'; im.src = u; if (im.decode) im.decode().catch(() => {}); return im; });   // 붙잡아 두어야 풀린 그림이 버려지지 않는다
  },
  go(tab) { this.tab = tab; [...$('nav').children].forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); for (const s of $('screens').children) s.classList.toggle('on', s.id === 's_' + tab); this.render(); },
  render() { this['r_' + this.tab](); this.refreshTop(); },
  refreshTop() {
    const s = Meta.s, st = Meta.stats();
    setHTML($('topbar'), `<button class="ava" data-go="gods"><img src="assets/god/${s.god}/big_bare.webp" alt=""></button><div class="tb-r"><div class="tb-1"><div class="cur oL"><img src="${uiIcon('cur_energy')}" alt="">${s.energy}/30</div><div class="cur oL"><img src="${uiIcon('cur_gold')}" alt="">${fmt(s.gold)}</div><div class="cur oL"><img src="${uiIcon('cur_gem')}" alt="">${fmt(s.gem)}</div></div><div class="tb-2"><span class="oL">${s.name}</span><span class="pw oL"><img src="${uiIcon('cur_power')}" alt="">${st.power}</span><button class="set" data-go="set">⚙</button></div></div>`);
    $('topbar').onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; sfx.tap(); if (b.dataset.go === 'gods') { this.sub = 'gods'; this.go('gear'); } else this.settings(); };
    const qb = document.querySelector('.nb[data-tab=quest]'), gb = document.querySelector('.nb[data-tab=gear]');
    const setB = (el, on) => { if (!el) return; let d = el.querySelector('.badge'); if (on && !d) { d = document.createElement('i'); d.className = 'badge'; d.textContent = '!'; el.appendChild(d); d.style.right = '12%'; d.style.top = '6%'; } else if (!on && d) d.remove(); };
    setB(qb, Meta.questBadge()); setB(gb, Meta.anyUpgrade() || Meta.godReady() || s.inv.some(i => i.isNew));
  },

  /* ───── 전투 ───── */
  r_battle() {
    const v = this.chapterView, CI = chapterInfo(v), open = Meta.chapterOpen(v), s = Meta.s, el = $('s_battle'), best = s.cleared[v] ? STAGES : s.best[v] || 0;
    // v43 [보통 | 어려움] 탭: 같은 섬 6개를 두 난이도로 본다. 화살표는 고른 난이도 안에서만 움직인다. 어려움 탭은 어려움 1이 열릴 때(보통 3 클리어) 풀린다
    const N = BIOMES.length, hard = CI.deep, n = v % N, hardOn = Meta.chapterOpen(N), hardNew = hardOn && !s.cleared[N] && !s.hardSeen;
    const dtab = `<div class="dtab"><button class="dt oL ${hard ? '' : 'on'}" data-h="0">보통</button><button class="dt hd oL ${hard ? 'on' : ''} ${hardOn ? '' : 'lock'}" data-h="1">${hardOn ? '' : `<img src="${uiIcon('ico_lock')}" alt="">`}어려움${hardNew && !hard ? '<i class="dot"></i>' : ''}</button></div>`;
    const hardInfo = hard ? `<div class="ch-hard oL"><span><b>규칙</b> 분노한 괴물 · 가시 함정 턱 · 하트 절반</span><span><b>보상</b> 골드 · 두루마리 · 보석 3배 + <img src="${uiIcon('cur_abyss')}" alt="">${ABYSS.name}</span></div>` : '';
    el.className = 'screen on battle';
    // 판 6칸 미리보기: 전투 ● · 휴식 잎 · 보스 해골. 넘은 판은 금색
    const rec = typeof REC_POWER !== 'undefined' ? REC_POWER[v] : 0;   // v38 권장 전투력(성장 시뮬레이션에서 뽑은 값)
    const pips = STAGE_PLAN.map((k, i) => `<i class="sp ${k} ${i < best ? 'done' : ''}"></i>`).join('');
    // v45 섬 슬라이드: 같은 난이도의 섬 6개를 옆으로 늘어놓는다(가운데 = 보는 챕터, 좌우 2개까지만 보인다). 손가락으로 끌거나 화살표로 넘긴다
    const base = hard ? N : 0, isles = BIOMES.map((B, i) => { const o = i - n; return `<div class="isl ${o ? '' : 'c'} ${Math.abs(o) > 2 ? 'far' : ''}" style="--o:${o}" data-i="${i}"><img class="isle ${Meta.chapterOpen(base + i) ? '' : 'lock'} ${hard ? 'deep' : ''}" src="assets/ui/isle${i + 1}.webp" alt=""></div>`; }).join('');
    // 지금 깨야 하는 섬(이 난이도에서 아직 못 깬 첫 챕터)으로 바로 가는 단추: 그 섬이 오른쪽에 있으면 오른쪽 화살표 위, 왼쪽에 있으면 왼쪽 화살표 위
    const tgt = BIOMES.findIndex((B, i) => !s.cleared[base + i]), jump = tgt >= 0 && tgt !== n ? `<button class="jump ${tgt > n ? 'r' : 'l'}" data-jump="${tgt}"><small>깰 차례</small><b>${tgt > n ? '' : '‹‹ '}${tgt + 1}${tgt > n ? ' ››' : ''}</b></button>` : '';
    setHTML(el, `${dtab}<div class="ch-title oL"><span class="ch-no ${hard ? 'hd' : ''}">${CI.no}</span>${CI.B.name}</div><div class="ch-sub oL">${CI.sub}</div><div class="ch-best oL">${s.cleared[v] ? '클리어' : `최고 기록: ${best} / ${STAGES}판`}</div><div class="ch-pips">${pips}</div>${rec ? `<div class="ch-rec ${Meta.power() >= rec ? 'ok' : 'low'} oL"><img src="${uiIcon('cur_power')}" alt="">권장 전투력 <b>${fmt(rec)}</b></div>` : ''}
      <div class="isle-wrap"><div class="isles">${isles}</div><button class="arrow l oL" data-d="-1" ${n === 0 ? 'disabled' : ''}>‹</button><button class="arrow r oL" data-d="1" ${n === N - 1 ? 'disabled' : ''}>›</button>${jump}${open ? '' : `<div class="lockmsg oL">${Meta.chapterLockMsg(v)}</div>`}${hardInfo}</div>
      <div class="startbar"><button class="btn gold start" id="bStart" ${open ? '' : 'disabled'}><span>시작</span><small><img src="${uiIcon('cur_energy')}" alt="">×5</small></button><div class="bsub">전투 4판 · 휴식 1판 · 마지막 판에 보스</div><button class="btn blue modesbtn ${modeOpen('seal') || modeOpen('eel') ? '' : 'lock'}" id="bModes">도전${modeOpen('seal') && (modeLeft('seal') + (modeOpen('eel') ? modeLeft('eel') : 0)) > 0 ? '<i class="dot"></i>' : ''}</button></div>`);
    el.onclick = e => {
      const a = e.target.closest('.arrow'); if (a && !a.disabled) { sfx.tap(); this.slideTo(base + clamp(n + +a.dataset.d, 0, N - 1), 260); return; }
      const jp = e.target.closest('.jump'); if (jp) { sfx.tap(); this.slideTo(base + +jp.dataset.jump, 420); return; }
      const dt = e.target.closest('.dt'); if (dt) { const h = +dt.dataset.h; if (h === +hard) return; sfx.tap();
        if (h && !hardOn) { this.toast(Meta.chapterLockMsg(N)); return; }
        if (h && !s.hardSeen) { s.hardSeen = true; Meta.save(); }
        this.chapterView = (h ? N : 0) + n; this.r_battle(); return; }
      if (e.target.closest('#bStart')) this.start();
      if (e.target.closest('#bModes')) { sfx.tap(); this.openModes(); }
    };
    this.bindIsles(el, n, N, base);
    const sl = this._slide; this._slide = null; if (sl && sl.from) { this.isleAnim(el, n, sl.from, sl.dur); el.classList.remove('info-l', 'info-r'); void el.offsetWidth; el.classList.add(sl.from < 0 ? 'info-r' : 'info-l'); } else el.classList.remove('info-l', 'info-r');
  },
  /* ───── v45 섬 슬라이드 ─────
     챕터는 곧바로 바뀌고(화면 내용도 새 챕터로 다시 그린다), 섬 줄만 '이전 자리'에서 새 자리로 미끄러져 온다. off = 가운데에서 벗어난 정도(섬 개수 단위) */
  slideTo(c, dur) { const N = BIOMES.length, d = c - this.chapterView; if (!d) return; this.chapterView = c; this._slide = Math.abs(d) < N ? { from: -d, dur: dur || 260 } : null; this.r_battle(); },
  isleStop() { if (this._isleRaf) cancelAnimationFrame(this._isleRaf); this._isleRaf = 0; },
  isleLayout(el, n, off) {
    const all = el.querySelectorAll('.isl'); if (all.length < 2) return 0;
    const P = this._isleP || (this._isleP = (() => { const pr = document.createElement('i'); pr.style.cssText = 'position:absolute;width:var(--pitch);height:0'; el.querySelector('.isles').appendChild(pr); const w = pr.offsetWidth; pr.remove(); return w || el.querySelector('.isle-wrap').clientWidth * .62; })());   // 섬 사이 간격(--pitch)을 px로
    for (const d of all) { const k = +d.dataset.i - n - off, a = Math.min(1, Math.abs(k)); d.style.display = Math.abs(k) > 2.6 ? 'none' : 'flex'; d.style.transform = `translate(-50%, -50%) translateX(${(k * P).toFixed(1)}px) scale(${(1 - .36 * a).toFixed(3)})`; d.style.opacity = (1 - .3 * a).toFixed(3); d.style.zIndex = a < .5 ? 1 : 0; }
    return P;
  },
  isleReset(el) { for (const d of el.querySelectorAll('.isl')) d.style.display = d.style.transform = d.style.opacity = d.style.zIndex = ''; el.style.removeProperty('--dragk'); },
  isleAnim(el, n, from, dur) {
    this.isleStop(); const t0 = performance.now();
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3); this.isleLayout(el, n, from * (1 - e)); el.style.setProperty('--dragk', Math.max(0, Math.min(1, Math.abs(from * (1 - e)) * 1.6))); if (k < 1 && el.isConnected) this._isleRaf = requestAnimationFrame(tick); else { this._isleRaf = 0; this.isleReset(el); } };
    tick();
  },
  bindIsles(el, n, N, base) {
    const wrap = el.querySelector('.isle-wrap'); if (!wrap) return; this._isleP = 0; let st = null;
    wrap.onpointerdown = e => { if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button)) return; st = { x: e.clientX, y: e.clientY, id: e.pointerId, on: false, lx: e.clientX, lt: performance.now(), v: 0, off: 0 }; };
    wrap.onpointermove = e => {
      if (!st || e.pointerId !== st.id) return; const dx = e.clientX - st.x;
      if (!st.on) { if (Math.abs(dx) < 8) return; if (Math.abs(e.clientY - st.y) > Math.abs(dx)) { st = null; return; } st.on = true; this.isleStop(); try { wrap.setPointerCapture(st.id); } catch (_) {} }
      const now = performance.now(), P = this.isleLayout(el, n, st.off) || 1; st.v = .6 * st.v + .4 * (e.clientX - st.lx) / Math.max(1, now - st.lt); st.lx = e.clientX; st.lt = now;
      let off = -dx / P; const lo = -n, hi = N - 1 - n; if (off < lo) off = lo + (off - lo) * .3; if (off > hi) off = hi + (off - hi) * .3;   // 끝에서는 고무줄처럼 덜 끌린다
      st.off = off; this.isleLayout(el, n, off); el.style.setProperty('--dragk', Math.min(1, Math.abs(off) * 1.6));
    };
    const end = e => {
      if (!st || (e && e.pointerId !== st.id)) return; const s0 = st; st = null; if (!s0.on) return;
      const P = this._isleP || 1, t = clamp(Math.round(s0.off + clamp(-s0.v * 160 / P, -.6, .6)), -n, N - 1 - n);   // 반 넘게 끌었거나 빠르게 튕기면 넘어간다
      if (!t) { this.isleAnim(el, n, s0.off, 200); return; }
      sfx.tap(); this.chapterView = base + n + t; this._slide = { from: s0.off - t || .001, dur: 240 }; this.r_battle();
    };
    wrap.onpointerup = end; wrap.onpointercancel = end;
  },
  start() {
    const s = Meta.s; Meta.tick(); sfx.init();
    if (!Meta.chapterOpen(this.chapterView)) return;
    if (!s.equip.weapon) { this.toast('무기를 장착해야 출발할 수 있습니다'); this.sub = 'gear'; this.go('gear'); return; }
    if (s.energy < 5) { this.toast('에너지가 모자랍니다. 상점에서 채울 수 있습니다'); return; }
    Meta.spendEnergy(); s.chapter = this.chapterView; Meta.save(); sfx.start();
    startRun({ chapter: this.chapterView });
  },
  /* v38 새 계정 로비 안내(첫 판을 마치고 돌아왔을 때 한 번): 보상 → 상자 열기 → 일괄 장착 → 강화 → 전투력 → 다시 도전.
     궁수의 전설 2 초반처럼 한 걸음씩 '여기를 누르세요'(딤 · 포커스 · 강제 터치). 건너뛰어도 보상은 받는다 */
  ftueLobby() {
    const f = Meta.s.ftue; if (!f || f.stage !== 1 || Guide.running || !$('lobby').classList.contains('on')) return;
    const R = FTUE.reward, give = () => { if (!f.rewarded) { f.rewarded = true; Meta.ftueReward(); } };
    const end = skipped => { if (skipped && !f.rewarded) { give(); this.toast('첫 낙하 보상을 받았습니다'); } f.stage = 2; Meta.save(); this.render(); };
    const reward = next => {
      this.popup(`<div class="card-pop" style="--c:#d9962e;--d:#713f10"><div class="hd">첫 낙하 보상</div><div class="note" style="color:#fff;text-align:center">무사히 돌아왔군요! 다음 낙하를 위한 선물입니다.</div><div class="ft-rw"><div><img src="${uiIcon('cur_gold')}" alt=""><b class="oL">${fmt(R.gold)}</b></div><div><img src="${uiIcon('cur_gem')}" alt=""><b class="oL">${R.gem}</b></div><div><img src="${uiIcon('cur_scroll')}" alt=""><b class="oL">×${R.scroll * 6}</b></div></div><button class="btn gold" id="ftGo" style="width:100%">받기</button></div>`);
      $('pop').onclick = null;
      $('ftGo').onclick = () => { sfx.reward(); give(); this.closePop(); this.render(); next(); };
    };
    const tab = k => `.nb[data-tab="${k}"]`;
    Guide.run([
      { call: reward },
      { sel: tab('shop'), text: '<b>상점</b>에서 상자를 열면 장비가 나와.' },
      { sel: '[data-pull="obsidian"][data-free="1"]', text: '<b>흑요석 상자</b>를 무료로 한 번 열어 보자!', limit: 2500 },
      { sel: '#gaOk', text: '', limit: 12000, skipIf: () => !$('gacha').classList.contains('on') },
      { sel: tab('gear'), text: '얻은 장비를 껴 볼까?' },
      { sel: '.st[data-sub="gear"]', skipIf: () => this.sub === 'gear', limit: 1500 },
      { sel: '#bBest', text: '<b>일괄 장착</b>을 누르면 가장 좋은 장비를 한 번에 껴.', skipIf: () => !Meta.bestPlan().length, limit: 2500 },
      { sel: '.slot[data-slot="weapon"]', text: '장비 <b>칸</b>을 눌러 강화하자.<br>칸을 강화해 두면 장비를 바꿔도 레벨이 남아.', limit: 2500 },
      { sel: '#ipUpMax', text: '골드와 두루마리로 <b>한 번에 강화</b>!', limit: 1500, skipIf: () => { const b = $('ipUpMax'); return !b || b.disabled; } },
      { sel: '#ipUp', text: '골드와 두루마리로 <b>강화</b>!', limit: 1500, skipIf: () => Meta.s.slotLv.weapon > 1 },
      { pre: () => this.closePop(), sel: '.pw', mode: 'card', pad: 1.6, text: '<b>전투력</b>이 올랐어!<br>전투력은 장비 · 재능 · 캐릭터를 모두 합친 내 강함이야.' },
      { sel: tab('battle'), text: '강해졌으니 다시 내려가 보자.' },
      { sel: '#bStart', mode: 'card', text: '챕터마다 <b>권장 전투력</b>이 있어. 막히면 장비와 재능을 키우고 다시 도전해!' },
    ], end);
  },
  enterGame() { $('lobby').classList.remove('on'); $('pause').classList.add('on'); $('mResult').classList.remove('on'); },
  backToLobby() { verCheck(); game.state = 'title'; game.p = null; $('pause').classList.remove('on'); $('mResult').classList.remove('on'); $('mPause').classList.remove('on'); $('lobby').classList.add('on'); this.go('battle'); sfx.bgmFor && sfx.bgmFor('lobby'); ctx.clearRect(0, 0, view.W, view.H); if (Meta.s.ftue && Meta.s.ftue.stage === 1) setTimeout(() => this.ftueLobby(), 450); },
  pause() {
    const g = game; if (g.state !== 'play') return;
    g.state = 'pause'; input.clearAll(); sfx.tap();
    const st = g.st, p = g.p;
    const el = $('mPause'); el.classList.add('on');
    el.innerHTML = `<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">일시정지</div><div class="ip-st">능력치</div><div class="ip-sk"><div>공격력 ${p.atk} · 체력 ${p.hp}/${p.maxHp} · 탄창 ${p.maxAmmo}</div><div>챕터 ${chapterOf(g.wave) + 1} · ${stageOf(g.wave)}/${STAGES}판 · 처치 ${g.kills} · 파편 ${p.shards}</div></div><div class="ip-st">얻은 능력</div>${learnedHTML()}<div class="ip-acts"><button class="btn red" id="pQuit">포기</button><button class="btn gray" id="pMute">소리 ${sfx.muted ? '켜기' : '끄기'}</button><button class="btn green" id="pGo">계속</button></div></div>`;
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
    const items = rw.drops.map(it => itemTile(it, 'mini', 'div')).join('');
    const sc = Object.keys(rw.scrolls).map(k => `<div class="cu"><img src="${uiIcon('cur_scroll')}" alt=""><img class="mini" style="inset:auto;left:-6%;top:-6%;width:44%;height:44%" src="${uiIcon(k === 'weapon' ? 'w_' + Meta.s.god : k + '_a')}" alt=""><b class="oL">${rw.scrolls[k]}</b></div>`).join('');
    const el = $('mResult'); el.classList.add('on'); el.classList.remove('skip'); el.classList.toggle('win', !!r.clear);
    // v51 결과 화면 연출: 제목(0초) → 숫자 칸(0.35초부터 0.1초 간격, 0.5초 동안 올라감) → 새 기록 도장 → 보상 칸(0.12초 간격) → 확인 단추
    const nTile = (rw.gold ? 1 : 0) + (rw.gem ? 1 : 0) + (rw.abyss ? 1 : 0) + rw.drops.length + Object.keys(rw.scrolls).length, tRw = rw.newBest ? 1.35 : 1.1, tOk = tRw + .15 + Math.min(nTile, 12) * .12 + .25;
    el.style.setProperty('--rw', tRw + 's'); el.style.setProperty('--ok', tOk + 's');
    el.innerHTML = `${r.clear ? '<div class="rs-rays"></div>' : ''}<div class="rs-t oL" style="color:${r.clear ? '#ffd24a' : '#ff6a78'}">${r.clear ? (isHard(r.chapter) ? `어려움 ${chapterInfo(r.chapter).no} 클리어!` : `챕터 ${r.chapter + 1} 클리어!`) : '심연에 떨어졌다'}</div>
      <div class="rs-g"><div><b class="oL" data-n="${Math.min(STAGES, rw.cleared)}" data-suf="/${STAGES}">${Math.min(STAGES, rw.cleared)}/${STAGES}</b>${rw.newBest ? '<i class="rs-new oL">새 기록!</i>' : ''}통과한 판</div><div><b class="oL" data-n="${r.kills}">${r.kills}</b>처치</div><div><b class="oL" data-n="${r.high || 0}" data-suf="번">${r.high || 0}번</b>신성 폭주</div></div>
      <div class="rs-r"><h4>획득 보상</h4>${rw.first ? `<div class="rs-note first oL">첫 클리어 보너스 · 보석 +${rw.firstGem || REWARD.gemFirstClear}</div>` : ''}${rw.newGod ? `<div class="rs-note first oL">새 신 ${GOD_BY[rw.newGod].name} 합류!</div>` : ''}<div class="rs-items">${rw.gold ? `<div class="cu"><img src="${uiIcon('cur_gold')}" alt=""><b class="oL">${fmt(rw.gold)}</b></div>` : '<div class="rs-note">받은 보상이 없습니다</div>'}${rw.gem ? `<div class="cu"><img src="${uiIcon('cur_gem')}" alt=""><b class="oL">${rw.gem}</b></div>` : ''}${rw.abyss ? `<div class="cu ab"><img src="${uiIcon('cur_abyss')}" alt=""><b class="oL">${rw.abyss}</b></div>` : ''}${items}${sc}</div>${!rw.cleared && !r.bosses ? '<div class="rs-note">웨이브를 통과해야 스크롤과 장비를 받습니다</div>' : ''}</div>
      <button class="btn gold" id="rsOk" style="width:calc(var(--u)*56)">확인</button>`;
    $('rsOk').onclick = () => { sfx.tap(); this.backToLobby(); };
    [...el.querySelectorAll('.rs-items > *')].forEach((t, i) => t.style.setProperty('--i', Math.min(i, 12)));
    // 숫자 올라가기 + 소리 박자. 창이 닫히거나 다시 열리면 멈춘다(run 번호로 구분)
    const run = this._rsRun = (this._rsRun || 0) + 1, t0 = performance.now(), nums = [...el.querySelectorAll('.rs-g b[data-n]')], alive = () => this._rsRun === run && el.classList.contains('on');
    const setNums = k => nums.forEach((b, i) => { const n = +b.dataset.n, q = Math.max(0, Math.min(1, k - i * .2)); b.textContent = Math.round(n * (1 - Math.pow(1 - q, 3))) + (b.dataset.suf || ''); });
    const later = (sec, f) => setTimeout(() => { if (alive() && !el.classList.contains('skip')) f(); }, sec * 1000);
    setNums(0);
    const tick = () => { if (!alive()) return; if (el.classList.contains('skip')) { setNums(9); return; } const k = (performance.now() - t0 - 350) / 500; setNums(k); if (k < 1.5) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    if (r.clear) { sfx.bigBoom(); later(.3, () => sfx.reward()); }
    if (rw.newBest) later(.95, () => { sfx.cardLock(2); vibrate(20); });
    for (let i = 0; i < Math.min(nTile, 12); i++) later(tRw + .15 + i * .12, () => sfx.ping());
    if (!r.clear && nTile) later(tRw, () => sfx.reward());
    el.onclick = e => { if (e.target.closest('#rsOk') || el.classList.contains('skip')) return; el.classList.add('skip'); setNums(9); };   // 빈 곳을 누르면 연출을 건너뛰고 바로 끝 모습
  },

  /* v42 도전 모드: 목록 창과 결과 창 */
  openModes() {
    const card = id => { const M = MODES[id], open = modeOpen(id), m = modeState(id), left = modeLeft(id);
      return `<div class="md ${open ? '' : 'lock'}"><div class="md-t">${M.name}</div><div class="md-s">${M.sub}</div><div class="md-i">${open ? `최고 기록 <b>${m.best || 0}%</b> · ${modeDbg(id) ? '<b>디버그로 열림</b> · 횟수 제한 없음' : `오늘 남은 횟수 <b>${left}/${M.tries}</b>`}` : `챕터 ${M.open}을 깨면 열립니다`}</div><button class="btn ${id === 'eel' ? 'red' : 'gold'}" data-mode="${id}" ${open && left > 0 ? '' : 'disabled'}>${open ? (left > 0 ? '도전하기' : '내일 다시') : '잠김'}</button></div>`; };
    this.popup(`<div class="card-pop modes" style="--c:#a64af0;--d:#4e1a8c"><div class="hd">도전</div><button class="x" data-close>✕</button>${card('seal')}${card('eel')}<div class="note">도전은 에너지를 쓰지 않습니다. 하루 횟수는 날이 바뀌면 다시 찹니다.</div></div>`);
    $('pop').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (!Meta.s.equip.weapon) { this.toast('무기를 장착해야 출발할 수 있습니다'); return; } this.closePop(); $('lobby').classList.remove('on'); if (!startMode(b.dataset.mode)) { $('lobby').classList.add('on'); this.toast('지금은 도전할 수 없습니다'); } });
  },
  showModeResult(o) {
    $('pause').classList.remove('on');
    const el = $('mResult'); el.classList.add('on');
    el.innerHTML = `<div class="rs-t oL" style="color:${o.win ? '#ffd24a' : '#ff6a78'}">${o.title}</div>
      <div class="rs-g">${o.stats.map(([v, l]) => `<div><b class="oL">${v}</b>${l}</div>`).join('')}</div>
      <div class="rs-r"><h4>획득 보상</h4>${o.best ? `<div class="rs-note first oL">최고 기록 갱신! ${o.bestScore}%</div>` : `<div class="rs-note">최고 기록 ${o.bestScore || 0}%</div>`}<div class="rs-items"><div class="cu"><img src="${uiIcon('cur_gold')}" alt=""><b class="oL">${fmt(o.gold)}</b></div>${o.gem ? `<div class="cu"><img src="${uiIcon('cur_gem')}" alt=""><b class="oL">${o.gem}</b></div>` : ''}</div></div>
      <button class="btn gold" id="rsOk" style="width:calc(var(--u)*56)">확인</button>`;
    $('rsOk').onclick = () => { sfx.tap(); this.backToLobby(); };
    sfx.reward();
  },

  /* ───── 장비 ───── */
  heroHTML() {
    const s = Meta.s, wi = Meta.equipped('weapon'), show = this.sub === 'gods' && this.godView ? this.godView : s.god, sw = Meta.godLv(show) && Meta.equipped('weapon', show), src = `assets/god/${show}/${sw ? (sw.g >= GRADE_S ? 'big_armed_s' : 'big_armed') : 'big_bare'}.webp`;
    return `<div class="aura" style="--ac:${wi ? GRADES[wi.g].glow : 'transparent'}"></div><div class="hero ${this._swap ? 'swap' : ''}"><img src="${src}" alt=""></div>`;
  },
  slotHTML(S) {
    const it = Meta.equipped(S.id), lv = Meta.s.slotLv[S.id], up = Meta.canUpgrade(S.id);
    const ph = uiIcon(S.id === 'weapon' ? 'w_' + Meta.s.god : S.id + '_a');
    if (!it) return `<button class="slot empty" data-slot="${S.id}"><img class="ph" src="${ph}" alt=""><span class="sl-nm">${S.name}</span><span class="lv oL">Lv.${lv}</span></button>`;
    return `<button class="slot" data-slot="${S.id}">${itemTile(it, 'mini noown', 'span')}<span class="lv oL">Lv.${lv}</span>${up ? '<span class="it-up lvup"></span>' : ''}</button>`;
  },
  r_gear() {
    const s = Meta.s, godsTab = this.sub === 'gods', el = $('s_gear'), st = Meta.stats(godsTab && this.godView ? this.godView : s.god); el.className = 'screen on';
    const side = godsTab ? this.godPanelHTML() : `<div class="col l">${SLOTS.filter(x => x.side === 'L').map(x => this.slotHTML(x)).join('')}</div><div class="col r">${SLOTS.filter(x => x.side === 'R').map(x => this.slotHTML(x)).join('')}</div>`;
    const stage = `<div class="hero-stage ${godsTab ? 'gods-on' : ''}">${this.heroHTML()}${side}<div class="statbar oL"><img src="${uiIcon('cur_power')}" alt=""><span><span class="sl">공격력</span>${st.atk}</span><span style="width:calc(var(--u)*1)"></span><img src="${uiIcon('armor_a')}" alt=""><span><span class="sl">체력</span>${st.hp}</span><button class="iw" id="bInfo">i</button></div></div>`;
    const tabs = `<div class="sub-tabs"><button class="st oL ${this.sub === 'gods' ? 'on' : ''}" data-sub="gods">캐릭터</button><button class="st oL ${this.sub === 'gear' ? 'on' : ''}" data-sub="gear">장비${s.inv.some(i => i.isNew) ? '<i class="badge" style="top:8%;right:30%">!</i>' : ''}</button></div>`;
    const P = this._panes || (this._panes = { gear: document.createElement('div'), gods: document.createElement('div') }), pane = P[this.sub];
    pane.className = 'gpane'; setHTML(pane, stage + tabs + (this.sub === 'gear' ? this.gearPane() : this.godsPane()));
    if (el.firstChild !== pane || el.childNodes.length !== 1) el.replaceChildren(pane);
    this._swap = false;
    el.onclick = e => this.gearClick(e);
  },
  gearPane() {
    const s = Meta.s, list = s.inv.filter(i => !Meta.isEquipped(i.uid));
    list.sort(this.sort === 'grade' ? (a, b) => b.g - a.g || SLOTS.findIndex(x => x.id === GEAR[a.d].slot) - SLOTS.findIndex(x => x.id === GEAR[b.d].slot) : (a, b) => SLOTS.findIndex(x => x.id === GEAR[a.d].slot) - SLOTS.findIndex(x => x.id === GEAR[b.d].slot) || b.g - a.g);
    const sc = SLOTS.map(S => `<div class="sc"><img src="${uiIcon('cur_scroll')}" alt=""><img class="mini" src="${uiIcon(S.id === 'weapon' ? 'w_' + s.god : S.id + '_a')}" alt=""><b class="oL">${s.scrolls[S.id]}</b></div>`).join('');
    const nb = Meta.bestPlan().length;
    return `<div class="toolbar"><button class="btn glass" id="bSort"><i class="ic-sort"></i>${this.sort === 'grade' ? '등급순' : '부위순'}</button><span class="tb-gap"></span><button class="btn ${nb ? 'green' : 'glass dimb'}" id="bBest">일괄 장착${nb ? `<b class="cnt">${nb}</b>` : ''}</button><button class="btn gold" id="bForge"><img src="${uiIcon('ico_forge')}" alt="">대장간</button></div><div class="scroll" id="gearScroll"><div class="sect top"><span>보유 장비</span><b>${list.length}</b></div><div class="grid">${list.map(i => itemTile(i)).join('') || '<div class="muted" style="grid-column:1/6;text-align:center;padding:calc(var(--u)*8)">가방이 비었습니다</div>'}</div><div class="sect"><span>강화 두루마리</span></div><div class="scgrid">${sc}</div>${s.abyss || s.cleared.slice(BIOMES.length).some(Boolean) || Meta.chapterOpen(BIOMES.length) ? `<div class="sect ab"><span><img src="${uiIcon('cur_abyss')}" alt="">${ABYSS.name}</span><b>${s.abyss || 0}</b><i>어려움에서 얻고, 전설 이상 합성에 듭니다</i></div>` : ''}</div>`;
  },
  /* 캐릭터 탭의 무대: 장비 칸 대신 오른쪽 패널(이름 · 고유 능력 Lv.1~4 · 해금/출전/레벨 업 버튼). 궁수의 전설 2 배치 */
  godPanelHTML() {
    const s = Meta.s, cur = this.godView || s.god, G = GOD_BY[cur], lv = Meta.godLv(cur), info = Meta.godInfo(cur), cost = Meta.godCost(cur);
    const rows = [[G.passive, 1], ...GOD_LV[cur].map(([t], n) => [t, n + 2])].map(([t, n]) => `<div class="gl ${n <= lv ? 'on' : ''}"><b class="oL">Lv.${n}</b> ${t}</div>`).join('');
    const cnt = c => `<small>${info.shard}/${c}</small>`;
    const price = Meta.godPrice(cur), get = GOD_GET[cur] || {};   // v38 뽑기 없음: 조각 50개면 해금, 모자라면 보석 구매(조각만큼 깎임) 또는 챕터 클리어 보상
    const act = !lv ? (info.shard >= cost ? `<button class="btn green" id="gUp">해금 ${cnt(cost)}</button>` : price !== null ? `<button class="btn gold" id="gBuy"><img src="${uiIcon('cur_gem')}" alt="">${fmt(price)} <small>데려오기</small></button>` : `<span class="gmax oL">챕터 ${get.chapter} 클리어 보상</span>`)
      : `${s.god !== cur ? '<button class="btn gold" id="gSel">출전</button>' : ''}${cost !== null ? `<button class="btn green" id="gUp" ${info.shard >= cost ? '' : 'disabled'}>레벨 업 ${cnt(cost)}</button>` : '<span class="gmax oL">최대 레벨</span>'}`;
    return `<div class="gpanel"><div class="gname oL"><span style="--rk:${G.rankCol}" class="grk">${G.rank}</span>${G.name}</div><div class="gsub">${G.title} · ${(w => w ? Meta.weaponName(w) : G.weapon)(Meta.godLv(cur) && Meta.equipped('weapon', cur))}</div><div class="gpips">${[1, 2, 3, 4].map(n => `<i class="${n <= lv ? 'on' : ''}"></i>`).join('')}</div>${rows}<div class="god-act">${act}</div></div>`;
  },
  /* 캐릭터 목록: 4열 카드(등급 색 바탕 · 얼굴 위주 · 조각 막대). 새 신이 들어올 자리(준비 중)를 미리 채워 12칸을 맞춘다. 안내 글은 목록 아래 */
  godsPane() {
    const s = Meta.s, cur = this.godView || s.god, G = GOD_BY[cur], lv = Meta.godLv(cur);
    // v37: 등급 3단계(전설 3 · 영웅 5 · 희귀 4) — 등급별 묶음 머리글 + 등급 색 테두리 · 햇살 무늬 · 이름 띠(전설은 금빛이 흐른다)
    const TIERS = [['전설', 't3'], ['영웅', 't2'], ['희귀', 't1']];
    const card = g => {
      const i = Meta.godInfo(g.id), c = Meta.godCost(g.id), l = Meta.godLv(g.id), pct = c ? Math.min(100, i.shard / c * 100) : 100, t = (TIERS.find(x => x[0] === g.rank) || TIERS[2])[1];
      return `<button class="gc ${t} ${l ? '' : 'lock'} ${g.id === cur ? 'sel' : ''} ${c !== null && i.shard >= c ? 'ready' : ''}" data-god="${g.id}" aria-label="${g.rank} ${g.name}"><span class="pt"><img src="assets/god/${g.id}/big_bare.webp" alt=""><span class="gfx"></span>${l ? `<span class="rk oL">Lv.${l}</span>` : `<img class="lk" src="${uiIcon('ico_lock')}" alt="">`}<span class="gnm oL">${g.name}</span></span>${s.god === g.id ? '<span class="on oL">출전 중</span>' : ''}<span class="pg oL"><i style="width:${pct}%"></i><img src="${uiIcon('cur_shard')}" alt=""><span>${c === null ? '최대' : i.shard + '/' + c}</span></span></button>`;
    };
    const cards = TIERS.map(([r, t]) => { const gs = GODS.filter(g => g.rank === r); if (!gs.length) return ''; const own = gs.filter(g => Meta.godLv(g.id)).length;
      return `<div class="gtier ${t}"><span class="gem"></span><b class="oL">${r}</b><i>${own}/${gs.length}</i><span class="ln"></span></div>` + gs.map(card).join(''); }).join('');
    const soon = Array.from({ length: Math.max(0, GODS_PLANNED - GODS.length) }, () => '<div class="gc soon"><span class="pt"><b>?</b></span><span class="pg oL"><span>준비 중</span></span></div>').join('');
    const nextBonus = lv && lv < GOD_LV_MAX ? ` · 다음 레벨 +${Math.round(GOD_LV_BONUS * 100)}%` : '';
    const share = Meta.godShare(cur), all = Meta.accountBonus(), pc = x => (x * 100).toFixed(x * 100 % 1 ? 1 : 0);
    const acc = `<div class="gacc oL"><b>모든 신에게 주는 보너스</b><span>이 신 공격력 +${pc(share.atk)}% · 체력 +${pc(share.hp)}%</span><span>전체 합계 공격력 +${pc(all.atk)}% · 체력 +${pc(all.hp)}%</span></div>`;
    const about = `<div class="gabout oL"><b>${G.name}</b> 연사 ${Math.round(100 / G.fire)}% · 피해 ${Math.round(G.dmg * 100)}% · 탄창 ${G.ammo}${RANK_STAT[G.rank] > 1 ? ` · ${G.rank} 등급 +${Math.round((RANK_STAT[G.rank] - 1) * 100)}%` : ''}${lv ? ` · 레벨 효과 +${Math.round((lv - 1) * GOD_LV_BONUS * 100)}%${nextBonus}` : (GOD_GET[cur] && GOD_GET[cur].chapter ? `<br>챕터 ${GOD_GET[cur].chapter}을 처음 깨면 함께합니다` : '<br>보석으로 데려올 수 있습니다. 가진 조각만큼 값이 내려갑니다')}</div>`;
    return `<div class="scroll" id="godScroll"><div class="gods">${cards}${soon}</div>${about}${acc}</div>`;
  },
  gearClick(e) {
    const t = e.target, sl = t.closest('.slot'), it = t.closest('.grid .it'), st = t.closest('.st'), gc = t.closest('.gc');
    if (st) { sfx.tap(); this.sub = st.dataset.sub; this.r_gear(); return; }
    if (sl) { sfx.tap(); this.slotPop(sl.dataset.slot); return; }
    if (it) { sfx.tap(); this.itemPop(it.dataset.uid); return; }
    if (t.closest('#bSort')) { sfx.tap(); this.sort = this.sort === 'grade' ? 'slot' : 'grade'; this.r_gear(); return; }
    if (t.closest('#bForge')) { sfx.tap(); this.openForge(); return; }
    if (t.closest('#bBest')) { this.equipAll(); return; }
    if (t.closest('#bInfo')) { sfx.tap(); this.statPop(); return; }
    if (gc) { sfx.tap(); this.godView = gc.dataset.god; this._swap = true; this.r_gear(); return; }
    if (t.closest('#gSel')) { sfx.tap(); loadGod(this.godView); Meta.selectGod(this.godView); this._swap = true; this.render(); this.toast(GOD_BY[this.godView].name + ' 출전'); return; }
    if (t.closest('#gBuy')) { const id = this.godView, p0 = Meta.power(); if (Meta.buyGod(id)) { sfx.reward(); loadGod(id); this.toast(GOD_BY[id].name + ' 합류!'); this._swap = true; this.render(); powerPill(p0, Meta.power()); } else { sfx.empty(); this.toast('보석이 모자랍니다'); } return; }
    if (t.closest('#gUp')) { const id = this.godView || Meta.s.god, p0 = Meta.power(); if (Meta.godUp(id)) { setTimeout(() => powerPill(p0, Meta.power()), 0); sfx.reward(); this.toast(Meta.godLv(id) > 1 ? `Lv.${Meta.godLv(id)}이 되었습니다` : '해금했습니다'); this._swap = true; this.render(); } return; }
  },
  popup(html) { const el = $('pop'); el.innerHTML = html; el.classList.add('on'); el.onclick = e => { if (e.target === el || e.target.closest('[data-close]')) { sfx.tap(); el.classList.remove('on'); } }; },
  closePop() { $('pop').classList.remove('on'); },
  itemBody(it, lvBonus) {
    const S = SLOT_BY[GEAR[it.d].slot], G = GEAR[it.d], stat = Meta.itemStat(it), lab = stat.stat === 'atk' ? '공격력' : '체력';
    const owner = S.id === 'weapon' ? it.god : null, name = owner ? `${Meta.weaponName(it)} · ${G.name}` : G.name;
    const usable = !owner || (Meta.godLv(owner) && owner === Meta.s.god);
    const own = owner ? `<div class="ip-own ${usable ? 'ok' : 'no'}"><b>${GOD_BY[owner].name} 전용</b>${usable ? '' : !Meta.godLv(owner) ? ` · ${GOD_BY[owner].name}를 해금하면 쓸 수 있습니다` : ` · 장착하면 ${GOD_BY[owner].name}의 무기 칸에 들어갑니다`}</div>` : '';
    const sk = Meta.itemSkills(it).map(k => `<div class="sk ${k.on ? 'on' : 'off'} ${k.sig ? 'sig' : ''}" style="--c:${GRADES[k.g].color};--h:${GRADES[k.g].hi}"><i></i><em>${GRADES[k.g].name}</em><span>${k.t}</span></div>`).join('');
    return { name, usable, html: `<div class="ip-top"><div class="ip-big">${itemTile(it, 'mini noown', 'div')}</div><div class="ip-meta"><div class="ip-tags"><span class="ip-gr g${it.g}" style="${gradeVars(it.g)}">${gradeName(it.g)}</span><span class="ip-slot">${S.name}</span></div><span class="ip-lv">레벨 ${Meta.levelOf(S.id, owner)} / ${LV_MAX}</span>${own}<div class="ip-ds">${G.desc}</div></div></div>${owner ? `<div class="ip-acc">장착하면 모든 신의 공격력 +${(ACCOUNT.weaponGrade[it.g] * 100).toFixed(1).replace('.0', '')}% (등급이 오를수록 커집니다)</div>` : ''}<div class="ip-st"><img src="${uiIcon(stat.stat === 'atk' ? 'cur_power' : 'armor_a')}" alt=""><span>${lab}</span><b>+${stat.val}</b>${lvBonus ? `<em>레벨 +${lvBonus}</em>` : ''}</div><div class="ip-sk">${sk}</div>` };
  },
  itemPop(uid) {
    const it = Meta.item(uid); it.isNew = false; Meta.save();
    const b = this.itemBody(it), slot = GEAR[it.d].slot, w = slot === 'weapon', owner = w ? it.god : null, own = !w || !!Meta.godLv(owner), cur = Meta.equipped(slot, owner), other = w && owner !== Meta.s.god;
    const note = '';   // v36 전용 표기는 몸통(ip-own)에 한 줄로
    // 다른 신의 무기도 그 신의 무기 칸에 끼울 수 있다(해금했을 때). 지금 출전한 신이 아니면 '○○에게 장착'
    const usable = own, label = !own ? '장착 불가' : other ? `${GOD_BY[owner].name}에게 장착` : cur ? '교체' : '장착';
    const sg = Meta.canSalvage(it) && Meta.salvageGain(it);
    this.popup(`<div class="card-pop" style="${gradeVars(it.g)}"><div class="hd">${b.name}</div><button class="x" data-close>✕</button>${b.html}${note}<div class="ip-acts">${sg ? '<button class="btn red" id="ipSalv">분해</button>' : ''}<button class="btn blue" id="ipForge" ${Meta.mergeNeed(it) ? '' : 'disabled'}>합성</button><button class="btn green" id="ipEq" ${usable ? '' : 'disabled'}>${label}</button></div></div>`);
    $('ipEq').onclick = () => { const p0 = Meta.power(); if (!Meta.equip(uid)) return; sfx.equip(); if (w) this._swap = true; this.closePop(); this.render(); powerPill(p0, Meta.power()); const sl = document.querySelector(`.slot[data-slot="${slot}"]`); if (sl) { sl.classList.add('upg'); sparkBurst(sl, GRADES[it.g].glow, 12, 1); } };
    $('ipForge').onclick = () => { this.closePop(); this.openForge(uid); };
    if (sg) $('ipSalv').onclick = e => {
      const bt = e.currentTarget;
      if (!bt.classList.contains('arm')) { sfx.tap(); bt.classList.add('arm'); bt.innerHTML = `<span class="arm-t">한 번 더<br><small>두루마리 +${sg.scroll}</small></span>`; return; }   // 실수로 지우지 않게 두 번 누른다
      const r = Meta.salvage([uid]); if (!r.n) return; sfx.coin && sfx.coin(); this.closePop(); this.render(); this.toast(`분해: ${SLOT_BY[sg.slot].name} 두루마리 +${sg.scroll} · 골드 +${sg.gold}`);
    };
  },
  /* 일괄 장착: 확인 없이 바로(더 좋은 것만 끼우고 빼지는 않는다). 바뀐 칸마다 빛, 전투력 변화 표시 */
  equipAll() {
    const p0 = Meta.power(), plan = Meta.equipBest();
    if (!plan.length) { sfx.tap(); this.toast('지금보다 좋은 장비가 없습니다'); return; }
    sfx.equip(); if (plan.some(x => x.slot === 'weapon')) this._swap = true; this.render(); powerPill(p0, Meta.power());
    const mine = plan.filter(x => !x.god || x.god === Meta.s.god), others = plan.length - mine.length;
    mine.forEach((x, i) => setTimeout(() => { const sl = document.querySelector(`.slot[data-slot="${x.slot}"]`); if (sl) { sl.classList.add('upg'); sparkBurst(sl, GRADES[x.to].glow, 12, 1); } }, i * 70));
    this.toast(`${mine.length ? `${mine.length}칸 장착` : ''}${mine.length && others ? ' · ' : ''}${others ? `다른 신 무기 ${others}개 장착` : ''}`);
  },
  /* 일괄 분해 확인 창(대장간): 등급을 고르고, 받을 두루마리·골드를 미리 보여 준다 */
  salvagePop(gr) {
    const s = Meta.s; gr = gr || this._salvGr || [0]; this._salvGr = gr;
    const list = Meta.salvageList(gr), sum = { gold: 0 }, by = {};
    for (const it of list) { const g = Meta.salvageGain(it); sum.gold += g.gold; by[g.slot] = (by[g.slot] || 0) + g.scroll; }
    const gain = SLOTS.filter(S => by[S.id]).map(S => `<span class="sv-g"><img src="${uiIcon(S.id + '_a')}" alt=""><img class="mini" src="${uiIcon('cur_scroll')}" alt="">+${by[S.id]}</span>`).join('');
    this.popup(`<div class="card-pop" style="--c:#dc3a46;--d:#7a141e"><div class="hd">일괄 분해</div><button class="x" data-close>✕</button>
      <div class="ua-tabs sv">${[0, 1, 2].map(g => `<button class="${gr.includes(g) ? 'on' : ''}" data-sg="${g}" style="--gc:${GRADES[g].color}">${gr.includes(g) ? '✓ ' : ''}${GRADES[g].name}</button>`).join('')}</div>
      <div class="sv-list">${list.length ? list.slice(0, 30).map(i => itemTile(i, 'mini')).join('') + (list.length > 30 ? `<span class="more">+${list.length - 30}</span>` : '') : '<div class="note">분해할 장비가 없습니다</div>'}</div>
      ${list.length ? `<div class="sv-gain">${gain}<span class="sv-g"><img src="${uiIcon('cur_gold')}" alt="">+${fmt(sum.gold)}</span></div>` : ''}
      <div class="note">착용 중 · 무기 · 지금보다 좋은 장비(초록 화살표) · 바로 합성할 수 있는 3개 묶음은 분해하지 않습니다.</div>
      <div class="ip-acts"><button class="btn gray" data-close>취소</button><button class="btn red" id="svGo" ${list.length ? '' : 'disabled'}>분해 ${list.length ? `<small>${list.length}개</small>` : ''}</button></div></div>`);
    $('pop').querySelectorAll('[data-sg]').forEach(b => b.onclick = () => { sfx.tap(); const g = +b.dataset.sg, n = gr.includes(g) ? gr.filter(x => x !== g) : [...gr, g].sort(); this.salvagePop(n); });
    $('svGo').onclick = () => { const r = Meta.salvage(list.map(i => i.uid)); if (!r.n) return; sfx.upgrade(); this.closePop(); this.r_forge(); this.toast(`${r.n}개 분해 · 두루마리 +${Object.values(r.scrolls).reduce((a, b) => a + b, 0)} · 골드 +${fmt(r.gold)}`); };
  },
  /* god: 무기 칸만 쓴다. 출전하지 않은 신의 전용 무기도 여기서 올린다 */
  slotPop(slot, god) {
    const S = SLOT_BY[slot], it = Meta.equipped(slot, god), s = Meta.s;
    if (!it) { this.toast(`가방에서 ${S.name}를 골라 장착하세요`); this.sub = 'gear'; return; }
    const b = this.itemBody(it, Meta.slotBonus(slot, god)), c = Meta.upgradeCost(slot, god), cap = Meta.lvCap(slot), lv = Meta.levelOf(slot, god), maxed = lv >= cap;
    const lab = S.stat === 'atk' ? '공격력' : '체력', bp = Meta.slotUpPlan(slot, god), bn = bp.to - bp.from;
    this.popup(`<div class="card-pop" style="${gradeVars(it.g)}"><div class="hd">${b.name}</div><button class="x" data-close>✕</button>${b.html}
      <div class="ip-up"><div class="row"><span>레벨 ${lv} / ${cap}</span><span style="color:#2a8c3a">다음 레벨 ${lab} +${S.perLv}</span></div>${maxed ? `<div class="row no">최대 레벨입니다</div>` : `<div class="row"><span class="${s.gold < c.gold ? 'no' : ''}"><img src="${uiIcon('cur_gold')}" alt=""> ${fmt(c.gold)}</span><span class="${s.scrolls[slot] < c.scroll ? 'no' : ''}"><img src="${uiIcon('cur_scroll')}" alt=""> ${s.scrolls[slot]} / ${c.scroll}</span></div>`}${maxed ? '' : `<div class="row bulk ${bn ? '' : 'off'}"><span>일괄 ${bn ? `<b>Lv.${bp.from} → Lv.${bp.to}</b>` : `<i>${bp.why}</i>`}</span>${bn ? `<span><img src="${uiIcon('cur_gold')}" alt=""> ${fmt(bp.gold)} <img src="${uiIcon('cur_scroll')}" alt=""> ${bp.scroll}</span>` : ''}</div>`}</div>
      <div class="ip-acts up3"><button class="btn gray" id="ipOff">해제</button><button class="btn green" id="ipUp" ${Meta.canUpgrade(slot, god) ? '' : 'disabled'}>업그레이드</button><button class="btn gold" id="ipUpMax" ${bn ? '' : 'disabled'}><span>일괄 업그레이드</span>${bn ? `<small>+${bn}레벨</small>` : ''}</button></div></div>`);
    $('ipOff').onclick = () => { Meta.unequip(slot, god); sfx.tap(); if (slot === 'weapon') this._swap = true; this.closePop(); this.render(); };
    $('ipUp').onclick = () => {
      const p0 = Meta.power(); if (!Meta.upgrade(slot, god)) { sfx.empty(); return; }
      sfx.upgrade(); this.render(); this.slotPop(slot, god);
      const pop = $('pop'), ic = pop.querySelector('.ip-top .it'), lvEl = pop.querySelector('.ip-lv'), plus = document.createElement('span');
      ic.classList.add('upg'); lvEl.classList.add('bump'); plus.className = 'ip-plus oL'; plus.textContent = `${lab} +${S.perLv}`; ic.append(plus);
      sparkBurst(ic, GRADES[it.g].glow, 16, 1); powerPill(p0, Meta.power());
    };
    $('ipUpMax').onclick = () => {   // 한 번에 여러 레벨: 같은 강화 연출을 크게, 올린 레벨 수를 띄운다
      const p0 = Meta.power(), r = Meta.upgradeMax(slot, god); if (!r.n) { sfx.empty(); return; }
      sfx.upgrade(); this.render(); this.slotPop(slot, god);
      const pop = $('pop'), ic = pop.querySelector('.ip-top .it'), lvEl = pop.querySelector('.ip-lv'), plus = document.createElement('span');
      ic.classList.add('upg'); lvEl.classList.add('bump'); plus.className = 'ip-plus oL'; plus.textContent = `Lv.+${r.n} · ${lab} +${Math.round(r.n * S.perLv)}`; ic.append(plus);
      sparkBurst(ic, GRADES[it.g].glow, 26, 1.25); powerPill(p0, Meta.power());
      const sl = document.querySelector(`.slot[data-slot="${slot}"]`); if (sl) sl.classList.add('upg');
    };
  },
  statPop() {
    const o = Meta.stats();
    this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">능력치</div><button class="x" data-close>✕</button><div class="ip-sk"><div>전투력 ${o.power}</div><div>모든 신 보너스: 공격력 +${(Meta.accountBonus().atk * 100).toFixed(1)}% · 체력 +${(Meta.accountBonus().hp * 100).toFixed(1)}%</div><div>공격력 ${o.atk} · 체력 ${o.hp}</div><div>치명타 확률 ${Math.round(o.crit * 100)}% · 치명타 피해 +${Math.round((.5 + o.critDmg) * 100)}%</div><div>받는 피해 -${Math.round(o.dmgCut * 100)}%</div><div>파편 획득 +${Math.round(o.shardPct * 100)}% · 이동 속도 +${Math.round(o.runPct * 100)}%</div><div>탄창 ${o.god.ammo + o.ammo}칸 · 점프 높이 +${Math.round(o.jumpPct * 100)}%</div></div><div class="note">장비 칸을 업그레이드하고, 대장간에서 합성해 더 높은 등급을 만드세요.</div></div>`);
  },

  /* ───── 대장간 ───── */
  openForge(uid) { const it0 = uid && Meta.item(uid); this.fg = { target: it0 && Meta.mergeNeed(it0) ? uid : null, mats: [] }; if (this.fg.target) this.fg.mats = Meta.mergeMats(it0).slice(0, Meta.mergeNeed(it0).n).map(o => o.uid); $('forge').classList.add('on'); this.r_forge(); },
  r_forge() {
    const f = this.fg, tgt = f.target ? Meta.item(f.target) : null, s = Meta.s;
    let say = '합성할 대상 장비를 고르시오.';
    let list = s.inv.filter(i => !Meta.isEquipped(i.uid) && Meta.mergeNeed(i));
    const need = tgt ? Meta.mergeNeed(tgt) : null, nM = need ? need.n : 2;
    if (tgt) {
      const cands = Meta.mergeMats(tgt), w = GEAR[tgt.d].slot === 'weapon';
      const what = need.same ? `같은 장비 ${gradeName(need.matG)}` : w ? `${GOD_BY[tgt.god].name}의 무기 ${gradeName(need.matG)}` : `같은 부위 ${gradeName(need.matG)}`;
      list = cands;
      say = `${gradeName(tgt.g)} → <b style="color:${GRADES[tgt.g + 1].color}">${gradeName(tgt.g + 1)}</b><br>재료: ${what} ${need.n}개${tgt.g + 1 === GRADE_S ? '<br>S가 되면 무기 모양이 바뀌오!' : tgt.g + 1 >= 4 && !w ? '' : ''}`;
      if (need.stone) say += `<br><span class="fg-ab ${(s.abyss || 0) >= need.stone ? '' : 'no'}"><img src="${uiIcon('cur_abyss')}" alt="">${ABYSS.name} ${s.abyss || 0} / ${need.stone}</span>`;
      if (cands.length < need.n) say = `재료가 부족하오.<br>${what} ${need.n - cands.length}개가 더 필요하오.`;
      else if (need.stone && (s.abyss || 0) < need.stone) say = `${ABYSS.name}이 모자라오.<br><span class="fg-ab no"><img src="${uiIcon('cur_abyss')}" alt="">${s.abyss || 0} / ${need.stone}</span><br>어려움에서 구해 오시오.`;
    }
    list.sort((a, b) => b.g - a.g || SLOTS.findIndex(x => x.id === GEAR[a.d].slot) - SLOTS.findIndex(x => x.id === GEAR[b.d].slot));
    const can = tgt && f.mats.length === nM && (!need.stone || (s.abyss || 0) >= need.stone);
    const res = tgt ? itemTile({ ...tgt, g: tgt.g + 1, isNew: false }, 'mini noown', 'div') : '';
    $('forge').innerHTML = `<div class="fg-top"><img class="fg-smith" src="assets/god/hephaestus/big_armed.webp" alt=""><div class="fg-slots"><div class="fbox ${this._fgFlash ? 'flash' : ''}" id="fgRes" data-cap="결과">${this._fgDone ? itemTile({ ...this._fgDone, isNew: false }, 'mini noown pop', 'div') : res}</div><div class="fg-arrow"></div><div class="fbox" id="fgT" data-cap="대상">${tgt ? itemTile(tgt, 'mini noown', 'div') : ''}</div><div class="fg-mats">${Array.from({ length: nM }, (_, i) => { const m = f.mats[i] ? Meta.item(f.mats[i]) : null; return `<div class="fbox m" data-m="${i}" data-cap="재료">${m ? itemTile(m, 'mini noown', 'div') : ''}</div>`; }).join('')}</div></div><div class="fg-say"><span>${this._fgDone ? `${gradeName(this._fgDone.g)} 완성이오!${this._fgDone.g === GRADE_S ? '<br>무기 모양이 바뀌었소!' : ''}` : say}</span></div></div>
      <div class="fg-title oL">${tgt ? '재료 장비' : '대상 장비'}</div>
      <div class="scroll fg-grid"><div class="grid">${list.map(i => itemTile(i, (f.mats.includes(i.uid) || f.target === i.uid) ? 'sel' : '')).join('') || `<div class="muted" style="grid-column:1/6;text-align:center;padding:calc(var(--u)*6)">${tgt ? '재료가 없습니다' : '합성할 장비가 없습니다'}</div>`}</div></div>
      <div class="fg-bot"><button class="back oL" id="fgBack">←</button>${tgt ? `<button class="btn gray" id="fgClr">선택 취소</button><button class="btn green" id="fgGo" ${can ? '' : 'disabled'}>합성</button>` : `<button class="btn red" id="fgSalv">일괄 분해</button><button class="btn green" id="fgAll">일괄 합성</button>`}</div>`;
    this._fgDone = null; this._fgFlash = false;
    $('forge').onclick = e => {
      const t = e.target, it = t.closest('.grid .it');
      if (t.closest('#fgBack')) { sfx.tap(); if (this.fg.target) { this.fg = { target: null, mats: [] }; this.r_forge(); } else { $('forge').classList.remove('on'); this.render(); } return; }
      if (t.closest('#fgClr')) { sfx.tap(); this.fg = { target: null, mats: [] }; this.r_forge(); return; }
      if (t.closest('#fgSalv')) { sfx.tap(); this.salvagePop(); return; }
      if (t.closest('#fgAll')) { const r = Meta.mergeAll(); if (r.length) { sfx.upgrade(); this.toast(`${r.length}번 합성했습니다`); this._fgDone = r[r.length - 1]; this._fgFlash = true; this.r_forge(); } else this.toast('일괄로 합성할 장비가 없습니다. 전설 이상은 직접 고르세요'); return; }
      if (t.closest('#fgGo')) { const r = Meta.merge(this.fg.target, this.fg.mats); if (r) { sfx.bigBoom(); sfx.reward(); this._fgDone = r; this._fgFlash = true; this.fg = { target: null, mats: [] }; this.r_forge(); } return; }
      if (it) {
        sfx.tap(); const uid = it.dataset.uid, f2 = this.fg;
        if (!f2.target) { f2.target = uid; f2.mats = []; const t2 = Meta.item(uid), cands = Meta.mergeMats(t2); f2.mats = cands.slice(0, Meta.mergeNeed(t2).n).map(o => o.uid); }
        else { const i = f2.mats.indexOf(uid), n = Meta.mergeNeed(Meta.item(f2.target)).n; if (i >= 0) f2.mats.splice(i, 1); else if (f2.mats.length < n) f2.mats.push(uid); }
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
      const pity = (C.pity ? `<span class="pity">에픽 확정까지 ${Math.max(1, C.pity - (st.pity || 0))}회</span>` : '') + (C.featured ? (() => { const fg = GOD_BY[Meta.featuredGod()], l = Meta.featuredLeft(); return `<div class="feat"><img src="${uiIcon('w_' + fg.id)}" alt=""><span>이번 회차 <b style="color:${fg.rankCol}">${fg.name}</b> · ${Math.floor(l / 864e5)}일 ${Math.floor(l / 36e5) % 24}시간 남음</span></div>`; })() : '');
      return `<div class="chest" style="--t:${C.tint}"><div class="hd2 oL"><span>${C.name}</span><button class="info" data-rate="${id}">i</button></div><div class="bd"><img class="cimg" src="${uiIcon(C.icon)}" alt=""><div><div class="dsc">${C.desc}</div>${pity}${tm ? `<div class="pity" style="display:block;margin-top:calc(var(--u)*1)">${tm}</div>` : ''}</div></div><div class="acts">${fr ? `<button class="btn gold free" data-pull="${id}" data-n="1" data-free="1"><span>무료 1회</span></button>` : ''}<button class="btn green" data-pull="${id}" data-n="1"><span class="oL">1회 뽑기</span><span class="pr oL"><img src="${ic}" alt="">${fmt(C.one)}</span></button><button class="btn green" data-pull="${id}" data-n="10"><span class="oL">10회 뽑기</span><span class="pr oL"><img src="${ic}" alt="">${fmt(C.ten)}</span></button></div></div>`;
    }).join('');
    const GC = GOD_CHEST, gst = s.chest.god || {}, gfr = (gst.freeAt || 0) <= now, gleft = Math.max(0, (gst.freeAt || 0) - now), gic = uiIcon('cur_gem');
    const gtm = gleft ? `${Math.floor(gleft / 3600000)}시간 ${Math.floor(gleft / 60000) % 60}분 뒤 무료` : '';
    const gcard = `<div class="chest" style="--t:${GC.tint}"><div class="hd2 oL"><span>${GC.name}</span><button class="info" data-rategod="1">i</button></div><div class="bd"><img class="cimg" src="${uiIcon(GC.icon)}" alt=""><div><div class="dsc">${GC.desc}</div><span class="pity">전설 확정까지 ${Math.max(1, GC.pity - (gst.pity || 0))}회</span>${gtm ? `<div class="pity" style="display:block;margin-top:calc(var(--u)*1)">${gtm}</div>` : ''}</div></div><div class="acts">${gfr ? `<button class="btn gold free" data-pullgod="1" data-free="1"><span>무료 1회</span></button>` : ''}<button class="btn green" data-pullgod="1"><span class="oL">1회 소환</span><span class="pr oL"><img src="${gic}" alt="">${GC.one}</span></button><button class="btn green" data-pullgod="10"><span class="oL">10회 소환</span><span class="pr oL"><img src="${gic}" alt="">${GC.ten}</span></button></div></div>`;
    // v38 캐릭터 뽑기(신의 소환)는 없앴다 → 함께하는 신의 조각을 사는 상점(레벨 업용)
    const owned = GODS.filter(g => Meta.godLv(g.id) && Meta.godCost(g.id) !== null);
    const srow = g => { const left = Meta.shardLeft(g.id), i = Meta.godInfo(g.id); return `<div class="ss-r"><img class="ss-f" src="assets/god/${g.id}/big_bare.webp" alt=""><div class="ss-n"><b class="oL" style="color:${g.rankCol}">${g.name}</b><small>조각 ${i.shard}/${Meta.godCost(g.id)} · 오늘 ${left}/${SHARD_SHOP.daily}</small></div><button class="btn green" data-shard="${g.id}" ${left > 0 ? '' : 'disabled'}><span>조각 ×${SHARD_SHOP.n}</span><small><img src="${gic}" alt="">${SHARD_SHOP.price[g.rank]}</small></button></div>`; };
    const scard = `<div class="chest" style="--t:#7a3fb0"><div class="hd2 oL"><span>신의 조각 상점</span></div><div class="dsc" style="margin:calc(var(--u)*1) 0">함께하는 신의 조각을 삽니다(레벨 업). 새 신은 캐릭터 화면에서 데려옵니다.</div><div class="ss">${owned.map(srow).join('') || '<div class="note">레벨을 올릴 수 있는 신이 없습니다</div>'}</div></div>`;
    const gl = Meta.goldLeft(), gcard2 = `<div class="chest" style="--t:#9a6a12"><div class="hd2 oL"><span>골드 주머니</span></div><div class="bd"><img class="cimg" src="${uiIcon('cur_gold')}" alt=""><div><div class="dsc">보석으로 골드 <b style="color:#ffe27a">${fmt(GOLD_SHOP.gold(Meta.clearedN()))}</b>을 삽니다. 챕터를 깰수록 많아집니다.</div><span class="pity">오늘 ${gl}/${GOLD_SHOP.daily}</span></div></div><div class="acts"><button class="btn green" id="buyGold" style="grid-column:1/3" ${gl > 0 ? '' : 'disabled'}><span>골드 사기</span><span class="pr oL"><img src="${gic}" alt="">${GOLD_SHOP.gem}</span></button></div></div>`;
    setHTML(el, `<div class="scroll">${html}${scard}${gcard2}<div class="chest" style="--t:#2a6a3a"><div class="hd2 oL"><span>에너지 충전</span></div><div class="dsc" style="margin:calc(var(--u)*1) 0">에너지 ${ENERGY.buyN}을 채웁니다. 상한을 넘어 쌓입니다.</div><div class="acts"><button class="btn green" id="buyEn" style="grid-column:1/3"><span class="pr oL"><img src="${uiIcon('cur_gem')}" alt="">${ENERGY.buyGem}</span></button></div></div><div style="height:calc(var(--u)*2)"></div></div>`);
    el.onclick = e => {
      const t = e.target, p = t.closest('[data-pull]'), r = t.closest('[data-rate]');
      if (r) { sfx.tap(); this.ratePop(r.dataset.rate); return; }
      if (t.closest('[data-rategod]')) { sfx.tap(); this.godRatePop(); return; }
      const pg = t.closest('[data-pullgod]');
      if (pg) { const res = Meta.pullGod(+pg.dataset.pullgod, !!pg.dataset.free); if (!res) { sfx.empty(); this.toast('보석이 모자랍니다'); return; } this.reveal('god', res); return; }
      const sh = t.closest('[data-shard]'); if (sh && !sh.disabled) { if (Meta.buyShards(sh.dataset.shard)) { sfx.buy(); this.render(); this.toast('조각 +' + SHARD_SHOP.n); } else { sfx.empty(); this.toast('보석이 모자랍니다'); } return; }
      if (t.closest('#buyGold')) { const n = Meta.buyGold(); if (n) { sfx.buy(); this.render(); this.toast('골드 +' + fmt(n)); } else { sfx.empty(); this.toast(Meta.goldLeft() > 0 ? '보석이 모자랍니다' : '오늘은 다 샀습니다'); } return; }
      if (t.closest('#buyEn')) { if (s.gem >= ENERGY.buyGem) { s.gem -= ENERGY.buyGem; s.energy += ENERGY.buyN; Meta.save(); sfx.reward(); this.render(); } else this.toast('보석이 모자랍니다'); return; }
      if (p) { const res = Meta.pull(p.dataset.pull, +p.dataset.n, !!p.dataset.free); if (!res) { sfx.empty(); this.toast('재화가 모자랍니다'); return; } this.reveal(p.dataset.pull, res); }
    };
  },
  godRatePop() {
    const C = GOD_CHEST, row = r => { const names = GODS.filter(g => g.rank === r).map(g => g.name).join(', '), col = GODS.find(g => g.rank === r).rankCol; return `<div class="r" style="--c:${col}"><span>${r} 조각 ${C.shard[r]}개</span><span>${Math.round(C.rate[r] * 100)}%</span></div><div class="note" style="margin:0 0 calc(var(--u)*1)">${names}</div>`; };
    this.popup(`<div class="card-pop" style="--c:#7a3fb0;--d:#4a2470"><div class="hd">${C.name} 확률</div><button class="x" data-close>✕</button><div class="rates">${['희귀', '영웅', '전설'].map(row).join('')}</div><div class="note">${C.pity}회 안에 전설 조각이 확정으로 나옵니다. 해금에는 조각 ${GOD_UNLOCK}개가 듭니다.</div></div>`);
  },
  ratePop(id) {
    const C = CHESTS.find(x => x.id === id);
    this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">${C.name} 확률</div><button class="x" data-close>✕</button><div class="rates">${Object.entries(C.rate).filter(([, v]) => v > 0).map(([i, v]) => `<div class="r" style="--c:${GRADES[i].color}"><span>${GRADES[i].name}</span><span>${(v * 100).toFixed(0)}%</span></div>`).join('')}<div class="r" style="--c:#8a7a7a"><span>전설 · 신화</span><span>합성으로만</span></div></div><div class="note" style="color:#fff">${C.note}${C.pity ? ` ${C.pity}회 안에 에픽 1개가 확정됩니다.` : ''}</div><div class="note">전설 · 신화는 뽑기로 나오지 않습니다. 대장간에서 같은 부위 에픽 3개로 전설을, 전설 2개로 신화를 만듭니다. 신 전용 무기는 같은 신의 무기끼리 합성하고, 신화 위로 S · SS까지 올라 S부터 모양이 바뀝니다. ${C.slots.includes('weapon') ? `${C.featured ? '이번 회차 신이 아닐 때 ' : ''}무기의 절반은 지금 출전한 신의 무기이고, 나머지는 신 1명당 레어 신 ${WEAPON_RATE['레어'] * 100}%, 에픽 신 ${WEAPON_RATE['에픽'] * 100}%, 전설 신 ${WEAPON_RATE['전설'] * 100}%입니다.` : ''}</div></div>`);
  },
  /* 뽑기 결과(2026-11-06): 가장 좋은 결과에 따라 상자 연출이 달라진다. 일반 = 짧게 흔들림, 희귀 = 파란 빛,
     에픽 = 두구두구(점점 세게 세 번 튀고 보라 빛이 새어 나옴), 전설 조각 = 금빛 햇살까지. 화면을 누르면 바로 결과로 넘어간다.
     결과 칸은 개수에 따라 1개 = 크게 가운데, 2~3개 = 한 줄, 4~6개 = 3칸씩, 그 이상 = 5칸씩. 좋은 것부터 앞에 둔다 */
  reveal(id, res) {
    const C = id === 'god' ? GOD_CHEST : CHESTS.find(x => x.id === id), el = $('gacha'); el.classList.add('on');
    const rankOf = r => r.type === 'item' ? Math.max(0, r.item.g - 1) : r.type === 'shard' ? { '희귀': 1, '영웅': 2, '전설': 3 }[GOD_BY[r.god].rank] - (id === 'god' ? 0 : 1) : -1;
    const best = Math.max(0, ...res.map(rankOf)), lv = best >= 3 ? 'lg' : best >= 2 ? 'ep' : best >= 1 ? 'rr' : 'nm';
    const col = { nm: '#ffffff', rr: GRADES[2].color, ep: GRADES[3].color, lg: '#ffc640' }[lv], dur = { nm: 760, rr: 980, ep: 2000, lg: 2500 }[lv];
    el.style.setProperty('--gc', col);
    el.innerHTML = `<div class="ga-stage lv-${lv}"><div class="ga-rays"></div><div class="ga-glow"></div><img class="ga-chest go-${lv}" src="${uiIcon(C.icon)}" alt=""><div class="ga-hint">${lv === 'ep' || lv === 'lg' ? '<b class="oL">무언가 대단한 것이…!</b>' : ''}</div></div>`;
    sfx.rumble(); (this._gaT || []).forEach(clearTimeout); this._gaT = [];
    // 두구두구: 튈 때마다 북소리가 빨라지고 높아진다
    if (lv === 'ep' || lv === 'lg') [180, 640, 1020, 1300, 1500, 1640, 1740, 1820].forEach((t, i) => this._gaT.push(setTimeout(() => { sfx.drum(i); if (i % 2 === 0) vibrate(18 + i * 4); }, t * dur / 2000)));
    let shown = false;
    const show = () => {
      if (shown) return; shown = true; this._gaT.forEach(clearTimeout); this._gaT = []; el.onclick = null;
      sfx.bigBoom(); sfx.reward(); if (lv === 'ep' || lv === 'lg') { sfx.cardUp(lv === 'lg' ? 3 : 2); vibrate(80); }
      const order = res.map((r, i) => ({ r, i, k: rankOf(r) })).sort((a, b) => b.k - a.k || a.i - b.i).map(o => o.r), n = order.length;
      const lay = n === 1 ? 'n1' : n <= 3 ? 'n3' : n <= 6 ? 'n6' : 'n10';
      const cells = order.map((r, i) => {
        const d = `animation-delay:${120 + i * (n > 6 ? 55 : 110)}ms`, k = rankOf(r);
        const tag = k >= 2 ? `<i class="ga-tag oL" style="--c:${r.type === 'item' ? GRADES[r.item.g].color : GOD_BY[r.god].rankCol}">${r.type === 'item' ? GRADES[r.item.g].name : GOD_BY[r.god].rank}</i>` : '';
        const fx = k >= 2 ? `<i class="ga-sun"></i>` : '';
        if (r.type === 'item') { const it = r.item; return `<div class="ga-it g${k}" style="--g:${GRADES[it.g].glow};${d}">${fx}${itemTile({ ...it, isNew: false }, 'mini', 'div')}${tag}<span class="ga-nm">${GEAR[it.d].slot === 'weapon' ? GOD_BY[it.god].weapon : GEAR[it.d].name}</span></div>`; }
        if (r.type === 'shard') return `<div class="ga-it ${k >= 2 ? 'g2' : ''}" style="--g:${GOD_BY[r.god].rankCol};${d}">${fx}<div class="sc" style="background:${GOD_BY[r.god].rankCol};overflow:hidden"><img style="inset:0;width:100%;height:auto" src="assets/god/${r.god}/big_bare.webp" alt=""><b class="oL">${r.n}</b></div>${tag}<span class="ga-nm">${GOD_BY[r.god].name} 조각</span></div>`;
        return `<div class="ga-it" style="${d}"><div class="sc"><img src="${uiIcon('cur_scroll')}" alt=""><img class="mini" src="${uiIcon(r.slot === 'weapon' ? 'w_' + Meta.s.god : r.slot + '_a')}" alt=""><b class="oL">${r.n}</b></div><span class="ga-nm">두루마리</span></div>`;
      }).join('');
      el.innerHTML = `<div class="ga-flash lv-${lv}"></div><div class="ga-title oL">${lv === 'lg' ? '전설 획득!' : lv === 'ep' ? '에픽 획득!' : '획득!'}</div><div class="ga-grid ${lay}">${cells}</div><button class="btn gold" id="gaOk" style="width:calc(var(--u)*50);margin-top:calc(var(--u)*2)">확인</button>`;
      // 에픽 이상 칸은 나타나는 순간 불꽃이 튄다
      [...el.querySelectorAll('.ga-it.g2,.ga-it.g3')].forEach(c => this._gaT.push(setTimeout(() => { if (c.isConnected) sparkBurst(c, getComputedStyle(c).getPropertyValue('--g').trim() || '#fff', 16, 1.3); }, parseInt(c.style.animationDelay) + 180)));
      $('gaOk').onclick = () => { sfx.tap(); this._gaT.forEach(clearTimeout); el.classList.remove('on'); this.render(); };
    };
    this._gaT.push(setTimeout(show, dur));
    el.onclick = e => { if (!shown && !e.target.closest('#gaOk')) show(); };
  },

  /* ───── 임무 ───── */
  r_quest() {
    const el = $('s_quest'), Q = Meta.quests(); el.className = 'screen on bg-dark bg-quest';
    const row = q => { const done = q.cur >= q.need, cl = Meta.questClaimed(q), c = Math.min(q.cur, q.need); return `<div class="qrow"><div><div class="nm">${q.name}</div><div class="bar"><i style="width:${c / q.need * 100}%"></i><span>${c} / ${q.need}</span></div><div class="rw"><span><img src="${uiIcon('cur_gem')}" alt=""> ${q.gem}</span><span><img src="${uiIcon('cur_gold')}" alt=""> ${fmt(q.gold)}</span></div></div><button class="btn ${cl ? 'gray' : 'green'}" data-q="${q.id}" ${done && !cl ? '' : 'disabled'}>${cl ? '완료' : '받기'}</button></div>`; };
    setHTML(el, `<div class="scroll"><div class="list"><div class="h2 oL">오늘의 임무</div>${Q.filter(q => q.daily).map(row).join('')}<div class="h2 oL">업적</div>${Q.filter(q => !q.daily).map(row).join('')}</div></div>`);
    el.onclick = e => { const b = e.target.closest('[data-q]'); if (b && !b.disabled && Meta.questClaim(b.dataset.q)) { sfx.reward(); this.render(); } };
  },
  /* ───── 재능 ───── */
  r_talent() {
    const el = $('s_talent'), s = Meta.s; el.className = 'screen on bg-dark bg-talent';
    setHTML(el, `<div class="scroll"><div class="h2 oL" style="padding:calc(var(--u)*3) calc(var(--u)*3) 0">재능: 골드로 영구히 강해집니다</div><div class="tal">${TALENTS.map(t => { const l = s.talent[t.id] || 0, mx = l >= t.max, c = t.cost(l); return `<div class="tc"><img src="${uiIcon(t.icon)}" alt=""><div class="nm oL">${t.name}</div><div class="lvv">Lv.${l} / ${t.max}</div><div class="dsc">${t.desc}</div><button class="btn green" data-t="${t.id}" ${mx || s.gold < c ? 'disabled' : ''}><span class="pr oL">${mx ? '최대' : `<img src="${uiIcon('cur_gold')}" alt="">${fmt(c)}`}</span></button></div>`; }).join('')}</div></div>`);
    el.onclick = e => { const b = e.target.closest('[data-t]'); const p0 = Meta.power(); if (b && !b.disabled && Meta.talentUp(b.dataset.t)) { sfx.upgrade(); this.render(); powerPill(p0, Meta.power()); } };
  },
  settings() {
    this.popup(`<div class="card-pop" style="--c:#3478e6;--d:#1b3f8a"><div class="hd">설정</div><button class="x" data-close>✕</button><div class="ip-acts"><button class="btn blue" id="stMute">소리 ${sfx.muted ? '켜기' : '끄기'}</button></div><div class="ip-acts"><button class="btn blue" id="stIntro">인트로 다시 보기</button></div><div class="ip-acts"><button class="btn blue" id="stTut">튜토리얼 다시 하기</button></div><div class="ip-acts"><button class="btn red" id="stReset">처음부터 다시</button></div><div class="note">GOD FALL 개발판 ${verText()}. 저장은 이 브라우저에 됩니다.</div></div>`);
    $('stIntro').onclick = () => { this.closePop(); Intro.play(() => {}); };
    $('stTut').onclick = () => { this.closePop(); $('lobby').classList.remove('on'); sfx.init(); startTutorial({ chapter: 0, replay: true }); };   // v38.1 예전 계정도 튜토리얼을 볼 수 있게
    $('stMute').onclick = e => { sfx.setMute(!sfx.muted); e.target.textContent = `소리 ${sfx.muted ? '켜기' : '끄기'}`; };
    $('stReset').onclick = e => { if (e.target.dataset.k) { Meta.reset(); this.closePop(); this.go('battle'); this.toast('처음부터 시작합니다'); } else { e.target.dataset.k = 1; e.target.textContent = '한 번 더 누르면 지워집니다'; } };
  },
};

/* ───── 부팅 ───── */
loadImg('ui_skull', uiIcon('ico_skull')); loadImg('ui_heart', uiIcon('ico_heart'));
const _layout0 = layout;
layout = function () { _layout0(); stage.style.setProperty('--u', (view.W / 100) + 'px'); };
layout();
requestAnimationFrame(frame);
UI.boot();
window.GF = { game, input, ui, view, PPT, CARDS, startRun, T, lvl, TILE, COLS, step, sfx, IMG, heroFrame, Meta, UI, DIFF, ENEMY, buildWave, mkEnemy, nextWave, revive, finishRun, openCards, startBossIntro, enterRoom, exitRoom, killEnemy, hurt, applyCard, CARD_BY, famLv, cardPool, interactNear, ORB, SEEK };
if (/[?&]debug=1/.test(location.search)) { $('optZone').checked = true; $('optHit').checked = true; }
