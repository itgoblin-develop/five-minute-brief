const Sentry = require('@sentry/node');

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN 미설정 - Sentry 비활성화');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      // 민감한 정보 제거
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });

  console.log(`[Sentry] 초기화 완료 (${process.env.NODE_ENV || 'development'})`);
}

module.exports = { initSentry };
