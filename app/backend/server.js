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

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 헤더 설정 (#3)
app.use(helmet());

// Rate Limiting 설정 (#2)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10회 시도
  message: { 
    success: false, 
    error: '너무 많은 요청입니다. 15분 후 다시 시도해주세요.' 
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

// 정적 파일 제공 (테스트 페이지)
app.use(express.static('public'));

// 기본 라우트 (테스트용)
app.get('/', (req, res) => {
  res.json({
    message: '오늘5분 백엔드 API 서버',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 인증 라우트 (Rate Limiting 적용)
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

// 글로벌 에러 핸들러 (#7)
app.use((err, req, res, next) => {
  // 프로덕션에서는 상세 에러 숨기기
  if (process.env.NODE_ENV !== 'production') {
    console.error('상세 오류:', err);
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? '서버 오류가 발생했습니다' 
      : err.message
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});

// DB 연결 테스트 (서버 시작 시 자동 실행)
const pool = require('./config/db');

