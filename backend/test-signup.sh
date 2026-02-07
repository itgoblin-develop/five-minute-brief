#!/bin/bash
# 회원가입 API 테스트 스크립트

echo "🧪 회원가입 API 테스트"
echo "===================="
echo ""

# 테스트 데이터
EMAIL="test$(date +%s)@test.com"
NICKNAME="테스트유저$(date +%s)"
PASSWORD="test1234"

echo "📝 테스트 데이터:"
echo "   이메일: $EMAIL"
echo "   닉네임: $NICKNAME"
echo "   비밀번호: $PASSWORD"
echo ""

# 회원가입 요청
echo "📤 회원가입 요청 중..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d "{\"email\":\"$EMAIL\",\"nickname\":\"$NICKNAME\",\"password\":\"$PASSWORD\"}")

echo ""
echo "📥 응답:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# 쿠키 확인
if [ -f /tmp/cookies.txt ]; then
    echo "🍪 쿠키 확인:"
    cat /tmp/cookies.txt | grep token || echo "   토큰 쿠키 없음"
    echo ""
fi

# DB 확인
echo "📊 DB에서 확인:"
echo "   psql -U nahyojin -d five_minute_brief -c \"SELECT id, email, nickname, created_at FROM users WHERE email = '$EMAIL';\""
echo ""
