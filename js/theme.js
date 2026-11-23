/* UI 풍 시안(디버그 전용, 2026-11-23). 배치 · 크기는 기본 UI 그대로이고, 디버그 패널에서 켰을 때만(#stage[data-theme]) themes.css의 색 · 질감과 아래 HUD 색이 쓰인다.
   시안이 정해지면: 고른 풍의 규칙을 style.css로, HUD 색을 render.js의 HUD_BASE로 옮기고 이 파일과 themes.css를 지운다(index.html의 태그 2개 포함).
   themes.css는 직접 고치지 않는다: tools/themes.src.css → python tools/build_themes.py (배치를 바꾸는 속성이 있으면 빌드가 멈춘다) */
const THEMES = { m: '대리석과 금', k: '검은 도자기', n: '심연의 빛', p: '양피지 삽화' };
const HUD_THEME = {
  m: { bg: 'rgba(42,51,80,.84)', hp1: '#f08a8a', hp2: '#b83a48', xp1: '#8aa6e8', xp2: '#dce6fb', xpTx: '#dce6fb', gold: '#e9cf8a', idle: '#5a6078' },
  k: { bg: 'rgba(23,19,16,.9)', hp1: '#e8704a', hp2: '#a8382a', xp1: '#d9782e', xp2: '#f3c9a0', xpTx: '#f3c9a0', gold: '#e8a04a', idle: '#4a4038' },
  n: { bg: 'rgba(6,26,34,.86)', hp1: '#f07fb0', hp2: '#a83a72', xp1: '#2fb0a4', xp2: '#c9fff6', xpTx: '#c9fff6', gold: '#7ff0e0', idle: '#1f4a56' },
  p: { bg: 'rgba(74,50,32,.88)', hp1: '#e06a58', hp2: '#a82e26', xp1: '#b98a3a', xp2: '#f3e6c4', xpTx: '#f3e6c4', gold: '#f3d27a', idle: '#7a5a3a' },
};
const Theme = {
  id: '',
  set(id) { id = THEMES[id] ? id : ''; this.id = id; window.__theme = id || undefined; const st = $('stage'); if (id) st.dataset.theme = id; else delete st.dataset.theme; },
};
if (window.GF) window.GF.Theme = Theme;
