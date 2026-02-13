// Express 서버 기본 설정
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// 필수 환경 변수 검증 (#5)
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 필수 환경 변수 누락: ${envVar}`);
    process.exit(1);
  }
}

const pool = require('./config/db');
const logger = require('./config/logger');
const { initSentry } = require('./config/sentry');
const Sentry = require('@sentry/node');
const app = express();
const PORT = process.env.PORT || 3000;

// Nginx 프록시 뒤에서 동작 (X-Forwarded-For 신뢰)
app.set('trust proxy', 1);

// Sentry 초기화 (가장 먼저)
initSentry(app);

// 보안 헤더 설정 (#3) — HTTPS 없이 HSTS 활성화하면 브라우저 접속 불가
app.use(helmet());

// Rate Limiting 설정 (#2)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 30, // 최대 30회 시도 (비로그인 시 자동 refresh 호출 포함)
  message: {
    success: false,
    error: '너무 많은 요청입니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 전체 API Rate Limiting (보안 강화)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 300, // IP당 15분에 300회
  message: {
    success: false,
    error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS 설정 개선 (#4)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // 서버 간 요청 (origin이 없음) 또는 허용된 origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = { method: req.method, url: req.originalUrl, status: res.statusCode, duration: `${duration}ms` };
    if (res.statusCode >= 400) {
      logger.warn('request', logData);
    } else {
      logger.info('request', logData);
    }
  });
  next();
});

// 정적 파일 제공 (테스트 페이지)
app.use(express.static('public'));

// 썸네일 이미지 캐시 서빙
app.use('/thumbnails', express.static('public/thumbnails', {
  maxAge: '7d',
  immutable: true,
}));

// 기본 라우트 (테스트용)
app.get('/', (req, res) => {
  res.json({
    message: '오늘5분 백엔드 API 서버',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check 엔드포인트 (민감 정보 최소화)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

// 전체 /api 경로에 rate limiting 적용
app.use('/api', apiLimiter);

// 인증 라우트 (추가 Rate Limiting 적용)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authLimiter, authRoutes);

// 사용자 라우트 (보호된 API)
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// 뉴스 라우트
const newsRoutes = require('./routes/news');
app.use('/api/news', newsRoutes);

// 소셜 인터랙션 라우트 (좋아요/북마크/댓글)
const interactionRoutes = require('./routes/interaction');
app.use('/api', interactionRoutes);

// 통계 라우트
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

// Sentry 에러 핸들러 (글로벌 에러 핸들러 전에 위치)
Sentry.setupExpressErrorHandler(app);

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? '서버 오류가 발생했습니다'
      : err.message
  });
});

// 서버 시작
app.listen(PORT, () => {
  logger.info(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});

// DB 연결 테스트 (서버 시작 시 자동 실행)
// pool은 상단에서 require됨

