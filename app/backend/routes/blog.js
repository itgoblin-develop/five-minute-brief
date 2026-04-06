// 블로그 라우트 (B-6)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');

// 선택적 인증 미들웨어
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

// slug 생성 헬퍼 (한국어 지원)
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

// === 관리자 라우트 (/:slug보다 먼저 정의) ===

// 관리자 전용 전체 목록 (draft 포함)
router.get('/admin/list', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM blog_posts');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT bp.*,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM blog_posts bp
      LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM blog_likes GROUP BY post_id) lc ON bp.post_id = lc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS bookmark_count FROM blog_bookmarks GROUP BY post_id) bc ON bp.post_id = bc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM blog_comments GROUP BY post_id) cc ON bp.post_id = cc.post_id
      ORDER BY bp.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const posts = result.rows.map(formatPost);

    res.json({ success: true, posts, pagination: { page: parseInt(page), limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('블로그 관리자 목록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 카테고리 목록
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: ['전체', '인사이트', '테크 리뷰', '튜토리얼', '업계 이야기', '기타'],
  });
});

// 블로그 검색 (FTS)
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
    const conditions = [`bp.search_vector @@ plainto_tsquery('simple', $1)`, `bp.status = 'published'`];

    if (category && category !== '전체') {
      params.push(category);
      conditions.push(`bp.category = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM blog_posts bp ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const queryParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT bp.*,
        ts_rank(bp.search_vector, plainto_tsquery('simple', $1)) AS relevance_score,
        ts_headline('simple', bp.title, plainto_tsquery('simple', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS highlight,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM blog_posts bp
      LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM blog_likes GROUP BY post_id) lc ON bp.post_id = lc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS bookmark_count FROM blog_bookmarks GROUP BY post_id) bc ON bp.post_id = bc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM blog_comments GROUP BY post_id) cc ON bp.post_id = cc.post_id
      ${whereClause}
      ORDER BY relevance_score DESC, bp.published_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    const posts = result.rows.map((row) => ({
      ...formatPost(row),
      relevanceScore: parseFloat(row.relevance_score),
      highlight: row.highlight,
    }));

    res.json({ success: true, posts, pagination: { page: parseInt(page), limit, total, totalPages: Math.ceil(total / limit) }, query: searchQuery });
  } catch (error) {
    logger.error('블로그 검색 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// === 공개 라우트 ===

// 공개 목록 (published만)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, tag, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const offset = (parseInt(page) - 1) * limit;
    const params = [];
    const conditions = [`bp.status = 'published'`];

    if (category && category !== '전체') {
      params.push(category);
      conditions.push(`bp.category = $${params.length}`);
    }

    if (tag) {
      params.push(JSON.stringify(tag));
      conditions.push(`bp.tags @> $${params.length}::jsonb`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM blog_posts bp ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const queryParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT bp.*,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM blog_posts bp
      LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM blog_likes GROUP BY post_id) lc ON bp.post_id = lc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS bookmark_count FROM blog_bookmarks GROUP BY post_id) bc ON bp.post_id = bc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM blog_comments GROUP BY post_id) cc ON bp.post_id = cc.post_id
      ${whereClause}
      ORDER BY bp.published_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    const posts = result.rows.map(formatPost);

    res.json({ success: true, posts, pagination: { page: parseInt(page), limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('블로그 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 상세 조회 (slug 기반)
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT bp.*,
        COALESCE(lc.like_count, 0) AS like_count,
        COALESCE(bc.bookmark_count, 0) AS bookmark_count,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM blog_posts bp
      LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM blog_likes GROUP BY post_id) lc ON bp.post_id = lc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS bookmark_count FROM blog_bookmarks GROUP BY post_id) bc ON bp.post_id = bc.post_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM blog_comments GROUP BY post_id) cc ON bp.post_id = cc.post_id
      WHERE bp.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }

    const row = result.rows[0];

    // 비공개 글은 관리자만 접근
    if (row.status !== 'published') {
      if (!req.user) {
        return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
      }
      // 관리자 확인
      const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
      if (!adminCheck.rows[0]?.is_admin) {
        return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
      }
    }

    // 조회수 증가
    await pool.query('UPDATE blog_posts SET view_count = view_count + 1 WHERE post_id = $1', [row.post_id]);

    // 좋아요/북마크 상태
    let isLiked = false;
    let isBookmarked = false;
    if (req.user) {
      const [likeCheck, bookmarkCheck] = await Promise.all([
        pool.query('SELECT 1 FROM blog_likes WHERE user_id = $1 AND post_id = $2', [req.user.userId, row.post_id]),
        pool.query('SELECT 1 FROM blog_bookmarks WHERE user_id = $1 AND post_id = $2', [req.user.userId, row.post_id]),
      ]);
      isLiked = likeCheck.rows.length > 0;
      isBookmarked = bookmarkCheck.rows.length > 0;
    }

    res.json({
      success: true,
      post: {
        ...formatPost(row),
        content: row.content,
        isLiked,
        isBookmarked,
        viewCount: row.view_count + 1,
      },
    });
  } catch (error) {
    logger.error('블로그 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// === 관리자 CRUD ===

// 게시글 생성
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, slug: customSlug, content, excerpt, category, tags, cover_image_url, status, meta_description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: '제목은 필수입니다' });
    }

    const slug = customSlug?.trim() || generateSlug(title);

    // slug 중복 확인
    const slugCheck = await pool.query('SELECT 1 FROM blog_posts WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: '이미 사용 중인 slug입니다' });
    }

    const postStatus = status === 'published' ? 'published' : 'draft';
    const publishedAt = postStatus === 'published' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO blog_posts (title, slug, content, excerpt, category, tags, cover_image_url, status, published_at, meta_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING post_id, slug`,
      [title.trim(), slug, content || '', excerpt || null, category || '인사이트', JSON.stringify(tags || []), cover_image_url || null, postStatus, publishedAt, meta_description || null]
    );

    logger.info(`관리자(${req.user.userId}) 블로그 생성: ${result.rows[0].slug}`);
    res.status(201).json({ success: true, post: { id: result.rows[0].post_id, slug: result.rows[0].slug } });
  } catch (error) {
    logger.error('블로그 생성 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 게시글 수정
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 게시글 ID입니다' });
    }

    const { title, slug, content, excerpt, category, tags, cover_image_url, status, meta_description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: '제목은 필수입니다' });
    }

    // slug 중복 확인 (자기 자신 제외)
    if (slug) {
      const slugCheck = await pool.query('SELECT 1 FROM blog_posts WHERE slug = $1 AND post_id != $2', [slug, parseInt(id)]);
      if (slugCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: '이미 사용 중인 slug입니다' });
      }
    }

    // 상태 변경 시 published_at 설정
    const current = await pool.query('SELECT status, published_at FROM blog_posts WHERE post_id = $1', [parseInt(id)]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }

    let publishedAt = current.rows[0].published_at;
    if (status === 'published' && current.rows[0].status !== 'published') {
      publishedAt = new Date();
    }

    const result = await pool.query(
      `UPDATE blog_posts
       SET title = $1, slug = COALESCE($2, slug), content = $3, excerpt = $4, category = $5,
           tags = $6, cover_image_url = $7, status = $8, published_at = $9,
           meta_description = $10, updated_at = NOW()
       WHERE post_id = $11
       RETURNING post_id, slug`,
      [title.trim(), slug || null, content || '', excerpt || null, category || '인사이트', JSON.stringify(tags || []), cover_image_url || null, status || current.rows[0].status, publishedAt, meta_description || null, parseInt(id)]
    );

    logger.info(`관리자(${req.user.userId}) 블로그 수정: ${id}`);
    res.json({ success: true, post: { id: result.rows[0].post_id, slug: result.rows[0].slug } });
  } catch (error) {
    logger.error('블로그 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 게시글 삭제
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 게시글 ID입니다' });
    }

    const postId = parseInt(id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM blog_likes WHERE post_id = $1', [postId]);
      await client.query('DELETE FROM blog_bookmarks WHERE post_id = $1', [postId]);
      await client.query('DELETE FROM blog_comments WHERE post_id = $1', [postId]);
      const result = await client.query('DELETE FROM blog_posts WHERE post_id = $1 RETURNING post_id', [postId]);
      await client.query('COMMIT');

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
      }

      logger.info(`관리자(${req.user.userId}) 블로그 삭제: ${id}`);
      res.json({ success: true, message: '게시글이 삭제되었습니다' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('블로그 삭제 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// === 상호작용 라우트 ===

// 좋아요 토글
router.post('/:slug/like', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;

    const post = await pool.query('SELECT post_id FROM blog_posts WHERE slug = $1', [slug]);
    if (post.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }
    const postId = post.rows[0].post_id;

    const existing = await pool.query('SELECT like_id FROM blog_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    let liked;
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM blog_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      liked = false;
    } else {
      await pool.query('INSERT INTO blog_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      liked = true;
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM blog_likes WHERE post_id = $1', [postId]);
    res.json({ success: true, liked, likeCount: parseInt(countResult.rows[0].count) });
  } catch (error) {
    logger.error('블로그 좋아요 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 북마크 토글
router.post('/:slug/bookmark', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;

    const post = await pool.query('SELECT post_id FROM blog_posts WHERE slug = $1', [slug]);
    if (post.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }
    const postId = post.rows[0].post_id;

    const existing = await pool.query('SELECT bookmark_id FROM blog_bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    let bookmarked;
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM blog_bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      bookmarked = false;
    } else {
      await pool.query('INSERT INTO blog_bookmarks (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      bookmarked = true;
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM blog_bookmarks WHERE post_id = $1', [postId]);
    res.json({ success: true, bookmarked, bookmarkCount: parseInt(countResult.rows[0].count) });
  } catch (error) {
    logger.error('블로그 북마크 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 목록
router.get('/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await pool.query('SELECT post_id FROM blog_posts WHERE slug = $1', [slug]);
    if (post.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }
    const postId = post.rows[0].post_id;

    const result = await pool.query(
      `SELECT c.comment_id, c.content, c.created_at, c.updated_at,
              c.user_id, c.parent_id, u.nickname
       FROM blog_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    // 로그인 사용자 확인
    let currentUserId = null;
    const token = req.cookies?.token;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      } catch { /* ignore */ }
    }

    // 트리 구조 변환
    const commentMap = new Map();
    const topLevel = [];
    for (const row of result.rows) {
      const comment = {
        id: row.comment_id,
        content: row.content,
        nickname: row.nickname,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        parentId: row.parent_id,
        isMine: currentUserId === row.user_id,
        replies: [],
      };
      commentMap.set(row.comment_id, comment);
      if (!row.parent_id) {
        topLevel.push(comment);
      } else {
        const parent = commentMap.get(row.parent_id);
        if (parent) parent.replies.push(comment);
      }
    }
    topLevel.reverse();

    res.json({ success: true, comments: topLevel });
  } catch (error) {
    logger.error('블로그 댓글 목록 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 작성
router.post('/:slug/comments', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: '댓글 내용을 입력해주세요' });
    }
    if (content.length > 500) {
      return res.status(400).json({ success: false, error: '댓글은 500자 이내로 작성해주세요' });
    }

    const post = await pool.query('SELECT post_id FROM blog_posts WHERE slug = $1', [slug]);
    if (post.rows.length === 0) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다' });
    }
    const postId = post.rows[0].post_id;

    // 답글 검증
    if (parentId) {
      const parentCheck = await pool.query(
        'SELECT comment_id, parent_id FROM blog_comments WHERE comment_id = $1 AND post_id = $2',
        [parentId, postId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ success: false, error: '원본 댓글을 찾을 수 없습니다' });
      }
      if (parentCheck.rows[0].parent_id) {
        return res.status(400).json({ success: false, error: '답글에는 답글을 달 수 없습니다' });
      }
    }

    const result = await pool.query(
      `INSERT INTO blog_comments (user_id, post_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING comment_id, content, created_at, parent_id`,
      [userId, postId, content.trim(), parentId || null]
    );

    const comment = result.rows[0];
    res.status(201).json({
      success: true,
      comment: {
        id: comment.comment_id,
        content: comment.content,
        nickname: req.user.nickname,
        createdAt: comment.created_at,
        parentId: comment.parent_id,
        isMine: true,
      },
    });
  } catch (error) {
    logger.error('블로그 댓글 작성 오류:', error);
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

    const existing = await pool.query('SELECT user_id FROM blog_comments WHERE comment_id = $1', [commentId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '댓글을 찾을 수 없습니다' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 댓글만 수정할 수 있습니다' });
    }

    const result = await pool.query(
      'UPDATE blog_comments SET content = $1, updated_at = NOW() WHERE comment_id = $2 RETURNING *',
      [content.trim(), commentId]
    );

    res.json({ success: true, comment: { id: result.rows[0].comment_id, content: result.rows[0].content, updatedAt: result.rows[0].updated_at } });
  } catch (error) {
    logger.error('블로그 댓글 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 댓글 삭제
router.delete('/comments/:id', verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    const existing = await pool.query('SELECT user_id FROM blog_comments WHERE comment_id = $1', [commentId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '댓글을 찾을 수 없습니다' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 댓글만 삭제할 수 있습니다' });
    }

    await pool.query('DELETE FROM blog_comments WHERE comment_id = $1', [commentId]);
    res.json({ success: true, message: '댓글이 삭제되었습니다' });
  } catch (error) {
    logger.error('블로그 댓글 삭제 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 응답 포맷 헬퍼
function formatPost(row) {
  return {
    id: row.post_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    category: row.category,
    tags: row.tags || [],
    coverImageUrl: row.cover_image_url || '',
    status: row.status,
    authorName: row.author_name,
    viewCount: row.view_count,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metaDescription: row.meta_description || '',
    likeCount: parseInt(row.like_count || 0),
    bookmarkCount: parseInt(row.bookmark_count || 0),
    commentCount: parseInt(row.comment_count || 0),
  };
}

module.exports = router;
