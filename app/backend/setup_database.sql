-- =============================================================
-- IT 도깨비 - Full Database Setup
-- 실행 방법: psql -U postgres -f setup_database.sql
-- =============================================================

-- 1. 데이터베이스 생성 (이미 있으면 에러 무시)
CREATE DATABASE five_minute_brief;

-- 2. 데이터베이스 선택
\c five_minute_brief

-- =============================================================
-- TABLE 1: users
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'local',
    social_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_social UNIQUE (provider, social_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_provider_social ON users(provider, social_id);

-- =============================================================
-- TABLE 2: news
-- Compatible with db_loader.py INSERT SQL:
--   INSERT INTO news (title, summary, bullet_summary, content,
--     category, hashtags, source_url, source_name,
--     source_count, published_at)
-- =============================================================
CREATE TABLE IF NOT EXISTS news (
    news_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    bullet_summary JSONB,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    hashtags JSONB,
    image_url VARCHAR(500),
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    source_count INT DEFAULT 1,
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    admin_comment TEXT,
    admin_comment_at TIMESTAMP,
    admin_comment_auto BOOLEAN DEFAULT FALSE,
    is_editor_pick BOOLEAN DEFAULT FALSE,
    editor_pick_at TIMESTAMP,
    editor_pick_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_news_category_published ON news(category, published_at);
CREATE INDEX IF NOT EXISTS idx_news_editor_pick ON news(is_editor_pick) WHERE is_editor_pick = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_title_unique ON news(title);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- 전문 검색(FTS) 지원
ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_news_search_vector ON news USING GIN(search_vector);

CREATE OR REPLACE FUNCTION news_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_news_search_vector ON news;
CREATE TRIGGER trg_news_search_vector
  BEFORE INSERT OR UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION news_search_vector_update();

-- =============================================================
-- TABLE 3: user_settings
-- =============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    notification_time TIME,
    notification_days JSONB,
    smart_notification BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================
-- TABLE 4: device_tokens
-- =============================================================
CREATE TABLE IF NOT EXISTS device_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    fcm_token VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_device_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

-- =============================================================
-- TABLE 5: user_view_logs
-- =============================================================
CREATE TABLE IF NOT EXISTS user_view_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    news_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_view_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_view_logs_news
        FOREIGN KEY (news_id) REFERENCES news(news_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_view_logs_user_viewed ON user_view_logs(user_id, viewed_at);

-- =============================================================
-- TABLE 6: likes
-- =============================================================
CREATE TABLE IF NOT EXISTS likes (
    like_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    news_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_likes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_news
        FOREIGN KEY (news_id) REFERENCES news(news_id) ON DELETE CASCADE,
    CONSTRAINT uq_likes_user_news UNIQUE (user_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_news_id ON likes(news_id);

-- =============================================================
-- TABLE 7: bookmarks
-- =============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    bookmark_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    news_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_bookmarks_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmarks_news
        FOREIGN KEY (news_id) REFERENCES news(news_id) ON DELETE CASCADE,
    CONSTRAINT uq_bookmarks_user_news UNIQUE (user_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_news_id ON bookmarks(news_id);

-- =============================================================
-- TABLE 8: comments
-- =============================================================
CREATE TABLE IF NOT EXISTS comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    news_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_news
        FOREIGN KEY (news_id) REFERENCES news(news_id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_news_created ON comments(news_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- =============================================================
-- TABLE 9: push_subscriptions (Web Push 구독 정보)
-- =============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(512) NOT NULL,
    auth VARCHAR(512) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_push_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_push_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON push_subscriptions(user_id);

-- =============================================================
-- TABLE 10: notification_logs (알림 발송 이력)
-- =============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    category VARCHAR(50) DEFAULT '맞춤 뉴스 배달',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_user_created ON notification_logs(user_id, created_at DESC);

-- =============================================================
-- TABLE 11: weekly_briefs (주간 브리핑)
-- =============================================================
CREATE TABLE IF NOT EXISTS weekly_briefs (
    brief_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    period VARCHAR(50) NOT NULL,          -- "2026.02.24 ~ 2026.03.02"
    week_label VARCHAR(20) NOT NULL,      -- "2026-W09"
    top_keywords JSONB,                   -- [{keyword, description}]
    category_highlights JSONB,            -- [{category, content}]
    weekly_comment TEXT,                   -- IT 도깨비 주간 코멘트
    next_week_preview JSONB,              -- [예고 문자열]
    stats JSONB,                          -- {total_articles, total_days, category_counts}
    raw_data JSONB,                       -- 원본 AI 응답 전체
    is_fallback BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    editor_comment TEXT,
    editor_comment_at TIMESTAMP,
    editor_comment_auto BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_weekly_briefs_week ON weekly_briefs(week_label);
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_generated ON weekly_briefs(generated_at DESC);

-- =============================================================
-- TABLE 12: monthly_briefs (월간 브리핑)
-- =============================================================
CREATE TABLE IF NOT EXISTS monthly_briefs (
    brief_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    period VARCHAR(50) NOT NULL,          -- "2026년 02월"
    month_label VARCHAR(10) NOT NULL,     -- "2026-02"
    top_keywords JSONB,                   -- [{keyword, description}]
    deep_articles JSONB,                  -- [{title, content, hashtags}]
    monthly_editorial TEXT,               -- IT 도깨비 월간 에디토리얼
    stats JSONB,                          -- {total_articles, avg_daily, ...}
    raw_data JSONB,                       -- 원본 AI 응답 전체
    is_fallback BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    editor_comment TEXT,
    editor_comment_at TIMESTAMP,
    editor_comment_auto BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_monthly_briefs_month ON monthly_briefs(month_label);
CREATE INDEX IF NOT EXISTS idx_monthly_briefs_generated ON monthly_briefs(generated_at DESC);

-- =============================================================
-- TABLE 13: daily_briefs (일간 뉴스레터)
-- =============================================================
CREATE TABLE IF NOT EXISTS daily_briefs (
    brief_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    date_label VARCHAR(10) NOT NULL,        -- "2026-03-02"
    intro_comment TEXT,                     -- IT 도깨비 도입 멘트
    top_keywords JSONB,                     -- [{keyword, description}]
    category_highlights JSONB,              -- [{category, title, summary}]
    daily_comment TEXT,                     -- 마무리 코멘트
    stats JSONB,                           -- {total_articles, category_counts}
    raw_data JSONB,                        -- 원본 AI 응답 전체
    is_fallback BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    editor_comment TEXT,
    editor_comment_at TIMESTAMP,
    editor_comment_auto BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_daily_briefs_date ON daily_briefs(date_label);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_generated ON daily_briefs(generated_at DESC);

-- =============================================================
-- cover_image_url 컬럼 추가 (브리핑 커버 이미지)
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_briefs' AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE daily_briefs ADD COLUMN cover_image_url VARCHAR(500);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_briefs' AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE weekly_briefs ADD COLUMN cover_image_url VARCHAR(500);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'monthly_briefs' AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE monthly_briefs ADD COLUMN cover_image_url VARCHAR(500);
    END IF;
END $$;

-- =============================================================
-- news 테이블 컬럼 추가 (기존 데이터 호환)
-- briefing_type: 'daily' (기본값), 향후 확장용
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'news' AND column_name = 'briefing_type'
    ) THEN
        ALTER TABLE news ADD COLUMN briefing_type VARCHAR(20) DEFAULT 'daily';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_news_briefing_type ON news(briefing_type);

-- =============================================================
-- 소프트 삭제 컬럼 추가 (회원 탈퇴 유예 기간)
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'deletion_scheduled_at'
    ) THEN
        ALTER TABLE users ADD COLUMN deletion_scheduled_at TIMESTAMP;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled ON users(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;

-- =============================================================
-- TABLE 14: playstore_apps (Play Store 수집 대상 앱)
-- =============================================================
CREATE TABLE IF NOT EXISTS playstore_apps (
    app_id SERIAL PRIMARY KEY,
    package_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    store_url TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    store_type VARCHAR(20) DEFAULT 'playstore',
    app_store_id BIGINT,
    last_collected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playstore_apps_package_id ON playstore_apps(package_id);
CREATE INDEX IF NOT EXISTS idx_playstore_apps_is_active ON playstore_apps(is_active);

-- =============================================================
-- TABLE 15: playstore_reviews (Play Store 수집된 리뷰)
-- =============================================================
CREATE TABLE IF NOT EXISTS playstore_reviews (
    review_id SERIAL PRIMARY KEY,
    app_id INT NOT NULL REFERENCES playstore_apps(app_id) ON DELETE CASCADE,
    external_review_id VARCHAR(255),
    author VARCHAR(255),
    content TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_date TIMESTAMP,
    developer_reply_content TEXT,
    developer_reply_date TIMESTAMP,
    sentiment_score FLOAT,
    ai_summary TEXT,
    ai_category VARCHAR(100),
    ai_analyzed_at TIMESTAMP,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playstore_reviews_app_id ON playstore_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_playstore_reviews_review_date ON playstore_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_playstore_reviews_collected_at ON playstore_reviews(collected_at);
CREATE INDEX IF NOT EXISTS idx_playstore_reviews_rating ON playstore_reviews(rating);
CREATE UNIQUE INDEX IF NOT EXISTS idx_playstore_reviews_app_external
    ON playstore_reviews(app_id, external_review_id);

-- =============================================================
-- TABLE 16: review_daily_summaries (일간 앱별 리뷰 요약)
-- =============================================================
CREATE TABLE IF NOT EXISTS review_daily_summaries (
    summary_id SERIAL PRIMARY KEY,
    app_id INT NOT NULL REFERENCES playstore_apps(app_id) ON DELETE CASCADE,
    date_label VARCHAR(10) NOT NULL,
    review_count INT DEFAULT 0,
    avg_rating FLOAT,
    sentiment_avg FLOAT,
    sentiment_change FLOAT,
    rating_distribution JSONB,
    top_issues JSONB,
    ai_highlight TEXT,
    notability_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_review_summary_app_date UNIQUE (app_id, date_label)
);

CREATE INDEX IF NOT EXISTS idx_review_summaries_date ON review_daily_summaries(date_label);
CREATE INDEX IF NOT EXISTS idx_review_summaries_notability
    ON review_daily_summaries(date_label, notability_score DESC);

-- daily_briefs에 review_highlights 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_briefs' AND column_name = 'review_highlights'
    ) THEN
        ALTER TABLE daily_briefs ADD COLUMN review_highlights JSONB;
    END IF;
END $$;

-- =============================================================
-- TABLE: newsletter_subscribers
-- =============================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    subscriber_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    verify_token VARCHAR(255),
    unsubscribe_token VARCHAR(255) NOT NULL,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    unsubscribed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_newsletter_user ON newsletter_subscribers(user_id);

-- =============================================================
-- TABLE: blog_posts (블로그 게시글)
-- =============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    post_id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT,
    category VARCHAR(50) DEFAULT '인사이트',
    tags JSONB DEFAULT '[]',
    cover_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    author_name VARCHAR(100) DEFAULT '현결',
    view_count INT DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    meta_description VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector ON blog_posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION blog_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blog_search_vector ON blog_posts;
CREATE TRIGGER trg_blog_search_vector
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION blog_search_vector_update();

-- TABLE: blog_likes
CREATE TABLE IF NOT EXISTS blog_likes (
    like_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_blog_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_likes_post FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT uq_blog_likes_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_post_id ON blog_likes(post_id);

-- TABLE: blog_bookmarks
CREATE TABLE IF NOT EXISTS blog_bookmarks (
    bookmark_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_blog_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_bookmarks_post FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT uq_blog_bookmarks_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_user_id ON blog_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_post_id ON blog_bookmarks(post_id);

-- TABLE: blog_comments
CREATE TABLE IF NOT EXISTS blog_comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_blog_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_comments_post FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_comments_parent FOREIGN KEY (parent_id) REFERENCES blog_comments(comment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_created ON blog_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);

-- =============================================================
-- Verification
-- =============================================================
SELECT '--- Database setup complete: 21 tables created ---' AS status;
\dt
