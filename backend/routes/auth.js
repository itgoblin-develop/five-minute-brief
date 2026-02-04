// 인증 관련 라우트 (회원가입, 로그인)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// 회원가입 API
router.post('/signup', async (req, res) => {
  try {
    const { email, nickname, password } = req.body;

    // 1. 입력값 검증
    if (!email || !nickname || !password) {
      return res.status(400).json({ 
        success: false,
        error: '모든 필드를 입력해주세요' 
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: '올바른 이메일 형식이 아닙니다' 
      });
    }

    // 닉네임 길이 검증 (2-20자)
    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ 
        success: false,
        error: '닉네임은 2자 이상 20자 이하여야 합니다' 
      });
    }

    // 비밀번호 규칙 검증: 8~16자, 영문 + 숫자 혼합
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        success: false,
        error: '비밀번호는 8~16자, 영문과 숫자를 모두 포함해야 합니다' 
      });
    }

    // 2. 이메일 중복 확인
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: '이미 사용 중인 이메일입니다' 
      });
    }

    // 3. 닉네임 중복 확인
    const nicknameCheck = await pool.query(
      'SELECT * FROM users WHERE nickname = $1',
      [nickname]
    );
    if (nicknameCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: '이미 사용 중인 닉네임입니다' 
      });
    }

    // 4. 비밀번호 해싱
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. DB 저장
    const result = await pool.query(
      'INSERT INTO users (email, nickname, password_hash) VALUES ($1, $2, $3) RETURNING id, email, nickname, created_at',
      [email, nickname, passwordHash]
    );

    const user = result.rows[0];

    // 6. JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        nickname: user.nickname
      },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );

    // 7. httpOnly Cookie 설정
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
      path: '/'
    });

    // 8. 응답 반환
    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '서버 오류가 발생했습니다' 
    });
  }
});

// 로그인 API
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 입력값 검증
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: '이메일과 비밀번호를 입력해주세요' 
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: '올바른 이메일 형식이 아닙니다' 
      });
    }

    // 2. 이메일로 사용자 조회
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다' 
      });
    }

    const user = result.rows[0];

    // 3. 비밀번호 검증
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다' 
      });
    }

    // 4. JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        nickname: user.nickname
      },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );

    // 5. last_login_at 업데이트
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 6. httpOnly Cookie 설정
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
      path: '/'
    });

    // 7. 응답 반환
    res.status(200).json({
      success: true,
      message: '로그인이 완료되었습니다',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        last_login_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '서버 오류가 발생했습니다' 
    });
  }
});

module.exports = router;
