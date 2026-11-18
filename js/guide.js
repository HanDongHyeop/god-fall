'use strict';
/* v38(2026-11-18) 안내(튜토리얼) 화면: 어둡게 덮고(딤) 한 곳만 밝게(포커스) + 손가락 + 말풍선.
   궁수의 전설 2 초반 흐름처럼 '설명 → 직접 해 보기'를 한 걸음씩 시킨다.
   - Guide.card(o)  : 멈추고 설명한다. 아무 데나 누르면 넘어간다(0.45초 뒤부터)
   - Guide.force(o) : 밝은 곳만 누를 수 있다(강제 터치). 누르면 그 버튼이 실제로 눌리고 다음으로 간다
   - Guide.chip(t)  : 판 안에서 '지금 할 일' 알약(위쪽). chipDone()이면 초록 체크 뒤 사라진다
   - Guide.run(steps, onEnd) : 로비 안내를 차례로. 걸음마다 대상이 나타나길 기다리고, 4초 안에 없으면 건너뛴다(절대 멈춰 서지 않게)
   o = { sel | el | rect{x,y,w,h}(무대 기준 px), text, round, pad, onDone, name } */
const Guide = (() => {
  const $id = id => document.getElementById(id), stage = $id('stage');
  const root = document.createElement('div'); root.id = 'guide';
  root.innerHTML = `<i class="g-hole"></i><i class="g-b g-bt"></i><i class="g-b g-bb"></i><i class="g-b g-bl"></i><i class="g-b g-br"></i><i class="g-catch"></i>
    <i class="g-ring"></i><i class="g-hand"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 6c3.3 0 6 2.7 6 6v15.5l2.2-.4c2.3-.4 4.5.6 5.7 2.4 2-.9 4.5-.4 6 1.300 1 .2 2.900 1.100 4.100 2.600C50.400 35.900 52 38.800 52 42v4c0 8.800-7.200 16-16 16h-4c-5.300 0-10.200-2.600-13.200-7L9.700 41.600c-1.700-2.500-1.100-5.900 1.300-7.700 2.300-1.700 5.500-1.400 7.400.7l-.4.500V12c0-3.300 2.700-6 6-6z" fill="#fff" stroke="#1a1838" stroke-width="3" stroke-linejoin="round"/></svg></i>
    <div class="g-box"><img class="g-face" src="assets/god/hermes/big_bare.webp" alt=""><div class="g-tx"><b class="g-name oL">헤르메스</b><p class="g-p"></p><small class="g-more">화면을 누르면 계속</small></div></div>
    <div class="g-chip"><i></i><span class="oL"></span></div><button class="g-skip" type="button">건너뛰기</button>`;
  stage.appendChild(root);
  const q = c => root.querySelector(c), hole = q('.g-hole'), ring = q('.g-ring'), hand = q('.g-hand'), box = q('.g-box'), ptx = q('.g-p'), more = q('.g-more'), chipEl = q('.g-chip'), skip = q('.g-skip');
  const B = { t: q('.g-bt'), b: q('.g-bb'), l: q('.g-bl'), r: q('.g-br') }, catcher = q('.g-catch');
  let cur = null, chipT = 0, seq = null, lockUntil = 0, follow = 0, armed = false;
  const sRect = () => stage.getBoundingClientRect();
  function rectOf(o) {
    if (o.rect) return typeof o.rect === 'function' ? o.rect() : o.rect;
    const el = o.el || (o.sel && document.querySelector(o.sel)); if (!el) return null;
    const r = el.getBoundingClientRect(), s = sRect(); if (!r.width || !r.height) return null;
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }
  function place() {
    if (!cur) return;
    const s = sRect(), W = s.width, H = s.height, u = W / 100, r0 = rectOf(cur);
    const pad = (cur.pad !== undefined ? cur.pad : 1.2) * u;
    const r = r0 ? { x: r0.x - pad, y: r0.y - pad, w: r0.w + pad * 2, h: r0.h + pad * 2 } : { x: W / 2, y: H * .42, w: 0, h: 0 };
    const rad = cur.round ? Math.max(r.w, r.h) : 2.4 * u;
    const set = (el, x, y, w, h) => { el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = Math.max(0, w) + 'px'; el.style.height = Math.max(0, h) + 'px'; };
    set(hole, r.x, r.y, r.w, r.h); hole.style.borderRadius = rad + 'px';
    set(ring, r.x, r.y, r.w, r.h); ring.style.borderRadius = rad + 'px'; ring.style.display = r0 ? '' : 'none';
    set(B.t, 0, 0, W, r.y); set(B.b, 0, r.y + r.h, W, H - r.y - r.h); set(B.l, 0, r.y, r.x, r.h); set(B.r, r.x + r.w, r.y, W - r.x - r.w, r.h);
    // 손가락: 대상 아래쪽 가운데를 가리킨다(아래 공간이 없으면 위에서)
    const hs = 11 * u, below = r.y + r.h + hs * .9 < H;
    hand.style.display = r0 && cur.hand !== false ? '' : 'none'; hand.style.width = hand.style.height = hs + 'px';
    hand.style.left = (r.x + r.w / 2 - hs * .32) + 'px'; hand.style.top = (below ? r.y + r.h - hs * .18 : r.y - hs * .82) + 'px'; hand.classList.toggle('flip', !below);
    // 말풍선: 밝은 곳이 화면 아래쪽이면 위에, 아니면 아래에
    box.style.display = cur.text ? '' : 'none';
    if (cur.text) {
      const bh = box.offsetHeight || 18 * u, cy = r.y + r.h / 2, gap = (r0 ? 15 : 0) * u;
      let top = !r0 ? H * .4 - bh / 2 : cy > H * .52 ? r.y - bh - gap : r.y + r.h + gap;
      top = Math.max(s.top < 0 ? 0 : 9 * u, Math.min(H - bh - 4 * u, top));
      // 말풍선이 밝은 곳을 덮으면 반대쪽으로
      if (r0 && top < r.y + r.h && top + bh > r.y) top = cy > H / 2 ? Math.max(9 * u, r.y - bh - 3 * u) : Math.min(H - bh - 4 * u, r.y + r.h + 3 * u);
      box.style.top = top + 'px';
    }
  }
  function open(o, mode) {
    cur = Object.assign({ mode }, o); lockUntil = performance.now() + (mode === 'card' ? (o.lock || 800) : 250);   // 설명 카드는 0.8초 동안 넘어가지 않는다(버튼을 연타하던 손에 읽기도 전에 넘어가지 않게) armed = false;
    ptx.innerHTML = o.text || ''; q('.g-name').textContent = o.name || '헤르메스';
    more.style.display = mode === 'card' ? '' : 'none';
    root.className = 'on ' + mode + (o.dim === false ? ' nodim' : '');
    skip.style.display = seq ? '' : 'none';
    place(); cancelAnimationFrame(follow);
    const tick = () => { if (!cur) return; place(); follow = requestAnimationFrame(tick); }; follow = requestAnimationFrame(tick);   // 대상이 움직이거나 화면이 바뀌어도 따라간다
    if (typeof sfx !== 'undefined' && sfx.tap) sfx.tap();
  }
  function close() { cur = null; cancelAnimationFrame(follow); root.classList.remove('on', 'card', 'force', 'nodim'); }
  function done() { const c = cur; if (!c) return; close(); if (c.onDone) c.onDone(); }
  // 설명 카드: 아무 데나 누르면 넘어간다
  // (카드가 뜨기 전부터 누르고 있던 손가락을 떼는 것은 세지 않는다: 카드가 뜬 뒤 새로 누른 탭만 인정)
  const anyDown = e => { if (!cur || cur.mode !== 'card') return; e.preventDefault(); e.stopPropagation(); armed = performance.now() >= lockUntil; };
  const anyTap = e => { if (!cur || cur.mode !== 'card') return; e.preventDefault(); e.stopPropagation(); if (!armed) return; armed = false; done(); };
  for (const el of [catcher, B.t, B.b, B.l, B.r]) { el.addEventListener('pointerdown', anyDown); el.addEventListener('pointerup', anyTap); }
  // 강제 터치: 밝은 곳을 누른 '진짜' 누르기를 그대로 통과시키고, 그 직후 다음 걸음으로
  document.addEventListener('click', e => {
    if (!cur || cur.mode !== 'force') return;
    if (e.target === skip) return;
    const r = rectOf(cur), s = sRect(), x = e.clientX - s.left, y = e.clientY - s.top;
    const inside = r && x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6;
    if (!inside || performance.now() < lockUntil) { e.preventDefault(); e.stopPropagation(); hand.classList.remove('nudge'); void hand.offsetWidth; hand.classList.add('nudge'); return; }
    setTimeout(done, 40);
  }, true);
  for (const k in B) B[k].addEventListener('pointerdown', e => { if (cur && cur.mode === 'force') { e.preventDefault(); e.stopPropagation(); } });
  skip.addEventListener('click', e => { e.stopPropagation(); const s = seq; seq = null; close(); if (s && s.onEnd) s.onEnd(true); });
  addEventListener('resize', place);

  /* 로비 안내 차례: steps = [{ sel, text, mode: 'force' | 'card', pre(), wait(), round, pad, skipIf() }] */
  function run(steps, onEnd) {
    seq = { steps, i: -1, onEnd };
    const next = () => {
      const S = seq; if (!S) return; S.i++;
      if (S.i >= S.steps.length) { seq = null; close(); if (onEnd) onEnd(false); return; }
      const st = S.steps[S.i]; if (st.skipIf && st.skipIf()) { next(); return; }
      if (st.pre) st.pre();
      const t0 = performance.now(), limit = st.limit || 4000;
      const poll = () => {
        if (seq !== S) return;
        const ready = (!st.wait || st.wait()) && (!st.sel || rectOf(st));
        if (ready) {
          if (st.sel) { const el = document.querySelector(st.sel); if (el && el.scrollIntoView && st.scroll !== false) try { el.scrollIntoView({ block: 'center' }); } catch (e) {} }
          setTimeout(() => { if (seq !== S) return; if (st.call) { st.call(next); return; } open(Object.assign({}, st, { onDone: () => { if (st.after) st.after(); setTimeout(next, st.gap || 260); } }), st.mode || 'force'); }, st.sel ? 120 : 0);
        } else if (performance.now() - t0 > limit) next();   // 대상이 끝내 없으면 건너뛴다
        else setTimeout(poll, 100);
      };
      poll();
    };
    next();
  }
  function chip(text) { clearTimeout(chipT); chipEl.querySelector('span').textContent = text; chipEl.className = 'g-chip on'; }
  function chipDone(text) { chipEl.querySelector('span').textContent = text || '잘했어요!'; chipEl.className = 'g-chip on ok'; if (typeof sfx !== 'undefined' && sfx.reward) sfx.reward(); clearTimeout(chipT); chipT = setTimeout(() => { chipEl.className = 'g-chip'; }, 1100); }
  function chipHide() { clearTimeout(chipT); chipEl.className = 'g-chip'; }
  return { card: o => open(o, 'card'), force: o => open(o, 'force'), close, run, chip, chipDone, chipHide, get active() { return !!cur; }, state() { return cur ? { mode: cur.mode, rect: rectOf(cur), text: cur.text || '', sel: cur.sel || '' } : null; }, get running() { return !!seq; }, stop() { seq = null; close(); chipHide(); } };
})();
