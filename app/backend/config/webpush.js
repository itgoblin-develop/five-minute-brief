// Web Push VAPID 설정
const webpush = require('web-push');
const logger = require('./logger');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@itdokkaebi.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('✅ Web Push VAPID 설정 완료');
} else {
  logger.warn('⚠️ VAPID 키가 설정되지 않았습니다. 푸시 알림이 비활성화됩니다.');
}

module.exports = webpush;
