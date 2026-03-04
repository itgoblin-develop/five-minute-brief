// 주간/월간 브리핑 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');

// ─── 일간 뉴스레터 목록 ───
router.get('/daily', async (req, res) => {
  try {
    const { page = 1, limit: rawLimit = 10 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 10, 1), 50);
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM daily_briefs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT brief_id, title, date_label, intro_comment, top_keywords,
              category_highlights, daily_comment, stats, is_fallback, generated_at, cover_image_url
       FROM daily_briefs
       ORDER BY generated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      briefs: result.rows.map(row => ({
        id: row.brief_id,
        title: row.title,
        dateLabel: row.date_label,
        introComment: row.intro_comment || '',
        topKeywords: row.top_keywords || [],
        categoryHighlights: row.category_highlights || [],
        dailyComment: row.daily_comment || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('일간 뉴스레터 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 최신 일간 뉴스레터 1건 (latest는 :id보다 먼저 선언) ───
router.get('/daily/latest', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM daily_briefs ORDER BY generated_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, brief: null });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      brief: {
        id: row.brief_id,
        title: row.title,
        dateLabel: row.date_label,
        introComment: row.intro_comment || '',
        topKeywords: row.top_keywords || [],
        categoryHighlights: row.category_highlights || [],
        dailyComment: row.daily_comment || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
      },
    });
  } catch (error) {
    logger.error('최신 일간 뉴스레터 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 일간 뉴스레터 상세 ───
router.get('/daily/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다' });
    }

    const result = await pool.query(
      `SELECT * FROM daily_briefs WHERE brief_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '일간 뉴스레터를 찾을 수 없습니다' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      brief: {
        id: row.brief_id,
        title: row.title,
        dateLabel: row.date_label,
        introComment: row.intro_comment || '',
        topKeywords: row.top_keywords || [],
        categoryHighlights: row.category_highlights || [],
        dailyComment: row.daily_comment || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
      },
    });
  } catch (error) {
    logger.error('일간 뉴스레터 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 주간 브리핑 목록 ───
router.get('/weekly', async (req, res) => {
  try {
    const { page = 1, limit: rawLimit = 10 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 10, 1), 50);
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM weekly_briefs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT brief_id, title, period, week_label, top_keywords,
              category_highlights, weekly_comment, next_week_preview, stats, is_fallback, generated_at, cover_image_url,
              editor_comment, editor_comment_at, editor_comment_auto, dialogue, central_keyword
       FROM weekly_briefs
       ORDER BY generated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      briefs: result.rows.map(row => ({
        id: row.brief_id,
        title: row.title,
        period: row.period,
        weekLabel: row.week_label,
        topKeywords: row.top_keywords || [],
        categoryHighlights: row.category_highlights || [],
        weeklyComment: row.weekly_comment || '',
        nextWeekPreview: row.next_week_preview || [],
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
        dialogue: row.dialogue || null,
        centralKeyword: row.central_keyword || null,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('주간 브리핑 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 최신 주간 브리핑 1건 (latest는 :id보다 먼저 선언) ───
router.get('/weekly/latest', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM weekly_briefs ORDER BY generated_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, brief: null });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      brief: {
        id: row.brief_id,
        title: row.title,
        period: row.period,
        weekLabel: row.week_label,
        topKeywords: row.top_keywords || [],
        categoryHighlights: row.category_highlights || [],
        weeklyComment: row.weekly_comment || '',
        nextWeekPreview: row.next_week_preview || [],
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
        dialogue: row.dialogue || null,
        centralKeyword: row.central_keyword || null,
      },
    });
  } catch (error) {
    logger.error('최신 주간 브리핑 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 주간 브리핑 상세 ───
router.get('/weekly/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다' });
    }

    const result = await pool.query(
      `SELECT * FROM weekly_briefs WHERE brief_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '주간 브리핑을 찾을 수 없습니다' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      brief: {
        id: row.brief_id,
        title: row.title,
        period: row.period,
        weekLabel: row.week_label,
        topKeywords: row.top_keywords || [],
        categoryHighlights: row.category_highlights || [],
        weeklyComment: row.weekly_comment || '',
        nextWeekPreview: row.next_week_preview || [],
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
        dialogue: row.dialogue || null,
        centralKeyword: row.central_keyword || null,
      },
    });
  } catch (error) {
    logger.error('주간 브리핑 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 월간 브리핑 목록 ───
router.get('/monthly', async (req, res) => {
  try {
    const { page = 1, limit: rawLimit = 10 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 10, 1), 50);
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM monthly_briefs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT brief_id, title, period, month_label, top_keywords,
              monthly_editorial, stats, is_fallback, generated_at, cover_image_url
       FROM monthly_briefs
       ORDER BY generated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      briefs: result.rows.map(row => ({
        id: row.brief_id,
        title: row.title,
        period: row.period,
        monthLabel: row.month_label,
        topKeywords: row.top_keywords || [],
        monthlyEditorial: row.monthly_editorial || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('월간 브리핑 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 최신 월간 브리핑 1건 (latest는 :id보다 먼저 선언) ───
router.get('/monthly/latest', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM monthly_briefs ORDER BY generated_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, brief: null });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      brief: {
        id: row.brief_id,
        title: row.title,
        period: row.period,
        monthLabel: row.month_label,
        topKeywords: row.top_keywords || [],
        deepArticles: row.deep_articles || [],
        monthlyEditorial: row.monthly_editorial || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
      },
    });
  } catch (error) {
    logger.error('최신 월간 브리핑 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 월간 브리핑 상세 ───
router.get('/monthly/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다' });
    }

    const result = await pool.query(
      `SELECT * FROM monthly_briefs WHERE brief_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '월간 브리핑을 찾을 수 없습니다' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      brief: {
        id: row.brief_id,
        title: row.title,
        period: row.period,
        monthLabel: row.month_label,
        topKeywords: row.top_keywords || [],
        deepArticles: row.deep_articles || [],
        monthlyEditorial: row.monthly_editorial || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
        coverImageUrl: row.cover_image_url || null,
        editorComment: row.editor_comment || null,
        editorCommentAt: row.editor_comment_at || null,
        editorCommentAuto: row.editor_comment_auto || false,
      },
    });
  } catch (error) {
    logger.error('월간 브리핑 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 주간 브리핑 대화 수정 (관리자 전용) ───
router.put('/weekly/:id/dialogue', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dialogue } = req.body;

    if (!Array.isArray(dialogue)) {
      return res.status(400).json({ success: false, error: 'dialogue는 배열이어야 합니다' });
    }

    const result = await pool.query(
      `UPDATE weekly_briefs
       SET dialogue = $1
       WHERE brief_id = $2
       RETURNING brief_id`,
      [JSON.stringify(dialogue), parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '주간 브리핑을 찾을 수 없습니다' });
    }

    logger.info(`관리자(${req.user.userId}) 주간 브리핑 대화 수정: ${id}`);
    res.json({ success: true, message: '대화가 저장되었습니다' });
  } catch (error) {
    logger.error('주간 브리핑 대화 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 브리핑 현결 코멘트 수정 (관리자 전용) ───
router.put('/:type/:id/editor-comment', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { comment } = req.body;

    const tableMap = { daily: 'daily_briefs', weekly: 'weekly_briefs', monthly: 'monthly_briefs' };
    const table = tableMap[type];
    if (!table) {
      return res.status(400).json({ success: false, error: '유효하지 않은 브리핑 타입입니다' });
    }

    const result = await pool.query(
      `UPDATE ${table}
       SET editor_comment = $1, editor_comment_at = NOW(), editor_comment_auto = FALSE
       WHERE brief_id = $2
       RETURNING brief_id`,
      [comment || null, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '브리핑을 찾을 수 없습니다' });
    }

    logger.info(`관리자(${req.user.userId}) ${type} 브리핑 현결 코멘트 ${comment ? '수정' : '삭제'}: ${id}`);
    res.json({ success: true, message: comment ? '코멘트가 저장되었습니다' : '코멘트가 삭제되었습니다' });
  } catch (error) {
    logger.error('브리핑 현결 코멘트 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
