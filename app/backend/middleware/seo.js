// SEO 미들웨어 — 크롤러/소셜 공유용 메타 태그 주입
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const logger = require('../config/logger');

const BASE_URL = process.env.BASE_URL || 'https://itdokkaebi.com';

// 프론트엔드 빌드 index.html 템플릿 캐시
let htmlTemplate = null;

function getHtmlTemplate() {
  if (htmlTemplate) return htmlTemplate;

  const distPath = process.env.FRONTEND_DIST_PATH || path.resolve(__dirname, '../../frontend-dist');
  const indexPath = path.join(distPath, 'index.html');

  try {
    htmlTemplate = fs.readFileSync(indexPath, 'utf8');
    logger.info('SEO: 프론트엔드 index.html 로드 성공', { path: indexPath });
  } catch {
    // 빌드 파일 없으면 최소 HTML (SPA 리다이렉트)
    logger.warn('SEO: 프론트엔드 index.html 없음, 폴백 HTML 사용');
    htmlTemplate = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#3D61F1" />
  <link rel="manifest" href="/manifest.json" />
  <title>IT 도깨비</title>
</head>
<body>
  <div id="root"></div>
  <script>window.location.reload();</script>
</body>
</html>`;
  }

  return htmlTemplate;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectMeta(html, meta) {
  const metaTags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${meta.ogType || 'article'}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    meta.image ? `<meta property="og:image" content="${meta.image}" />` : '',
    `<meta property="og:site_name" content="IT 도깨비" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    meta.image ? `<meta name="twitter:image" content="${meta.image}" />` : '',
  ].filter(Boolean).join('\n    ');

  let jsonLd = '';
  if (meta.jsonLd) {
    jsonLd = `\n    <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`;
  }

  // <title>부터 twitter:image 태그까지 전체 기본 메타 블록 교체
  const metaBlockRegex = /<title>IT 도깨비<\/title>[\s\S]*?<meta name="twitter:image"[^>]*\/>/;
  return html.replace(metaBlockRegex, metaTags + jsonLd);
}

// ─── SEO 라우트 핸들러 ───

async function handleNewsPage(req, res, next) {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return next();
  try {
    const result = await pool.query(
      `SELECT news_id, title, bullet_summary, category, image_url, source_name, created_at
       FROM news WHERE news_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return serveFallbackHtml(res);
    }

    const news = result.rows[0];
    const description = Array.isArray(news.bullet_summary)
      ? news.bullet_summary.slice(0, 2).join(' ')
      : (news.bullet_summary || 'IT 도깨비에서 제공하는 IT 뉴스');
    const imageUrl = news.image_url
      ? (news.image_url.startsWith('http') ? news.image_url : `${BASE_URL}${news.image_url}`)
      : `${BASE_URL}/icon-512.png`;

    const meta = {
      title: `${news.title} - IT 도깨비`,
      description: description.substring(0, 160),
      url: `${BASE_URL}/news/${id}`,
      image: imageUrl,
      ogType: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: news.title,
        description: description.substring(0, 200),
        image: imageUrl,
        url: `${BASE_URL}/news/${id}`,
        author: {
          '@type': 'Organization',
          name: 'IT 도깨비',
          url: BASE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'IT 도깨비',
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
        },
        datePublished: news.created_at,
        dateModified: news.created_at,
        articleSection: news.category,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/news/${id}` },
      },
    };

    res.set('Content-Type', 'text/html');
    res.send(injectMeta(getHtmlTemplate(), meta));
  } catch (err) {
    logger.error('SEO news 오류:', { id, error: err.message });
    serveFallbackHtml(res);
  }
}

async function handleBriefingDetailPage(req, res, next) {
  const { type, id } = req.params;
  if (!id || isNaN(Number(id))) return next();
  const tableMap = { daily: 'daily_briefs', weekly: 'weekly_briefs', monthly: 'monthly_briefs' };
  const tableName = tableMap[type];

  if (!tableName) return next();

  try {
    const result = await pool.query(
      `SELECT brief_id, title, cover_image_url, generated_at FROM ${tableName} WHERE brief_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return serveFallbackHtml(res);
    }

    const brief = result.rows[0];
    const imageUrl = brief.cover_image_url
      ? (brief.cover_image_url.startsWith('http') ? brief.cover_image_url : `${BASE_URL}${brief.cover_image_url}`)
      : `${BASE_URL}/icon-512.png`;
    const typeLabel = type === 'daily' ? '일간' : type === 'weekly' ? '주간' : '월간';

    const meta = {
      title: `${brief.title} - IT 도깨비 ${typeLabel} 브리핑`,
      description: `IT 도깨비의 ${typeLabel} 브리핑입니다. AI가 큐레이션한 IT 뉴스 요약을 확인하세요.`,
      url: `${BASE_URL}/briefing/${type}/${id}`,
      image: imageUrl,
      ogType: 'article',
    };

    res.set('Content-Type', 'text/html');
    res.send(injectMeta(getHtmlTemplate(), meta));
  } catch (err) {
    logger.error('SEO briefing 오류:', { type, id, error: err.message });
    serveFallbackHtml(res);
  }
}

async function handleTrendsPage(req, res) {
  try {
    const result = await pool.query(
      `SELECT top_keywords, date_label FROM daily_briefs ORDER BY generated_at DESC LIMIT 1`
    );

    const keywords = result.rows[0]?.top_keywords || [];
    const keywordText = keywords.slice(0, 5).map(k => k.keyword).join(', ');
    const dateLabel = result.rows[0]?.date_label || '';

    const meta = {
      title: `IT 트렌드 키워드 - IT 도깨비`,
      description: `오늘의 IT 트렌드: ${keywordText}. AI가 분석한 최신 IT 키워드 동향을 확인하세요.`,
      url: `${BASE_URL}/trends`,
      image: `${BASE_URL}/icon-512.png`,
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'IT 트렌드 키워드',
        description: `${dateLabel} IT 트렌드 키워드 — ${keywordText}`,
        url: `${BASE_URL}/trends`,
        publisher: {
          '@type': 'Organization',
          name: 'IT 도깨비',
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
        },
      },
    };

    res.set('Content-Type', 'text/html');
    res.send(injectMeta(getHtmlTemplate(), meta));
  } catch (err) {
    logger.error('SEO trends 오류:', { error: err.message });
    serveFallbackHtml(res);
  }
}

function handleBriefingListPage(req, res) {
  const meta = {
    title: '브리핑 - IT 도깨비',
    description: 'AI가 큐레이션하는 IT 뉴스 브리핑. 일간, 주간, 월간 IT 뉴스 요약을 확인하세요.',
    url: `${BASE_URL}/briefing`,
    image: `${BASE_URL}/icon-512.png`,
    ogType: 'website',
  };

  res.set('Content-Type', 'text/html');
  res.send(injectMeta(getHtmlTemplate(), meta));
}

function serveFallbackHtml(res) {
  const meta = {
    title: 'IT 도깨비 - AI 큐레이션 IT 뉴스',
    description: 'AI가 큐레이션하는 IT 뉴스 브리핑 서비스. 매일 IT 트렌드를 5분만에 파악하세요.',
    url: BASE_URL,
    image: `${BASE_URL}/icon-512.png`,
    ogType: 'website',
  };

  res.set('Content-Type', 'text/html');
  res.send(injectMeta(getHtmlTemplate(), meta));
}

// ─── 블로그 SEO 핸들러 (B-6) ───

function handleBlogListPage(req, res) {
  const meta = {
    title: '블로그 - IT 도깨비',
    description: '현결이 직접 쓰는 IT 인사이트. AI 뉴스와 다른 사람의 시선으로 IT를 봅니다.',
    url: `${BASE_URL}/blog`,
    image: `${BASE_URL}/icon-512.png`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'IT 도깨비 블로그',
      description: '현결이 직접 쓰는 IT 인사이트와 리뷰',
      url: `${BASE_URL}/blog`,
      publisher: {
        '@type': 'Organization',
        name: 'IT 도깨비',
        logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
      },
    },
  };

  res.set('Content-Type', 'text/html');
  res.send(injectMeta(getHtmlTemplate(), meta));
}

async function handleBlogDetailPage(req, res, next) {
  const { slug } = req.params;
  if (!slug) return next();

  try {
    const result = await pool.query(
      `SELECT post_id, title, excerpt, content, category, tags, cover_image_url, meta_description,
              author_name, published_at, updated_at
       FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return serveFallbackHtml(res);
    }

    const post = result.rows[0];
    const description = (post.meta_description || post.excerpt || post.content?.substring(0, 160) || 'IT 도깨비 블로그 글').substring(0, 160);
    const imageUrl = post.cover_image_url
      ? (post.cover_image_url.startsWith('http') ? post.cover_image_url : `${BASE_URL}${post.cover_image_url}`)
      : `${BASE_URL}/icon-512.png`;
    const tags = Array.isArray(post.tags) ? post.tags : [];

    const meta = {
      title: `${post.title} - IT 도깨비 블로그`,
      description,
      url: `${BASE_URL}/blog/${slug}`,
      image: imageUrl,
      ogType: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description,
        image: imageUrl,
        url: `${BASE_URL}/blog/${slug}`,
        author: {
          '@type': 'Person',
          name: post.author_name || '현결',
        },
        publisher: {
          '@type': 'Organization',
          name: 'IT 도깨비',
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
        },
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        articleSection: post.category,
        keywords: tags.join(', '),
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
      },
    };

    res.set('Content-Type', 'text/html');
    res.send(injectMeta(getHtmlTemplate(), meta));
  } catch (err) {
    logger.error('SEO blog 오류:', { slug, error: err.message });
    serveFallbackHtml(res);
  }
}

// HTML 템플릿 캐시 초기화 (배포 시 새 빌드 반영)
function clearTemplateCache() {
  htmlTemplate = null;
}

module.exports = { handleNewsPage, handleBriefingDetailPage, handleBriefingListPage, handleTrendsPage, handleBlogListPage, handleBlogDetailPage, serveFallbackHtml, clearTemplateCache };
