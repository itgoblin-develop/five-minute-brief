// 사용자 관련 라우트 (보호된 API)
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../config/db');

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
      'SELECT id, email, nickname, created_at, last_login_at FROM users WHERE id = $1',
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
        created_at: user.created_at,
        last_login_at: user.last_login_at
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
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
      nickname: req.user.nickname
    }
  });
});

module.exports = router;
