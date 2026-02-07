// Express 서버 기본 설정
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // 프론트엔드 주소 + 테스트 페이지
  credentials: true // httpOnly cookie 전송 허용
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

// 인증 라우트
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 사용자 라우트 (보호된 API)
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});

// DB 연결 테스트 (서버 시작 시 자동 실행)
const pool = require('./config/db');
