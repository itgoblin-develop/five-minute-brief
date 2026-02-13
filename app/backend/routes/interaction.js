// 소셜 인터랙션 라우트 (좋아요, 북마크, 댓글)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');

// === 좋아요 ===

// 좋아요 토글
router.post('/news/:id/like', verifyToken, async (req, res) => {
  try {
    const newsId = req.params.id;
    const userId = req.user.userId;

    // 이미 좋아요했는지 확인
    const existing = await pool.query(
      'SELECT like_id FROM likes WHERE user_id = $1 AND news_id = $2',
      [userId, newsId]
    );

    let liked;
    if (existing.rows.length > 0) {
      // 좋아요 취소
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND news_id = $2', [userId, newsId]);
      liked = false;
    } else {
      // 좋아요 추가
      await pool.query('INSERT INTO likes (user_id, news_id) VALUES ($1, $2)', [userId, newsId]);
      liked = true;
    }

    // 현재 좋아요 수
    const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE news_id = $1', [newsId]);

    res.json({
      success: true,
      liked,
      likeCount: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    logger.error('좋아요 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 내 좋아요 목록
router.get('/user/likes', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.news_id, n.title, n.category, n.bullet_summary, n.image_url,
              n.source_name, n.published_at, l.created_at AS liked_at,
              COALESCE(lc.like_count, 0) AS like_count,
              COALESCE(bc.bookmark_count, 0) AS bookmark_count,
              COALESCE(cc.comment_count, 0) AS comment_count
       FROM likes l
       JOIN news n ON l.news_id = n.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.userId]
    );

    const news = result.rows.map((row) => ({
      id: String(row.news_id),
      category: row.category,
      title: row.title,
      summary: row.bullet_summary || [],
      imageUrl: row.image_url || '',
      source: row.source_name || '',
      date: row.published_at,
      likeCount: parseInt(row.like_count),
      bookmarkCount: parseInt(row.bookmark_count),
      commentCount: parseInt(row.comment_count),
    }));

    res.json({ success: true, news });
  } catch (error) {
    logger.error('좋아요 목록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// === 북마크 ===

// 북마크 토글
router.post('/news/:id/bookmark', verifyToken, async (req, res) => {
  try {
    const newsId = req.params.id;
    const userId = req.user.userId;

    const existing = await pool.query(
      'SELECT bookmark_id FROM bookmarks WHERE user_id = $1 AND news_id = $2',
      [userId, newsId]
    );

    let bookmarked;
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND news_id = $2', [userId, newsId]);
      bookmarked = false;
    } else {
      await pool.query('INSERT INTO bookmarks (user_id, news_id) VALUES ($1, $2)', [userId, newsId]);
      bookmarked = true;
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM bookmarks WHERE news_id = $1', [newsId]);

    res.json({
      success: true,
      bookmarked,
      bookmarkCount: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    logger.error('북마크 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 내 북마크 목록
router.get('/user/bookmarks', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.news_id, n.title, n.category, n.bullet_summary, n.image_url,
              n.source_name, n.published_at, b.created_at AS bookmarked_at,
              COALESCE(lc.like_count, 0) AS like_count,
              COALESCE(bc.bookmark_count, 0) AS bookmark_count,
              COALESCE(cc.comment_count, 0) AS comment_count
       FROM bookmarks b
       JOIN news n ON b.news_id = n.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.userId]
    );

    const news = result.rows.map((row) => ({
      id: String(row.news_id),
      category: row.category,
      title: row.title,
      summary: row.bullet_summary || [],
      imageUrl: row.image_url || '',
      source: row.source_name || '',
      date: row.published_at,
      likeCount: parseInt(row.like_count),
      bookmarkCount: parseInt(row.bookmark_count),
      commentCount: parseInt(row.comment_count),
    }));

    res.json({ success: true, news });
  } catch (error) {
    logger.error('북마크 목록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// === 댓글 ===

// 내 댓글 목록
router.get('/user/comments', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (n.news_id)
              n.news_id, n.title, n.category, n.bullet_summary, n.image_url,
              n.source_name, n.published_at,
              c.content AS my_comment, c.created_at AS commented_at,
              COALESCE(lc.like_count, 0) AS like_count,
              COALESCE(bc.bookmark_count, 0) AS bookmark_count,
              COALESCE(cc.comment_count, 0) AS comment_count
       FROM comments c
       JOIN news n ON c.news_id = n.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS like_count FROM likes GROUP BY news_id) lc ON n.news_id = lc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY news_id) bc ON n.news_id = bc.news_id
       LEFT JOIN (SELECT news_id, COUNT(*) AS comment_count FROM comments GROUP BY news_id) cc ON n.news_id = cc.news_id
       WHERE c.user_id = $1
       ORDER BY n.news_id, c.created_at DESC`,
      [req.user.userId]
    );

    const news = result.rows.map((row) => ({
      id: String(row.news_id),
      category: row.category,
      title: row.title,
      summary: row.bullet_summary || [],
      imageUrl: row.image_url || '',
      source: row.source_name || '',
      date: row.published_at,
      likeCount: parseInt(row.like_count),
      bookmarkCount: parseInt(row.bookmark_count),
      commentCount: parseInt(row.comment_count),
      myComment: row.my_comment,
      commentedAt: row.commented_at,
    }));

    res.json({ success: true, news });
  } catch (error) {
    logger.error('내 댓글 목록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 작성
router.post('/news/:id/comments', verifyToken, async (req, res) => {
  try {
    const newsId = req.params.id;
    const userId = req.user.userId;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: '댓글 내용을 입력해주세요' });
    }

    if (content.length > 500) {
      return res.status(400).json({ success: false, error: '댓글은 500자 이내로 작성해주세요' });
    }

    const result = await pool.query(
      `INSERT INTO comments (user_id, news_id, content)
       VALUES ($1, $2, $3)
       RETURNING comment_id, content, created_at`,
      [userId, newsId, content.trim()]
    );

    const comment = result.rows[0];

    res.status(201).json({
      success: true,
      comment: {
        id: comment.comment_id,
        content: comment.content,
        nickname: req.user.nickname,
        createdAt: comment.created_at,
        isMine: true,
      },
    });
  } catch (error) {
    logger.error('댓글 작성 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 목록 조회
router.get('/news/:id/comments', async (req, res) => {
  try {
    const newsId = req.params.id;

    const result = await pool.query(
      `SELECT c.comment_id, c.content, c.created_at, c.updated_at,
              c.user_id, u.nickname
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.news_id = $1
       ORDER BY c.created_at DESC`,
      [newsId]
    );

    // 로그인 사용자면 본인 댓글 표시
    let currentUserId = null;
    const token = req.cookies?.token;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      } catch { /* ignore */ }
    }

    const comments = result.rows.map((row) => ({
      id: row.comment_id,
      content: row.content,
      nickname: row.nickname,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isMine: currentUserId === row.user_id,
    }));

    res.json({ success: true, comments });
  } catch (error) {
    logger.error('댓글 목록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 수정
router.put('/comments/:id', verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: '댓글 내용을 입력해주세요' });
    }

    // 본인 댓글인지 확인
    const existing = await pool.query(
      'SELECT user_id FROM comments WHERE comment_id = $1',
      [commentId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '댓글을 찾을 수 없습니다' });
    }

    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 댓글만 수정할 수 있습니다' });
    }

    const result = await pool.query(
      'UPDATE comments SET content = $1, updated_at = NOW() WHERE comment_id = $2 RETURNING *',
      [content.trim(), commentId]
    );

    res.json({
      success: true,
      comment: {
        id: result.rows[0].comment_id,
        content: result.rows[0].content,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    logger.error('댓글 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 삭제
router.delete('/comments/:id', verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    const existing = await pool.query(
      'SELECT user_id FROM comments WHERE comment_id = $1',
      [commentId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '댓글을 찾을 수 없습니다' });
    }

    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 댓글만 삭제할 수 있습니다' });
    }

    await pool.query('DELETE FROM comments WHERE comment_id = $1', [commentId]);

    res.json({ success: true, message: '댓글이 삭제되었습니다' });
  } catch (error) {
    logger.error('댓글 삭제 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
