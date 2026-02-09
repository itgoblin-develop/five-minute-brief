// 사용자 통계 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');

// 서비스 통계 조회 (관리자용 - 현재는 로그인 사용자 접근 가능)
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const [
      totalUsersResult,
      todayActiveResult,
      weeklyActiveResult,
      totalNewsResult,
      totalViewsResult,
      totalLikesResult,
      totalBookmarksResult,
      totalCommentsResult,
    ] = await Promise.all([
      // 전체 회원 수
      pool.query('SELECT COUNT(*) FROM users'),
      // 오늘 활성 사용자 (DAU) - 오늘 로그인한 사용자
      pool.query("SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE"),
      // 주간 활성 사용자 (WAU)
      pool.query("SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days'"),
      // 전체 뉴스 수
      pool.query('SELECT COUNT(*) FROM news'),
      // 전체 열람 수
      pool.query('SELECT COUNT(*) FROM user_view_logs'),
      // 전체 좋아요 수
      pool.query('SELECT COUNT(*) FROM likes'),
      // 전체 북마크 수
      pool.query('SELECT COUNT(*) FROM bookmarks'),
      // 전체 댓글 수
      pool.query('SELECT COUNT(*) FROM comments'),
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: parseInt(totalUsersResult.rows[0].count),
          dau: parseInt(todayActiveResult.rows[0].count),
          wau: parseInt(weeklyActiveResult.rows[0].count),
        },
        content: {
          totalNews: parseInt(totalNewsResult.rows[0].count),
          totalViews: parseInt(totalViewsResult.rows[0].count),
        },
        engagement: {
          totalLikes: parseInt(totalLikesResult.rows[0].count),
          totalBookmarks: parseInt(totalBookmarksResult.rows[0].count),
          totalComments: parseInt(totalCommentsResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    logger.error('통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 인기 뉴스 (조회수 기준)
router.get('/popular-news', verifyToken, async (req, res) => {
  try {
    const { period = '7d', limit = 10 } = req.query;

    let interval;
    switch (period) {
      case '1d': interval = '1 day'; break;
      case '30d': interval = '30 days'; break;
      default: interval = '7 days';
    }

    const result = await pool.query(
      `SELECT n.news_id, n.title, n.category, n.image_url, n.published_at,
              COUNT(v.log_id) AS view_count,
              COALESCE(lc.like_count, 0) AS like_count
       FROM news n
       JOIN user_view_logs v ON n.news_id = v.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
       WHERE v.viewed_at >= NOW() - $1::interval
       GROUP BY n.news_id, n.title, n.category, n.image_url, n.published_at, lc.like_count
       ORDER BY view_count DESC
       LIMIT $2`,
      [interval, parseInt(limit)]
    );

    res.json({
      success: true,
      period,
      news: result.rows.map(row => ({
        id: String(row.news_id),
        title: row.title,
        category: row.category,
        imageUrl: row.image_url,
        publishedAt: row.published_at,
        viewCount: parseInt(row.view_count),
        likeCount: parseInt(row.like_count),
      })),
    });
  } catch (error) {
    logger.error('인기 뉴스 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 일별 활성 사용자 추이 (최근 N일)
router.get('/daily-active', verifyToken, async (req, res) => {
  try {
    const { days = 14 } = req.query;

    const result = await pool.query(
      `SELECT d::date AS date,
              COUNT(DISTINCT u.id) AS active_users
       FROM generate_series(CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day', CURRENT_DATE, '1 day') d
       LEFT JOIN users u ON u.last_login_at::date = d::date
       GROUP BY d::date
       ORDER BY d::date`,
      [parseInt(days)]
    );

    res.json({
      success: true,
      dailyActive: result.rows.map(row => ({
        date: row.date,
        activeUsers: parseInt(row.active_users),
      })),
    });
  } catch (error) {
    logger.error('일별 활성 사용자 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 카테고리별 뉴스 통계
router.get('/category-stats', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.category,
              COUNT(DISTINCT n.news_id) AS news_count,
              COUNT(v.log_id) AS view_count,
              COALESCE(SUM(lc.like_count), 0) AS like_count
       FROM news n
       LEFT JOIN user_view_logs v ON n.news_id = v.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
       GROUP BY n.category
       ORDER BY view_count DESC`
    );

    res.json({
      success: true,
      categories: result.rows.map(row => ({
        category: row.category,
        newsCount: parseInt(row.news_count),
        viewCount: parseInt(row.view_count),
        likeCount: parseInt(row.like_count),
      })),
    });
  } catch (error) {
    logger.error('카테고리별 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
