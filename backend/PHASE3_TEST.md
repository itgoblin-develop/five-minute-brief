# Phase 3: 회원가입 API 테스트 가이드

## ✅ 완료된 기능

- ✅ 회원가입 API 엔드포인트 (`POST /api/auth/signup`)
- ✅ 입력값 유효성 검증 (이메일 형식, 닉네임 길이, 비밀번호 길이)
- ✅ 이메일/닉네임 중복 확인
- ✅ 비밀번호 해싱 (bcrypt)
- ✅ JWT 토큰 생성 (90일 유효)
- ✅ httpOnly Cookie 설정
- ✅ DB 저장 확인

---

## 🧪 테스트 방법

### 방법 1: 웹 브라우저 테스트 (가장 쉬움)

1. **서버 실행 확인**
   ```bash
   cd backend
   npm start
   ```

2. **브라우저에서 테스트 페이지 열기**
   ```
   http://localhost:3000/test-signup.html
   ```

3. **폼에 입력하고 회원가입 버튼 클릭**
   - 이메일: `test@example.com`
   - 닉네임: `테스트유저`
   - 비밀번호: `test1234` (최소 8자)

4. **결과 확인**
   - 성공 시: 초록색 박스에 사용자 정보 표시
   - 실패 시: 빨간색 박스에 에러 메시지 표시

---

### 방법 2: curl 명령어로 테스트

```bash
# 회원가입 요청
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nickname":"테스트유저","password":"test1234"}'

# 성공 응답 예시:
# {
#   "success": true,
#   "message": "회원가입이 완료되었습니다",
#   "user": {
#     "id": 1,
#     "email": "test@example.com",
#     "nickname": "테스트유저",
#     "created_at": "2026-02-02T..."
#   }
# }
```

---

### 방법 3: 테스트 스크립트 실행

```bash
cd backend
./test-signup.sh
```

---

## 📊 DB에서 직접 확인

### 저장된 데이터 확인

```bash
# PostgreSQL 접속
export PATH="/opt/homebrew/Cellar/postgresql@15/15.15_1/bin:$PATH"
psql -U nahyojin -d five_minute_brief

# 또는 직접 쿼리 실행
psql -U nahyojin -d five_minute_brief -c "SELECT id, email, nickname, created_at FROM users ORDER BY id DESC LIMIT 5;"
```

### 비밀번호 해싱 확인

```sql
-- 비밀번호는 해시값으로 저장되어 있음 (평문이 아님)
SELECT id, email, nickname, LEFT(password_hash, 30) as password_hash_preview 
FROM users 
ORDER BY id DESC 
LIMIT 5;
```

---

## 🔍 검증 체크리스트

### 기본 기능
- [ ] 회원가입 성공 (201 응답)
- [ ] DB에 데이터 저장 확인
- [ ] 비밀번호가 해시값으로 저장됨 (평문 아님)
- [ ] JWT 토큰이 httpOnly Cookie로 설정됨

### 유효성 검증
- [ ] 빈 필드 입력 시 에러 (400)
- [ ] 잘못된 이메일 형식 시 에러 (400)
- [ ] 닉네임 2자 미만 시 에러 (400)
- [ ] 비밀번호 8자 미만 시 에러 (400)

### 중복 확인
- [ ] 같은 이메일로 재가입 시도 → 에러 (400)
- [ ] 같은 닉네임으로 재가입 시도 → 에러 (400)

### 쿠키 확인
- [ ] 브라우저 개발자 도구 → Application → Cookies
- [ ] `token` 쿠키가 httpOnly로 설정되어 있는지 확인
- [ ] 쿠키 값이 JWT 토큰인지 확인

---

## 🐛 문제 해결

### 문제 1: "서버가 실행 중인지 확인해주세요"
**해결**: 
```bash
cd backend
npm start
```

### 문제 2: "이미 사용 중인 이메일입니다"
**해결**: 다른 이메일 주소 사용하거나, DB에서 삭제:
```sql
DELETE FROM users WHERE email = 'test@example.com';
```

### 문제 3: CORS 에러
**해결**: 서버의 CORS 설정 확인 (`server.js`)

---

## 📝 다음 단계

Phase 3 완료 후:
- **Phase 4**: 로그인 API 개발
- **Phase 5**: 인증 미들웨어 개발

---

**Phase 3 완료! 테스트 페이지에서 직접 확인해보세요!** 🎉
