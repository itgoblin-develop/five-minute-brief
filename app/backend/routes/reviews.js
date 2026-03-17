// Play Store 리뷰 관련 라우트
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');
const { spawn } = require('child_process');
const path = require('path');

// ─── 공개 API ───

// 추적 중인 앱 목록 조회
router.get('/apps', async (req, res) => {
  try {
    const { all } = req.query;
    const whereClause = all === 'true' ? '' : 'WHERE is_active = TRUE';
    const result = await pool.query(
      `SELECT app_id, package_id, name, store_url, category, is_active,
              last_collected_at, created_at
       FROM playstore_apps
       ${whereClause}
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      apps: result.rows.map(row => ({
        appId: row.app_id,
        packageId: row.package_id,
        name: row.name,
        storeUrl: row.store_url,
        category: row.category,
        isActive: row.is_active,
        lastCollectedAt: row.last_collected_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    logger.error('앱 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 전체 또는 특정 앱 리뷰 조회 (페이징 + 필터)
router.get('/apps/:appId/reviews', async (req, res) => {
  try {
    const { appId } = req.params;
    const isAll = appId === 'all';

    if (!isAll && (!appId || isNaN(parseInt(appId)))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 앱 ID입니다' });
    }

    const { date, from, to, rating, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const offset = (parseInt(page) - 1) * limit;

    const params = [];
    const conditions = [];

    if (!isAll) {
      params.push(parseInt(appId));
      conditions.push(`r.app_id = $${params.length}`);
    }

    // 날짜 필터: 범위(from~to) 또는 단일(date)
    if (from) {
      params.push(from);
      conditions.push(`r.review_date::date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`r.review_date::date <= $${params.length}::date`);
    }
    if (date && !from && !to) {
      params.push(date);
      conditions.push(`r.review_date::date = $${params.length}::date`);
    }

    // 평점 필터
    if (rating && !isNaN(parseInt(rating))) {
      const ratingVal = parseInt(rating);
      if (ratingVal >= 1 && ratingVal <= 5) {
        params.push(ratingVal);
        conditions.push(`r.rating = $${params.length}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 총 개수 조회
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM playstore_reviews r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 리뷰 목록 조회 (전체 앱일 때 앱 이름도 조인)
    const queryParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT r.review_id, r.app_id, r.external_review_id, r.author,
              r.content, r.rating, r.review_date,
              r.developer_reply_content, r.developer_reply_date,
              r.sentiment_score, r.ai_summary, r.ai_category, r.collected_at,
              a.name AS app_name
       FROM playstore_reviews r
       LEFT JOIN playstore_apps a ON r.app_id = a.app_id
       ${whereClause}
       ORDER BY r.review_date DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.json({
      success: true,
      reviews: result.rows.map(row => ({
        reviewId: row.review_id,
        appId: row.app_id,
        appName: row.app_name || null,
        externalReviewId: row.external_review_id,
        author: row.author,
        content: row.content,
        rating: row.rating,
        reviewDate: row.review_date,
        developerReply: row.developer_reply_content || null,
        developerReplyDate: row.developer_reply_date || null,
        sentimentScore: row.sentiment_score,
        aiSummary: row.ai_summary || null,
        aiCategory: row.ai_category || null,
        collectedAt: row.collected_at,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('앱 리뷰 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 리뷰 CSV 내보내기 (관리자용)
router.get('/export/csv', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { appId, from, to, rating, type = 'reviews' } = req.query;

    const params = [];
    const conditions = [];

    if (type === 'replies') {
      conditions.push('r.developer_reply_content IS NOT NULL');
    }
    if (appId) {
      params.push(parseInt(appId));
      conditions.push(`r.app_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`r.review_date::date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`r.review_date::date <= $${params.length}::date`);
    }
    if (rating && !isNaN(parseInt(rating))) {
      params.push(parseInt(rating));
      conditions.push(`r.rating = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT a.name AS app_name, r.author, r.rating, r.review_date,
              r.content, r.sentiment_score, r.ai_category, r.ai_summary,
              r.developer_reply_content, r.developer_reply_date
       FROM playstore_reviews r
       LEFT JOIN playstore_apps a ON r.app_id = a.app_id
       ${whereClause}
       ORDER BY r.review_date DESC
       LIMIT 5000`,
      params
    );

    // CSV 생성
    const BOM = '\uFEFF';
    const escape = (val) => {
      if (val == null) return '';
      return `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    let headers, mapRow;
    if (type === 'replies') {
      // 개발자 댓글: 답글을 앞에 배치
      headers = ['앱', '리뷰 작성자', '평점', '리뷰일', '사용자 리뷰', '개발자 답글', '답글일'];
      mapRow = (row) => [
        escape(row.app_name),
        escape(row.author),
        row.rating || '',
        row.review_date ? new Date(row.review_date).toISOString().split('T')[0] : '',
        escape(row.content),
        escape(row.developer_reply_content),
        row.developer_reply_date ? new Date(row.developer_reply_date).toISOString().split('T')[0] : '',
      ].join(',');
    } else {
      // 리뷰 열람: 전체 정보
      headers = ['앱', '작성자', '평점', '리뷰일', '내용', '감정점수', 'AI카테고리', 'AI요약', '개발자답글', '답글일'];
      mapRow = (row) => [
        escape(row.app_name),
        escape(row.author),
        row.rating || '',
        row.review_date ? new Date(row.review_date).toISOString().split('T')[0] : '',
        escape(row.content),
        row.sentiment_score != null ? row.sentiment_score.toFixed(2) : '',
        escape(row.ai_category),
        escape(row.ai_summary),
        escape(row.developer_reply_content),
        row.developer_reply_date ? new Date(row.developer_reply_date).toISOString().split('T')[0] : '',
      ].join(',');
    }

    const csvRows = [headers.join(',')];
    for (const row of result.rows) {
      csvRows.push(mapRow(row));
    }

    const filename = `reviews_${type}_${from || 'all'}_${to || 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(BOM + csvRows.join('\n'));
  } catch (error) {
    logger.error('리뷰 CSV 내보내기 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 당일 Top 5 요약 조회
router.get('/daily-summary', async (req, res) => {
  try {
    // 날짜 파라미터가 없으면 오늘 날짜 사용
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT s.summary_id, s.app_id, s.date_label, s.review_count,
              s.avg_rating, s.sentiment_avg, s.sentiment_change,
              s.rating_distribution, s.top_issues, s.ai_highlight,
              s.notability_score, a.name AS app_name, a.package_id, a.category
       FROM review_daily_summaries s
       JOIN playstore_apps a ON s.app_id = a.app_id
       WHERE s.date_label = $1
       ORDER BY s.notability_score DESC NULLS LAST
       LIMIT 5`,
      [date]
    );

    res.json({
      success: true,
      date,
      summaries: result.rows.map(row => ({
        summaryId: row.summary_id,
        appId: row.app_id,
        appName: row.app_name,
        packageId: row.package_id,
        category: row.category,
        dateLabel: row.date_label,
        reviewCount: row.review_count,
        avgRating: row.avg_rating,
        sentimentAvg: row.sentiment_avg,
        sentimentChange: row.sentiment_change,
        ratingDistribution: row.rating_distribution,
        topIssues: row.top_issues,
        aiHighlight: row.ai_highlight,
        notabilityScore: row.notability_score,
      })),
    });
  } catch (error) {
    logger.error('일간 리뷰 요약 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 앱 평점/감정 트렌드 조회
router.get('/app/:appId/trend', async (req, res) => {
  try {
    const { appId } = req.params;
    if (!appId || isNaN(parseInt(appId))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 앱 ID입니다' });
    }

    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);

    const result = await pool.query(
      `SELECT s.date_label, s.review_count, s.avg_rating,
              s.sentiment_avg, s.sentiment_change, s.notability_score
       FROM review_daily_summaries s
       WHERE s.app_id = $1
         AND s.date_label >= (CURRENT_DATE - $2::int)::text
       ORDER BY s.date_label ASC`,
      [parseInt(appId), days]
    );

    // 앱 정보도 함께 반환
    const appResult = await pool.query(
      `SELECT app_id, package_id, name, category FROM playstore_apps WHERE app_id = $1`,
      [parseInt(appId)]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '앱을 찾을 수 없습니다' });
    }

    const app = appResult.rows[0];

    res.json({
      success: true,
      app: {
        appId: app.app_id,
        packageId: app.package_id,
        name: app.name,
        category: app.category,
      },
      days,
      trend: result.rows.map(row => ({
        dateLabel: row.date_label,
        reviewCount: row.review_count,
        avgRating: row.avg_rating,
        sentimentAvg: row.sentiment_avg,
        sentimentChange: row.sentiment_change,
        notabilityScore: row.notability_score,
      })),
    });
  } catch (error) {
    logger.error('앱 트렌드 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 개발자 댓글이 있는 리뷰만 조회 (관리자용)
router.get('/developer-replies', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { appId, date, from, to, page: rawPage, limit: rawLimit } = req.query;
    const page = Math.max(parseInt(rawPage) || 1, 1);
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['r.developer_reply_content IS NOT NULL'];
    const params = [];
    let paramIndex = 1;

    if (appId) {
      conditions.push(`r.app_id = $${paramIndex++}`);
      params.push(parseInt(appId));
    }
    if (from) {
      conditions.push(`r.review_date::date >= $${paramIndex++}::date`);
      params.push(from);
    }
    if (to) {
      conditions.push(`r.review_date::date <= $${paramIndex++}::date`);
      params.push(to);
    }
    if (date && !from && !to) {
      conditions.push(`r.collected_at::date = $${paramIndex++}::date`);
      params.push(date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 총 건수
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM playstore_reviews r ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    // 데이터 조회
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT r.review_id, r.content, r.rating, r.author, r.review_date,
              r.developer_reply_content, r.developer_reply_date,
              r.sentiment_score, r.ai_category,
              a.name AS app_name, a.package_id
       FROM playstore_reviews r
       JOIN playstore_apps a ON r.app_id = a.app_id
       ${whereClause}
       ORDER BY r.developer_reply_date DESC NULLS LAST, r.collected_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params,
    );

    res.json({
      success: true,
      reviews: result.rows.map(row => ({
        reviewId: row.review_id,
        appName: row.app_name,
        packageId: row.package_id,
        author: row.author,
        content: row.content,
        rating: row.rating,
        reviewDate: row.review_date,
        developerReplyContent: row.developer_reply_content,
        developerReplyDate: row.developer_reply_date,
        sentimentScore: row.sentiment_score,
        aiCategory: row.ai_category,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('개발자 댓글 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// ─── 관리자 전용 API ───

// 앱 추가
router.post('/apps', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { package_id, packageId, name, store_url, storeUrl, category } = req.body;
    const resolvedPackageId = package_id || packageId;
    const resolvedStoreUrl2 = store_url !== undefined ? store_url : storeUrl;

    if (!resolvedPackageId || !name) {
      return res.status(400).json({ success: false, error: 'package_id와 name은 필수입니다' });
    }

    // 패키지 ID 형식 검증 (com.example.app 형태)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(resolvedPackageId)) {
      return res.status(400).json({ success: false, error: '올바른 패키지 ID 형식이 아닙니다 (예: com.example.app)' });
    }

    // 중복 확인
    const existing = await pool.query(
      'SELECT app_id FROM playstore_apps WHERE package_id = $1',
      [resolvedPackageId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: '이미 등록된 패키지입니다' });
    }

    const result = await pool.query(
      `INSERT INTO playstore_apps (package_id, name, store_url, category)
       VALUES ($1, $2, $3, $4)
       RETURNING app_id, package_id, name, store_url, category, is_active, created_at`,
      [resolvedPackageId, name, resolvedStoreUrl2 || null, category || null]
    );

    const row = result.rows[0];
    logger.info(`관리자(${req.user.userId}) 앱 추가: ${package_id} (${name})`);

    res.status(201).json({
      success: true,
      message: '앱이 추가되었습니다',
      app: {
        appId: row.app_id,
        packageId: row.package_id,
        name: row.name,
        storeUrl: row.store_url,
        category: row.category,
        isActive: row.is_active,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    logger.error('앱 추가 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 앱 수정 (is_active 토글 등)
router.put('/apps/:appId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { appId } = req.params;
    if (!appId || isNaN(parseInt(appId))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 앱 ID입니다' });
    }

    const { name, store_url, storeUrl, category, is_active, isActive } = req.body;
    const resolvedStoreUrl = store_url !== undefined ? store_url : storeUrl;
    const resolvedIsActive = is_active !== undefined ? is_active : isActive;

    // 동적 업데이트 필드 구성
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (resolvedStoreUrl !== undefined) {
      updates.push(`store_url = $${paramIndex++}`);
      params.push(resolvedStoreUrl);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (resolvedIsActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(resolvedIsActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 필드가 없습니다' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(parseInt(appId));

    const result = await pool.query(
      `UPDATE playstore_apps
       SET ${updates.join(', ')}
       WHERE app_id = $${paramIndex}
       RETURNING app_id, package_id, name, store_url, category, is_active, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '앱을 찾을 수 없습니다' });
    }

    const row = result.rows[0];
    logger.info(`관리자(${req.user.userId}) 앱 수정: ${row.package_id}`);

    res.json({
      success: true,
      message: '앱이 수정되었습니다',
      app: {
        appId: row.app_id,
        packageId: row.package_id,
        name: row.name,
        storeUrl: row.store_url,
        category: row.category,
        isActive: row.is_active,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    logger.error('앱 수정 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 앱 제거
router.delete('/apps/:appId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { appId } = req.params;
    if (!appId || isNaN(parseInt(appId))) {
      return res.status(400).json({ success: false, error: '유효하지 않은 앱 ID입니다' });
    }

    const parsedAppId = parseInt(appId);

    // CASCADE로 연관 리뷰/요약도 함께 삭제됨
    const result = await pool.query(
      'DELETE FROM playstore_apps WHERE app_id = $1 RETURNING package_id, name',
      [parsedAppId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '앱을 찾을 수 없습니다' });
    }

    const deleted = result.rows[0];
    logger.info(`관리자(${req.user.userId}) 앱 삭제: ${deleted.package_id} (${deleted.name})`);

    res.json({
      success: true,
      message: `${deleted.name} 앱이 삭제되었습니다`,
    });
  } catch (error) {
    logger.error('앱 삭제 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

// 수동 리뷰 수집 트리거 (subprocess 실행)
router.post('/collect', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // 프로젝트 루트 기준 파이프라인 스크립트 경로
    const scriptPath = path.resolve(__dirname, '../../../pipeline/review_collection/run_reviews.py');

    logger.info(`관리자(${req.user.userId}) 리뷰 수집 트리거: ${scriptPath}`);

    // 비동기 subprocess 실행 (응답은 즉시 반환)
    const child = spawn('python3', [scriptPath], {
      cwd: path.resolve(__dirname, '../../../'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.info('리뷰 수집 완료', { stdout: stdout.slice(-500) });
      } else {
        logger.error('리뷰 수집 실패', { code, stderr: stderr.slice(-500) });
      }
    });

    child.on('error', (err) => {
      logger.error('리뷰 수집 프로세스 실행 오류:', err);
    });

    // 즉시 응답 반환 (수집은 백그라운드에서 진행)
    res.json({
      success: true,
      message: '리뷰 수집이 시작되었습니다. 완료까지 수 분이 소요될 수 있습니다.',
    });
  } catch (error) {
    logger.error('리뷰 수집 트리거 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
