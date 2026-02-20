// 사용자 관련 라우트 (보호된 API)
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

/**
 * 프로필 조회 API (보호된 API)
 * - 로그인한 사용자만 접근 가능
 * - 미들웨어가 토큰 검증 후 req.user에 사용자 정보 저장
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // req.user는 미들웨어에서 설정됨
    const userId = req.user.userId;

    // DB에서 사용자 정보 조회
    const result = await pool.query(
      'SELECT id, email, nickname, provider, created_at, last_login_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider || 'local',
        created_at: user.created_at,
        last_login_at: user.last_login_at
      }
    });
  } catch (error) {
    logger.error('프로필 조회 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '서버 오류가 발생했습니다' 
    });
  }
});

/**
 * 현재 로그인한 사용자 정보 조회 (간단 버전)
 * - 토큰에서 바로 사용자 정보 반환
 */
router.get('/me', verifyToken, (req, res) => {
  // req.user는 미들웨어에서 설정됨 (토큰에서 추출한 정보)
  res.status(200).json({
    success: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      nickname: req.user.nickname,
      isAdmin: req.user.isAdmin || false
    }
  });
});

// 프로필 수정 API
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nickname, password, currentPassword } = req.body;

    if (nickname) {
      if (nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ success: false, error: '닉네임은 2자 이상 20자 이하여야 합니다' });
      }
      const dupCheck = await pool.query('SELECT id FROM users WHERE nickname = $1 AND id != $2', [nickname, userId]);
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: '이미 사용 중인 닉네임입니다' });
      }
      await pool.query('UPDATE users SET nickname = $1, updated_at = NOW() WHERE id = $2', [nickname, userId]);
    }

    if (password) {
      // 소셜 로그인 사용자는 비밀번호 변경 불가
      const providerCheck = await pool.query('SELECT provider, password_hash FROM users WHERE id = $1', [userId]);
      if (providerCheck.rows[0]?.provider !== 'local') {
        return res.status(400).json({ success: false, error: '소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다' });
      }
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: '현재 비밀번호를 입력해주세요' });
      }
      const user = providerCheck;
      const isValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: '현재 비밀번호가 올바르지 않습니다' });
      }
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,16}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, error: '비밀번호는 8~16자, 영문, 숫자, 특수문자를 모두 포함해야 합니다' });
      }
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    }

    res.json({ success: true, message: '프로필이 수정되었습니다' });
  } catch (error) {
    logger.error('프로필 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 설정 조회 API
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT push_enabled, notification_time, notification_days, smart_notification FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // 설정이 없으면 기본값 반환
      return res.json({
        success: true,
        settings: {
          push_enabled: false,
          notification_time: '07:00',
          notification_days: ['월', '화', '수', '목', '금'],
          smart_notification: true,
        },
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      settings: {
        push_enabled: row.push_enabled,
        notification_time: row.notification_time ? row.notification_time.slice(0, 5) : '07:00',
        notification_days: row.notification_days || ['월', '화', '수', '목', '금'],
        smart_notification: row.smart_notification,
      },
    });
  } catch (error) {
    logger.error('설정 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 설정 변경 API
router.put('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { push_enabled, notification_time, notification_days } = req.body;

    // 유효성 검증
    if (notification_time !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(notification_time)) {
        return res.status(400).json({ success: false, error: '시간 형식이 올바르지 않습니다 (HH:MM)' });
      }
    }

    if (notification_days !== undefined) {
      const validDays = ['월', '화', '수', '목', '금', '토', '일'];
      if (!Array.isArray(notification_days) || !notification_days.every(d => validDays.includes(d))) {
        return res.status(400).json({ success: false, error: '요일 형식이 올바르지 않습니다' });
      }
    }

    // UPSERT: 있으면 업데이트, 없으면 삽입
    const existing = await pool.query('SELECT setting_id FROM user_settings WHERE user_id = $1', [userId]);

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO user_settings (user_id, push_enabled, notification_time, notification_days, updated_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          push_enabled ?? false,
          notification_time ?? '07:00',
          JSON.stringify(notification_days ?? ['월', '화', '수', '목', '금']),
        ]
      );
    } else {
      const updates = [];
      const values = [];
      let idx = 1;

      if (push_enabled !== undefined) {
        updates.push(`push_enabled = $${idx++}`);
        values.push(push_enabled);
      }
      if (notification_time !== undefined) {
        updates.push(`notification_time = $${idx++}`);
        values.push(notification_time);
      }
      if (notification_days !== undefined) {
        updates.push(`notification_days = $${idx++}`);
        values.push(JSON.stringify(notification_days));
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(userId);
        await pool.query(
          `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${idx}`,
          values
        );
      }
    }

    // push_enabled가 false로 변경되면 모든 push 구독도 비활성화
    if (push_enabled === false) {
      await pool.query(
        'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
    }

    res.json({ success: true, message: '설정이 저장되었습니다' });
  } catch (error) {
    logger.error('설정 변경 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 회원 탈퇴 API
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.FORCE_SECURE_COOKIE === 'true',
      sameSite: 'lax',
      path: '/'
    });
    res.json({ success: true, message: '회원 탈퇴가 완료되었습니다' });
  } catch (error) {
    logger.error('회원 탈퇴 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
