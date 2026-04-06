// 뉴스 관련 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');

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
    const { category, briefing_type, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100); // 1~100 제한
    const offset = (parseInt(page) - 1) * limit;
    const params = [];
    const conditions = [];

    if (category && category !== '전체') {
      params.push(category);
      conditions.push(`n.category = $${params.length}`);
    }

    // briefing_type 필터 (daily/weekly/monthly, 기본: daily)
    if (briefing_type && ['daily', 'weekly', 'monthly'].includes(briefing_type)) {
      params.push(briefing_type);
      conditions.push(`n.briefing_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

    const news = result.rows.map((row) => ({
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
    }));

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
    categories: ['전체', '모바일', 'PC', 'AI', '네트워크/통신', '보안', '기타'],
  });
});

// 에디터 픽 목록 조회
router.get('/editor-picks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.news_id, n.title, n.bullet_summary, n.category, n.image_url,
              n.source_name, n.published_at, n.admin_comment, n.editor_pick_at,
              COALESCE(lc.like_count, 0) AS like_count,
              COALESCE(bc.bookmark_count, 0) AS bookmark_count,
              COALESCE(cc.comment_count, 0) AS comment_count
       FROM news n
       LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
       WHERE n.is_editor_pick = TRUE
       ORDER BY n.editor_pick_order ASC, n.editor_pick_at DESC
       LIMIT 10`
    );

    const picks = result.rows.map((row) => ({
      id: String(row.news_id),
      category: row.category,
      title: row.title,
      summary: row.bullet_summary || [],
      imageUrl: row.image_url || '',
      source: row.source_name || '',
      date: row.published_at,
      adminComment: row.admin_comment || '',
      editorPickAt: row.editor_pick_at,
      likeCount: parseInt(row.like_count),
      bookmarkCount: parseInt(row.bookmark_count),
      commentCount: parseInt(row.comment_count),
    }));

    res.json({ success: true, picks });
  } catch (error) {
    logger.error('에디터 픽 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 에디터 픽 설정/해제 (관리자 전용)
router.put('/:id/editor-pick', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPick, order } = req.body;

    if (isPick) {
      await pool.query(
        `UPDATE news SET is_editor_pick = TRUE, editor_pick_at = NOW(), editor_pick_order = $1 WHERE news_id = $2`,
        [order || 0, id]
      );
    } else {
      await pool.query(
        `UPDATE news SET is_editor_pick = FALSE, editor_pick_at = NULL, editor_pick_order = 0 WHERE news_id = $1`,
        [id]
      );
    }

    res.json({ success: true, message: isPick ? '에디터 픽으로 설정되었습니다' : '에디터 픽이 해제되었습니다' });
  } catch (error) {
    logger.error('에디터 픽 설정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 뉴스 검색 (Full-Text Search)
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, page = 1, limit: rawLimit = 20 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: '검색어를 입력해주세요' });
    }

    const searchQuery = q.trim();
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const offset = (parseInt(page) - 1) * limit;
    const params = [searchQuery];
    const conditions = [`search_vector @@ plainto_tsquery('simple', $1)`];

    if (category && category !== '전체') {
      params.push(category);
      conditions.push(`n.category = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 총 개수
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM news n ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 검색 결과 + 관련도 점수 + 하이라이트
    const queryParams = [...params];
    queryParams.push(limit);
    queryParams.push(offset);

    const result = await pool.query(
      `SELECT
        n.news_id, n.title, n.summary, n.bullet_summary, n.content,
        n.category, n.hashtags, n.image_url, n.source_url, n.source_name,
        n.published_at, n.created_at,
        ts_rank(n.search_vector, plainto_tsquery('simple', $1)) AS relevance_score,
        ts_headline('simple', n.title, plainto_tsquery('simple', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS highlight,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM news n
      LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
      LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
      LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
      ${whereClause}
      ORDER BY relevance_score DESC, n.published_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    const news = result.rows.map((row) => ({
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
      relevanceScore: parseFloat(row.relevance_score),
      highlight: row.highlight,
    }));

    res.json({
      success: true,
      news,
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      query: searchQuery,
    });
  } catch (error) {
    logger.error('뉴스 검색 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
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
        adminComment: row.admin_comment || null,
        adminCommentAt: row.admin_comment_at || null,
        adminCommentAuto: row.admin_comment_auto || false,
      },
    });
  } catch (error) {
    logger.error('뉴스 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 뉴스 수정 (관리자 전용)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 뉴스 ID입니다' });
    }

    const { title, summary, bullet_summary, content, category, hashtags, admin_comment } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: '제목과 본문은 필수입니다' });
    }

    const result = await pool.query(
      `UPDATE news
       SET title = $1, summary = $2, bullet_summary = $3, content = $4, category = $5, hashtags = $6,
           admin_comment = $7, admin_comment_at = CASE WHEN $7 IS NOT NULL THEN NOW() ELSE admin_comment_at END,
           admin_comment_auto = FALSE
       WHERE news_id = $8
       RETURNING news_id`,
      [title, summary || '', JSON.stringify(bullet_summary || []), content, category || '기타', JSON.stringify(hashtags || []), admin_comment || null, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '뉴스를 찾을 수 없습니다' });
    }

    logger.info(`관리자(${req.user.userId}) 뉴스 수정: ${id}`);
    res.json({ success: true, message: '뉴스가 수정되었습니다' });
  } catch (error) {
    logger.error('뉴스 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 현결 코멘트 추가/수정 (관리자 전용)
router.put('/:id/admin-comment', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const result = await pool.query(
      `UPDATE news
       SET admin_comment = $1, admin_comment_at = NOW(), admin_comment_auto = FALSE
       WHERE news_id = $2
       RETURNING news_id`,
      [comment || null, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '뉴스를 찾을 수 없습니다' });
    }

    logger.info(`관리자(${req.user.userId}) 현결 코멘트 ${comment ? '수정' : '삭제'}: ${id}`);
    res.json({ success: true, message: comment ? '코멘트가 저장되었습니다' : '코멘트가 삭제되었습니다' });
  } catch (error) {
    logger.error('현결 코멘트 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 뉴스 삭제 (관리자 전용)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 뉴스 ID입니다' });
    }

    const newsId = parseInt(id);

    // 연관 데이터 삭제 후 뉴스 삭제
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM likes WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM bookmarks WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM comments WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM user_view_logs WHERE news_id = $1', [newsId]);
      const result = await client.query('DELETE FROM news WHERE news_id = $1 RETURNING news_id', [newsId]);
      await client.query('COMMIT');

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: '뉴스를 찾을 수 없습니다' });
      }

      logger.info(`관리자(${req.user.userId}) 뉴스 삭제: ${id}`);
      res.json({ success: true, message: '뉴스가 삭제되었습니다' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('뉴스 삭제 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
