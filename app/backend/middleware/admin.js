// 관리자 권한 검증 미들웨어
const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * 관리자 권한 검증 미들웨어
 * - verifyToken 미들웨어 이후에 사용
 * - DB에서 is_admin 실시간 확인 (JWT 캐시가 아닌 실시간 확인)
 * - 관리자가 아니면 403 반환
 */
async function verifyAdmin(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    next();
  } catch (error) {
    logger.error('관리자 권한 확인 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}

module.exports = verifyAdmin;
