# JWT 토큰 및 httpOnly Cookie 확인 방법

## 🔍 확인 방법

### 방법 1: 브라우저 개발자 도구 (가장 쉬움)

1. **회원가입 페이지에서 가입 완료**
   - `http://localhost:3000/test-signup.html`에서 회원가입

2. **브라우저 개발자 도구 열기**
   - `F12` 또는 `Cmd + Option + I` (Mac)
   - 또는 우클릭 → "검사"

3. **Application 탭 → Cookies 확인**
   - 좌측 메뉴에서 `Application` (또는 `저장소`) 클릭
   - `Cookies` → `http://localhost:3000` 클릭
   - `token` 쿠키가 있는지 확인

4. **쿠키 속성 확인**
   - `HttpOnly`: ✅ 체크되어 있어야 함
   - `SameSite`: `Strict`
   - `Path`: `/`
   - `Expires`: 90일 후 날짜

5. **JWT 토큰 내용 확인**
   - `token` 쿠키의 값(Value)을 복사
   - https://jwt.io 접속
   - 왼쪽에 토큰 붙여넣기
   - Payload 부분에서 확인:
     ```json
     {
       "userId": 4,
       "email": "test@example1.com",
       "nickname": "테스트유저",
       "iat": 1234567890,
       "exp": 1234654290
     }
     ```

---

### 방법 2: curl로 쿠키 확인

```bash
# 회원가입 요청 (쿠키 저장)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","nickname":"테스트유저2","password":"test1234"}' \
  -c /tmp/cookies.txt -v

# 쿠키 파일 확인
cat /tmp/cookies.txt | grep token

# 또는 쿠키와 함께 다른 API 호출 테스트
curl http://localhost:3000/api/user/profile \
  -b /tmp/cookies.txt
```

---

### 방법 3: Node.js 스크립트로 확인

```javascript
// verify-cookie.js
const jwt = require('jsonwebtoken');

// 쿠키에서 토큰 가져오기 (브라우저에서 복사한 토큰)
const token = '여기에_토큰_붙여넣기';

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ 토큰 유효함');
  console.log('Payload:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('❌ 토큰 검증 실패:', error.message);
}
```

---

## ✅ 확인 체크리스트

- [ ] 브라우저 쿠키에 `token`이 저장되어 있음
- [ ] `HttpOnly` 속성이 체크되어 있음 (JavaScript로 접근 불가)
- [ ] `SameSite`가 `Strict`로 설정되어 있음
- [ ] JWT 토큰을 jwt.io에서 디코딩하면 userId, email, nickname이 포함되어 있음
- [ ] `exp` (만료 시간)가 90일 후로 설정되어 있음

---

## 🎯 빠른 확인 방법

1. **브라우저에서 회원가입 완료**
2. **개발자 도구 열기** (`F12`)
3. **Application → Cookies → localhost:3000**
4. **`token` 쿠키 확인**
   - 값이 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 형식이면 OK
   - `HttpOnly` 체크되어 있으면 OK

5. **토큰 내용 확인**
   - 토큰 값 복사 → https://jwt.io 붙여넣기
   - Payload에 userId, email, nickname이 있으면 OK

---

**이렇게 확인하면 JWT 토큰과 httpOnly Cookie가 제대로 설정되었는지 확인할 수 있습니다!** 🎉
