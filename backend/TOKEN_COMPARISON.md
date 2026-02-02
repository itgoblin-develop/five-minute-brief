# 회원가입 vs 로그인: 토큰 비교

## 🤔 질문

**"회원가입하면 바로 로그인되도록 했는데, 그럼 회원가입 시 토큰과 로그인 시 토큰이 같은 거 아닌가?"**

**답변: 아니요, 값이 다릅니다!** ❌

---

## 📊 현재 구현 방식

### 시나리오 1: 회원가입 (2026-02-02 12:00:00)

```
사용자 → 회원가입 요청
  ↓
서버: DB에 사용자 저장
  ↓
서버: JWT 토큰 생성 (12:00:00 시점)
  ↓
서버: httpOnly Cookie에 토큰 저장
  ↓
사용자: 바로 로그인 상태 ✅
```

**발급된 토큰:**
```json
{
  "userId": 5,
  "email": "test@example.com",
  "nickname": "테스트유저",
  "iat": 1770034403,  // 2026-02-02 12:00:03
  "exp": 1777810403   // 2026-05-03 12:00:03
}
```

**토큰 문자열:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoidGVzdEBleGFtcGxlMS5jb20iLCJuaWNrbmFtZSI6Iu2FjOyKpO2KuOycoOyggDIiLCJpYXQiOjE3NzAwMzQ0MDMsImV4cCI6MTc3NzgxMDQwM30.xxx
```

---

### 시나리오 2: 로그아웃 후 다시 로그인 (2026-02-02 14:30:00)

```
사용자 → 로그아웃 (쿠키 삭제)
  ↓
사용자 → 로그인 요청 (이메일/비밀번호)
  ↓
서버: 비밀번호 검증
  ↓
서버: JWT 토큰 생성 (14:30:00 시점) ← 새로운 시점!
  ↓
서버: httpOnly Cookie에 토큰 저장
  ↓
사용자: 로그인 상태 ✅
```

**발급된 토큰:**
```json
{
  "userId": 5,
  "email": "test@example.com",
  "nickname": "테스트유저",
  "iat": 1770044200,  // 2026-02-02 14:30:00 (다름!)
  "exp": 1777810200   // 2026-05-03 14:30:00 (다름!)
}
```

**토큰 문자열:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoidGVzdEBleGFtcGxlMS5jb20iLCJuaWNrbmFtZSI6Iu2FjOyKpO2KuOycoOyggDIiLCJpYXQiOjE3NzAwNDQyMDAsImV4cCI6MTc3NzgxMDIwMH0.yyy
```

---

## 🔑 핵심 차이점

### ✅ 동일한 점
- **같은 사용자**: userId, email, nickname 동일
- **같은 생성 방식**: 같은 `jwt.sign()` 함수 사용
- **같은 만료 시간**: 90일

### ❌ 다른 점
- **토큰 값**: 완전히 다른 문자열
- **발급 시간 (iat)**: 12:00 vs 14:30
- **만료 시간 (exp)**: 90일 후 12:00 vs 90일 후 14:30

---

## 💡 왜 다른가?

JWT 토큰은 **생성 시점**을 포함합니다:

```javascript
jwt.sign(
  { userId, email, nickname },
  JWT_SECRET,
  { expiresIn: '90d' }
);
```

이 함수가 호출될 때마다:
1. 현재 시간을 `iat` (issued at)에 저장
2. 현재 시간 + 90일을 `exp` (expires)에 저장
3. 이 정보를 포함해서 **새로운 토큰** 생성

**결과:**
- 회원가입 시 (12:00): `iat: 1770034403` → 토큰 A
- 로그인 시 (14:30): `iat: 1770044200` → 토큰 B
- **토큰 A ≠ 토큰 B** (완전히 다른 값!)

---

## 🎯 실제 동작 예시

### 사용자 플로우

**1단계: 회원가입 (12:00)**
```
POST /api/auth/signup
→ 토큰 발급 (토큰 A)
→ 쿠키에 저장
→ 바로 로그인 상태 ✅
```

**2단계: 로그아웃 (13:00)**
```
POST /api/auth/logout
→ 쿠키 삭제
→ 로그아웃 상태
```

**3단계: 다시 로그인 (14:30)**
```
POST /api/auth/login
→ 토큰 발급 (토큰 B) ← 새로운 토큰!
→ 쿠키에 저장
→ 로그인 상태 ✅
```

**결과:**
- 토큰 A (회원가입 시): 무효화됨 (쿠키에서 삭제됨)
- 토큰 B (로그인 시): 유효함 (현재 사용 중)

---

## ✅ 결론

### Q: 회원가입 시 토큰과 로그인 시 토큰이 같은가?

**A: 아니요, 값이 다릅니다!**

**이유:**
1. ✅ 회원가입 시: 토큰 발급 (시점 A)
2. ✅ 로그인 시: **새로운 토큰** 발급 (시점 B)
3. ❌ 두 토큰은 **완전히 다른 값** (생성 시점이 다르므로)

**하지만:**
- ✅ 생성 방식은 동일
- ✅ 같은 사용자 정보 포함
- ✅ 같은 만료 시간 (90일)

**→ 매번 새로운 토큰이 발급되지만, 동일한 방식으로 생성됩니다!** 🎉
