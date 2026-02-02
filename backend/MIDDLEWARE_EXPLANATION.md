# Phase 6: 인증 미들웨어 - 왜 필요한가?

## 🤔 질문: 미들웨어가 뭐고, 왜 필요한가?

**답변: 로그인한 사용자만 접근할 수 있는 API를 보호하기 위해 필요합니다!**

---

## 📚 미들웨어란?

### 간단한 설명

**미들웨어(Middleware)**는 **요청과 응답 사이에서 작동하는 함수**입니다.

```
사용자 요청 → 미들웨어 → 실제 API 처리 → 응답
              ↑
         여기서 검증/처리!
```

### 예시: 보안 검사

실생활 비유:
- **회사 출입**: 직원증을 보여주면 입장 허용 (미들웨어가 검사)
- **은행 거래**: 신분증 확인 후 거래 진행 (미들웨어가 검사)

---

## 🎯 인증 미들웨어가 필요한 이유

### 현재 상황

**✅ 완료된 것:**
- 회원가입 API (`/api/auth/signup`)
- 로그인 API (`/api/auth/login`)
- JWT 토큰 발급 및 쿠키 저장

**❌ 아직 없는 것:**
- **로그인한 사용자만 접근할 수 있는 API 보호**
- 예: "내 프로필 보기", "뉴스 좋아요", "설정 변경" 등

---

## 💡 실제 사용 시나리오

### 시나리오 1: 사용자 프로필 조회 API

**보호가 없는 경우 (위험!):**
```javascript
// 누구나 접근 가능
app.get('/api/user/profile', (req, res) => {
  // 누가 요청했는지 모름!
  // 아무나 다른 사람의 정보를 볼 수 있음 ❌
});
```

**보호가 있는 경우 (안전!):**
```javascript
// 인증 미들웨어 사용
app.get('/api/user/profile', authMiddleware, (req, res) => {
  // req.user에 로그인한 사용자 정보가 있음 ✅
  // 로그인하지 않은 사용자는 접근 불가 ✅
  res.json({ user: req.user });
});
```

---

## 🔐 인증 미들웨어의 역할

### 1. 토큰 검증

```javascript
// 미들웨어가 하는 일:
1. 쿠키에서 JWT 토큰 가져오기
2. 토큰이 유효한지 검증 (서명 확인)
3. 토큰이 만료되지 않았는지 확인
4. 토큰에서 사용자 정보 추출
5. req.user에 사용자 정보 저장
```

### 2. 접근 제어

```javascript
// 로그인한 사용자만 접근 가능
if (토큰이 없거나 유효하지 않으면) {
  return 401 Unauthorized; // 접근 거부
}

// 토큰이 유효하면
다음 단계로 진행; // API 실행
```

---

## 📊 비교: 미들웨어 없이 vs 미들웨어 있이

### 미들웨어 없이 (매번 반복 코드)

```javascript
// API 1: 프로필 조회
app.get('/api/user/profile', async (req, res) => {
  // 토큰 검증 코드 (반복!)
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // 실제 로직
    res.json({ user: decoded });
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
  }
});

// API 2: 좋아요
app.post('/api/news/like', async (req, res) => {
  // 토큰 검증 코드 (또 반복!)
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // 실제 로직
    res.json({ success: true });
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
  }
});

// API 3, 4, 5... (계속 반복!)
```

**문제점:**
- ❌ 같은 코드를 매번 반복
- ❌ 유지보수 어려움 (토큰 검증 로직 변경 시 모든 API 수정 필요)
- ❌ 실수로 검증 코드를 빼먹을 수 있음

---

### 미들웨어 있이 (한 번만 작성)

```javascript
// 미들웨어: 한 번만 작성
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 사용자 정보 저장
    next(); // 다음 단계로 진행
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
  }
};

// API 1: 프로필 조회
app.get('/api/user/profile', authMiddleware, (req, res) => {
  // req.user에 사용자 정보가 이미 있음!
  res.json({ user: req.user });
});

// API 2: 좋아요
app.post('/api/news/like', authMiddleware, (req, res) => {
  // req.user에 사용자 정보가 이미 있음!
  const userId = req.user.userId;
  // 실제 로직
  res.json({ success: true });
});

// API 3, 4, 5... (간단하게!)
```

**장점:**
- ✅ 코드 중복 제거
- ✅ 유지보수 쉬움 (미들웨어만 수정하면 모든 API에 적용)
- ✅ 실수 방지 (미들웨어를 사용하면 자동으로 검증)

---

## 🎯 실제 사용 예시

### 예시 1: 사용자 프로필 조회

```javascript
// 보호된 API
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  // req.user.userId로 DB에서 사용자 정보 조회
  const user = await pool.query(
    'SELECT id, email, nickname FROM users WHERE id = $1',
    [req.user.userId]
  );
  res.json({ user: user.rows[0] });
});
```

**동작:**
1. 사용자가 `/api/user/profile` 요청
2. 미들웨어가 토큰 검증
3. 토큰이 유효하면 `req.user`에 사용자 정보 저장
4. API가 `req.user.userId`로 사용자 정보 조회
5. 응답 반환

---

### 예시 2: 뉴스 좋아요

```javascript
// 보호된 API
app.post('/api/news/like', authMiddleware, async (req, res) => {
  const { newsId } = req.body;
  const userId = req.user.userId; // 미들웨어에서 가져온 사용자 ID
  
  // 좋아요 저장
  await pool.query(
    'INSERT INTO news_likes (user_id, news_id) VALUES ($1, $2)',
    [userId, newsId]
  );
  
  res.json({ success: true });
});
```

**동작:**
1. 사용자가 뉴스 좋아요 요청
2. 미들웨어가 토큰 검증
3. 토큰이 유효하면 `req.user.userId`로 좋아요 저장
4. 응답 반환

---

### 예시 3: 로그인 없이 접근 시도

```javascript
// 로그인하지 않은 사용자가 요청
// → 미들웨어가 토큰 없음을 감지
// → 401 Unauthorized 응답
```

**응답:**
```json
{
  "error": "로그인이 필요합니다"
}
```

---

## 🔄 전체 플로우

### 로그인한 사용자의 요청

```
1. 사용자 → API 요청 (쿠키에 토큰 포함)
   ↓
2. 미들웨어 → 토큰 검증
   ✅ 토큰 유효
   ↓
3. req.user에 사용자 정보 저장
   ↓
4. 실제 API 실행
   ↓
5. 응답 반환
```

### 로그인하지 않은 사용자의 요청

```
1. 사용자 → API 요청 (토큰 없음)
   ↓
2. 미들웨어 → 토큰 검증
   ❌ 토큰 없음 또는 유효하지 않음
   ↓
3. 401 Unauthorized 응답
   ↓
4. 실제 API는 실행되지 않음
```

---

## ✅ Phase 6에서 할 일

### 1. 인증 미들웨어 만들기
- 쿠키에서 토큰 가져오기
- 토큰 검증 (JWT verify)
- 사용자 정보를 `req.user`에 저장

### 2. 보호된 API 테스트
- 미들웨어를 사용하는 테스트 API 만들기
- 로그인한 사용자: 접근 가능
- 로그인하지 않은 사용자: 접근 불가

---

## 🎯 결론

### Q: 미들웨어가 뭐고, 왜 필요한가?

**A: 로그인한 사용자만 접근할 수 있는 API를 보호하기 위해 필요합니다!**

**이유:**
1. ✅ **코드 중복 제거**: 토큰 검증 로직을 한 곳에만 작성
2. ✅ **보안 강화**: 모든 보호된 API에 자동으로 인증 적용
3. ✅ **유지보수 용이**: 미들웨어만 수정하면 모든 API에 적용
4. ✅ **실수 방지**: 미들웨어를 사용하면 자동으로 검증

**실제 사용:**
- 사용자 프로필 조회
- 뉴스 좋아요
- 설정 변경
- 알림 설정
- 등등... 모든 보호된 API에 사용!

---

**Phase 6를 진행하면, 이제 로그인한 사용자만 접근할 수 있는 API를 만들 수 있습니다!** 🎉
