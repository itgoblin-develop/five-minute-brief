// 트렌드 키워드 관련 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');

// 오늘의 트렌드 키워드 조회
router.get('/daily', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT date_label, top_keywords, generated_at
       FROM daily_briefs
       ORDER BY generated_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        date: null,
        keywords: [],
      });
    }

    const row = result.rows[0];
    const topKeywords = row.top_keywords || [];

    const keywords = topKeywords.map((item, index) => ({
      keyword: item.keyword,
      description: item.description || '',
      rank: item.rank || index + 1,
    }));

    res.json({
      success: true,
      date: row.date_label,
      keywords,
    });
  } catch (error) {
    logger.error('트렌드 키워드 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 트렌드 키워드 히스토리 조회
router.get('/history', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 30);

    const result = await pool.query(
      `SELECT date_label, top_keywords, generated_at
       FROM daily_briefs
       WHERE generated_at >= NOW() - INTERVAL '1 day' * $1
       ORDER BY generated_at DESC`,
      [days]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        period: { from: null, to: null },
        keywords: [],
      });
    }

    // 키워드별 출현 횟수/날짜 집계
    const keywordMap = new Map();

    for (const row of result.rows) {
      const topKeywords = row.top_keywords || [];
      const dateLabel = row.date_label;

      for (const item of topKeywords) {
        const key = item.keyword;
        if (!keywordMap.has(key)) {
          keywordMap.set(key, {
            keyword: key,
            appearances: 0,
            dates: [],
            latestDescription: item.description || '',
          });
        }
        const entry = keywordMap.get(key);
        entry.appearances += 1;
        entry.dates.push(dateLabel);
      }
    }

    // 출현 횟수 내림차순 정렬
    const keywords = Array.from(keywordMap.values())
      .sort((a, b) => b.appearances - a.appearances);

    const dates = result.rows.map(r => r.date_label);

    res.json({
      success: true,
      period: {
        from: dates[dates.length - 1],
        to: dates[0],
      },
      keywords,
    });
  } catch (error) {
    logger.error('트렌드 히스토리 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
