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
echo ""
echo "📊 웹 브라우저에서도 테스트 가능:"
echo "http://localhost:3000/test-profile.html"
