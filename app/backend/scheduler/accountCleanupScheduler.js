// 탈퇴 유예 만료 계정 자동 삭제 스케줄러
const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * 매일 새벽 3시(KST) = UTC 18:00에 실행
 * deletion_scheduled_at이 지난 사용자를 영구 삭제
 */
async function cleanupExpiredAccounts() {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= NOW() RETURNING id, email'
    );

    if (result.rows.length > 0) {
      logger.info(`탈퇴 유예 만료 계정 ${result.rows.length}건 영구 삭제: ${result.rows.map(r => r.email).join(', ')}`);
    }
  } catch (error) {
    logger.error('탈퇴 유예 계정 정리 오류:', error);
  }
}

function startAccountCleanupScheduler() {
  // 매일 UTC 18:00 (= KST 03:00) 실행
  cron.schedule('0 18 * * *', cleanupExpiredAccounts);
  logger.info('탈퇴 유예 계정 정리 스케줄러 시작 (매일 KST 03:00)');
}

module.exports = { startAccountCleanupScheduler };
