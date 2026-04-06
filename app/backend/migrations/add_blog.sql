-- =============================================================
-- B-6: 블로그 테이블 마이그레이션
-- 실행: psql -U postgres -d five_minute_brief -f add_blog.sql
-- =============================================================

-- blog_posts: 블로그 게시글
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

-- 전문 검색(FTS) 지원
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

-- blog_likes: 블로그 좋아요
CREATE TABLE IF NOT EXISTS blog_likes (
    like_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_blog_likes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_likes_post
        FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT uq_blog_likes_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_post_id ON blog_likes(post_id);

-- blog_bookmarks: 블로그 북마크
CREATE TABLE IF NOT EXISTS blog_bookmarks (
    bookmark_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_blog_bookmarks_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_bookmarks_post
        FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT uq_blog_bookmarks_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_user_id ON blog_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_post_id ON blog_bookmarks(post_id);

-- blog_comments: 블로그 댓글 (1단계 답글 지원)
CREATE TABLE IF NOT EXISTS blog_comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_blog_comments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_comments_post
        FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_comments_parent
        FOREIGN KEY (parent_id) REFERENCES blog_comments(comment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_created ON blog_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);

SELECT '--- Blog tables created successfully ---' AS status;
