-- =============================================================
-- Play Store 리뷰 수집 + 브리핑 통합 마이그레이션
-- 실행: psql -U postgres -d five_minute_brief -f add_review_tables.sql
-- =============================================================

-- =============================================================
-- TABLE: playstore_apps (수집 대상 앱)
-- =============================================================
CREATE TABLE IF NOT EXISTS playstore_apps (
    app_id SERIAL PRIMARY KEY,
    package_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    store_url TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_collected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playstore_apps_package_id ON playstore_apps(package_id);
CREATE INDEX IF NOT EXISTS idx_playstore_apps_is_active ON playstore_apps(is_active);

-- =============================================================
-- TABLE: playstore_reviews (수집된 리뷰)
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
-- TABLE: review_daily_summaries (일간 앱별 요약)
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

-- =============================================================
-- daily_briefs 테이블에 review_highlights 컬럼 추가
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_briefs' AND column_name = 'review_highlights'
    ) THEN
        ALTER TABLE daily_briefs ADD COLUMN review_highlights JSONB;
    END IF;
END $$;
