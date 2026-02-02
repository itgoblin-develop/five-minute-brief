# JWT 토큰 보안 가이드

## 🔍 질문: jwt.io에서 누구나 Payload를 볼 수 있는데 괜찮은가?

**답변: 네, 완전히 안전합니다!** ✅

---

## 📚 JWT의 보안 원리

### 1. JWT는 **의도적으로** 디코딩 가능합니다

JWT는 **Base64 인코딩**을 사용합니다:
- Base64는 **암호화가 아닙니다** (단순 인코딩)
- 누구나 디코딩해서 내용을 볼 수 있습니다
- 이것은 **정상이고 의도된 동작**입니다

**왜 이렇게 설계되었나요?**
- JWT는 **서명(Signature)**으로 보안을 보장합니다
- Payload를 숨기는 것이 목적이 아닙니다
- **위변조 방지**가 핵심입니다

---

## 🔐 JWT 보안의 핵심: 서명(Signature)

### 서명이란?

```
JWT 구조:
[Header].[Payload].[Signature]
     ↓         ↓          ↓
  Base64    Base64    서버 비밀키로 서명
```

**서명 생성 과정:**
```javascript
// 서버에서만 알고 있는 비밀키
const secret = process.env.JWT_SECRET; // "my-super-secret-key"

// 서명 생성
const signature = HMAC-SHA256(
  base64(header) + "." + base64(payload),
  secret
);
```

### 서명 검증 과정

1. **클라이언트가 토큰을 서버에 전송**
2. **서버가 서명을 검증:**
   ```javascript
   // 서버에서 검증
   const decoded = jwt.verify(token, JWT_SECRET);
   // ✅ 서명이 맞으면 → 인증 성공
   // ❌ 서명이 틀리면 → 인증 실패 (위변조 감지!)
   ```

3. **중요한 점:**
   - 누구나 Payload를 **볼 수 있음** (정상)
   - 하지만 Payload를 **수정할 수 없음** (서명 때문에)
   - 서명을 위조하려면 **서버의 비밀키**가 필요함

---

## ✅ 실제 서비스에서도 안전한 이유

### 1. **위변조 불가능**

**시나리오: 공격자가 Payload를 수정하려고 시도**

```javascript
// 원본 토큰
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOjUsImVtYWlsIjoidGVzdEBleGFtcGxlMS5jb20ifQ.
원본서명

// 공격자가 userId를 999로 변경
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOjk5OSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUxLmNvbSJ9.
위조된서명  ← 이 서명을 만들 수 없음! (비밀키 필요)
```

**결과:**
- 서버가 서명을 검증하면 **즉시 위변조 감지**
- 인증 실패 처리

### 2. **httpOnly Cookie로 XSS 공격 방지**

```javascript
// 현재 설정
res.cookie('token', token, {
  httpOnly: true,  // ← JavaScript로 접근 불가!
  secure: true,    // ← HTTPS에서만 전송
  sameSite: 'strict' // ← CSRF 공격 방지
});
```

**보안 효과:**
- ❌ JavaScript로 토큰을 읽을 수 없음 (`document.cookie` 접근 불가)
- ❌ XSS 공격으로 토큰 탈취 불가능
- ✅ 오직 서버와의 HTTP 통신으로만 전송

### 3. **민감한 정보를 Payload에 넣지 않음**

**✅ 안전한 Payload:**
```json
{
  "userId": 5,
  "email": "test@example.com",
  "nickname": "테스트유저",
  "iat": 1770034403,
  "exp": 1777810403
}
```

**❌ 위험한 Payload (절대 하지 말 것!):**
```json
{
  "password": "plaintext123",  // ❌ 절대 안됨!
  "creditCard": "1234-5678",   // ❌ 절대 안됨!
  "ssn": "123-45-6789"         // ❌ 절대 안됨!
}
```

**현재 구현:**
- ✅ 비밀번호는 **절대** 토큰에 포함하지 않음
- ✅ DB에만 해시값으로 저장
- ✅ Payload에는 **식별 정보만** 포함 (userId, email, nickname)

### 4. **토큰 만료 시간 설정**

```javascript
// 90일 후 자동 만료
{ expiresIn: '90d' }
```

**보안 효과:**
- 토큰이 탈취되어도 **90일 후 자동 무효화**
- 장기간 사용하지 않으면 자동 로그아웃

---

## 🌐 실제 서비스 사용 사례

JWT는 **전 세계적으로 널리 사용**되는 인증 방식입니다:

### 사용하는 주요 서비스들:
- ✅ **Google** (OAuth 2.0)
- ✅ **Facebook** (Graph API)
- ✅ **GitHub** (API 인증)
- ✅ **AWS** (API Gateway)
- ✅ **Netflix** (마이크로서비스 인증)
- ✅ **Uber** (사용자 인증)

**→ 실제 프로덕션 환경에서 검증된 보안 방식입니다!**

---

## 🛡️ 추가 보안 강화 방법 (선택사항)

### 1. Refresh Token 패턴 (추후 구현 가능)

```javascript
// Access Token: 짧은 만료 시간 (15분)
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Refresh Token: 긴 만료 시간 (90일)
const refreshToken = jwt.sign(payload, secret, { expiresIn: '90d' });
```

**장점:**
- Access Token이 탈취되어도 **15분 후 자동 만료**
- Refresh Token은 httpOnly Cookie로 안전하게 보관

### 2. 토큰 블랙리스트 (보안 사고 대응)

```javascript
// 로그아웃 시 토큰을 블랙리스트에 추가
const blacklist = new Set();

// 토큰 검증 시 블랙리스트 확인
if (blacklist.has(token)) {
  return res.status(401).json({ error: '토큰이 무효화되었습니다' });
}
```

### 3. IP 주소 검증 (선택사항)

```javascript
// 토큰에 IP 주소 포함
const payload = {
  userId: user.id,
  ip: req.ip  // IP 주소도 검증
};
```

---

## 📊 보안 체크리스트

현재 구현 상태:

- [x] **JWT 서명 검증** ✅
- [x] **httpOnly Cookie** ✅
- [x] **SameSite=Strict** ✅
- [x] **비밀번호 Payload 제외** ✅
- [x] **토큰 만료 시간 설정** ✅ (90일)
- [ ] **Refresh Token** (선택사항, 추후 구현)
- [ ] **토큰 블랙리스트** (선택사항, 추후 구현)

---

## 🎯 결론

### Q: jwt.io에서 누구나 Payload를 볼 수 있는데 괜찮은가?

**A: 완전히 안전합니다!**

**이유:**
1. ✅ Payload를 **볼 수 있는 것**은 정상입니다 (의도된 동작)
2. ✅ Payload를 **수정할 수 없는 것**이 핵심입니다 (서명 보호)
3. ✅ httpOnly Cookie로 **JavaScript 접근 차단**
4. ✅ 민감한 정보는 **Payload에 포함하지 않음**
5. ✅ 실제 서비스에서 **널리 사용되는 검증된 방식**

**→ 현재 구현은 프로덕션 환경에서도 안전하게 사용 가능합니다!** 🎉

---

## 📚 참고 자료

- [JWT.io 공식 문서](https://jwt.io/introduction)
- [OWASP JWT 보안 가이드](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 7519 (JWT 표준)](https://tools.ietf.org/html/rfc7519)
