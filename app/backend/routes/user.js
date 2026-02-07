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
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: '현재 비밀번호를 입력해주세요' });
      }
      const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: '현재 비밀번호가 올바르지 않습니다' });
      }
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, error: '비밀번호는 8~16자, 영문, 숫자, 특수문자를 모두 포함해야 합니다' });
      }
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    }

    res.json({ success: true, message: '프로필이 수정되었습니다' });
  } catch (error) {
    console.error('프로필 수정 오류:', error);
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    res.json({ success: true, message: '회원 탈퇴가 완료되었습니다' });
  } catch (error) {
    console.error('회원 탈퇴 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
