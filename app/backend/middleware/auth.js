// 인증 미들웨어: JWT 토큰 검증
const jwt = require('jsonwebtoken');

/**
 * 인증 미들웨어
 * - 쿠키에서 JWT 토큰 가져오기
 * - 토큰 검증 (서명 확인, 만료 확인)
 * - 사용자 정보를 req.user에 저장
 */
function verifyToken(req, res, next) {
  // 1. 쿠키에서 토큰 가져오기
  const token = req.cookies?.token;

  // 2. 토큰이 없으면 에러
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: '로그인이 필요합니다' 
    });
  }

  // 3. 토큰 검증
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. 사용자 정보를 req.user에 저장
    req.user = decoded;
    
    // 5. 다음 미들웨어 또는 라우트로 진행
    next();
  } catch (error) {
    // 토큰이 유효하지 않으면 (만료, 위조 등)
    res.clearCookie('token'); // 쿠키 삭제
    return res.status(401).json({ 
      success: false,
      error: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' 
    });
  }
}

module.exports = verifyToken;
