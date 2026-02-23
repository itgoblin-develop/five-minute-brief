// 푸시 알림 관련 라우트
const express = require('express');
const router = express.Router();
const webpush = require('../config/webpush');
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');

// VAPID 공개키 반환 (프론트엔드에서 구독 시 사용)
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ success: false, error: '푸시 알림이 설정되지 않았습니다' });
  }
  res.json({ success: true, publicKey: key });
});

// 푸시 구독 등록
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, error: '잘못된 구독 정보입니다' });
    }

    // UPSERT: endpoint 기준으로 있으면 업데이트, 없으면 삽입
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = $1, p256dh = $3, auth = $4, is_active = TRUE, updated_at = NOW()`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );

    logger.info(`푸시 구독 등록: user_id=${userId}`);
    res.json({ success: true, message: '푸시 알림이 등록되었습니다' });
  } catch (error) {
    logger.error('푸시 구독 등록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 푸시 구독 해제
router.delete('/unsubscribe', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { endpoint } = req.body;

    if (endpoint) {
      // 특정 구독만 비활성화
      await pool.query(
        'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND endpoint = $2',
        [userId, endpoint]
      );
    } else {
      // 사용자의 모든 구독 비활성화
      await pool.query(
        'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
    }

    logger.info(`푸시 구독 해제: user_id=${userId}`);
    res.json({ success: true, message: '푸시 알림이 해제되었습니다' });
  } catch (error) {
    logger.error('푸시 구독 해제 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 알림 이력 조회
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit: rawLimit = 30 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 30, 1), 100);
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notification_logs WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT notification_id, title, body, category, is_read, data, created_at
       FROM notification_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // 안 읽은 알림 수
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notification_logs WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    const unreadCount = parseInt(unreadResult.rows[0].count);

    const notifications = result.rows.map(row => ({
      id: String(row.notification_id),
      title: row.title,
      body: row.body,
      category: row.category,
      isRead: row.is_read,
      data: row.data,
      date: row.created_at,
    }));

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('알림 이력 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 알림 읽음 처리
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await pool.query(
      'UPDATE notification_logs SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 모든 알림 읽음 처리
router.put('/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query(
      'UPDATE notification_logs SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('전체 알림 읽음 처리 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 테스트 알림 발송 (특정 사용자에게)
router.post('/test', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.body;
    const sendToUserId = targetUserId || userId;

    // 해당 사용자의 활성 구독 조회
    const subsResult = await pool.query(
      'SELECT subscription_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
      [sendToUserId]
    );

    if (subsResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '해당 사용자의 활성 푸시 구독이 없습니다' });
    }

    // 최신 뉴스 1개 가져오기
    const newsResult = await pool.query(
      'SELECT title, category FROM news ORDER BY published_at DESC LIMIT 1'
    );

    const newsTitle = newsResult.rows.length > 0
      ? newsResult.rows[0].title
      : '테스트 알림입니다';
    const newsCategory = newsResult.rows.length > 0
      ? newsResult.rows[0].category
      : '테스트';

    const payload = JSON.stringify({
      title: '5늘5분 - 테스트 알림',
      body: newsTitle,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: '/', type: 'test' },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subsResult.rows) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
      } catch (err) {
        failCount++;
        // 410 Gone 또는 404 Not Found → 구독 만료, 비활성화
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(
            'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE subscription_id = $1',
            [sub.subscription_id]
          );
          logger.info(`만료된 푸시 구독 비활성화: subscription_id=${sub.subscription_id}`);
        } else {
          logger.error(`테스트 푸시 발송 실패: subscription_id=${sub.subscription_id}`, err);
        }
      }
    }

    // 알림 이력 저장
    await pool.query(
      `INSERT INTO notification_logs (user_id, title, body, category, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [sendToUserId, '5늘5분 - 테스트 알림', newsTitle, '테스트 알림', JSON.stringify({ type: 'test' })]
    );

    res.json({
      success: true,
      message: `테스트 알림 발송 완료 (성공: ${successCount}, 실패: ${failCount})`,
    });
  } catch (error) {
    logger.error('테스트 알림 발송 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
