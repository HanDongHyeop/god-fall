/* UI 풍 시안(디버그 전용, 2026-11-23). 배치 · 크기는 기본 UI 그대로이고, 디버그 패널에서 켰을 때만(#stage[data-theme]) themes.css의 색 · 질감과 아래 HUD 색이 쓰인다.
   v49 시안 4종 중 '양피지 삽화'로 정해졌고(색은 어둡게), 지금은 어두운 양피지 계열 4종(A~D)을 비교하는 중이다. 예전 풍(대리석 · 도자기 · 심연 · 밝은 양피지)은 지웠다.
   시안이 정해지면: 고른 풍의 규칙을 style.css로, HUD 색을 render.js의 HUD_BASE로 옮기고 이 파일과 themes.css를 지운다(index.html의 태그 2개 포함).
   themes.css는 직접 고치지 않는다: tools/themes.src.css → python tools/build_themes.py (배치를 바꾸는 속성이 있으면 빌드가 멈춘다) */
const THEMES = { a: '그을린 양피지', b: '먹색 가죽 금박', c: '밤의 고문서', d: '짙은 지도 양피지' };
const HUD_THEME = {
  a: { bg: 'rgba(28,18,10,.9)', hp1: '#f0705a', hp2: '#b8322a', xp1: '#d99a2e', xp2: '#ffe2a0', xpTx: '#ffe2a0', gold: '#f0b84a', idle: '#5a4226' },
  b: { bg: 'rgba(15,13,11,.92)', hp1: '#e86a5a', hp2: '#a82a26', xp1: '#b8964a', xp2: '#f5e3ae', xpTx: '#f5e3ae', gold: '#e2c98a', idle: '#4a4132' },
  c: { bg: 'rgba(12,17,32,.9)', hp1: '#f07a94', hp2: '#b0345a', xp1: '#6f8fe0', xp2: '#dfe8ff', xpTx: '#dfe8ff', gold: '#cfd9ee', idle: '#3a4668' },
  d: { bg: 'rgba(23,26,14,.9)', hp1: '#e8644a', hp2: '#a82e1e', xp1: '#a8a04a', xp2: '#f0e4bc', xpTx: '#f0e4bc', gold: '#e0c878', idle: '#4c4e2c' },
};
const Theme = {
  id: '',
  set(id) { id = THEMES[id] ? id : ''; this.id = id; window.__theme = id || undefined; const st = $('stage'); if (id) st.dataset.theme = id; else delete st.dataset.theme; },
};
if (window.GF) window.GF.Theme = Theme;
