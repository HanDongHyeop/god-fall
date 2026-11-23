/* UI 시안(디버그 전용, 2026-11-23). 기본 UI는 그대로이고, 디버그 패널에서 시안을 켰을 때만(#stage[data-skin]) skins.css와 아래 코드가 쓰인다.
   시안이 정해지면: 고른 시안의 규칙만 style.css · render.js로 옮기고 이 파일과 skins.css를 지운다(index.html의 태그 2개 포함).
   a 신화 석판: 왼쪽 기둥 메뉴 · 글 새긴 판   b 제단: 가운데 둥근 인장 · 둘레에 놓인 메뉴   c 낙하 지도: 챕터를 세로 길로 · 위쪽 글 탭   d 두루마리: 아래에서 펼쳐지는 판 */
const SKINS = { a: '신화 석판', b: '제단', c: '낙하 지도', d: '두루마리' };
const Skin = {
  id: '',
  set(id) {
    id = SKINS[id] ? id : ''; this.id = id; window.__skin = id || undefined;
    const st = $('stage'); if (id) st.dataset.skin = id; else delete st.dataset.skin;
    if (typeof UI !== 'undefined' && $('s_battle')) { $('s_battle')._h = null; $('topbar')._h = null; $('lobby').dataset.tab = UI.tab; UI.render(); }
  },
};
/* 전투 탭에 덧붙이는 챕터 고르기 줄(b 메달 줄 · c 세로 길). 시안이 꺼져 있으면 만들지 않는다 */
function skinChapters(v) {
  if (!window.__skin) return '';
  const N = BIOMES.length, hard = v >= N, s = Meta.s;
  return `<div class="chsel">${BIOMES.map((B, i) => { const c = (hard ? N : 0) + i, open = Meta.chapterOpen(c), done = !!s.cleared[c], best = done ? STAGES : s.best[c] || 0;
    return `<button class="cs ${c === v ? 'on' : ''} ${open ? '' : 'lock'} ${done ? 'done' : ''}" data-ch="${c}"><i class="nd"></i><img src="assets/ui/isle${i + 1}.webp" alt=""><b>${i + 1}</b><span class="cn">${B.name}</span><span class="cr">${!open ? '잠김' : done ? '클리어' : best ? `${best} / ${STAGES}판` : '도전 가능'}</span></button>`; }).join('')}</div>`;
}

/* ───── 전투 중 HUD: 시안마다 자리만 다르고 보여 주는 값은 기본과 같다(체력 · 경험치 · 판 · 내려온 정도 · 파편 · 보스 체력) ───── */
function drawHudSkin() {
  const g = game, p = g.p; if (!p) return;
  const k = window.__skin, s = view.s, top = view.safeT + 8 * s, W = view.W, hudLive = g.state !== 'card';
  if (hudLive) g.hudHp = approachSnap(g.hudHp === undefined ? p.hp : g.hudHp, p.hp, 5, 1 / 60, .3);
  const flash = g.hpFlash || 0, rise = flash > 0 ? 1 - Math.pow(flash, 3) : 1, hpShown = flash > 0 ? Math.round(g.hpFrom + (p.hp - g.hpFrom) * rise) : p.hp, f = clamp(hpShown / p.maxHp, 0, 1), f2 = clamp(g.hudHp / p.maxHp, 0, 1);
  if (flash > 0 && hudLive) g.hpFlash = Math.max(0, flash - 1 / 60 / 1.1);
  const xpOn = !g.tut && g.xpNeed > 0 && !(g.boss && g.boss.barK > 0), xmax = g.runLv >= XP.cap, xk0 = xmax ? 1 : clamp(g.xp / (g.xpNeed || 1), 0, 1);
  if (xpOn) g.hudXp = hudLive ? approachSnap(g.hudXp === undefined ? xk0 : g.hudXp, xk0, 8, 1 / 60, .002) : (g.hudXp || 0);
  const xk = g.hudXp || 0, lvText = xmax ? 'MAX' : `Lv.${g.runLv + 1}`, wv = stageOf(g.wave) - 1, pipsOn = !g.mode;
  const prog = g.room ? 1 : clamp(p.y / Math.max(1, (g.isBossWave ? g.arenaTop * TILE : g.floorRow * TILE)), 0, 1), progOn = !g.boss && !g.mode;
  const C = { a: { bg: 'rgba(33,28,24,.9)', hp1: '#e0694a', hp2: '#b8432c', ghost: '#f1e4c6', xp: '#e0b254', ink: '#f1e4c6', mark: '#e0b254', done: '#e0b254', idle: '#5a5046' },
              b: { bg: 'rgba(34,14,20,.88)', hp1: '#ff7a5a', hp2: '#c8322e', ghost: '#ffe2b0', xp: '#ffc24a', ink: '#fff', mark: '#ffc24a', done: '#ffc24a', idle: '#5a3a3e' },
              c: { bg: 'rgba(8,12,34,.82)', hp1: '#ff7a8a', hp2: '#d42a54', ghost: '#ffe9c0', xp: '#7fd8ff', ink: '#e8f0ff', mark: '#f3d27a', done: '#f3d27a', idle: '#2c3566' },
              d: { bg: 'rgba(246,232,198,.94)', hp1: '#e2584a', hp2: '#b52e2e', ghost: '#8a6a3a', xp: '#3f86d8', ink: '#4a3220', mark: '#b9770a', done: '#b9770a', idle: '#cdb88a' } }[k];
  const dark = k !== 'd', txt = (t, x, y, col, lw = 2.6) => { if (dark) textOut(t, x, y, col, lw); else { ctx.fillStyle = col; ctx.fillText(t, x, y); } };
  // 가로 · 세로 막대(뒤에 늦게 따라오는 잔상 + 회복 번쩍임은 기본과 같은 규칙)
  const hbar = (x, y, w, h, r) => {
    ctx.fillStyle = C.bg; rr(x, y, w, h, r); ctx.fill(); const pd = Math.min(2 * s, h * .18), iw = w - pd * 2, ih = h - pd * 2;
    if (f2 > f && !flash) { ctx.fillStyle = C.ghost; ctx.fillRect(x + pd, y + pd, iw * f2, ih); }
    const hg = ctx.createLinearGradient(0, y, 0, y + h); hg.addColorStop(0, C.hp1); hg.addColorStop(1, C.hp2); ctx.fillStyle = hg; ctx.fillRect(x + pd, y + pd, iw * f, ih);
    if (flash > 0) { ctx.globalAlpha = flash * .55; ctx.fillStyle = '#7dffa8'; ctx.fillRect(x + pd, y + pd, iw * f, ih); ctx.globalAlpha = flash; ctx.strokeStyle = '#8dffb0'; ctx.lineWidth = 2.4 * s; rr(x - s, y - s, w + 2 * s, h + 2 * s, r + s); ctx.stroke(); ctx.globalAlpha = 1; }
  };
  const vbar = (x, y, w, h) => {
    ctx.fillStyle = C.bg; rr(x, y, w, h, w / 2); ctx.fill(); const pd = 1.6 * s, iw = w - pd * 2, ih = h - pd * 2;
    if (f2 > f && !flash) { ctx.fillStyle = C.ghost; ctx.fillRect(x + pd, y + pd + ih * (1 - f2), iw, ih * f2); }
    const hg = ctx.createLinearGradient(x, 0, x + w, 0); hg.addColorStop(0, C.hp1); hg.addColorStop(1, C.hp2); ctx.fillStyle = hg; ctx.fillRect(x + pd, y + pd + ih * (1 - f), iw, ih * f);
    if (flash > 0) { ctx.globalAlpha = flash * .55; ctx.fillStyle = '#7dffa8'; ctx.fillRect(x + pd, y + pd + ih * (1 - f), iw, ih * f); ctx.globalAlpha = 1; }
  };
  const xbar = (x, y, w, h) => { ctx.fillStyle = C.bg; rr(x, y, w, h, h / 2); ctx.fill(); ctx.fillStyle = xmax ? C.mark : C.xp; if (xk > 0) { rr(x + .8 * s, y + .8 * s, Math.max(h - 1.6 * s, (w - 1.6 * s) * xk), h - 1.6 * s, (h - 1.6 * s) / 2); ctx.fill(); } };
  // 판 표식 하나: 전투 = 점(석판은 네모), 휴식 = 잎, 보스 = 해골
  const pip = (x, y, pr, i) => {
    const done = i < wv, cur = i === wv, kind = STAGE_PLAN[i];
    ctx.fillStyle = C.bg; ctx.beginPath(); if (k === 'a') ctx.rect(x - pr, y - pr, pr * 2, pr * 2); else ctx.arc(x, y, pr, 0, 7); ctx.fill();
    if (kind === 'boss') { const sk = IMG.ui_skull; if (ok(sk)) ctx.drawImage(sk, x - pr * .85, y - pr * .85, pr * 1.7, pr * 1.7); if (!cur) { ctx.fillStyle = k === 'd' ? 'rgba(246,232,198,.5)' : 'rgba(10,8,20,.45)'; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fill(); } }
    else if (kind === 'rest') { ctx.fillStyle = done ? '#58c98a' : cur ? '#9be8bd' : C.idle; ctx.beginPath(); ctx.ellipse(x, y, pr * .42, pr * .62, .6, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = done ? C.done : cur ? (dark ? '#fff' : '#4a3220') : C.idle; ctx.beginPath(); if (k === 'a') ctx.rect(x - pr * .5, y - pr * .5, pr, pr); else ctx.arc(x, y, pr * .55, 0, 7); ctx.fill(); }
    if (cur) { ctx.strokeStyle = C.mark; ctx.lineWidth = 1.8 * s; ctx.beginPath(); if (k === 'a') ctx.rect(x - pr, y - pr, pr * 2, pr * 2); else ctx.arc(x, y, pr, 0, 7); ctx.stroke(); }
  };
  const shards = (x, y, size = 15) => { ctx.font = `${size * s}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; const im = IMG.o_rose, h = size * s, w = ok(im) ? h * im.naturalWidth / im.naturalHeight : 0; txt(p.shards, x - w - 4 * s, y, C.ink, 3); if (w) ctx.drawImage(im, x - w, y - h / 2, w, h); };
  ctx.textBaseline = 'middle';
  if (k === 'a') {
    // 석판: 위쪽을 가로지르는 긴 체력 띠 → 그 아래 경험치 줄 → 네모 판 표식. 전부 왼쪽 맞춤으로 쌓는다
    const x = 46 * s, w = W - 46 * s - 66 * s, h = 15 * s;
    hbar(x, top, w, h, 2 * s); ctx.font = `${11.5 * s}px ${FONT}`; ctx.textAlign = 'left'; txt(`${hpShown} / ${p.maxHp}`, x + 6 * s, top + h / 2 + .5 * s, '#fff');
    shards(W - 12 * s, top + h / 2);
    let y = top + h + 3 * s;
    if (xpOn) { xbar(x, y, w, 5 * s); ctx.font = `${10.5 * s}px ${FONT}`; ctx.textAlign = 'left'; txt(lvText, x + w + 5 * s, y + 2.5 * s, xmax ? C.mark : C.ink, 2.4); y += 8 * s; }
    drawZoneHud(x, y, 118 * s); if (g.zone === 'water' && !g.room) y += 10 * s;
    if (pipsOn && !(g.boss && g.boss.barK > 0)) { const pr = 5.4 * s, gap = 14 * s, x0 = x + pr, py = y + pr + 1 * s; for (let i = 0; i < STAGES; i++) pip(x0 + i * gap, py, pr, i);
      if (progOn) { const px = x0 + STAGES * gap + 2 * s, pw = 64 * s; ctx.fillStyle = C.bg; ctx.fillRect(px, py - 2 * s, pw, 4 * s); ctx.fillStyle = C.mark; ctx.fillRect(px, py - 2 * s, pw * prog, 4 * s); } }
  } else if (k === 'b') {
    // 제단: 위쪽 한가운데 레벨 원반(둘레가 경험치), 왼쪽에 체력, 오른쪽에 판 표식. 원반을 중심으로 좌우가 마주 본다
    const cx = W / 2, cy = top + 13 * s, R = 15 * s, boss = g.boss && g.boss.barK > 0, x = 46 * s, w = cx - R - 6 * s - x, h = 16 * s;
    hbar(x, cy - h / 2, w, h, 8 * s); ctx.font = `${11.5 * s}px ${FONT}`; ctx.textAlign = 'center'; txt(`${hpShown} / ${p.maxHp}`, x + w / 2, cy + .5 * s, '#fff');
    if (!boss) { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      if (xpOn) { ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(cx, cy, R - 2.4 * s, 0, 7); ctx.stroke(); ctx.strokeStyle = C.xp; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R - 2.4 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.001, xk)); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.font = `${(xmax ? 9 : 10.5) * s}px ${FONT}`; ctx.textAlign = 'center'; txt(lvText, cx, cy + .5 * s, xmax ? C.mark : '#fff', 2.4); } }
    if (pipsOn) { const pr = 5.6 * s, gap = 13 * s, x0 = cx + R + 8 * s + pr; for (let i = 0; i < STAGES; i++) pip(x0 + i * gap, cy - 2 * s, pr, i);
      if (progOn) { const pw = (STAGES - 1) * gap + pr * 2; ctx.fillStyle = C.bg; ctx.fillRect(x0 - pr, cy + 6.5 * s, pw, 3.4 * s); ctx.fillStyle = C.mark; ctx.fillRect(x0 - pr, cy + 6.5 * s, pw * prog, 3.4 * s); } }
    shards(W - 10 * s, pipsOn ? cy : cy, 13.5);
    drawZoneHud(x, cy + h / 2 + 3 * s, w);
  } else if (k === 'c') {
    // 낙하 지도: 왼쪽 벽에 세로 체력 기둥(옆에 경험치 줄), 오른쪽 벽에 세로 깊이 눈금. 위쪽 띠는 비워 시야를 넓힌다
    const y0 = top + 62 * s, hh = 150 * s, x = 7 * s, w = 11 * s;
    vbar(x, y0, w, hh); if (xpOn) { ctx.fillStyle = C.bg; rr(x + w + 2 * s, y0, 4 * s, hh, 2 * s); ctx.fill(); ctx.fillStyle = xmax ? C.mark : C.xp; const xh = (hh - 1.6 * s) * xk; if (xh > 0) { rr(x + w + 2.8 * s, y0 + hh - .8 * s - xh, 2.4 * s, xh, 1.2 * s); ctx.fill(); } }
    ctx.font = `${12 * s}px ${FONT}`; ctx.textAlign = 'left'; txt(`${hpShown}`, x - 1 * s, y0 - 9 * s, '#fff'); if (xpOn) { ctx.font = `${10.5 * s}px ${FONT}`; txt(lvText, x - 1 * s, y0 + hh + 9 * s, xmax ? C.mark : C.xp, 2.4); }
    if (pipsOn) { const px = W - 13 * s, gap = 26 * s, pr = 6 * s; ctx.strokeStyle = 'rgba(243,210,122,.35)'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + (STAGES - 1) * gap); ctx.stroke();
      if (progOn && wv < STAGES - 1) { ctx.strokeStyle = C.mark; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(px, y0 + wv * gap); ctx.lineTo(px, y0 + (wv + prog) * gap); ctx.stroke(); }
      for (let i = 0; i < STAGES; i++) pip(px, y0 + i * gap, pr, i); }
    shards(W - 12 * s, top + 8 * s);
    drawZoneHud(W / 2 - 59 * s, top + 4 * s, 118 * s);
  } else {
    // 두루마리: 위쪽 가운데 양피지 띠 하나에 체력 · 레벨 · 판 · 파편을 한 줄로 모은다
    const x = 46 * s, w = W - x - 10 * s, h = 25 * s, cy = top + h / 2 - 2 * s;
    ctx.fillStyle = C.bg; rr(x, top - 2 * s, w, h, 6 * s); ctx.fill(); ctx.strokeStyle = 'rgba(122,82,32,.55)'; ctx.lineWidth = 1.2 * s; rr(x + 2 * s, top, w - 4 * s, h - 4 * s, 4.5 * s); ctx.stroke();
    const bx = x + 8 * s, bw = 92 * s, bh = 13 * s, bg0 = C.bg; C.bg = 'rgba(74,50,32,.9)'; hbar(bx, cy - bh / 2, bw, bh, 3 * s);
    ctx.font = `${10.5 * s}px ${FONT}`; ctx.textAlign = 'center'; textOut(`${hpShown} / ${p.maxHp}`, bx + bw / 2, cy + .5 * s, '#fff', 2.4);
    let nx = bx + bw + 8 * s;
    if (xpOn) { ctx.font = `${10.5 * s}px ${FONT}`; ctx.textAlign = 'left'; txt(lvText, nx, cy - 3 * s, xmax ? C.mark : C.ink); xbar(nx, cy + 4 * s, 30 * s, 4 * s); }
    nx += 38 * s;
    if (pipsOn) { const pr = 5 * s, gap = 11.6 * s; for (let i = 0; i < STAGES; i++) pip(nx + pr + i * gap, cy - 2 * s, pr, i);
      if (progOn) { const pw = (STAGES - 1) * gap + pr * 2; ctx.fillStyle = 'rgba(74,50,32,.35)'; ctx.fillRect(nx, cy + 6 * s, pw, 3 * s); ctx.fillStyle = C.mark; ctx.fillRect(nx, cy + 6 * s, pw * prog, 3 * s); } }
    C.bg = bg0; shards(x + w - 8 * s, cy, 13.5);
    drawZoneHud(x + 8 * s, top + h + 1 * s, 118 * s);
  }
  drawModeHud();
  // 보스 체력: 자리는 기본과 같고(모드 HUD · 보스 이름과 겹치지 않게) 색만 시안을 따른다
  if (g.boss && g.boss.barK > 0) {
    const b = g.boss, by = top + (k === 'a' || k === 'd' ? 30 : 26) * s, bw2 = W - 28 * s, x0 = 14 * s, F = (g.minis ? clamp(g.minis.reduce((a, m) => a + Math.max(0, m.hp), 0) / g.minis.reduce((a, m) => a + m.maxHp, 0), 0, 1) : clamp(b.hp / b.maxHp, 0, 1)) * b.barK;
    ctx.font = `${12.5 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,8,20,.9)'; rr(x0, by + 12 * s, bw2, 12 * s, (k === 'a' ? 2 : 5) * s); ctx.fill();
    b.barGhost = approachSnap(b.barGhost === undefined ? F : b.barGhost, F, 4, 1 / 60, .001);
    ctx.fillStyle = '#ffe9c0'; ctx.fillRect(x0 + 2 * s, by + 14 * s, (bw2 - 4 * s) * b.barGhost, 8 * s);
    const bg = ctx.createLinearGradient(0, by + 14 * s, 0, by + 22 * s); bg.addColorStop(0, '#ff5b7a'); bg.addColorStop(1, '#a01040');
    ctx.fillStyle = bg; ctx.fillRect(x0 + 2 * s, by + 14 * s, (bw2 - 4 * s) * F, 8 * s);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x0 + (bw2) * .5 - .5 * s, by + 13 * s, 1.4 * s, 10 * s);
    textOut(b.def.name, W / 2, by + 3 * s, b.flash > 0 ? '#ffd24a' : '#fff', 3);
  }
}
if (window.GF) window.GF.Skin = Skin;
