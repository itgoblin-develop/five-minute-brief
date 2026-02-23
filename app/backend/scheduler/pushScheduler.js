// 푸시 알림 스케줄러 — 매분 실행하여 사용자 설정 시간에 뉴스 푸시 발송
const cron = require('node-cron');
const webpush = require('../config/webpush');
const pool = require('../config/db');
const logger = require('../config/logger');

// 한국어 요일 매핑 (0=일, 1=월, ..., 6=토)
const DAY_MAP = { 0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' };

/**
 * 현재 KST 시간/요일과 user_settings를 비교하여
 * 조건에 맞는 사용자에게 최신 뉴스 3개를 푸시 발송
 */
async function sendScheduledNotifications() {
  try {
    // VAPID 키가 없으면 스킵
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return;
    }

    // 현재 KST 시간
    const now = new Date();
    const kstOffset = 9 * 60; // KST = UTC+9
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
    const kstHour = kstTime.getHours();
    const kstMinute = kstTime.getMinutes();
    const kstDay = DAY_MAP[kstTime.getDay()];
    const currentTime = `${kstHour.toString().padStart(2, '0')}:${kstMinute.toString().padStart(2, '0')}`;

    // push_enabled=true이고, 현재 시간과 일치하는 사용자 조회
    const usersResult = await pool.query(
      `SELECT us.user_id, us.notification_time, us.notification_days
       FROM user_settings us
       WHERE us.push_enabled = TRUE
         AND TO_CHAR(us.notification_time, 'HH24:MI') = $1`,
      [currentTime]
    );

    if (usersResult.rows.length === 0) return;

    // 최신 뉴스 3개 가져오기
    const newsResult = await pool.query(
      `SELECT news_id, title, category, image_url
       FROM news
       ORDER BY published_at DESC
       LIMIT 3`
    );

    if (newsResult.rows.length === 0) {
      logger.info('푸시 발송 스킵: 뉴스가 없습니다');
      return;
    }

    const topNews = newsResult.rows;
    const newsTitle = topNews[0].title;
    const newsBody = topNews.length > 1
      ? `외 ${topNews.length - 1}건의 새로운 뉴스가 도착했습니다`
      : '새로운 뉴스가 도착했습니다';

    let totalSent = 0;
    let totalFailed = 0;

    for (const user of usersResult.rows) {
      // 요일 체크
      const days = user.notification_days || [];
      if (!days.includes(kstDay)) continue;

      // 해당 사용자의 활성 구독 조회
      const subsResult = await pool.query(
        'SELECT subscription_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
        [user.user_id]
      );

      if (subsResult.rows.length === 0) continue;

      const payload = JSON.stringify({
        title: '5늘5분 뉴스 브리핑',
        body: newsTitle + ' ' + newsBody,
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: {
          url: '/',
          type: 'scheduled',
          newsIds: topNews.map(n => n.news_id),
        },
      });

      for (const sub of subsResult.rows) {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        try {
          await webpush.sendNotification(subscription, payload);
          totalSent++;
        } catch (err) {
          totalFailed++;
          // 410 Gone 또는 404 Not Found → 구독 만료
          if (err.statusCode === 410 || err.statusCode === 404) {
            await pool.query(
              'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE subscription_id = $1',
              [sub.subscription_id]
            );
            logger.info(`만료된 푸시 구독 비활성화: subscription_id=${sub.subscription_id}`);
          }
        }
      }

      // 알림 이력 저장
      await pool.query(
        `INSERT INTO notification_logs (user_id, title, body, category, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.user_id,
          '5늘5분 뉴스 브리핑',
          newsTitle + ' ' + newsBody,
          '맞춤 뉴스 배달',
          JSON.stringify({ type: 'scheduled', newsIds: topNews.map(n => n.news_id) }),
        ]
      );
    }

    if (totalSent > 0 || totalFailed > 0) {
      logger.info(`푸시 스케줄러 실행 완료: KST ${currentTime} ${kstDay}요일, 발송 ${totalSent}건, 실패 ${totalFailed}건`);
    }
  } catch (error) {
    logger.error('푸시 스케줄러 오류:', error);
  }
}

/**
 * 스케줄러 시작 — 매분 실행
 */
function startPushScheduler() {
  // 매분 0초에 실행
  cron.schedule('0 * * * * *', () => {
    sendScheduledNotifications();
  });

  logger.info('📬 푸시 알림 스케줄러 시작 (매분 실행)');
}

module.exports = { startPushScheduler, sendScheduledNotifications };
