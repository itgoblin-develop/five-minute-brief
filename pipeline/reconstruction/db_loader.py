#!/usr/bin/env python3
"""
Phase 5: DB 적재 모듈
- PostgreSQL INSERT (JSONB 컬럼 포함)
- 카테고리 매핑
- ON CONFLICT DO NOTHING
"""

import json
import os
from datetime import datetime
from typing import Dict, List


CATEGORY_MAP = {
    "IT": "IT 소식",
    "Review": "리뷰",
    "HowTo": "사용 방법",
}

INSERT_SQL = """
    INSERT INTO news (
        title, summary, bullet_summary, content,
        category, hashtags, image_url, source_url, source_name,
        source_count, published_at
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT DO NOTHING
"""


def load_to_db(reconstructed_articles: List[dict], db_config: dict = None):
    """
    재구성 기사를 PostgreSQL에 적재

    Args:
        reconstructed_articles: 재구성된 기사 리스트
        db_config: DB 연결 설정 (None이면 환경변수 사용)
    """
    import psycopg2

    if db_config is None:
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv("DB_NAME", "five_minute_brief"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", ""),
        }

    conn = None
    try:
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()

        inserted = 0
        failed = 0

        for article in reconstructed_articles:
            try:
                # 출처 매체명 추출
                source_articles = article.get("_source_articles", [])
                source_names = ", ".join(sorted(set(
                    a.get("press", "") for a in source_articles if a.get("press")
                )))

                # 카테고리 한글 변환
                category = CATEGORY_MAP.get(
                    article.get("category", ""),
                    article.get("category", "")
                )

                cur.execute(INSERT_SQL, (
                    article["title"],
                    article["summary"],
                    json.dumps(article["bullet_summary"], ensure_ascii=False),
                    article["content"],
                    category,
                    json.dumps(article["hashtags"], ensure_ascii=False),
                    article.get("image_url", ""),
                    article.get("source_links", [""])[0] if article.get("source_links") else "",
                    source_names,
                    article.get("source_count", 1),
                    datetime.now(),
                ))
                inserted += 1
            except Exception as e:
                print(f"  ❌ DB INSERT 실패 [{article.get('title', '')[:20]}...]: {e}")
                conn.rollback()
                failed += 1
                continue

        conn.commit()
        print(f"  📊 DB 적재 결과: {inserted}건 성공, {failed}건 실패 (총 {len(reconstructed_articles)}건)")

    except Exception as e:
        print(f"  ❌ DB 연결 실패: {e}")
        # JSON 파일로 임시 저장
        fallback_path = f"reconstructed_fallback_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        save_data = []
        for article in reconstructed_articles:
            save_article = {k: v for k, v in article.items() if not k.startswith("_")}
            save_data.append(save_article)
        with open(fallback_path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        print(f"  💾 DB 실패 → JSON 임시 저장: {fallback_path}")
    finally:
        if conn:
            conn.close()


def get_create_table_sql() -> str:
    """news 테이블 생성 SQL (참고용)"""
    return """
    -- v1.1 추가 컬럼 포함
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

    -- 인덱스
    CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
    CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
    """
