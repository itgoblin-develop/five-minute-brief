// SEO 라우트 — sitemap.xml, robots.txt 동적 생성
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');

const BASE_URL = process.env.BASE_URL || 'https://itdokkaebi.com';

// ─── sitemap.xml ───
router.get('/sitemap.xml', async (req, res) => {
  try {
    // 뉴스 기사 URL
    const newsResult = await pool.query(
      `SELECT news_id, created_at FROM news ORDER BY created_at DESC LIMIT 1000`
    );

    // 일간 브리핑 URL
    const dailyResult = await pool.query(
      `SELECT brief_id, generated_at FROM daily_briefs ORDER BY generated_at DESC LIMIT 100`
    );

    // 주간 브리핑 URL
    const weeklyResult = await pool.query(
      `SELECT brief_id, generated_at FROM weekly_briefs ORDER BY generated_at DESC LIMIT 50`
    );

    // 월간 브리핑 URL
    const monthlyResult = await pool.query(
      `SELECT brief_id, generated_at FROM monthly_briefs ORDER BY generated_at DESC LIMIT 50`
    );

    // 블로그 URL
    const blogResult = await pool.query(
      `SELECT slug, updated_at, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 500`
    );

    const urls = [];

    // 정적 페이지
    urls.push({ loc: BASE_URL, changefreq: 'daily', priority: '1.0' });
    urls.push({ loc: `${BASE_URL}/trends`, changefreq: 'daily', priority: '0.8' });
    urls.push({ loc: `${BASE_URL}/briefing`, changefreq: 'daily', priority: '0.8' });
    urls.push({ loc: `${BASE_URL}/blog`, changefreq: 'weekly', priority: '0.8' });

    // 뉴스 기사
    for (const row of newsResult.rows) {
      urls.push({
        loc: `${BASE_URL}/news/${row.news_id}`,
        lastmod: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : undefined,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }

    // 일간 브리핑
    for (const row of dailyResult.rows) {
      urls.push({
        loc: `${BASE_URL}/briefing/daily/${row.brief_id}`,
        lastmod: row.generated_at ? new Date(row.generated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'monthly',
        priority: '0.6',
      });
    }

    // 주간 브리핑
    for (const row of weeklyResult.rows) {
      urls.push({
        loc: `${BASE_URL}/briefing/weekly/${row.brief_id}`,
        lastmod: row.generated_at ? new Date(row.generated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'monthly',
        priority: '0.6',
      });
    }

    // 월간 브리핑
    for (const row of monthlyResult.rows) {
      urls.push({
        loc: `${BASE_URL}/briefing/monthly/${row.brief_id}`,
        lastmod: row.generated_at ? new Date(row.generated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'yearly',
        priority: '0.5',
      });
    }

    // 블로그 글
    for (const row of blogResult.rows) {
      const lastmod = row.updated_at || row.published_at;
      urls.push({
        loc: `${BASE_URL}/blog/${row.slug}`,
        lastmod: lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined,
        changefreq: 'monthly',
        priority: '0.7',
      });
    }

    // XML 생성
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    logger.error('sitemap 생성 오류:', err.message);
    res.status(500).set('Content-Type', 'text/plain').send('Sitemap generation error');
  }
});

// ─── robots.txt ───
router.get('/robots.txt', (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Allow: /news/
Allow: /briefing/
Allow: /trends
Allow: /blog/

Disallow: /api/
Disallow: /admin
Disallow: /settings
Disallow: /edit-profile

Sitemap: ${BASE_URL}/sitemap.xml
`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

module.exports = router;
