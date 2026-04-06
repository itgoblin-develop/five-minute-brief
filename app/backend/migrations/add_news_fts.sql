-- 뉴스 전문 검색(Full-Text Search) 지원
-- search_vector tsvector 컬럼 추가
ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 기존 데이터 채우기 (한국어는 'simple' 파서 사용)
UPDATE news SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'C');

-- GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_news_search_vector ON news USING GIN(search_vector);

-- 자동 업데이트 트리거
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
