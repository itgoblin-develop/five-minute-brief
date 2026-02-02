#!/bin/bash

echo "=== Phase 5: 로그인 API 테스트 ==="
echo ""

# 1. 성공 케이스
echo "1. ✅ 성공 케이스 (올바른 이메일/비밀번호)"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example1.com","password":"test1234"}' \
  -c /tmp/login-cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 2. 존재하지 않는 이메일
echo "2. ❌ 존재하지 않는 이메일"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"test1234"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 3. 잘못된 비밀번호
echo "3. ❌ 잘못된 비밀번호"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example1.com","password":"wrongpassword"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 4. 이메일 형식 오류
echo "4. ❌ 이메일 형식 오류"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test1234"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# 5. 쿠키 확인
echo "5. 🍪 쿠키 확인"
if [ -f /tmp/login-cookies.txt ]; then
    echo "토큰 쿠키:"
    cat /tmp/login-cookies.txt | grep token || echo "쿠키 파일에 token이 없습니다"
else
    echo "쿠키 파일이 생성되지 않았습니다"
fi
echo ""

echo "=== 테스트 완료 ==="
echo ""
echo "📊 DB에서 last_login_at 확인:"
echo "export PATH=\"/opt/homebrew/Cellar/postgresql@15/15.15_1/bin:\$PATH\""
echo "psql -U nahyojin -d five_minute_brief -c \"SELECT id, email, nickname, last_login_at FROM users ORDER BY id DESC LIMIT 5;\""
