# 개발 로드맵 (비개발자 친화적)

## 📋 개발 순서 개요

**핵심 원칙**: 작은 단위로 나눠서 → 개발 → 테스트 → 검증 → 다음 단계

각 단계마다 **"이게 제대로 작동하는지"** 바로 확인할 수 있도록 설계했습니다.

---

## 🗄️ Phase 1: 데이터베이스 설계 및 생성 ✅ 완료

### 목표
- Users 테이블 생성
- DB 연결 테스트

### 작업 순서

#### 1-1. PostgreSQL 데이터베이스 생성
```sql
-- 터미널에서 PostgreSQL 접속
psql -U postgres

-- 데이터베이스 생성
CREATE DATABASE five_minute_brief;

-- 데이터베이스 선택
\c five_minute_brief
```

**검증 방법**: 
- `\l` 명령어로 데이터베이스 목록 확인
- `\c five_minute_brief`로 접속 성공 확인

#### 1-2. Users 테이블 생성
```sql
-- AUTH_SYSTEM.md의 스키마 그대로 실행
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
```

**검증 방법**:
```sql
-- 테이블 확인
\dt

-- 테이블 구조 확인
\d users

-- 테스트 데이터 삽입 (나중에 삭제)
INSERT INTO users (email, nickname, password_hash) 
VALUES ('test@test.com', '테스트', 'hashed_password_here');

-- 조회 확인
SELECT * FROM users;

-- 테스트 데이터 삭제
DELETE FROM users WHERE email = 'test@test.com';
```

**✅ 이 단계 완료 기준**: 
- 테이블이 생성되었고
- 테스트 데이터를 넣었다가 삭제할 수 있으면 OK

---

## 🔧 Phase 2: 백엔드 기본 설정 ✅ 완료

### 목표
- Node.js 프로젝트 초기화
- DB 연결 설정
- 간단한 테스트 API 만들기

### 작업 순서

#### 2-1. 프로젝트 초기화
```bash
# 프로젝트 폴더에서
npm init -y
npm install express pg dotenv bcrypt jsonwebtoken cookie-parser cors
npm install -D @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cookie-parser typescript ts-node nodemon
```

**검증 방법**:
- `package.json` 파일이 생성되었는지 확인
- `node_modules` 폴더가 생성되었는지 확인

#### 2-2. 환경변수 설정
```bash
# .env 파일 생성
touch .env
```

`.env` 파일 내용:
```
# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_NAME=five_minute_brief
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key_here_change_this

# 서버
PORT=3000
NODE_ENV=development
```

**검증 방법**:
- `.env` 파일이 생성되었는지 확인
- (나중에) 서버 실행 시 에러가 안 나면 OK

#### 2-3. DB 연결 테스트
```javascript
// server.js 또는 app.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// 연결 테스트
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DB 연결 실패:', err);
  } else {
    console.log('✅ DB 연결 성공:', res.rows[0]);
  }
});
```

**검증 방법**:
```bash
node server.js
# 콘솔에 "✅ DB 연결 성공" 메시지가 나오면 OK
```

**✅ 이 단계 완료 기준**: 
- 서버 실행 시 DB 연결 성공 메시지가 나오면 OK

---

## 🔐 Phase 3: 회원가입 API 개발 ✅ 완료

### 목표
- 회원가입 API 만들기
- 실제로 DB에 데이터가 저장되는지 확인

### 작업 순서

#### 3-1. 회원가입 API 기본 구조 ✅ 완료
```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

router.post('/signup', async (req, res) => {
  const { email, nickname, password } = req.body;
  
  // 1. 입력값 검증
  // 2. 이메일/닉네임 중복 확인
  // 3. 비밀번호 해싱
  // 4. DB 저장
  // 5. JWT 토큰 생성 및 httpOnly Cookie 설정
  // 6. 응답 반환
});

module.exports = router;
```

**검증 방법**: 
- 서버 실행 후 테스트 페이지 또는 curl로 테스트
- `http://localhost:3000/test-signup.html` 웹 페이지에서 테스트 가능

#### 3-2. 입력값 유효성 검증 및 중복 확인 로직 ✅ 완료
```javascript
// 1. 필수 필드 검증
if (!email || !nickname || !password) {
  return res.status(400).json({ 
    success: false,
    error: '모든 필드를 입력해주세요' 
  });
}

// 2. 이메일 형식 검증
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ 
    success: false,
    error: '올바른 이메일 형식이 아닙니다' 
  });
}

// 3. 닉네임 길이 검증 (2-20자)
if (nickname.length < 2 || nickname.length > 20) {
  return res.status(400).json({ 
    success: false,
    error: '닉네임은 2자 이상 20자 이하여야 합니다' 
  });
}

// 4. 비밀번호 길이 검증 (최소 8자)
if (password.length < 8) {
  return res.status(400).json({ 
    success: false,
    error: '비밀번호는 최소 8자 이상이어야 합니다' 
  });
}

// 5. 이메일 중복 확인
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

// 6. 닉네임 중복 확인
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
```

**검증 방법**:
```bash
# 1. 정상 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","nickname":"테스트","password":"test1234"}'

# 2. 중복 이메일로 재시도 → 에러 확인
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","nickname":"다른닉네임","password":"test1234"}'
# 예상 응답: {"success":false,"error":"이미 사용 중인 이메일입니다"}

# 3. 중복 닉네임으로 재시도 → 에러 확인
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","nickname":"테스트","password":"test1234"}'
# 예상 응답: {"success":false,"error":"이미 사용 중인 닉네임입니다"}

# 4. 잘못된 이메일 형식 → 에러 확인
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","nickname":"테스트","password":"test1234"}'
# 예상 응답: {"success":false,"error":"올바른 이메일 형식이 아닙니다"}

# 5. 짧은 비밀번호 → 에러 확인
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@test.com","nickname":"테스트2","password":"1234"}'
# 예상 응답: {"success":false,"error":"비밀번호는 최소 8자 이상이어야 합니다"}
```

**✅ 완료 기준**: 
- 모든 유효성 검증이 작동하고
- 중복 확인이 정확히 작동하며
- 적절한 에러 메시지가 반환되면 OK

#### 3-3. 비밀번호 해싱 및 저장 ✅ 완료
```javascript
// 비밀번호 해싱 (bcrypt)
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

// DB 저장
const result = await pool.query(
  'INSERT INTO users (email, nickname, password_hash) VALUES ($1, $2, $3) RETURNING id, email, nickname, created_at',
  [email, nickname, passwordHash]
);

const user = result.rows[0];
```

**검증 방법**:
```bash
# 회원가입 요청
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","nickname":"테스트","password":"test1234"}'

# 성공 응답 확인
# DB에서 직접 확인 (비밀번호는 해시값으로 저장됨)
export PATH="/opt/homebrew/Cellar/postgresql@15/15.15_1/bin:$PATH"
psql -U nahyojin -d five_minute_brief -c "SELECT id, email, nickname, LEFT(password_hash, 30) as password_hash_preview FROM users;"
```

**✅ 완료 기준**: 
- 회원가입 요청 시 성공 응답 (201 Created)
- DB에 데이터가 저장되고
- 비밀번호가 해시값(`$2b$10$...`)으로 저장되면 OK

#### 3-4. JWT 토큰 생성 및 httpOnly Cookie 설정 ✅ 완료
```javascript
// JWT 토큰 생성
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    nickname: user.nickname
  },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);

// httpOnly Cookie 설정
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
  path: '/'
});

// 응답 반환
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
```

**검증 방법**:
```bash
# 회원가입 요청 후 쿠키 확인
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","nickname":"테스트","password":"test1234"}' \
  -c /tmp/cookies.txt -v

# 쿠키 파일 확인
cat /tmp/cookies.txt | grep token

# 또는 브라우저에서 http://localhost:3000/test-signup.html 접속
# 개발자 도구 → Application → Cookies에서 token 확인
```

**✅ 완료 기준**: 
- JWT 토큰이 생성되고
- httpOnly Cookie로 설정되며
- 브라우저 쿠키에서 확인 가능하면 OK

---

## 🎫 Phase 4: JWT 토큰 발급 및 httpOnly Cookie 설정 ✅ 완료

### 목표
- 회원가입 시 JWT 토큰 생성
- httpOnly cookie로 토큰 전송

**✅ 완료 상태**: Phase 3에서 함께 구현 완료

### 작업 순서

#### 4-1. JWT 토큰 생성
```javascript
const jwt = require('jsonwebtoken');

// 회원가입 성공 후
const token = jwt.sign(
  {
    userId: result.rows[0].id,
    email: result.rows[0].email,
    nickname: result.rows[0].nickname
  },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);
```

**검증 방법**:
- 콘솔에 토큰이 출력되는지 확인
- https://jwt.io 에서 토큰 디코딩해서 payload 확인

#### 4-2. httpOnly Cookie 설정
```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// 회원가입 응답 시
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
  path: '/'
});

res.json({
  success: true,
  user: { ... }
});
```

**검증 방법**:
```bash
# Postman에서 요청 후
# Response Headers에서 Set-Cookie 확인
# 또는 브라우저 개발자 도구 → Application → Cookies 확인
```

**✅ 이 단계 완료 기준**: 
- 응답 헤더에 `Set-Cookie`가 있고
- 브라우저 쿠키에 토큰이 저장되면 OK

**✅ 완료 확인**:
- [x] JWT 토큰 생성 (90일 유효)
- [x] httpOnly Cookie 설정
- [x] 브라우저 쿠키에서 토큰 확인 완료
- [x] jwt.io에서 Payload 확인 완료

---

## 🔑 Phase 5: 로그인 API 개발 ✅ 완료

### 목표
- 로그인 API 만들기
- 비밀번호 검증
- JWT 토큰 발급

**✅ 완료 상태**: 로그인 API 구현 완료

### 작업 순서

#### 5-1. 로그인 API 기본 구조
```javascript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 1. 입력값 검증
  // 2. 이메일로 사용자 조회
  // 3. 비밀번호 검증
  // 4. JWT 토큰 생성 및 쿠키 설정
  // 5. 응답 반환
});
```

#### 5-2. 비밀번호 검증
```javascript
// 사용자 조회
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

if (result.rows.length === 0) {
  return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
}

const user = result.rows[0];

// 비밀번호 검증
const isValid = await bcrypt.compare(password, user.password_hash);
if (!isValid) {
  return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
}
```

**검증 방법**:
```bash
# 잘못된 비밀번호로 시도 → 에러 확인
# 올바른 비밀번호로 시도 → 성공 확인
```

#### 5-3. 로그인 성공 처리
```javascript
// JWT 토큰 생성
const token = jwt.sign(
  { userId: user.id, email: user.email, nickname: user.nickname },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);

// last_login_at 업데이트
await pool.query(
  'UPDATE users SET last_login_at = NOW() WHERE id = $1',
  [user.id]
);

// httpOnly cookie 설정
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 90 * 24 * 60 * 60 * 1000,
  path: '/'
});

res.json({
  success: true,
  user: {
    id: user.id,
    email: user.email,
    nickname: user.nickname
  }
});
```

**검증 방법**:
- 로그인 성공 시 쿠키가 설정되는지 확인
- DB의 `last_login_at`이 업데이트되는지 확인

**✅ 이 단계 완료 기준**: 
- 올바른 이메일/비밀번호로 로그인 성공
- 쿠키에 토큰이 저장되면 OK

**✅ 완료 확인**:
- [x] 로그인 API 구현 완료 (`POST /api/auth/login`)
- [x] 이메일/비밀번호 검증
- [x] 비밀번호 검증 (bcrypt.compare)
- [x] JWT 토큰 생성 및 httpOnly Cookie 설정
- [x] last_login_at 업데이트
- [x] 웹 테스트 페이지 제공 (`/test-login.html`)
- [x] curl 테스트 스크립트 제공 (`test-login.sh`)

---

## 🛡️ Phase 6: 인증 미들웨어 개발 ✅ 완료

### 목표
- 토큰 검증 미들웨어 만들기
- 보호된 API 테스트

**✅ 완료 상태**: 인증 미들웨어 및 보호된 API 구현 완료

### 작업 순서

#### 6-1. 토큰 검증 미들웨어
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '토큰이 없습니다' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ error: '유효하지 않은 토큰' });
  }
}

module.exports = verifyToken;
```

#### 6-2. 보호된 API 테스트
```javascript
// routes/user.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

// 프로필 조회 (보호된 API)
router.get('/profile', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
```

**검증 방법**:
```bash
# 토큰 없이 요청 → 401 에러
curl http://localhost:3000/api/user/profile

# 로그인 후 쿠키 포함해서 요청 → 성공
curl http://localhost:3000/api/user/profile --cookie "token=..."
```

**✅ 이 단계 완료 기준**: 
- 토큰 없이 요청 시 401 에러
- 토큰 있으면 사용자 정보 반환되면 OK

**✅ 완료 확인**:
- [x] 인증 미들웨어 구현 완료 (`middleware/auth.js`)
- [x] 보호된 API 구현 (`/api/user/profile`, `/api/user/me`)
- [x] 토큰 검증 동작 확인
- [x] 웹 테스트 페이지 제공 (`/test-profile.html`)
- [x] curl 테스트 스크립트 제공 (`test-middleware.sh`)
- [x] 로그오프 상태에서 토큰 검증 확인 (401 에러)
- [x] 로그온 상태에서 토큰 검증 확인 (성공)

---

## 🎨 Phase 7: 프론트엔드 기본 설정 ✅ 완료

### 목표
- React 프로젝트 초기화
- API 연동 테스트

**✅ 완료 상태**: React 프로젝트 생성 및 API 연동 설정 완료

### 작업 순서

#### 7-1. React 프로젝트 생성
```bash
# Vite로 React 프로젝트 생성
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios
```

**검증 방법**:
- `npm run dev` 실행
- 브라우저에서 `http://localhost:5173` 접속
- 기본 화면이 보이면 OK

#### 7-2. Axios 설정
```typescript
// src/lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true, // httpOnly cookie 전송
});

export default api;
```

**검증 방법**:
- API 호출 시 CORS 에러가 안 나면 OK (백엔드 CORS 설정 필요)

**✅ 완료 확인**:
- [x] React 프로젝트 생성 (Vite + TypeScript)
- [x] Axios 설치 및 설정 (`src/lib/axios.ts`)
- [x] API 호출 함수 생성 (`src/lib/api.ts`)
- [x] API 테스트 페이지 구현 (`App.tsx`)
- [x] 개발 서버 실행 확인 (`http://localhost:5173`)
- [x] API 연동 테스트 완료 (콘솔에서 응답 확인)
- [x] 에러 처리 확인 (401 에러 정상 작동)

**✅ Phase 7 완료 상태:**
- API 연동이 정상 작동함 (콘솔에서 응답 확인)
- 401 에러 등 에러 처리가 정상 작동함
- 화면 표시 문제는 Phase 8에서 실제 입력 폼 구현 시 해결 예정

---

## 📝 Phase 8: 회원가입 폼 개발

### 목표
- 회원가입 UI 만들기
- 이메일 도메인 자동완성
- API 연동

### 작업 순서

#### 8-1. 기본 폼 구조
```tsx
// src/pages/Signup.tsx
import { useState } from 'react';
import api from '../lib/axios';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // API 호출
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드 */}
    </form>
  );
}
```

**검증 방법**:
- 폼이 화면에 보이고
- 입력이 가능하면 OK

#### 8-2. 이메일 도메인 자동완성
```tsx
const commonDomains = [
  'gmail.com',
  'naver.com',
  'daum.net',
  'kakao.com',
  // ...
];

const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);

const handleEmailChange = (value: string) => {
  setEmail(value);
  
  if (value.includes('@') && !value.includes('@', value.indexOf('@') + 1)) {
    const [localPart, domain] = value.split('@');
    if (localPart && !domain) {
      setDomainSuggestions(commonDomains);
    } else if (domain) {
      const matches = commonDomains.filter(d => d.startsWith(domain));
      setDomainSuggestions(matches);
    }
  } else {
    setDomainSuggestions([]);
  }
};
```

**검증 방법**:
- 이메일 입력 시 `@` 입력 후 도메인 제안이 나타나면 OK

#### 8-3. API 연동
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const response = await api.post('/auth/signup', {
      email,
      nickname,
      password
    });
    
    // 성공 시 메인 페이지로 이동
    window.location.href = '/';
  } catch (error) {
    // 에러 처리
    console.error('회원가입 실패:', error);
  }
};
```

**검증 방법**:
- 회원가입 성공 시 메인 페이지로 이동
- 브라우저 쿠키에 토큰이 저장되면 OK

**✅ 이 단계 완료 기준**: 
- 회원가입 폼에서 가입 성공
- 자동 로그인 상태가 되면 OK

---

## 🔐 Phase 9: 로그인 폼 개발

### 목표
- 로그인 UI 만들기
- API 연동

### 작업 순서

#### 9-1. 로그인 폼
```tsx
// src/pages/Login.tsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    
    // 성공 시 메인 페이지로 이동
    window.location.href = '/';
  } catch (error) {
    // 에러 처리
  }
};
```

**검증 방법**:
- 로그인 성공 시 메인 페이지로 이동
- 쿠키에 토큰이 저장되면 OK

**✅ 이 단계 완료 기준**: 
- 로그인 성공
- 자동 로그인 상태 유지되면 OK

---

## 📊 개발 진행 체크리스트

### Phase 1: 데이터베이스 ✅ 완료
- [x] PostgreSQL 데이터베이스 생성
- [x] Users 테이블 생성
- [x] 테스트 데이터 삽입/삭제 확인

### Phase 2: 백엔드 기본 설정 ✅ 완료
- [x] Node.js 프로젝트 초기화
- [x] 환경변수 설정
- [x] DB 연결 테스트

### Phase 3: 회원가입 API ✅ 완료
- [x] 회원가입 API 기본 구조
- [x] 입력값 유효성 검증 (이메일 형식, 닉네임 길이, 비밀번호 길이)
- [x] 이메일 중복 확인 로직
- [x] 닉네임 중복 확인 로직
- [x] 비밀번호 해싱 및 저장
- [x] JWT 토큰 생성 (90일 유효)
- [x] httpOnly Cookie 설정
- [x] 실제 DB 저장 확인
- [x] 웹 테스트 페이지 제공 (`/test-signup.html`)

**참고**: Phase 4 (JWT 토큰)는 Phase 3에 포함되어 완료됨 ✅

### Phase 5: 로그인 API ✅ 완료
- [x] 로그인 API 기본 구조
- [x] 비밀번호 검증
- [x] 로그인 성공 처리
- [x] JWT 토큰 생성 및 httpOnly Cookie 설정
- [x] last_login_at 업데이트

### Phase 6: 인증 미들웨어 ✅ 완료
- [x] 토큰 검증 미들웨어
- [x] 보호된 API 구현 (`/api/user/profile`, `/api/user/me`)
- [x] 토큰 검증 동작 확인
- [x] 웹 테스트 페이지 제공

### Phase 7: 프론트엔드 기본 설정 ✅ 완료
- [x] React 프로젝트 생성 (Vite + TypeScript)
- [x] Axios 설치 및 설정
- [x] API 호출 함수 생성
- [x] API 테스트 페이지 구현
- [x] API 연동 테스트 완료 (콘솔에서 응답 확인)
- [x] 에러 처리 확인 (401 에러 정상 작동)

### Phase 8: 회원가입 폼
- [ ] 기본 폼 구조
- [ ] 이메일 도메인 자동완성
- [ ] API 연동

### Phase 9: 로그인 폼
- [ ] 로그인 폼
- [ ] API 연동

---

## 💡 검증 팁

### 각 단계마다 확인할 것

1. **에러 메시지 확인**
   - 콘솔 에러 확인
   - API 응답 에러 확인

2. **데이터 확인**
   - DB에서 직접 데이터 확인
   - 브라우저 개발자 도구에서 쿠키 확인

3. **단계별 테스트**
   - 한 번에 하나씩만 테스트
   - 이전 단계가 완전히 작동하는지 확인 후 다음 단계로

### 문제 발생 시

1. **에러 메시지 복사**
2. **어느 단계에서 발생했는지 확인**
3. **이전 단계로 돌아가서 다시 확인**

---

## 🚀 다음 단계 (인증 완료 후)

인증 시스템이 완성되면:
1. 메인 피드 개발
2. 뉴스 API 연동
3. 카테고리 필터링
4. 푸시 알림 설정

---

**이 순서대로 하나씩 진행하면, 각 단계마다 검증하면서 개발할 수 있습니다!**
