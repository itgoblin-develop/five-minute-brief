-- 에디터 픽 컬럼 추가
ALTER TABLE news ADD COLUMN IF NOT EXISTS is_editor_pick BOOLEAN DEFAULT FALSE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS editor_pick_at TIMESTAMP;
ALTER TABLE news ADD COLUMN IF NOT EXISTS editor_pick_order INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_news_editor_pick ON news(is_editor_pick) WHERE is_editor_pick = TRUE;

-- 댓글 답글 지원 (parent_id)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES comments(comment_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
