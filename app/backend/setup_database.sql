-- =============================================================
-- Five Minute Brief - Full Database Setup
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
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_category_published ON news(category, published_at);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);

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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_news
        FOREIGN KEY (news_id) REFERENCES news(news_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_news_created ON comments(news_id, created_at);

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
-- Verification
-- =============================================================
SELECT '--- Database setup complete: 10 tables created ---' AS status;
\dt
