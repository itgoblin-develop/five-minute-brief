# Phase 5: 로그인 API 테스트 가이드

## 🎯 개발 목표

- 로그인 API 구현 완료
- 이메일/비밀번호로 로그인
- 비밀번호 검증 (bcrypt)
- JWT 토큰 발급 및 httpOnly Cookie 설정
- last_login_at 업데이트

---

## ✅ 구현 완료 사항

### 1. 로그인 API 엔드포인트
- **URL**: `POST /api/auth/login`
- **요청 본문**: `{ email, password }`
- **응답**: `{ success, message, user }`

### 2. 보안 기능
- ✅ 이메일 형식 검증
- ✅ 비밀번호 검증 (bcrypt.compare)
- ✅ 사용자 존재 여부 확인
- ✅ JWT 토큰 생성 (90일 유효)
- ✅ httpOnly Cookie 설정

### 3. DB 업데이트
- ✅ `last_login_at` 필드 업데이트

---

## 🧪 테스트 방법

### 방법 1: 웹 브라우저 테스트 (가장 쉬움)

1. **서버 실행 확인**
   ```bash
   cd backend
   npm start
   ```

2. **브라우저에서 접속**
   ```
   http://localhost:3000/test-login.html
   ```

3. **테스트 시나리오**

   **✅ 성공 케이스:**
   - 회원가입한 이메일과 비밀번호로 로그인
   - 예: `test@example1.com` / `test1234` (회원가입 시 사용한 비밀번호)

   **❌ 실패 케이스:**
   - 존재하지 않는 이메일
   - 잘못된 비밀번호
   - 이메일 형식 오류

4. **결과 확인**
   - 성공 시: 초록색 박스에 사용자 정보 표시
   - 실패 시: 빨간색 박스에 에러 메시지 표시
   - 브라우저 개발자 도구 → Application → Cookies에서 `token` 확인

---

### 방법 2: curl로 테스트

#### ✅ 성공 케이스

```bash
# 로그인 요청 (쿠키 저장)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example1.com","password":"test1234"}' \
  -c /tmp/login-cookies.txt \
  -v
```

**예상 응답:**
```json
{
  "success": true,
  "message": "로그인이 완료되었습니다",
  "user": {
    "id": 5,
    "email": "test@example1.com",
    "nickname": "테스트유저2",
    "last_login_at": "2026-02-02T14:30:00.000Z"
  }
}
```

**쿠키 확인:**
```bash
cat /tmp/login-cookies.txt | grep token
```

#### ❌ 실패 케이스 1: 존재하지 않는 이메일

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"test1234"}' \
  -v
```

**예상 응답:**
```json
{
  "success": false,
  "error": "이메일 또는 비밀번호가 올바르지 않습니다"
}
```

**HTTP 상태 코드**: `401 Unauthorized`

#### ❌ 실패 케이스 2: 잘못된 비밀번호

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example1.com","password":"wrongpassword"}' \
  -v
```

**예상 응답:**
```json
{
  "success": false,
  "error": "이메일 또는 비밀번호가 올바르지 않습니다"
}
```

**HTTP 상태 코드**: `401 Unauthorized`

#### ❌ 실패 케이스 3: 이메일 형식 오류

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test1234"}' \
  -v
```

**예상 응답:**
```json
{
  "success": false,
  "error": "올바른 이메일 형식이 아닙니다"
}
```

**HTTP 상태 코드**: `400 Bad Request`

---

### 방법 3: DB에서 확인

#### last_login_at 업데이트 확인

```bash
export PATH="/opt/homebrew/Cellar/postgresql@15/15.15_1/bin:$PATH"
psql -U nahyojin -d five_minute_brief -c "SELECT id, email, nickname, last_login_at FROM users ORDER BY id DESC LIMIT 5;"
```

**예상 결과:**
```
 id |        email         |    nickname     |      last_login_at      
----+----------------------+-----------------+-------------------------
  5 | test@example1.com    | 테스트유저2     | 2026-02-02 14:30:00
```

**확인 포인트:**
- ✅ `last_login_at`이 현재 시간으로 업데이트되었는지 확인
- ✅ 로그인할 때마다 시간이 갱신되는지 확인

---

## 🔍 검증 체크리스트

### 기본 기능
- [ ] 올바른 이메일/비밀번호로 로그인 성공
- [ ] 존재하지 않는 이메일로 로그인 실패 (401)
- [ ] 잘못된 비밀번호로 로그인 실패 (401)
- [ ] 이메일 형식 오류 시 실패 (400)

### 보안 기능
- [ ] JWT 토큰이 생성되었는지 확인
- [ ] httpOnly Cookie에 토큰이 저장되었는지 확인
- [ ] 브라우저 개발자 도구에서 `token` 쿠키 확인
- [ ] jwt.io에서 토큰 Payload 확인 (userId, email, nickname 포함)

### DB 업데이트
- [ ] `last_login_at`이 업데이트되었는지 확인
- [ ] 로그인할 때마다 시간이 갱신되는지 확인

### 쿠키 확인
- [ ] `HttpOnly` 속성이 체크되어 있는지 확인
- [ ] `SameSite`가 `Strict`로 설정되어 있는지 확인
- [ ] `Expires`가 90일 후로 설정되어 있는지 확인

---

## 🎯 완료 기준

**✅ Phase 5 완료 조건:**
1. ✅ 올바른 이메일/비밀번호로 로그인 성공
2. ✅ 에러 케이스 모두 정상 작동 (존재하지 않는 이메일, 잘못된 비밀번호)
3. ✅ JWT 토큰이 httpOnly Cookie에 저장됨
4. ✅ DB의 `last_login_at`이 업데이트됨
5. ✅ 브라우저에서 토큰 확인 가능

---

## 📝 테스트 스크립트

### 전체 테스트 시나리오

```bash
#!/bin/bash

# 1. 성공 케이스
echo "=== 성공 케이스 ==="
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example1.com","password":"test1234"}' \
  -c /tmp/login-cookies.txt \
  -w "\nHTTP Status: %{http_code}\n"

# 2. 존재하지 않는 이메일
echo -e "\n=== 존재하지 않는 이메일 ==="
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"test1234"}' \
  -w "\nHTTP Status: %{http_code}\n"

# 3. 잘못된 비밀번호
echo -e "\n=== 잘못된 비밀번호 ==="
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example1.com","password":"wrongpassword"}' \
  -w "\nHTTP Status: %{http_code}\n"

# 4. 쿠키 확인
echo -e "\n=== 쿠키 확인 ==="
cat /tmp/login-cookies.txt | grep token
```

---

## 🚀 다음 단계

Phase 5가 완료되면:
- **Phase 6**: 인증 미들웨어 (토큰 검증)
- **Phase 7**: 프론트엔드 기본 설정

---

**테스트해보시고 결과를 알려주세요!** 🎉
