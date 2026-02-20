// 인증 관련 라우트 (회원가입, 로그인)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../config/logger');
const crypto = require('crypto');
const { Resend } = require('resend');

// Resend 이메일 클라이언트
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 인증번호 발송 API (이메일 인증)
const verificationCodes = new Map(); // 메모리 저장 (프로덕션에서는 Redis 권장)

// 만료된 인증번호 주기적 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of verificationCodes) {
    if (now > val.expiresAt) verificationCodes.delete(key);
  }
}, 5 * 60 * 1000);

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '이메일을 입력해주세요'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식이 아닙니다'
      });
    }

    // 이메일 중복 확인
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

    // 6자리 인증번호 생성
    const code = String(crypto.randomInt(100000, 1000000));

    // 메모리에 저장 (5분 만료)
    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // 이메일 발송 (Resend)
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || '5늘5분 <onboarding@resend.dev>',
          to: [email],
          subject: '[5늘5분] 이메일 인증번호',
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #3D61F1; margin-bottom: 8px;">5늘5분</h2>
              <p style="color: #374151; font-size: 16px;">회원가입 인증번호입니다.</p>
              <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
              </div>
              <p style="color: #9CA3AF; font-size: 14px;">이 인증번호는 5분간 유효합니다.</p>
            </div>
          `
        });
        logger.info(`[이메일 발송 완료] ${email}`);
      } catch (emailError) {
        logger.error('이메일 발송 실패:', emailError);
        // 이메일 발송 실패해도 인증번호는 생성됨 — 개발 모드에서 콘솔로 확인 가능
      }
    } else {
      logger.info(`[개발 모드 - 콘솔 출력] ${email} → ${code}`);
    }

    res.json({
      success: true,
      message: '인증번호가 발송되었습니다',
    });

  } catch (error) {
    logger.error('인증번호 발송 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다'
    });
  }
});

// 인증번호 검증 API
router.post('/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: '이메일과 인증번호를 입력해주세요'
    });
  }

  const stored = verificationCodes.get(email);

  if (!stored) {
    return res.status(400).json({
      success: false,
      error: '인증번호를 먼저 요청해주세요'
    });
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return res.status(400).json({
      success: false,
      error: '인증번호가 만료되었습니다. 다시 요청해주세요'
    });
  }

  if (stored.code !== code) {
    return res.status(400).json({
      success: false,
      error: '인증번호가 올바르지 않습니다'
    });
  }

  // 인증 성공 — 코드 소비하지 않음 (회원가입 시 재검증용)
  res.json({
    success: true,
    message: '인증되었습니다'
  });
});

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

    // 비밀번호 규칙 검증: 8~16자, 영문 + 숫자 + 특수문자 혼합 (#6 강화)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,16}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        success: false,
        error: '비밀번호는 8~16자, 영문+숫자+특수문자 조합이어야 합니다' 
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
        nickname: user.nickname,
        isAdmin: false // 신규 가입자는 항상 비관리자
      },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    // 7. httpOnly Cookie 설정
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.FORCE_SECURE_COOKIE === 'true',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
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
    logger.error('회원가입 오류:', error);
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
        nickname: user.nickname,
        isAdmin: user.is_admin || false
      },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    // 5. last_login_at 업데이트
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 6. httpOnly Cookie 설정
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.FORCE_SECURE_COOKIE === 'true',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
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
    logger.error('로그인 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '서버 오류가 발생했습니다' 
    });
  }
});

// 비밀번호 재설정 - 인증번호 발송
const resetCodes = new Map(); // 비밀번호 재설정용 인증번호 저장

// 만료된 재설정 코드 주기적 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of resetCodes) {
    if (now > val.expiresAt) resetCodes.delete(key);
  }
}, 5 * 60 * 1000);

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: '이메일을 입력해주세요' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: '올바른 이메일 형식이 아닙니다' });
    }

    // 가입된 이메일인지 확인
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      // 보안상 가입 여부를 노출하지 않음
      return res.json({ success: true, message: '가입된 이메일이면 인증번호가 발송됩니다' });
    }

    // 6자리 인증번호 생성
    const code = String(crypto.randomInt(100000, 1000000));

    // 메모리에 저장 (5분 만료)
    resetCodes.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

    // 이메일 발송
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || '5늘5분 <onboarding@resend.dev>',
          to: [email],
          subject: '[5늘5분] 비밀번호 재설정 인증번호',
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #3D61F1; margin-bottom: 8px;">5늘5분</h2>
              <p style="color: #374151; font-size: 16px;">비밀번호 재설정 인증번호입니다.</p>
              <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
              </div>
              <p style="color: #9CA3AF; font-size: 14px;">이 인증번호는 5분간 유효합니다.</p>
            </div>
          `
        });
      } catch (emailError) {
        logger.error('비밀번호 재설정 이메일 발송 실패:', emailError);
      }
    } else {
      logger.info(`[개발 모드] 비밀번호 재설정 코드: ${email} → ${code}`);
    }

    res.json({
      success: true,
      message: '가입된 이메일이면 인증번호가 발송됩니다',
    });
  } catch (error) {
    logger.error('비밀번호 재설정 요청 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 비밀번호 재설정 - 새 비밀번호 설정
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: '모든 필드를 입력해주세요' });
    }

    // 인증번호 검증
    const stored = resetCodes.get(email);
    if (!stored) {
      return res.status(400).json({ success: false, error: '인증번호를 먼저 요청해주세요' });
    }
    if (Date.now() > stored.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ success: false, error: '인증번호가 만료되었습니다. 다시 요청해주세요' });
    }
    if (stored.code !== code) {
      return res.status(400).json({ success: false, error: '인증번호가 올바르지 않습니다' });
    }

    // 비밀번호 규칙 검증
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,16}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ success: false, error: '비밀번호는 8~16자, 영문, 숫자, 특수문자를 모두 포함해야 합니다' });
    }

    // 비밀번호 업데이트
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [passwordHash, email]);

    // 인증번호 소비
    resetCodes.delete(email);

    res.json({ success: true, message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' });
  } catch (error) {
    logger.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 토큰 갱신 API
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
    }

    // 현재 토큰 검증 (만료된 토큰도 디코딩 시도)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // 만료된 토큰은 디코딩만 하여 사용자 정보 추출
        decoded = jwt.decode(token);
        if (!decoded) {
          res.clearCookie('token');
          return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다' });
        }
        // 만료 후 7일 이상 경과한 토큰은 갱신 거부
        if (decoded.exp && (Date.now() / 1000 - decoded.exp) > 7 * 24 * 60 * 60) {
          res.clearCookie('token');
          return res.status(401).json({ success: false, error: '세션이 만료되었습니다. 다시 로그인해주세요' });
        }
      } else {
        res.clearCookie('token');
        return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다' });
      }
    }

    // 사용자가 여전히 DB에 존재하는지 확인
    const userCheck = await pool.query('SELECT id, email, nickname, is_admin FROM users WHERE id = $1', [decoded.userId]);
    if (userCheck.rows.length === 0) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, error: '사용자를 찾을 수 없습니다' });
    }

    const user = userCheck.rows[0];

    // 새 토큰 발급
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, nickname: user.nickname, isAdmin: user.is_admin || false },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.FORCE_SECURE_COOKIE === 'true',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
      path: '/'
    });

    res.json({
      success: true,
      message: '토큰이 갱신되었습니다',
      user: { id: user.id, email: user.email, nickname: user.nickname }
    });
  } catch (error) {
    logger.error('토큰 갱신 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 로그아웃 API
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.FORCE_SECURE_COOKIE === 'true',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, message: '로그아웃되었습니다' });
});

// ======================================================
// 카카오 OAuth 로그인
// ======================================================

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://itdokkaebi.com';

// GET /api/auth/kakao — 카카오 인증 페이지로 리다이렉트
router.get('/kakao', (req, res) => {
  if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
    logger.error('카카오 OAuth 환경변수 미설정');
    return res.status(500).json({ success: false, error: '카카오 로그인이 설정되지 않았습니다' });
  }

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
  res.redirect(kakaoAuthUrl);
});

// GET /api/auth/kakao/callback — 카카오 인증 콜백
router.get('/kakao/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      logger.error('카카오 콜백: code 파라미터 없음');
      return res.redirect(`${FRONTEND_URL}?kakao_login=error&message=${encodeURIComponent('인증 코드가 없습니다')}`);
    }

    // 1. 인가 코드 → 액세스 토큰 교환
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: KAKAO_REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      logger.error('카카오 토큰 교환 실패:', tokenData);
      return res.redirect(`${FRONTEND_URL}?kakao_login=error&message=${encodeURIComponent('카카오 인증에 실패했습니다')}`);
    }

    const accessToken = tokenData.access_token;

    // 2. 액세스 토큰으로 사용자 정보 조회
    const userInfoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const kakaoUser = await userInfoResponse.json();
    const kakaoId = String(kakaoUser.id);
    const kakaoNickname = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname || `사용자${kakaoId.slice(-4)}`;
    const kakaoProfileImage = kakaoUser.properties?.profile_image || kakaoUser.kakao_account?.profile?.profile_image_url || null;

    logger.info(`카카오 로그인 시도: id=${kakaoId}, nickname=${kakaoNickname}`);

    // 3. DB에서 기존 카카오 사용자 조회
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE provider = $1 AND social_id = $2',
      ['kakao', kakaoId]
    );

    let user;

    if (existingUser.rows.length > 0) {
      // 기존 카카오 사용자 → 로그인
      user = existingUser.rows[0];
      await pool.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      logger.info(`카카오 로그인 성공 (기존 사용자): id=${user.id}, nickname=${user.nickname}`);
    } else {
      // 신규 카카오 사용자 → 회원가입
      // 닉네임 중복 처리
      let finalNickname = kakaoNickname;
      const nicknameCheck = await pool.query(
        'SELECT id FROM users WHERE nickname = $1',
        [finalNickname]
      );
      if (nicknameCheck.rows.length > 0) {
        // 중복 시 랜덤 숫자 추가
        const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
        finalNickname = `${kakaoNickname}_${randomSuffix}`;
      }

      const newUser = await pool.query(
        'INSERT INTO users (nickname, provider, social_id, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
        [finalNickname, 'kakao', kakaoId, null]
      );
      user = newUser.rows[0];
      logger.info(`카카오 회원가입 완료: id=${user.id}, nickname=${user.nickname}`);
    }

    // 4. JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email || null,
        nickname: user.nickname,
        isAdmin: user.is_admin || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    // 5. httpOnly Cookie 설정
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.FORCE_SECURE_COOKIE === 'true',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
      path: '/',
    });

    // 6. 프론트엔드로 리다이렉트
    res.redirect(`${FRONTEND_URL}?kakao_login=success`);

  } catch (error) {
    logger.error('카카오 콜백 오류:', error);
    res.redirect(`${FRONTEND_URL}?kakao_login=error&message=${encodeURIComponent('카카오 로그인 중 오류가 발생했습니다')}`);
  }
});

module.exports = router;
