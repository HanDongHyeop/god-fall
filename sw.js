/* 설치 앱용. 항상 새 파일을 먼저 받고, 인터넷이 끊겼을 때만 저장해 둔 파일을 쓴다. 배포하면 다음 실행부터 바로 반영된다 */
const CACHE = 'godfall-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); } return res; }).catch(() => caches.match(r)));
});
