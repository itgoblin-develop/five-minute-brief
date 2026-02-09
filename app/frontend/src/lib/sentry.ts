import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] VITE_SENTRY_DSN 미설정 - Sentry 비활성화');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
    beforeSend(event) {
      // 민감한 정보 제거
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });

  console.log(`[Sentry] 초기화 완료 (${import.meta.env.MODE})`);
}

export { Sentry };
