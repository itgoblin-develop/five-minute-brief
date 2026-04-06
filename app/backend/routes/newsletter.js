// 뉴스레터 구독/발송 관련 라우트
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');

const BASE_URL = process.env.BASE_URL || 'https://itdokkaebi.com';

// Resend 초기화 (API 키 없으면 비활성화)
let resend = null;
try {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch {
  logger.warn('Resend SDK 로드 실패 — 뉴스레터 비활성화');
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'newsletter@itdokkaebi.com';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 구독 신청
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: '유효한 이메일을 입력해주세요' });
    }

    // 이미 구독 중인지 확인
    const existing = await pool.query(
      'SELECT subscriber_id, is_active, verified FROM newsletter_subscribers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      const sub = existing.rows[0];
      if (sub.is_active && sub.verified) {
        return res.json({ success: true, message: '이미 구독 중입니다' });
      }
      // 비활성화된 구독 재활성화
      if (!sub.is_active) {
        const verifyToken = generateToken();
        await pool.query(
          `UPDATE newsletter_subscribers SET is_active = TRUE, verified = FALSE, verify_token = $1, unsubscribed_at = NULL, subscribed_at = NOW() WHERE subscriber_id = $2`,
          [verifyToken, sub.subscriber_id]
        );
        await sendVerificationEmail(email, verifyToken);
        return res.json({ success: true, message: '인증 이메일을 발송했습니다' });
      }
      // 미인증 상태 → 인증 이메일 재발송
      const verifyToken = generateToken();
      await pool.query(
        'UPDATE newsletter_subscribers SET verify_token = $1 WHERE subscriber_id = $2',
        [verifyToken, sub.subscriber_id]
      );
      await sendVerificationEmail(email, verifyToken);
      return res.json({ success: true, message: '인증 이메일을 재발송했습니다' });
    }

    // 신규 구독
    const verifyTk = generateToken();
    const unsubscribeTk = generateToken();

    await pool.query(
      `INSERT INTO newsletter_subscribers (email, verify_token, unsubscribe_token)
       VALUES ($1, $2, $3)`,
      [email.toLowerCase(), verifyTk, unsubscribeTk]
    );

    await sendVerificationEmail(email, verifyTk);
    res.json({ success: true, message: '인증 이메일을 발송했습니다' });
  } catch (error) {
    logger.error('뉴스레터 구독 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 이메일 인증
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: '유효하지 않은 토큰입니다' });
    }

    const result = await pool.query(
      'UPDATE newsletter_subscribers SET verified = TRUE, verify_token = NULL WHERE verify_token = $1 AND is_active = TRUE RETURNING email',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: '유효하지 않거나 만료된 토큰입니다' });
    }

    // 구독 확인 페이지로 리다이렉트
    res.redirect(`${BASE_URL}/?newsletter_verified=true`);
  } catch (error) {
    logger.error('뉴스레터 인증 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 구독 해지
router.get('/unsubscribe', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: '유효하지 않은 토큰입니다' });
    }

    const result = await pool.query(
      'UPDATE newsletter_subscribers SET is_active = FALSE, unsubscribed_at = NOW() WHERE unsubscribe_token = $1 RETURNING email',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: '유효하지 않은 토큰입니다' });
    }

    // 구독 해지 확인 페이지로 리다이렉트
    res.redirect(`${BASE_URL}/?newsletter_unsubscribed=true`);
  } catch (error) {
    logger.error('뉴스레터 해지 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 구독 상태 확인 (로그인 사용자)
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    if (userResult.rows.length === 0) {
      return res.json({ success: true, isSubscribed: false });
    }

    const email = userResult.rows[0].email;
    const result = await pool.query(
      'SELECT is_active, verified FROM newsletter_subscribers WHERE email = $1',
      [email?.toLowerCase()]
    );

    const isSubscribed = result.rows.length > 0 && result.rows[0].is_active && result.rows[0].verified;
    res.json({ success: true, isSubscribed, email });
  } catch (error) {
    logger.error('뉴스레터 상태 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 로그인 사용자 구독 토글
router.post('/toggle', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].email) {
      return res.status(400).json({ success: false, error: '이메일이 등록되지 않은 계정입니다' });
    }

    const email = userResult.rows[0].email.toLowerCase();
    const existing = await pool.query(
      'SELECT subscriber_id, is_active FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existing.rows.length === 0) {
      // 신규 구독 (로그인 사용자는 인증 스킵)
      const unsubscribeTk = generateToken();
      await pool.query(
        `INSERT INTO newsletter_subscribers (email, user_id, verified, unsubscribe_token)
         VALUES ($1, $2, TRUE, $3)`,
        [email, req.user.userId, unsubscribeTk]
      );
      return res.json({ success: true, isSubscribed: true, message: '뉴스레터가 구독되었습니다' });
    }

    const sub = existing.rows[0];
    if (sub.is_active) {
      await pool.query(
        'UPDATE newsletter_subscribers SET is_active = FALSE, unsubscribed_at = NOW() WHERE subscriber_id = $1',
        [sub.subscriber_id]
      );
      return res.json({ success: true, isSubscribed: false, message: '뉴스레터가 해지되었습니다' });
    } else {
      await pool.query(
        'UPDATE newsletter_subscribers SET is_active = TRUE, verified = TRUE, unsubscribed_at = NULL, user_id = $1 WHERE subscriber_id = $2',
        [req.user.userId, sub.subscriber_id]
      );
      return res.json({ success: true, isSubscribed: true, message: '뉴스레터가 재구독되었습니다' });
    }
  } catch (error) {
    logger.error('뉴스레터 토글 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 구독자 수 (관리자)
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE is_active AND verified) AS active_count,
        COUNT(*) FILTER (WHERE is_active AND NOT verified) AS pending_count,
        COUNT(*) FILTER (WHERE NOT is_active) AS unsubscribed_count
       FROM newsletter_subscribers`
    );
    res.json({ success: true, stats: result.rows[0] });
  } catch (error) {
    logger.error('뉴스레터 통계 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 테스트 발송 (관리자)
router.post('/send-test', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: '이메일을 입력해주세요' });
    }

    const html = await buildNewsletterHtml();
    if (!html) {
      return res.status(500).json({ success: false, error: '뉴스레터 생성 실패' });
    }

    await sendEmail(email, html.subject, html.body);
    res.json({ success: true, message: '테스트 이메일이 발송되었습니다' });
  } catch (error) {
    logger.error('테스트 발송 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 헬퍼 함수 ───

async function sendVerificationEmail(email, token) {
  if (!resend) {
    logger.warn('Resend 미설정 — 인증 이메일 미발송');
    return;
  }

  const verifyUrl = `${BASE_URL}/api/newsletter/verify?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '[IT 도깨비] 뉴스레터 구독 인증',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:-apple-system,sans-serif;padding:32px 24px;">
        <h2 style="color:#3D61F1;margin-bottom:16px;">IT 도깨비 뉴스레터</h2>
        <p style="color:#333;line-height:1.6;">안녕하세요! 뉴스레터 구독을 완료하려면 아래 버튼을 클릭해주세요.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#3D61F1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:24px 0;">구독 확인하기</a>
        <p style="color:#999;font-size:12px;margin-top:24px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
      </div>
    `,
  });
}

async function sendEmail(to, subject, html) {
  if (!resend) {
    logger.warn('Resend 미설정 — 이메일 미발송');
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

async function buildNewsletterHtml() {
  try {
    const briefResult = await pool.query(
      `SELECT title, date_label, top_keywords, category_highlights, daily_comment, editor_comment
       FROM daily_briefs ORDER BY generated_at DESC LIMIT 1`
    );

    if (briefResult.rows.length === 0) return null;

    const brief = briefResult.rows[0];
    const keywords = (brief.top_keywords || []).slice(0, 5);
    const highlights = (brief.category_highlights || []).slice(0, 5);

    const keywordsHtml = keywords.map(k =>
      `<span style="display:inline-block;background:#EEF2FF;color:#3D61F1;padding:4px 12px;border-radius:16px;font-size:13px;margin:4px;">${k.keyword}</span>`
    ).join('');

    const highlightsHtml = highlights.map(h =>
      `<div style="border-left:3px solid #3D61F1;padding-left:12px;margin-bottom:16px;">
        <p style="font-size:11px;color:#3D61F1;margin:0 0 4px;">${h.category || ''}</p>
        <p style="font-weight:bold;color:#222;margin:0 0 4px;">${h.title || ''}</p>
        <p style="color:#666;font-size:13px;margin:0;">${h.summary || ''}</p>
      </div>`
    ).join('');

    const commentHtml = brief.editor_comment
      ? `<div style="background:#F8F8F8;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="font-size:12px;color:#3D61F1;margin:0 0 8px;font-weight:bold;">현결의 한마디</p>
          <p style="color:#333;font-size:14px;line-height:1.6;margin:0;">${brief.editor_comment}</p>
        </div>`
      : '';

    const subject = `[IT 도깨비] ${brief.title}`;
    const body = `
      <div style="max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif;padding:32px 24px;background:white;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#3D61F1;font-size:20px;margin:0;">IT 도깨비</h1>
          <p style="color:#999;font-size:12px;margin:4px 0 0;">${brief.date_label} 일간 브리핑</p>
        </div>
        <h2 style="font-size:18px;color:#222;margin-bottom:16px;">${brief.title}</h2>
        <div style="margin-bottom:20px;">${keywordsHtml}</div>
        ${highlightsHtml}
        ${commentHtml}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="text-align:center;">
          <a href="${BASE_URL}" style="color:#3D61F1;text-decoration:none;font-weight:bold;">itdokkaebi.com에서 자세히 보기 →</a>
        </p>
        <p style="text-align:center;color:#bbb;font-size:11px;margin-top:24px;">
          더 이상 받고 싶지 않으시면 <a href="{{unsubscribe_url}}" style="color:#bbb;">구독 해지</a>
        </p>
      </div>
    `;

    return { subject, body };
  } catch (error) {
    logger.error('뉴스레터 HTML 생성 오류:', error);
    return null;
  }
}

// 일간 뉴스레터 발송 함수 (스케줄러에서 호출)
async function sendDailyNewsletter() {
  if (!resend) {
    logger.info('뉴스레터: Resend 미설정 — 발송 스킵');
    return;
  }

  try {
    const html = await buildNewsletterHtml();
    if (!html) {
      logger.warn('뉴스레터: 브리핑 데이터 없음 — 발송 스킵');
      return;
    }

    // 활성 구독자 조회
    const subscribers = await pool.query(
      'SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE is_active = TRUE AND verified = TRUE'
    );

    if (subscribers.rows.length === 0) {
      logger.info('뉴스레터: 구독자 없음 — 발송 스킵');
      return;
    }

    let sent = 0;
    let failed = 0;

    // 배치 발송 (100명씩)
    for (let i = 0; i < subscribers.rows.length; i += 100) {
      const batch = subscribers.rows.slice(i, i + 100);
      const promises = batch.map(async (sub) => {
        try {
          const personalizedBody = html.body.replace(
            '{{unsubscribe_url}}',
            `${BASE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`
          );
          await sendEmail(sub.email, html.subject, personalizedBody);
          sent++;
        } catch (err) {
          logger.error(`뉴스레터 발송 실패: ${sub.email}`, err.message);
          failed++;
        }
      });
      await Promise.all(promises);
    }

    logger.info(`뉴스레터 발송 완료: 성공 ${sent}, 실패 ${failed}`);
  } catch (error) {
    logger.error('뉴스레터 일괄 발송 오류:', error);
  }
}

module.exports = router;
module.exports.sendDailyNewsletter = sendDailyNewsletter;
