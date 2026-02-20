// 뉴스 관련 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');

// 선택적 인증 미들웨어 (토큰 있으면 파싱, 없어도 통과)
function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    req.user = null;
    return next();
  }
  const jwt = require('jsonwebtoken');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

// 뉴스 목록 조회
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100); // 1~100 제한
    const offset = (parseInt(page) - 1) * limit;
    const params = [];
    let whereClause = '';

    if (category && category !== '전체') {
      params.push(category);
      whereClause = `WHERE n.category = $${params.length}`;
    }

    // 총 개수 조회
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM news n ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 뉴스 목록 + 좋아요/북마크/댓글 수
    const queryParams = [...params];
    queryParams.push(limit);
    queryParams.push(offset);

    const result = await pool.query(
      `SELECT
        n.news_id, n.title, n.summary, n.bullet_summary, n.content,
        n.category, n.hashtags, n.image_url, n.source_url, n.source_name,
        n.published_at, n.created_at,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM news n
      LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
      LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
      LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
      ${whereClause}
      ORDER BY n.published_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    const FREE_LIMIT = 3;
    const isLoggedIn = !!req.user;

    const news = result.rows.map((row, index) => {
      const item = {
        id: String(row.news_id),
        category: row.category,
        title: row.title,
        summary: row.bullet_summary || [],
        content: row.content,
        source: row.source_name || '',
        date: row.published_at,
        imageUrl: row.image_url || '',
        likeCount: parseInt(row.like_count),
        bookmarkCount: parseInt(row.bookmark_count),
        commentCount: parseInt(row.comment_count),
        hashtags: row.hashtags || [],
      };

      // 비로그인 사용자: 3개까지만 전체 내용, 나머지는 제한
      if (!isLoggedIn && (offset + index) >= FREE_LIMIT) {
        return {
          id: item.id,
          category: item.category,
          title: item.title,
          imageUrl: item.imageUrl,
          date: item.date,
          restricted: true,
        };
      }

      return item;
    });

    res.json({
      success: true,
      news,
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('뉴스 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 카테고리 목록
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: ['전체', '트렌딩', '경제', '재테크', '사회'],
  });
});

// 뉴스 상세 조회
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 뉴스 ID입니다' });
    }

    const result = await pool.query(
      `SELECT
        n.*,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM news n
      LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
      LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
      LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
      WHERE n.news_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '뉴스를 찾을 수 없습니다' });
    }

    const row = result.rows[0];

    // 로그인 사용자면 열람 기록 저장
    if (req.user) {
      await pool.query(
        'INSERT INTO user_view_logs (user_id, news_id) VALUES ($1, $2)',
        [req.user.userId, id]
      );
    }

    // 로그인 사용자면 좋아요/북마크 여부 확인
    let isLiked = false;
    let isBookmarked = false;
    if (req.user) {
      const [likeCheck, bookmarkCheck] = await Promise.all([
        pool.query('SELECT 1 FROM likes WHERE user_id = $1 AND news_id = $2', [req.user.userId, id]),
        pool.query('SELECT 1 FROM bookmarks WHERE user_id = $1 AND news_id = $2', [req.user.userId, id]),
      ]);
      isLiked = likeCheck.rows.length > 0;
      isBookmarked = bookmarkCheck.rows.length > 0;
    }

    res.json({
      success: true,
      news: {
        id: String(row.news_id),
        category: row.category,
        title: row.title,
        summary: row.bullet_summary || [],
        content: row.content,
        source: row.source_name || '',
        date: row.published_at,
        imageUrl: row.image_url || '',
        likeCount: parseInt(row.like_count),
        bookmarkCount: parseInt(row.bookmark_count),
        commentCount: parseInt(row.comment_count),
        hashtags: row.hashtags || [],
        sourceUrl: row.source_url || '',
        isLiked,
        isBookmarked,
      },
    });
  } catch (error) {
    logger.error('뉴스 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
