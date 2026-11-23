/* UI 풍 시안(디버그 전용, 2026-11-23). 배치 · 크기는 기본 UI 그대로이고, 디버그 패널에서 켰을 때만(#stage[data-theme]) themes.css의 색 · 질감과 아래 HUD 색이 쓰인다.
   v49 시안 4종 중 "양피지 삽화" → 어두운 양피지 4종 중 "A 그을린 양피지"로 정해졌고, 지금은 A 모양 그대로 대표 색(판 · 바 색)만 다른 4종을 비교하는 중이다. 예전 풍(먹색 가죽 금박 · 밤의 고문서 · 짙은 지도 양피지)은 지웠다.
   ★배경(로비 하늘 · 구름 · 섬 장면, 장비 탭 무대)은 기본 UI 그대로다. UI 부품(버튼 · 메뉴 바 · 재화 줄 · 탭 · 판 · 화살표 · 창 틀)만 바뀐다.
   시안이 정해지면: 고른 풍의 규칙을 style.css로, HUD 색을 render.js의 HUD_BASE로 옮기고 이 파일과 themes.css를 지운다(index.html의 태그 2개 포함).
   themes.css는 직접 고치지 않는다: tools/themes.src.css → python tools/build_themes.py (배치를 바꾸는 속성이 있으면 빌드가 멈춘다) */
const THEMES = { a: '갈색 양피지', a2: '먹색 양피지', a3: '남색 양피지', a4: '녹색 양피지' };
/* 디버그 목록에 보이는 표시: tag = 단추 머리글, note = 대표 색 한 줄 */
const THEME_INFO = {
  a: { tag: 'A', note: '그을린 갈색 판 · 바 + 호박색 시작 버튼' },
  a2: { tag: 'A-색2', note: '먹색(검회색) 판 · 바 + 주홍 도장 시작 버튼' },
  a3: { tag: 'A-색3', note: '짙은 남색 판 · 바 + 밝은 금 시작 버튼' },
  a4: { tag: 'A-색4', note: '짙은 녹색 판 · 바 + 구리 주황 시작 버튼' },
};
const HUD_THEME = {
  a: { bg: 'rgba(28,18,10,.9)', hp1: '#f0705a', hp2: '#b8322a', xp1: '#d99a2e', xp2: '#ffe2a0', xpTx: '#ffe2a0', gold: '#f0b84a', idle: '#5a4226' },
  a2: { bg: 'rgba(16,16,17,.92)', hp1: '#f0654a', hp2: '#a82a18', xp1: '#b8a070', xp2: '#f4e6c4', xpTx: '#f4e6c4', gold: '#f0d8a4', idle: '#46464a' },
  a3: { bg: 'rgba(11,17,36,.9)', hp1: '#f07a8a', hp2: '#b0344e', xp1: '#d8a838', xp2: '#ffe9a8', xpTx: '#ffe9a8', gold: '#f4d27a', idle: '#34426c' },
  a4: { bg: 'rgba(11,25,18,.9)', hp1: '#f07858', hp2: '#b03a22', xp1: '#c8a84a', xp2: '#f4e8b0', xpTx: '#f4e8b0', gold: '#ead68c', idle: '#2e4c3a' },
};
const Theme = {
  id: '',
  set(id) { id = THEMES[id] ? id : ''; this.id = id; window.__theme = id || undefined; const st = $('stage'); if (id) st.dataset.theme = id; else delete st.dataset.theme; },
};
if (window.GF) window.GF.Theme = Theme;
