# Phase 6: 인증 미들웨어 테스트 가이드

## 🎯 개발 목표

- 인증 미들웨어 구현 완료
- 보호된 API 테스트 (프로필 조회)
- 토큰 검증 동작 확인

---

## ✅ 구현 완료 사항

### 1. 인증 미들웨어 (`middleware/auth.js`)
- ✅ 쿠키에서 JWT 토큰 가져오기
- ✅ 토큰 검증 (JWT verify)
- ✅ 사용자 정보를 `req.user`에 저장
- ✅ 토큰이 없거나 유효하지 않으면 401 에러

### 2. 보호된 API (`routes/user.js`)
- ✅ `/api/user/profile`: DB에서 사용자 정보 조회
- ✅ `/api/user/me`: 토큰에서 사용자 정보 반환

### 3. 서버 설정
- ✅ 사용자 라우트 등록 (`/api/user`)

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
   http://localhost:3000/test-profile.html
   ```

3. **테스트 시나리오**

   **시나리오 1: 로그인하지 않은 상태**
   - "프로필 조회" 버튼 클릭
   - 예상 결과: ❌ "로그인이 필요합니다" 에러

   **시나리오 2: 로그인한 상태**
   - 먼저 로그인: `http://localhost:3000/test-login.html`
   - 로그인 성공 후 프로필 페이지로 이동
   - "프로필 조회" 버튼 클릭
   - 예상 결과: ✅ 사용자 정보 반환

   **시나리오 3: 토큰이 만료된 경우**
   - (나중에 테스트 가능: 토큰 만료 시간 조정)

---

### 방법 2: curl로 테스트

#### ❌ 실패 케이스: 토큰 없이 요청

```bash
# 토큰 없이 프로필 조회 시도
curl -X GET http://localhost:3000/api/user/profile \
  -v
```

**예상 응답:**
```json
{
  "success": false,
  "error": "로그인이 필요합니다"
}
```

**HTTP 상태 코드**: `401 Unauthorized`

---

#### ✅ 성공 케이스: 로그인 후 토큰 포함해서 요청

```bash
# 1. 먼저 로그인 (쿠키 저장)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example2.com","password":"test1234"}' \
  -c /tmp/auth-cookies.txt \
  -s

# 2. 쿠키 포함해서 프로필 조회
curl -X GET http://localhost:3000/api/user/profile \
  -b /tmp/auth-cookies.txt \
  -s | jq '.' 2>/dev/null || cat
```

**예상 응답:**
```json
{
  "success": true,
  "user": {
    "id": 7,
    "email": "test@example2.com",
    "nickname": "아아",
    "created_at": "2026-02-02T12:30:00.000Z",
    "last_login_at": "2026-02-02T14:30:00.000Z"
  }
}
```

**HTTP 상태 코드**: `200 OK`

---

#### ✅ 성공 케이스: 내 정보 조회 (토큰에서)

```bash
# 쿠키 포함해서 내 정보 조회
curl -X GET http://localhost:3000/api/user/me \
  -b /tmp/auth-cookies.txt \
  -s | jq '.' 2>/dev/null || cat
```

**예상 응답:**
```json
{
  "success": true,
  "user": {
    "userId": 7,
    "email": "test@example2.com",
    "nickname": "아아"
  }
}
```

---

### 방법 3: 전체 테스트 스크립트

```bash
#!/bin/bash

echo "=== Phase 6: 인증 미들웨어 테스트 ==="
echo ""

# 1. 토큰 없이 요청 (실패 케이스)
echo "1. ❌ 토큰 없이 프로필 조회 (실패 예상)"
curl -X GET http://localhost:3000/api/user/profile \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 2. 로그인
echo "2. 🔑 로그인 (쿠키 저장)"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example2.com","password":"test1234"}' \
  -c /tmp/auth-cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 3. 토큰 포함해서 프로필 조회 (성공 케이스)
echo "3. ✅ 토큰 포함해서 프로필 조회 (성공 예상)"
curl -X GET http://localhost:3000/api/user/profile \
  -b /tmp/auth-cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 4. 내 정보 조회
echo "4. ✅ 내 정보 조회 (토큰에서)"
curl -X GET http://localhost:3000/api/user/me \
  -b /tmp/auth-cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

echo "=== 테스트 완료 ==="
```

---

## 🔍 검증 체크리스트

### 기본 기능
- [ ] 토큰 없이 요청 시 401 에러 반환
- [ ] 로그인 후 토큰 포함해서 요청 시 성공
- [ ] `/api/user/profile`에서 DB 정보 반환
- [ ] `/api/user/me`에서 토큰 정보 반환

### 보안 기능
- [ ] 미들웨어가 토큰을 정상적으로 검증
- [ ] `req.user`에 사용자 정보가 저장됨
- [ ] 유효하지 않은 토큰 시 401 에러 반환
- [ ] 쿠키가 자동으로 삭제됨 (유효하지 않은 토큰일 때)

### API 응답
- [ ] 성공 시: `{ success: true, user: {...} }`
- [ ] 실패 시: `{ success: false, error: "..." }`

---

## 🎯 완료 기준

**✅ Phase 6 완료 조건:**
1. ✅ 토큰 없이 요청 시 401 에러 반환
2. ✅ 로그인 후 토큰 포함해서 요청 시 성공
3. ✅ 미들웨어가 토큰을 정상적으로 검증
4. ✅ `req.user`에 사용자 정보가 저장됨
5. ✅ 보호된 API가 정상 작동

---

## 📝 테스트 시나리오 요약

### 시나리오 1: 로그인하지 않은 사용자
```
요청: GET /api/user/profile (토큰 없음)
  ↓
미들웨어: 토큰 없음 감지
  ↓
응답: 401 Unauthorized
{
  "success": false,
  "error": "로그인이 필요합니다"
}
```

### 시나리오 2: 로그인한 사용자
```
요청: GET /api/user/profile (토큰 포함)
  ↓
미들웨어: 토큰 검증 ✅
  ↓
req.user에 사용자 정보 저장
  ↓
API: req.user.userId로 DB 조회
  ↓
응답: 200 OK
{
  "success": true,
  "user": { ... }
}
```

---

## 🚀 다음 단계

Phase 6가 완료되면:
- **Phase 7**: 프론트엔드 기본 설정
- 또는 추가 보호된 API 개발 (뉴스 좋아요, 설정 변경 등)

---

**테스트해보시고 결과를 알려주세요!** 🎉
