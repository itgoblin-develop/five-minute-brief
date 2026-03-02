// 주간/월간 브리핑 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');

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
              weekly_comment, stats, is_fallback, generated_at
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
        weeklyComment: row.weekly_comment || '',
        stats: row.stats || {},
        isFallback: row.is_fallback,
        generatedAt: row.generated_at,
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
      },
    });
  } catch (error) {
    logger.error('주간 브리핑 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 최신 주간 브리핑 1건 ───
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
      },
    });
  } catch (error) {
    logger.error('최신 주간 브리핑 조회 오류:', error);
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
              monthly_editorial, stats, is_fallback, generated_at
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
      },
    });
  } catch (error) {
    logger.error('월간 브리핑 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 최신 월간 브리핑 1건 ───
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
      },
    });
  } catch (error) {
    logger.error('최신 월간 브리핑 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
