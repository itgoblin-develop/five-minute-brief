# JWT 토큰: 회원가입 vs 로그인

## 🔍 질문: 회원가입 시와 로그인 시 JWT 토큰이 같은가?

**답변: 생성 방식은 동일하지만, 토큰 값은 다릅니다.**

---

## 📊 비교

### 회원가입 시 JWT 토큰

```javascript
// 회원가입 성공 후
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    nickname: user.nickname
  },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);
```

**생성 시점**: 회원가입 완료 직후  
**Payload**: `{ userId: 5, email: "test@example.com", nickname: "테스트유저", iat: 1770034403, exp: 1777810403 }`

---

### 로그인 시 JWT 토큰 (구현 예정)

```javascript
// 로그인 성공 후
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    nickname: user.nickname
  },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);
```

**생성 시점**: 로그인 성공 직후  
**Payload**: `{ userId: 5, email: "test@example.com", nickname: "테스트유저", iat: 1770035000, exp: 1777811000 }`

---

## 🔑 핵심 차이점

### 1. **생성 방식**: ✅ 동일
- 같은 `jwt.sign()` 함수 사용
- 같은 Payload 구조 (userId, email, nickname)
- 같은 비밀키 (`JWT_SECRET`)
- 같은 만료 시간 (90일)

### 2. **토큰 값**: ❌ 다름
- **생성 시점이 다르므로** `iat` (issued at) 값이 다름
- **만료 시간도 다름** (`exp` = `iat` + 90일)
- 따라서 **토큰 문자열 자체는 완전히 다름**

### 3. **Payload 내용**: ✅ 동일 (같은 사용자라면)
- 같은 사용자라면 userId, email, nickname은 동일
- 하지만 생성 시간(`iat`)과 만료 시간(`exp`)은 다름

---

## 💡 예시

### 시나리오: 사용자가 회원가입 후 로그아웃, 다시 로그인

**1. 회원가입 시 (2026-02-02 12:00:00)**
```
토큰: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoidGVzdEBleGFtcGxlMS5jb20iLCJuaWNrbmFtZSI6Iu2FjOyKpO2KuOycoOyggDIiLCJpYXQiOjE3NzAwMzQ0MDMsImV4cCI6MTc3NzgxMDQwM30.xxx
Payload: {
  userId: 5,
  email: "test@example1.com",
  nickname: "테스트유저2",
  iat: 1770034403,  // 2026-02-02 12:00:03
  exp: 1777810403   // 2026-05-03 12:00:03
}
```

**2. 로그인 시 (2026-02-02 14:30:00)**
```
토큰: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoidGVzdEBleGFtcGxlMS5jb20iLCJuaWNrbmFtZSI6Iu2FjOyKpO2KuOycoOyggDIiLCJpYXQiOjE3NzAwNDQyMDAsImV4cCI6MTc3NzgxMDIwMH0.yyy
Payload: {
  userId: 5,
  email: "test@example1.com",
  nickname: "테스트유저2",
  iat: 1770044200,  // 2026-02-02 14:30:00 (다름!)
  exp: 1777810200   // 2026-05-03 14:30:00 (다름!)
}
```

**결과:**
- ✅ Payload의 userId, email, nickname은 **동일**
- ❌ 토큰 문자열 자체는 **완전히 다름** (iat, exp가 다르므로)
- ❌ 이전 토큰은 무효화됨 (새 토큰이 발급되므로)

---

## 🎯 실제 구현 권장사항

### 공통 함수로 추출 (코드 중복 제거)

```javascript
// utils/jwt.js
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      nickname: user.nickname
    },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

module.exports = { generateToken };
```

**사용:**
```javascript
// 회원가입 시
const token = generateToken(user);

// 로그인 시
const token = generateToken(user);
```

**장점:**
- ✅ 코드 중복 제거
- ✅ 토큰 생성 로직 일관성 유지
- ✅ 나중에 토큰 구조 변경 시 한 곳만 수정

---

## ✅ 결론

### Q: 회원가입 시와 로그인 시 JWT 토큰이 같은가?

**A: 생성 방식은 동일하지만, 토큰 값은 다릅니다.**

**이유:**
1. ✅ **생성 방식**: 동일한 함수, 동일한 구조
2. ❌ **토큰 값**: 생성 시점이 다르므로 완전히 다른 토큰
3. ✅ **Payload 내용**: 같은 사용자라면 userId, email, nickname은 동일
4. ❌ **시간 정보**: iat, exp는 다름

**실제로는:**
- 회원가입 시: 새 토큰 발급
- 로그인 시: **새 토큰 발급** (이전 토큰은 무효화)
- 두 토큰은 **서로 다른 토큰**이지만, **동일한 방식으로 생성**됨

---

## 🔄 토큰 갱신 시나리오

### 시나리오 1: 회원가입 후 바로 사용
- 회원가입 → 토큰 발급 → 바로 로그인 상태

### 시나리오 2: 회원가입 후 로그아웃, 다시 로그인
- 회원가입 → 토큰 발급 → 로그아웃 → 로그인 → **새 토큰 발급**
- 이전 토큰은 무효화됨 (새 토큰이 발급되므로)

### 시나리오 3: 토큰 만료 후 재로그인
- 회원가입 → 토큰 발급 → 90일 후 만료 → 로그인 → **새 토큰 발급**

---

**결론: 생성 방식은 동일하지만, 매번 새로운 토큰이 발급됩니다!** 🎉
