/* GOD FALL 인트로(2026-11-07). 정지 그림 6장 + 카메라 움직임 + 장면마다 정해진 순간의 흔들림·번쩍임·파편.
   핍의 젤리광산 인트로 방식: 탭하면 다음 장면, 가만히 두면 카메라가 끝 자리에서 아주 천천히 숨 쉰다. 마지막은 다이브 → 로고.
   기획: _기획/GOD FALL/10_인트로_기획.md · 시안 미리보기: 시안/13_인트로/preview (A·B 비교). 지금 쓰는 안 = INTRO_VER */
'use strict';
const Intro = (() => {
  const INTRO_VER = 'A';   // A 서사 / B 코믹 / R 추천(A + 5장 대사만 B). 그림은 assets/intro/a1~a6.jpg (B를 쓰려면 b1~b5도 넣는다)
  const A = [
    { img: 'a1', cap: '구름 위 올림포스.\n신들의 잔치는 끝날 줄 몰랐다.', z: [1.2, 1.05], p: [[60, 70], [30, 30]], mv: 6, in: 'fade', amb: ['sparkle'], beats: [{ t: .2, k: 'sfx', s: 'chime' }] },
    { img: 'a2', cap: '그날 밤, 빛이 생기기 전부터 있던 것이\n눈을 떴다.', z: [1.14, 1.24], p: [[0, 90], [0, -10]], mv: 5, in: 'fade', amb: ['ember', 'rumble'],
      beats: [{ t: .3, k: 'sfx', s: 'rumble' }, { t: 1.4, k: 'glow', x: .5, y: .43, r: 140, c: '#b070ff', d: 2.6 }, { t: 1.4, k: 'shake', a: 4, d: 1.2 }, { t: 1.4, k: 'sfx', s: 'eye' }, { t: 1.4, k: 'buzz', ms: 40 }] },
    { img: 'a3', cap: '어둠이 올림포스를 덮쳤다!', z: [1.32, 1.08], p: [[0, 0], [0, 0]], mv: .45, ease: 'out', in: 'cut', amb: ['dust', 'rumble'],
      beats: [{ t: 0, k: 'flash', c: '#ffffff', d: .35 }, { t: .05, k: 'flash', c: '#a060ff', d: .7, a: .55 }, { t: 0, k: 'shake', a: 16, d: .8 }, { t: 0, k: 'burst', n: 34, x: .55, y: .3 }, { t: 0, k: 'sfx', s: 'boom' }, { t: 0, k: 'buzz', ms: 120 },
        { t: 1.3, k: 'shake', a: 7, d: .5 }, { t: 1.3, k: 'burst', n: 14, x: .78, y: .2 }, { t: 1.3, k: 'sfx', s: 'crack' }, { t: 1.3, k: 'punch', z: .04, d: .3 }] },
    { img: 'a4', cap: '권능을 잃은 신들은\n끝없는 심연으로 떨어졌다.', z: [1.26, 1.26], p: [[0, 90], [0, -90]], mv: 4.5, in: 'drop', amb: ['speedV', 'fall', 'rumble'],
      beats: [{ t: 0, k: 'sfx', s: 'whoosh' }, { t: .1, k: 'shake', a: 3, d: 4 }] },
    { img: 'a5', cap: '…그리고 단 한 명,\n늦게 도착한 전령.', z: [1.04, 1.18], p: [[10, 10], [40, -20]], mv: 5, in: 'fade', amb: ['wind'],
      beats: [{ t: .2, k: 'sfx', s: 'wind' }, { t: 1.6, k: 'punch', z: .03, d: .25 }, { t: 1.6, k: 'sfx', s: 'tick' }] },
    { img: 'a6', cap: '헤르메스, 뛰어든다!', z: [1.0, 1.3], p: [[0, 0], [0, 30]], mv: 1.6, ease: 'in', in: 'cut', amb: ['speedR', 'rumble'], final: true,
      beats: [{ t: 0, k: 'flash', c: '#ffffff', d: .25 }, { t: 0, k: 'sfx', s: 'dive' }, { t: 0, k: 'shake', a: 5, d: 1.6 }, { t: 0, k: 'buzz', ms: 60 }] },
  ];
  const STORY = { A, R: A.map((c, i) => i === 4 ? { ...c, cap: '…늦게 도착한 전령 하나.\n배달은 끝까지 한다.' } : c) };
  const cuts = STORY[INTRO_VER] || A;

  let el = null, cv = null, cx = null, W = 360, H = 780, S = 1, DPR = 1, raf = 0, last = 0, onDone = null, st = null;
  const IM = {}, R = Math.random;
  let logo = null;
  function loadAll() {
    const need = [...new Set(cuts.map(c => c.img))];
    return Promise.all(need.map(n => IM[n] ? Promise.resolve() : new Promise(r => { const im = new Image(); im.onload = () => { IM[n] = im; r(); }; im.onerror = () => r(); im.src = `assets/intro/${n}.jpg`; })));
  }
  /* 소리: 게임 소리(sfx)의 오디오와 음소거를 따른다 */
  const out = () => sfx.ctx && !sfx.muted ? sfx.ctx : null, dst = a => sfx.master || a.destination;
  function noise(d, f0, f1, v, type = 'lowpass') { const a = out(); if (!a) return; const n = a.createBufferSource(), b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = (R() * 2 - 1) * (1 - i / x.length); n.buffer = b; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f0, a.currentTime); fl.frequency.exponentialRampToValueAtTime(f1, a.currentTime + d); const g = a.createGain(); g.gain.value = v; n.connect(fl).connect(g).connect(dst(a)); n.start(); }
  function tone(f0, f1, d, v, type = 'sine', delay = 0) { const a = out(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(dst(a)); o.start(t); o.stop(t + d + .05); }
  const SND = {
    chime() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 1.2, .05, 'sine', i * .12)); },
    rumble() { noise(2.4, 180, 60, .5); },
    eye() { tone(90, 50, 1.4, .25, 'sawtooth'); tone(520, 260, 1, .04, 'triangle'); },
    boom() { noise(1.2, 900, 50, .9); tone(70, 30, .9, .5); },
    crack() { noise(.5, 2500, 300, .35, 'bandpass'); },
    whoosh() { noise(.7, 400, 2400, .35, 'bandpass'); },
    wind() { noise(2.5, 600, 900, .12, 'bandpass'); },
    tick() { tone(1400, 900, .12, .08, 'square'); },
    dive() { noise(1.4, 300, 3000, .4, 'bandpass'); },
    slam() { noise(.9, 1200, 60, 1); tone(55, 28, 1.1, .6); [523, 659, 784].forEach((f, i) => tone(f, f, 1.4, .05, 'triangle', .15 + i * .07)); },
    page() { noise(.25, 1200, 3000, .12, 'bandpass'); },
  };
  const buzz = ms => { try { typeof vibrate === 'function' ? vibrate(ms) : navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  const IX = (x, y) => { const f = st.xf || { x0: 0, y0: 0, w: W, h: H }; return [f.x0 + x * f.w, f.y0 + y * f.h]; };   // 그림 안 위치(0~1) → 화면 위치
  const ease = (u, e) => e === 'out' ? 1 - Math.pow(1 - u, 3) : e === 'in' ? u * u : u * u * (3 - 2 * u);
  const cut = () => cuts[st.i];
  function camOf(c, t) { const u = Math.min(1, t / c.mv), e = ease(u, c.ease), br = t > c.mv ? Math.sin((t - c.mv) * .7) * .012 : 0; return { z: c.z[0] + (c.z[1] - c.z[0]) * e + br, x: c.p[0][0] + (c.p[1][0] - c.p[0][0]) * e, y: c.p[0][1] + (c.p[1][1] - c.p[0][1]) * e }; }
  function drawCut(c, t, alpha, dy = 0) {
    const im = IM[c.img]; if (alpha <= 0 || !im) return;
    const k = camOf(c, t); let z = k.z; for (const p of st.punch) z += p.z * Math.sin(Math.min(1, p.t / p.d) * Math.PI);
    const sc = Math.max(W / im.width, H / im.height) * z, w = im.width * sc, h = im.height * sc;
    const mx = Math.max(0, (w - W) / 2), my = Math.max(0, (h - H) / 2), ox = clamp(k.x, -mx, mx), oy = clamp(k.y, -my, my);
    cx.save(); cx.globalAlpha = alpha; cx.drawImage(im, (W - w) / 2 + ox, (H - h) / 2 + oy + dy, w, h); cx.restore();
    if (c === cut()) st.xf = { x0: (W - w) / 2 + ox, y0: (H - h) / 2 + oy + dy, w, h };
  }
  function addDebris(x, y, gold) { const a = R() * Math.PI * 2, v = 120 + R() * 380; st.parts.push({ k: 'deb', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, r: 2 + R() * 6, rot: R() * 6, vr: (R() - .5) * 12, c: gold ? (R() < .5 ? '#ffd98a' : '#fff4d6') : (R() < .7 ? '#ece6f2' : '#d9b25a'), t: 0, life: .9 + R() * .8 }); }
  function amb(dt) {
    for (const a of cut().amb) {
      if (a === 'sparkle' && R() < dt * 14) st.parts.push({ k: 'spk', x: R() * W, y: H * (.15 + R() * .6), t: 0, life: 1.4 + R(), c: '#fff1c4' });
      if (a === 'ember' && R() < dt * 16) st.parts.push({ k: 'emb', x: R() * W, y: H + 10, vx: (R() - .5) * 20, vy: -40 - R() * 60, t: 0, life: 4 + R() * 3, c: '#c58bff' });
      if (a === 'dust' && R() < dt * 20) st.parts.push({ k: 'emb', x: R() * W, y: -10, vx: (R() - .5) * 40, vy: 60 + R() * 80, t: 0, life: 3, c: '#e9dcff' });
      if (a === 'speedV' && R() < dt * 50) st.parts.push({ k: 'lineV', x: R() * W, y: H + 40, vy: -900 - R() * 600, l: 40 + R() * 90, t: 0, life: 1.4 });
      if (a === 'speedR' && R() < dt * 60) st.parts.push({ k: 'lineR', an: R() * Math.PI * 2, d: 30 + R() * 40, v: 500 + R() * 600, l: 30 + R() * 70, t: 0, life: 1 });
      if (a === 'fall' && R() < dt * 6) st.parts.push({ k: 'deb', x: R() * W, y: H + 20, vx: (R() - .5) * 30, vy: -500 - R() * 300, r: 2 + R() * 5, rot: R() * 6, vr: (R() - .5) * 6, c: '#ddd3ea', t: 0, life: 2, nog: true });
      if (a === 'wind' && R() < dt * 18) st.parts.push({ k: 'lineH', x: W + 30, y: R() * H * .75, vx: -260 - R() * 160, l: 20 + R() * 40, t: 0, life: 2.4 });
    }
  }
  function fire(c) {
    c.beats.forEach((b, n) => {
      if (st.fired.has(n) || b.t > st.t) return; st.fired.add(n);
      if (b.k === 'shake') st.shake.push({ t: 0, a: b.a, d: b.d });
      else if (b.k === 'flash') st.flash.push({ t: 0, c: b.c, d: b.d, a: b.a || 1 });
      else if (b.k === 'glow') st.glow.push({ t: 0, ...b });
      else if (b.k === 'punch') st.punch.push({ t: 0, z: b.z, d: b.d });
      else if (b.k === 'burst') { const [x, y] = IX(b.x, b.y); for (let i = 0; i < b.n; i++) addDebris(x, y, b.gold); }
      else if (b.k === 'sfx') SND[b.s] && SND[b.s]();
      else if (b.k === 'buzz') buzz(b.ms);
    });
  }
  function parts(dt) {
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const p = st.parts[i]; p.t += dt; if (p.t > p.life) { st.parts.splice(i, 1); continue; }
      const f = 1 - p.t / p.life; cx.save();
      if (p.k === 'spk') { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.sin(p.t / p.life * Math.PI) * .9; cx.fillStyle = p.c; const r = 1.5 + 2 * Math.sin(p.t * 6); cx.beginPath(); cx.moveTo(p.x, p.y - r * 2.4); cx.lineTo(p.x + r * .6, p.y); cx.lineTo(p.x, p.y + r * 2.4); cx.lineTo(p.x - r * .6, p.y); cx.closePath(); cx.fill(); cx.fillRect(p.x - r * 2.4, p.y - .6, r * 4.8, 1.2); }
      else if (p.k === 'emb') { p.x += p.vx * dt; p.y += p.vy * dt; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(1, f * 2) * .8; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, 1.6, 0, 7); cx.fill(); }
      else if (p.k === 'deb') { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.nog) p.vy += 900 * dt; p.rot += p.vr * dt; cx.globalAlpha = Math.min(1, f * 3); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r * .7, p.r * 2, p.r * 1.4); cx.fillStyle = 'rgba(40,20,60,.35)'; cx.fillRect(-p.r, p.r * .2, p.r * 2, p.r * .5); }
      else if (p.k === 'lineV') { p.y += p.vy * dt; cx.globalAlpha = .55 * f; cx.strokeStyle = '#fff'; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x, p.y + p.l); cx.stroke(); }
      else if (p.k === 'lineH') { p.x += p.vx * dt; cx.globalAlpha = .3 * f; cx.strokeStyle = '#fff'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x + p.l, p.y); cx.stroke(); }
      else if (p.k === 'lineR') { p.d += p.v * dt; p.v *= 1 + dt * 2; const c = Math.cos(p.an), s = Math.sin(p.an), ox = W / 2, oy = H * .42; cx.globalAlpha = .6 * Math.min(1, p.t * 4); cx.strokeStyle = '#f2ecff'; cx.lineWidth = 1.2 + p.d / 160; cx.beginPath(); cx.moveTo(ox + c * p.d, oy + s * p.d); cx.lineTo(ox + c * (p.d + p.l), oy + s * (p.d + p.l)); cx.stroke(); }
      cx.restore();
    }
  }
  function caption(c, a, rise) {
    if (a <= 0) return;
    cx.save(); cx.globalAlpha = a; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = `24px ${FONT}`; cx.lineJoin = 'round';
    const ls = c.cap.split('\n'), y0 = H - 150 - (ls.length - 1) * 17 + rise;
    ls.forEach((l, k) => { cx.lineWidth = 7; cx.strokeStyle = '#1a0c2c'; cx.strokeText(l, W / 2, y0 + k * 34); cx.fillStyle = '#fff6e0'; cx.fillText(l, W / 2, y0 + k * 34); });
    cx.restore();
  }
  function draw(dt) {
    const c = cut(); st.t += dt;
    if (st.prev) { st.prev.t += dt; st.prev.k += dt / (st.prev.mode === 'cut' ? .08 : st.prev.mode === 'drop' ? .5 : .55); if (st.prev.k >= 1) st.prev = null; }
    if (!st.end) { fire(c); amb(dt); }
    let sx = 0, sy = 0;
    for (let i = st.shake.length - 1; i >= 0; i--) { const s = st.shake[i]; s.t += dt; if (s.t > s.d) { st.shake.splice(i, 1); continue; } const k = 1 - s.t / s.d; sx += Math.sin(s.t * 71 + i) * s.a * k; sy += Math.cos(s.t * 57 + i * 2) * s.a * k * .8; }
    if (c.amb.includes('rumble') && !st.end) { sx += Math.sin(st.t * 43) * .9; sy += Math.cos(st.t * 37) * .9; }
    st.punch = st.punch.filter(p => (p.t += dt) < p.d);
    cx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0); cx.fillStyle = '#0c0818'; cx.fillRect(0, 0, W, H);
    cx.save(); cx.translate(sx, sy);
    const P = st.prev;
    if (P && P.mode === 'drop') { const e = ease(Math.min(1, P.k), 'in'); drawCut(cuts[P.i], P.t, 1, -e * H); drawCut(c, st.t, 1, H - e * H); }
    else { if (P) drawCut(cuts[P.i], P.t, 1); drawCut(c, st.t, P ? Math.min(1, P.k) : Math.min(1, st.t / .5 + (st.i ? 1 : 0))); }
    for (let i = st.glow.length - 1; i >= 0; i--) { const g = st.glow[i]; g.t += dt; if (g.t > g.d) { st.glow.splice(i, 1); continue; } const k = Math.sin(g.t / g.d * Math.PI), [x, y] = IX(g.x, g.y), gr = cx.createRadialGradient(x, y, 0, x, y, g.r * (1 + .2 * k)); gr.addColorStop(0, g.c + 'cc'); gr.addColorStop(1, g.c + '00'); cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = k; cx.fillStyle = gr; cx.fillRect(0, 0, W, H); cx.restore(); }
    parts(dt);
    cx.restore();
    let g = cx.createLinearGradient(0, 0, 0, 110); g.addColorStop(0, 'rgba(10,5,20,.8)'); g.addColorStop(1, 'rgba(10,5,20,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, 110);
    g = cx.createLinearGradient(0, H - 290, 0, H); g.addColorStop(0, 'rgba(10,5,20,0)'); g.addColorStop(.45, 'rgba(10,5,20,.72)'); g.addColorStop(1, 'rgba(10,5,20,.92)'); cx.fillStyle = g; cx.fillRect(0, H - 290, W, 290);
    if (!st.end) {
      if (P) caption(cuts[P.i], 1 - Math.min(1, P.k * 2.2), 0);
      const ct = Math.max(0, st.t - (P ? .2 : .15)), ca = Math.min(1, ct / .4); caption(c, ca, (1 - ca) * 12);
      if (st.t > 1.6) { cx.save(); cx.globalAlpha = Math.min(1, (st.t - 1.6) / .6) * (.45 + .35 * Math.sin(st.clock * 3.2)); cx.fillStyle = '#e8dcf0'; cx.font = `14px ${FONT}`; cx.textAlign = 'center'; cx.fillText('화면을 탭하면 다음으로', W / 2, H - 92); cx.restore(); }
      const n = cuts.length; for (let k = 0; k < n; k++) { cx.beginPath(); cx.arc(W / 2 + (k - (n - 1) / 2) * 16, H - 62, k === st.i ? 5 : 3.5, 0, 7); cx.fillStyle = k === st.i ? '#fff' : 'rgba(255,255,255,.35)'; cx.fill(); }
    }
    for (let i = st.flash.length - 1; i >= 0; i--) { const f = st.flash[i]; f.t += dt; if (f.t > f.d) { st.flash.splice(i, 1); continue; } cx.save(); cx.globalAlpha = f.a * (1 - f.t / f.d); cx.fillStyle = f.c; cx.fillRect(0, 0, W, H); cx.restore(); }
    if (st.end) {   // 로고가 위에서 쾅 떨어지고 화면이 흔들린다
      const E = st.end; E.t += dt;
      cx.save(); cx.globalAlpha = Math.min(1, E.t * 3) * .82; cx.fillStyle = '#0c0818'; cx.fillRect(0, 0, W, H); cx.restore();
      const u = Math.min(1, E.t / .35), s = E.t < .35 ? 2.2 - 1.2 * u * u : 1 + .06 * Math.exp(-(E.t - .35) * 6) * Math.sin((E.t - .35) * 30);
      if (logo && logo.complete && logo.naturalWidth) { const lw = W * .86, lh = lw * logo.naturalHeight / logo.naturalWidth; cx.save(); cx.globalAlpha = Math.min(1, E.t * 4); cx.translate(W / 2 + sx, H * .38 + sy); cx.scale(s, s); cx.drawImage(logo, -lw / 2, -lh / 2, lw, lh); cx.restore(); }
      parts(0);
      if (E.t > 1.2) { cx.save(); cx.globalAlpha = Math.min(1, (E.t - 1.2) / .5) * (.5 + .35 * Math.sin(E.t * 3.2)); cx.fillStyle = '#fff'; cx.font = `18px ${FONT}`; cx.textAlign = 'center'; cx.fillText('화면을 터치하세요', W / 2, H * .72); cx.restore(); }
      if (E.out != null) { E.out += dt; cx.fillStyle = `rgba(12,8,24,${Math.min(1, E.out / .35)})`; cx.fillRect(0, 0, W, H); if (E.out >= .35) finish(); }
    }
  }
  function next() {
    if (!st || st.done) return;
    if (st.end) { if (st.end.t > .9 && st.end.out == null) st.end.out = 0; return; }
    if (st.prev && st.prev.k < .7) return;   // 연타로 장면이 겹겹이 넘어가지 않게
    const c = cut();
    if (c.final) { st.end = { t: 0, out: null }; SND.slam(); buzz(140); st.flash.push({ t: 0, c: '#ffffff', d: .5, a: 1 }); st.shake.push({ t: 0, a: 14, d: .7 }); for (let i = 0; i < 40; i++) addDebris(W / 2, H * .38, true); return; }
    SND.page(); st.prev = { i: st.i, t: st.t, k: 0, mode: cuts[st.i + 1].in }; st.i++; st.t = 0; st.fired = new Set();
  }
  function fit() { const r = stage.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2.5); W = 360; S = r.width / W; H = r.height / S; cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR); }
  function loop(now) { if (!st || st.done) return; raf = requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; st.clock += dt; if (st.ready) draw(dt); }
  function finish() {
    if (!st || st.done) return; st.done = true; cancelAnimationFrame(raf); removeEventListener('resize', fit);
    el.classList.remove('on'); const f = onDone; onDone = null; f && f();
  }
  function play(done) {
    if (!el) {
      el = document.createElement('div'); el.id = 'introScene'; el.className = 'full';
      el.innerHTML = '<canvas></canvas><button id="introSkip">건너뛰기</button>'; stage.appendChild(el);
      cv = el.querySelector('canvas'); cx = cv.getContext('2d');
      el.addEventListener('pointerdown', e => { if (e.target.id === 'introSkip') return; next(); });
      el.querySelector('#introSkip').onclick = e => { e.stopPropagation(); sfx.tap && sfx.tap(); finish(); };
    }
    if (!logo) { logo = new Image(); logo.src = 'assets/ui/logo.webp'; }
    onDone = done; st = { i: 0, t: 0, clock: 0, prev: null, fired: new Set(), shake: [], flash: [], glow: [], punch: [], parts: [], end: null, done: false, ready: false, xf: null };
    el.classList.add('on'); fit(); addEventListener('resize', fit);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#0c0818'; cx.fillRect(0, 0, cv.width, cv.height);
    const s0 = st; Promise.race([loadAll(), new Promise(r => setTimeout(r, 6000))]).then(() => { if (st === s0) { s0.ready = true; s0.t = 0; } });
    last = performance.now(); raf = requestAnimationFrame(loop);
  }
  return { play, next, skip: () => finish(), preload: loadAll, get state() { return st; }, cuts, INTRO_VER };
})();
