-- 뉴스레터 구독자 테이블
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
