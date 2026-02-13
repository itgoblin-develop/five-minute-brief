// 서비스 워커 — 푸시 알림 수신 및 표시
// 이 파일은 Vite 빌드에 포함되지 않고 public/ 에서 직접 서빙됩니다.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '오늘 5분', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
    tag: 'five-minute-brief-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: '뉴스 보기' },
      { action: 'close', title: '닫기' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '오늘 5분', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  // 'close' 액션이면 그냥 닫기만
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // 열린 탭이 없으면 새 탭
      return clients.openWindow(url);
    })
  );
});

// 서비스 워커 활성화 시 이전 캐시 정리 (필요시)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
