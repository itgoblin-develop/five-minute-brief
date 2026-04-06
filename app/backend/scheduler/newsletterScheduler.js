// 뉴스레터 스케줄러 — 매일 오전 8시(KST) 일간 브리핑 이메일 발송
const cron = require('node-cron');
const logger = require('../config/logger');

function startNewsletterScheduler() {
  // RESEND_API_KEY가 없으면 스케줄러 비활성화
  if (!process.env.RESEND_API_KEY) {
    logger.info('뉴스레터 스케줄러: RESEND_API_KEY 미설정 — 비활성화');
    return;
  }

  // KST 08:00 = UTC 23:00 (전날)
  // node-cron은 서버 타임존 기준이므로 UTC 환경에서는 23시
  const cronExpression = process.env.TZ === 'Asia/Seoul' ? '0 8 * * *' : '0 23 * * *';

  cron.schedule(cronExpression, async () => {
    logger.info('뉴스레터 스케줄러: 일간 뉴스레터 발송 시작');
    try {
      const { sendDailyNewsletter } = require('../routes/newsletter');
      await sendDailyNewsletter();
    } catch (error) {
      logger.error('뉴스레터 스케줄러 오류:', error);
    }
  });

  logger.info(`뉴스레터 스케줄러 시작: cron="${cronExpression}"`);
}

module.exports = { startNewsletterScheduler };
