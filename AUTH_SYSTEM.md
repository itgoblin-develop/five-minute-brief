# 회원가입 및 로그인 시스템 설계

## 📋 개요

- **회원가입**: 이메일, 닉네임, 비밀번호 입력 (이메일 인증 없음)
- **자동 로그인**: 회원가입 완료 시 즉시 로그인 상태로 전환
- **세션 관리**: JWT 토큰 기반 인증 (장기 유지, 최대 90일)
- **보안**: 비밀번호 해싱, 입력 시 마스킹 처리
- **이메일 자동완성**: 프론트엔드에서 도메인 자동완성 기능 제공

---

## 🗄️ 데이터베이스 설계

### Users 테이블

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt 해시값
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
```

### 스키마 검토 결과

**✅ 현재 스키마 적합성 확인**

PRD 요구사항과 비교:
- ✅ **이메일**: 회원가입 필수 항목 (email 필드)
- ✅ **닉네임**: 회원가입 필수 항목 (nickname 필드)
- ✅ **비밀번호**: 회원가입 필수 항목 (password_hash 필드)
- ✅ **세션 관리**: JWT 토큰 기반 (별도 테이블 불필요)
- ✅ **알림 설정**: 별도 테이블 권장 (users_settings 또는 user_preferences)

**추가 고려사항:**
- 알림 설정(notification_time, push_enabled)은 별도 테이블로 분리 권장
- 향후 확장: 좋아요 내역, 북마크, 읽은 뉴스 기록 등은 별도 테이블로 관리

### 필요성
- **계정별 DB 관리 필요**: 각 사용자의 정보, 좋아요 내역, 알림 설정 등을 저장하기 위해 Users 테이블 필수
- **확장성**: 향후 사용자별 맞춤 뉴스 추천, 읽은 뉴스 기록 등을 위한 기반

---

## 🔐 보안 정책

### 1. 비밀번호 해싱
- **bcrypt** 사용 (salt 자동 생성, 비용 계수 10-12)
- 평문 비밀번호는 절대 DB에 저장하지 않음
- 로그인 시 해시값 비교로 검증

### 2. 비밀번호 입력 마스킹
- **프론트엔드**: `<input type="password">` 사용
- 입력 시 자동으로 `•` 또는 `*`로 표시
- 개발자 도구에서도 평문 노출 방지

### 3. JWT 토큰 보안
- **비밀키**: 환경변수(`JWT_SECRET`)로 관리
- **토큰 만료**: **90일 (7,776,000초)** - 장기 세션 유지
- **개인정보 보안 고려사항**:
  - 토큰에 민감정보(비밀번호 등) 포함 금지
  - 토큰 만료 시 자동 로그아웃 처리
  - 사용자 요청 시 즉시 토큰 무효화 가능 (로그아웃)
  - 보안 사고 시 전체 토큰 무효화 가능 (서버 측 블랙리스트)
- **Refresh Token**: 선택적 구현 (추후 확장)

---

## 🔄 회원가입 프로세스

### 1. 프론트엔드 (회원가입 폼)

```
[회원가입 페이지]
├── 이메일 입력 필드 (type="email")
│   └── 도메인 자동완성 기능 (예: @gmail.com, @naver.com 등)
├── 닉네임 입력 필드 (type="text")
├── 비밀번호 입력 필드 (type="password") ← 마스킹 자동 적용
├── 비밀번호 확인 필드 (type="password") ← 마스킹 자동 적용
└── [회원가입] 버튼
```

#### 이메일 도메인 자동완성 구현 (프론트엔드)

```javascript
// 일반적인 이메일 도메인 목록
const commonDomains = [
  'gmail.com',
  'naver.com',
  'daum.net',
  'kakao.com',
  'yahoo.com',
  'outlook.com',
  'hanmail.net'
];

// 이메일 입력 필드에서 '@' 입력 시 자동완성 제안
function handleEmailInput(value) {
  if (value.includes('@') && !value.includes('@', value.indexOf('@') + 1)) {
    const [localPart, domain] = value.split('@');
    if (localPart && !domain) {
      // '@' 입력 후 도메인 미입력 시 자동완성 제안
      showDomainSuggestions(commonDomains);
    } else if (domain) {
      // 부분 입력된 도메인과 매칭되는 제안 필터링
      const matches = commonDomains.filter(d => d.startsWith(domain));
      showDomainSuggestions(matches);
    }
  }
}
```

### 2. 유효성 검증 (프론트엔드)

```javascript
// 클라이언트 사이드 검증
- 이메일: 이메일 형식 검증 (정규식)
- 닉네임: 2-20자, 특수문자 제한
- 비밀번호: 최소 8자, 영문+숫자 조합
- 비밀번호 확인: 일치 여부 확인
```

### 3. API 요청

```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "nickname": "사용자닉네임",
  "password": "password123"
}
```

### 4. 백엔드 처리 로직

```
1. 입력값 유효성 검증
   - 이메일 형식 확인
   - 닉네임 중복 확인 (DB 조회)
   - 이메일 중복 확인 (DB 조회)

2. 비밀번호 해싱
   - bcrypt.hash(password, saltRounds=10)
   - 해시값만 DB에 저장

3. 사용자 생성
   - INSERT INTO users (email, nickname, password_hash)
   - VALUES (email, nickname, hashed_password)

4. JWT 토큰 생성
   - payload: { userId, email, nickname }
   - secret: JWT_SECRET
   - expiresIn: 90d (90일)

5. 응답 반환
   - JWT 토큰 (httpOnly cookie로 설정)
   - 사용자 정보 (닉네임, 이메일)
   - 자동 로그인 상태로 전환
```

**참고**: 이메일 인증은 MVP에서 제외 (회원가입 즉시 활성화)

### 5. API 응답

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "사용자닉네임"
  }
}
```

### 6. 프론트엔드 처리 (자동 로그인)

```javascript
// 회원가입 성공 시
1. JWT 토큰을 localStorage 또는 httpOnly cookie에 저장
2. 사용자 정보를 상태 관리(Redux/Context)에 저장
3. 메인 페이지로 리다이렉트
4. 이후 모든 API 요청에 토큰 포함
```

---

## 🔑 로그인 프로세스

### 1. 프론트엔드 (로그인 폼)

```
[로그인 페이지]
├── 이메일 입력 필드 (type="email")
├── 비밀번호 입력 필드 (type="password") ← 마스킹 자동 적용
└── [로그인] 버튼
```

### 2. API 요청

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. 백엔드 처리 로직

```
1. 이메일로 사용자 조회
   - SELECT * FROM users WHERE email = email
   - 사용자 없으면 401 에러

2. 비밀번호 검증
   - bcrypt.compare(password, user.password_hash)
   - 불일치 시 401 에러

3. JWT 토큰 생성
   - payload: { userId, email, nickname }
   - secret: JWT_SECRET
   - expiresIn: 24h

4. last_login_at 업데이트
   - UPDATE users SET last_login_at = NOW() WHERE id = userId

5. 응답 반환
   - JWT 토큰
   - 사용자 정보
```

### 4. API 응답

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "사용자닉네임"
  }
}
```

### 5. 프론트엔드 처리 (세션 유지)

```javascript
// httpOnly cookie 사용 시
// 1. axios 설정 (모든 요청에 쿠키 포함)
axios.defaults.withCredentials = true;

// 2. 로그인 성공 시
// - 토큰은 서버에서 httpOnly cookie로 설정됨 (프론트엔드에서 별도 저장 불필요)
// - 사용자 정보만 상태 관리에 저장
const userInfo = response.data.user;
setUser(userInfo);  // Redux/Context/Zustand 등

// 3. 메인 페이지로 리다이렉트
router.push('/');

// 4. 이후 모든 API 요청
// - 쿠키가 자동으로 포함됨 (별도 헤더 설정 불필요)
axios.get('/api/news', { withCredentials: true });
```

**참고**: httpOnly cookie 사용 시 프론트엔드에서 토큰에 직접 접근할 수 없으므로, 로그아웃은 API 호출로만 가능합니다.

---

## 🎫 JWT 토큰 관리

### 1. 토큰 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 1,
    "email": "user@example.com",
    "nickname": "사용자닉네임",
    "iat": 1234567890,  // 발급 시간
    "exp": 1242343890   // 만료 시간 (90일 후)
  },
  "signature": "HMACSHA256(base64UrlEncode(header) + '.' + base64UrlEncode(payload), secret)"
}
```

### 2. 토큰 저장 방식

#### 옵션 1: localStorage (현재 방식)
```javascript
// 장점: 구현 간단
// 단점: XSS 공격에 취약
localStorage.setItem('token', token);
```

#### 옵션 2: httpOnly Cookie (권장, AWS 배포 시)

**Express.js 구현 예시:**

```javascript
// 1. cookie-parser 미들웨어 설치
// npm install cookie-parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// 2. 로그인/회원가입 성공 시 토큰을 쿠키로 설정
app.post('/api/auth/login', async (req, res) => {
  // ... 로그인 로직 ...
  
  const token = jwt.sign(
    { userId: user.id, email: user.email, nickname: user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
  
  // httpOnly cookie로 토큰 설정
  res.cookie('token', token, {
    httpOnly: true,        // JavaScript 접근 불가 (XSS 방지)
    secure: process.env.NODE_ENV === 'production',  // HTTPS에서만 전송
    sameSite: 'strict',    // CSRF 방지
    maxAge: 90 * 24 * 60 * 60 * 1000,  // 90일 (밀리초)
    path: '/'              // 모든 경로에서 사용 가능
  });
  
  res.json({
    success: true,
    user: { id: user.id, email: user.email, nickname: user.nickname }
  });
});

// 3. 토큰 검증 미들웨어 (쿠키에서 토큰 읽기)
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '토큰이 없습니다' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰' });
  }
}

// 4. 로그아웃 시 쿠키 삭제
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({ success: true });
});
```

**AWS 배포 시 고려사항:**
- **ELB/ALB 사용 시**: `secure: true` 필수 (HTTPS)
- **도메인 설정**: `domain` 옵션으로 쿠키 도메인 지정 가능
- **CORS 설정**: 프론트엔드 도메인과 백엔드 도메인이 다를 경우 CORS 설정 필요
  ```javascript
  app.use(cors({
    origin: 'https://your-frontend-domain.com',
    credentials: true  // 쿠키 전송 허용
  }));
  ```
- **프론트엔드 요청**: axios에서 `withCredentials: true` 설정
  ```javascript
  axios.defaults.withCredentials = true;
  ```

**장점:**
- XSS 공격 방지 (JavaScript로 쿠키 접근 불가)
- 자동으로 모든 요청에 포함 (별도 헤더 설정 불필요)
- 보안성 향상

**단점:**
- CSRF 공격 가능성 (sameSite: 'strict'로 완화)
- 프론트엔드에서 토큰 직접 접근 불가 (로그아웃은 API 호출 필요)

### 3. 토큰 검증 미들웨어

```javascript
// 모든 보호된 API 요청에 적용
// httpOnly cookie와 Authorization 헤더 모두 지원
function verifyToken(req, res, next) {
  // 1순위: httpOnly cookie에서 토큰 읽기
  // 2순위: Authorization 헤더에서 토큰 읽기 (하위 호환성)
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '토큰이 없습니다' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // userId, email, nickname
    next();
  } catch (error) {
    // 토큰 만료 시 쿠키도 삭제
    if (error.name === 'TokenExpiredError') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }
    return res.status(401).json({ error: '유효하지 않은 토큰' });
  }
}
```

### 4. 토큰 갱신 (선택적)

```javascript
// 90일 장기 토큰 사용 시 갱신 불필요
// 하지만 보안 강화를 위해 선택적 구현 가능

// 백엔드: 토큰 갱신 API
app.post('/api/auth/refresh', verifyToken, (req, res) => {
  // 기존 토큰이 유효하면 새 토큰 발급
  const newToken = jwt.sign(
    { userId: req.user.userId, email: req.user.email, nickname: req.user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
  
  res.cookie('token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 90 * 24 * 60 * 60 * 1000,
    path: '/'
  });
  
  res.json({ success: true });
});
```

---

## 🛡️ 보안 고려사항

### 1. 비밀번호 정책

```
- 최소 8자 이상
- 영문 대소문자 + 숫자 조합
- 특수문자 권장 (선택)
- 일반적인 비밀번호 금지 (예: "password123")
```

### 2. 이메일 인증
- **MVP에서는 제외**: 회원가입 즉시 계정 활성화
- 향후 v2.0에서 선택적 구현 가능

### 3. Rate Limiting

```
로그인/회원가입 API에 제한:
- IP당 5회/분 초과 시 429 에러
- 무차별 대입 공격 방지
```

### 4. CORS 설정

```
프론트엔드 도메인만 허용:
Access-Control-Allow-Origin: https://yourdomain.com
```

---

## 📡 API 엔드포인트 설계

### 회원가입
```
POST /api/auth/signup
Body: { email, nickname, password }
Response: { success, token, user }
```

### 로그인
```
POST /api/auth/login
Body: { email, password }
Response: { success, token, user }
```

### 로그아웃
```
POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { success }
```

### 토큰 검증
```
GET /api/auth/verify
Headers: { Authorization: Bearer <token> }
Response: { valid, user }
```

### 사용자 정보 조회
```
GET /api/user/profile
Headers: { Authorization: Bearer <token> }
Response: { user }
```

---

## 🔄 전체 플로우 다이어그램

### 회원가입 플로우
```
[사용자] → [회원가입 폼 입력] → [API 요청]
    ↓
[서버] → [유효성 검증] → [중복 확인] → [비밀번호 해싱]
    ↓
[DB 저장] → [JWT 토큰 생성] → [응답 반환]
    ↓
[프론트엔드] → [토큰 저장] → [자동 로그인] → [메인 페이지]
```

### 로그인 플로우
```
[사용자] → [로그인 폼 입력] → [API 요청]
    ↓
[서버] → [사용자 조회] → [비밀번호 검증] → [JWT 토큰 생성]
    ↓
[응답 반환] → [프론트엔드] → [토큰 저장] → [세션 유지]
```

### 인증된 요청 플로우
```
[프론트엔드] → [API 요청 + 토큰] → [서버]
    ↓
[토큰 검증] → [사용자 정보 추출] → [비즈니스 로직] → [응답]
```

---

## 📝 구현 체크리스트

### 백엔드
- [ ] Users 테이블 생성
- [ ] 비밀번호 해싱 (bcrypt)
- [ ] JWT 토큰 생성/검증
- [ ] 회원가입 API
- [ ] 로그인 API
- [ ] 토큰 검증 미들웨어
- [ ] Rate Limiting
- [ ] CORS 설정

### 프론트엔드
- [ ] 회원가입 폼 (이메일, 닉네임, 비밀번호)
- [ ] **이메일 도메인 자동완성 기능**
- [ ] 로그인 폼 (이메일, 비밀번호)
- [ ] 비밀번호 마스킹 (type="password")
- [ ] 유효성 검증
- [ ] httpOnly cookie 사용 시 `withCredentials: true` 설정
- [ ] 자동 로그인 처리
- [ ] API 요청 시 쿠키 자동 포함 (axios 설정)
- [ ] 토큰 만료 시 로그아웃 처리

---

## 🔧 기술 스택 예시

### 백엔드
- **Node.js + Express** 또는 **Python + FastAPI**
- **JWT**: `jsonwebtoken` (Node.js) / `PyJWT` (Python)
- **비밀번호 해싱**: `bcrypt` (Node.js) / `bcrypt` (Python)
- **DB**: PostgreSQL (이미 사용 중)

### 프론트엔드
- **React** (ShadCN UI 컴포넌트 사용)
- **Axios**: API 요청
- **Form Validation**: React Hook Form + Zod

---

## 📌 주의사항

1. **비밀번호는 절대 평문으로 저장하지 않음**
2. **JWT Secret은 환경변수로 관리**
3. **토큰은 HTTPS에서만 전송** (프로덕션 환경)
4. **프론트엔드에서 비밀번호는 type="password"로 마스킹**
5. **회원가입/로그인 API는 Rate Limiting 필수**
6. **httpOnly cookie 사용 시 CORS 설정 필수** (`credentials: true`)
7. **토큰 만료 시간 90일**: 보안 사고 시 즉시 무효화 가능하도록 모니터링 필요
8. **개인정보 보안**: 토큰에 민감정보 포함 금지, 사용자 요청 시 즉시 로그아웃 가능
