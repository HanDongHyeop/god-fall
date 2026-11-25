/* 빌드 표시 + 새 버전 자동 반영(v38.1). GF_BUILD 줄은 tools/stamp.py가 배포할 때마다 고쳐 쓴다(version.json과 같은 값).
   폰에 설치한 앱은 '껐다 켜도' 예전 화면을 그대로 되살리는 경우가 있다 → 켤 때 · 다시 돌아올 때 · 로비로 올 때 version.json을 새로 받아 다르면 저장분을 지우고 다시 연다. */
window.GF_BUILD = { v: 'v62', t: '2026-11-26 00:38' };
function verText() { const b = window.GF_BUILD || {}; return `${b.v || ''} · ${(b.t || '').slice(5)}`; }
function verCheck() {
  if ((location.protocol !== 'https:' && !window.__verTest) || verCheck.busy) return; verCheck.busy = true;   // __verTest = 자동 시험용(http에서도 확인)
  fetch('version.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
    verCheck.busy = false; if (!j || !j.t || j.t === window.GF_BUILD.t) return;
    const inRun = typeof game !== 'undefined' && game.p && game.state !== 'title';   // 판을 하는 중에는 끊지 않는다(로비로 올 때 다시 확인)
    let tried = ''; try { tried = sessionStorage.getItem('gf_ver_try') || ''; } catch (e) {}
    if (inRun || tried === j.t) return;                                              // 같은 버전으로 한 번만 다시 연다(무한 새로고침 방지)
    try { sessionStorage.setItem('gf_ver_try', j.t); } catch (e) {}
    const go = () => location.reload();
    const wipe = window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : Promise.resolve();
    wipe.then(() => navigator.serviceWorker ? navigator.serviceWorker.getRegistration().then(r => r && r.update()) : null).then(go, go);
  }).catch(() => { verCheck.busy = false; });
}
addEventListener('load', verCheck);
document.addEventListener('visibilitychange', () => { if (!document.hidden) verCheck(); });
