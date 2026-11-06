/* 휴식 판(2026-11-06): 챕터의 3번째 판. 궁수의 전설 2의 보너스 룰렛·천사 판처럼 싸움 사이에 숨을 돌린다.
   몬스터 없이 짧게 떨어진 뒤 바닥에서 한 가지를 만난다. 표는 data.js의 REST.
   wheel 행운의 룰렛: 바퀴 앞에서 공격 버튼 → 2.8초 돌아 멈춘 칸의 보상 → 포탈
   nymph 님프의 샘: 두 샘 중 하나를 골라 마신다 → 포탈
   gold  황금 낙하: 항아리와 파편 덩어리가 가득한 긴 낙하. 바닥에 바로 포탈 */
'use strict';
function pickRestKind(R) { let r = R(); for (const k in REST.pick) { r -= REST.pick[k]; if (r < 0) return k; } return 'wheel'; }
const REST_TITLE = { wheel: '행운의 룰렛', nymph: '님프의 샘', gold: '황금 낙하' };
/* buildWave에서 부른다. 바닥(F)에 휴식 물건을 놓는다 */
function setupRest(kind, F) {
  const g = game, y = F * TILE;
  g.rest = { kind, x: WORLD_W / 2, y, t: 0, done: kind === 'gold', ang: 0, spin: null, pick: -1, showT: 0 };
  if (kind === 'nymph') g.rest.springs = REST.nymph.map((n, i) => ({ ...n, x: WORLD_W / 2 + (i ? 82 : -82), y, used: false }));
  if (kind === 'gold') g.portal = { x: WORLD_W / 2, y: y - 34, r: 34 };
}
/* 상호작용할 수 있는 거리에 있으면 그 대상(룰렛이면 rest 자체, 샘이면 그 샘) */
function restNear() {
  const g = game, r = g.rest, p = g.p; if (!r || r.done || r.spin || !p || !p.onGround || Math.abs(p.y + p.h / 2 - r.y) > 6) return null;
  if (r.kind === 'wheel') return Math.abs(p.x - r.x) < 70 ? r : null;
  if (r.kind === 'nymph') return r.springs.find(s => Math.abs(p.x - s.x) < 34) || null;
  return null;
}
function useRest(target) {
  const g = game, r = g.rest;
  if (r.kind === 'wheel') {
    // 멈출 칸을 먼저 정하고, 바퀴가 그 칸 가운데에서 멈추도록 회전량을 맞춘다
    const S = REST.wheel, tot = S.reduce((a, b) => a + b.w, 0); let x = Math.random() * tot, i = 0; for (; i < S.length - 1; i++) { x -= S[i].w; if (x < 0) break; }
    const n = S.length, seg = Math.PI * 2 / n, target_ = -(i + .5) * seg + (Math.random() - .5) * seg * .5;
    let to = target_; while (to < r.ang + Math.PI * 2 * 5) to += Math.PI * 2;
    r.spin = { from: r.ang, to, t: 0, dur: 2.8, pick: i, lastSeg: -1 }; sfx.cardOpen(); vibrate(20);
  } else if (r.kind === 'nymph') {
    target.used = true; r.done = true; r.pick = r.springs.indexOf(target);
    target.apply(g.p); restReward(target.name, target.col, target.x);
    for (const s of r.springs) if (s !== target) s.gone = true;
  }
}
function restReward(name, col, x) {
  const g = game, p = g.p;
  popup(x, g.rest.y - 120, name + '!', '#ffe27a', true); sfx.reward(); vibrate(40);
  g.fx.push({ type: 'pillar', x: p.x, y: p.y, w: 40, col, t: 0, life: .6 });
  g.fx.push({ type: 'ring', x: p.x, y: p.y - 10, r: 90, col: '#fff', t: 0, life: .45 });
  chunks(p.x, p.y - 10, 18, [col, '#ffffff', '#ffe27a'], 320, 3.4); g.whiteout = Math.max(g.whiteout, .2);
  // 끝나면 바닥 가운데에 포탈이 열린다
  // 주인공이 서 있는 자리를 피해 열어, 보상을 본 뒤 걸어 들어가게 한다
  later(1.1, () => { if (g.rest) { const px = g.p.x, x = Math.abs(px - WORLD_W / 2) < 70 ? WORLD_W / 2 + (px < WORLD_W / 2 ? 100 : -100) : WORLD_W / 2; g.portal = { x, y: g.rest.y - 34, r: 34, k: 0 }; sfx.door(); } });
}
function restTick(dt) {
  const g = game, r = g.rest; if (!r) return;
  r.t += dt; if (g.portal && g.portal.k !== undefined && g.portal.k < 1) g.portal.k = Math.min(1, g.portal.k + dt * 2.5);
  if (r.spin) {
    const sp = r.spin; sp.t += dt; const k = clamp(sp.t / sp.dur, 0, 1), e = 1 - Math.pow(1 - k, 3.4);
    r.ang = sp.from + (sp.to - sp.from) * e;
    // 칸 경계를 지날 때마다 딸깍
    const seg = Math.floor(((r.ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2 / REST.wheel.length));
    if (seg !== sp.lastSeg) { sp.lastSeg = seg; sfx.cardTick(); r.tick = 1; }
    if (k >= 1) { const S = REST.wheel[sp.pick]; r.spin = null; r.done = true; r.pick = sp.pick; S.apply && S.apply(g.p); r.showT = 2.2; g.shake = Math.max(g.shake, 6); if (S.id === 'card') { later(.7, () => openCards(true, { title: '행운의 룰렛', sub: '신의 선물을 고르세요', after: () => { g.state = 'play'; } })); later(.75, () => restReward(S.name, S.col, r.x)); } else restReward(S.name, S.col, r.x); }
  }
  r.tick = Math.max(0, (r.tick || 0) - dt * 6); r.showT = Math.max(0, r.showT - dt);
}
function drawRest() {
  const g = game, r = g.rest; if (!r || r.kind === 'gold') return;
  const s = view.s, X = wx(r.x), Y = wy(r.y);
  if (Y < -200 || Y > view.H + 200) return;
  ctx.save();
  if (r.kind === 'wheel') {
    const R = 62 * s, cy = Y - 100 * s, n = REST.wheel.length, seg = Math.PI * 2 / n;
    if (r.done && r.doneT === undefined) r.doneT = r.t + 2.2;
    const al = r.done ? clamp((r.doneT - r.t) / .5, 0, 1) : 1; if (al <= 0) { ctx.restore(); return; }
    ctx.globalAlpha = al;
    // 받침과 빛
    const gl = ctx.createRadialGradient(X, cy, R * .3, X, cy, R * 1.9); gl.addColorStop(0, 'rgba(255,214,120,.35)'); gl.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X, cy, R * 1.9, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1e3a'; ctx.beginPath(); ctx.moveTo(X - 14 * s, cy); ctx.lineTo(X + 14 * s, cy); ctx.lineTo(X + 26 * s, Y); ctx.lineTo(X - 26 * s, Y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(X - 30 * s, Y - 6 * s, 60 * s, 6 * s);
    // 바퀴
    ctx.translate(X, cy); ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(0, 0, R + 6 * s, 0, 7); ctx.fill();
    ctx.rotate(r.ang);
    REST.wheel.forEach((S, i) => {
      const a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg, hl = r.done && r.pick === i && Math.floor(r.t * 8) % 2 === 0;
      ctx.fillStyle = hl ? '#ffffff' : S.col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,30,.55)'; ctx.lineWidth = 1.6 * s; ctx.stroke();
      const im = IMG[S.icon], am = a0 + seg / 2, ix = Math.cos(am) * R * .62, iy = Math.sin(am) * R * .62, sz = 24 * s;
      if (ok(im)) { const w = im.naturalWidth >= im.naturalHeight ? sz : sz * im.naturalWidth / im.naturalHeight, h = im.naturalWidth >= im.naturalHeight ? sz * im.naturalHeight / im.naturalWidth : sz; ctx.save(); ctx.translate(ix, iy); ctx.rotate(am + Math.PI / 2); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
    });
    ctx.rotate(-r.ang);
    ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#7a4a10'; ctx.beginPath(); ctx.arc(0, 0, 4 * s, 0, 7); ctx.fill();
    // 위쪽 바늘(딸깍할 때 튄다)
    const tk = (r.tick || 0) * .35; ctx.save(); ctx.translate(0, -R - 4 * s); ctx.rotate(-tk); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a1a10'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(-9 * s, -10 * s); ctx.lineTo(9 * s, -10 * s); ctx.lineTo(0, 10 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.restore(); ctx.save(); ctx.globalAlpha = 1;
    if (r.done && r.pick >= 0 && r.showT > 0) { ctx.font = `${16 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; textOut(REST.wheel[r.pick].name, X, cy - R - 30 * s, '#ffe27a', 3); }
  } else if (r.kind === 'nymph') {
    for (const sp of r.springs) {
      if (sp.gone && r.t > (r.goneT || (r.goneT = r.t)) + .5) continue;
      const x = wx(sp.x), al = sp.gone ? clamp(1 - (r.t - r.goneT) / .5, 0, 1) : 1; ctx.globalAlpha = al;
      const bob = Math.sin(g.t * 2.4 + sp.x) * 3 * s, gl = ctx.createRadialGradient(x, Y - 46 * s, 4 * s, x, Y - 46 * s, 54 * s); gl.addColorStop(0, sp.glow); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, Y - 46 * s, 54 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a3050'; rr(x - 26 * s, Y - 16 * s, 52 * s, 16 * s, 5 * s); ctx.fill(); ctx.fillStyle = sp.col; ctx.fillRect(x - 22 * s, Y - 16 * s, 44 * s, 4 * s);
      const im = IMG[sp.icon]; if (ok(im)) { const h = 34 * s, w = h * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, x - w / 2, Y - 62 * s + bob, w, h); }
      ctx.font = `${11 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; textOut(sp.name, x, Y - 74 * s + bob, '#fff', 2.6); ctx.font = `${9.5 * s}px ${FONT}`; textOut(sp.sub, x, Y - 88 * s + bob, '#ffe9b0', 2.4);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
function drawRestPrompt() {
  const t = restNear(); if (!t) return;
  const g = game, s = view.s, r = g.rest, lab = r.kind === 'wheel' ? '공격 버튼으로 돌리기' : '공격 버튼으로 마시기', x = wx(r.kind === 'wheel' ? r.x : t.x), y = wy(r.y) - (r.kind === 'wheel' ? 186 : 116) * s;
  ctx.font = `${12 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(lab).width + 18 * s, cx = clamp(x, tw / 2 + 6 * s, view.W - tw / 2 - 6 * s);
  ctx.fillStyle = 'rgba(10,8,22,.92)'; rr(cx - tw / 2, y - 11 * s, tw, 22 * s, 7 * s); ctx.fill(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.6 * s; ctx.stroke();
  ctx.fillStyle = '#ffe9b0'; ctx.fillText(lab, cx, y + .5 * s);
}
