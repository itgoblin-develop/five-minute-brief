#!/usr/bin/env python3
"""
썸네일 백필 스크립트

DB에서 썸네일이 없거나 default 이미지인 기사를 찾아
새 도깨비 사이버펑크 스타일 썸네일을 생성하고 DB를 업데이트한다.

사용법 (서버에서 실행):
    cd ~/five-minute-brief
    python pipeline/backfill_thumbnails.py

    # 드라이런 (이미지 생성 없이 대상 기사만 조회):
    python pipeline/backfill_thumbnails.py --dry-run

    # 생성 수 제한:
    python pipeline/backfill_thumbnails.py --limit 10

    # 특정 카테고리 전체 재생성 (이미 썸네일 있어도):
    python pipeline/backfill_thumbnails.py --force-category AI
    python pipeline/backfill_thumbnails.py --force-category 모바일
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# 프로젝트 루트 기준으로 .env 로드
project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

sys.path.insert(0, str(project_root / "pipeline" / "reconstruction"))
from image_generator import ThumbnailGenerator, CATEGORY_KR  # noqa: E402


# default 이미지 경로 패턴 (이 값이면 썸네일 없는 것으로 간주)
DEFAULT_IMAGE_PREFIXES = ("/assets/default/",)


def is_missing_thumbnail(image_url: str) -> bool:
    """썸네일이 없거나 default 이미지인지 확인"""
    if not image_url:
        return True
    for prefix in DEFAULT_IMAGE_PREFIXES:
        if image_url.startswith(prefix):
            return True
    return False


def fetch_articles_without_thumbnails(conn, limit: int = None, force_category: str = None) -> list:
    """DB에서 썸네일이 없는 기사 조회 (force_category 지정 시 해당 카테고리 전체)"""
    if force_category:
        query = """
            SELECT news_id, title, category, hashtags, image_url
            FROM news
            WHERE category = %s
            ORDER BY published_at DESC
        """
        params = [force_category]
    else:
        query = """
            SELECT news_id, title, category, hashtags, image_url
            FROM news
            WHERE image_url IS NULL
               OR image_url = ''
               OR image_url LIKE '/assets/default/%'
            ORDER BY published_at DESC
        """
        params = []

    if limit:
        query += f" LIMIT {limit}"

    with conn.cursor() as cur:
        cur.execute(query, params if params else None)
        rows = cur.fetchall()

    articles = []
    for row in rows:
        news_id, title, category, hashtags_json, image_url = row
        hashtags = hashtags_json if isinstance(hashtags_json, list) else []
        articles.append({
            "news_id": news_id,
            "title": title,
            "category": category,
            "hashtags": hashtags,
            "image_url": image_url,
        })
    return articles


def update_image_url(conn, news_id: int, image_url: str):
    """DB의 image_url 업데이트"""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE news SET image_url = %s WHERE news_id = %s",
            (image_url, news_id),
        )
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="썸네일 백필 스크립트")
    parser.add_argument("--dry-run", action="store_true", help="이미지 생성 없이 대상만 출력")
    parser.add_argument("--limit", type=int, default=None, help="처리할 최대 기사 수")
    parser.add_argument("--force-category", metavar="CATEGORY", default=None,
                        help="이미 썸네일 있어도 해당 카테고리 전체 재생성 (예: AI, 모바일)")
    args = parser.parse_args()

    # DB 연결
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5432)),
            dbname=os.getenv("DB_NAME", "five_minute_brief"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", ""),
        )
        print(f"✅ DB 연결 성공 ({os.getenv('DB_HOST')}:{os.getenv('DB_PORT')})")
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        sys.exit(1)

    # 대상 기사 조회
    articles = fetch_articles_without_thumbnails(conn, limit=args.limit, force_category=args.force_category)
    label = f"카테고리 [{args.force_category}] 전체" if args.force_category else "썸네일 없는"
    print(f"\n📋 {label} 기사: {len(articles)}건")

    if not articles:
        print("모든 기사에 썸네일이 있습니다.")
        conn.close()
        return

    # 카테고리별 집계 출력
    from collections import Counter
    cat_counts = Counter(a["category"] for a in articles)
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}건")

    if args.dry_run:
        print("\n[DRY RUN] 실제 생성 없이 종료합니다.")
        conn.close()
        return

    # ThumbnailGenerator 초기화
    image_config = {
        "model": "gemini-2.5-flash-image",
        "request_interval": 1.5,  # 백필이므로 조금 여유있게
        "default_images": {
            "모바일": "/assets/default/mobile.webp",
            "PC": "/assets/default/pc.webp",
            "AI": "/assets/default/ai.webp",
            "네트워크/통신": "/assets/default/network.webp",
            "보안": "/assets/default/security.webp",
            "기타": "/assets/default/etc.webp",
        },
    }

    try:
        gen = ThumbnailGenerator(image_config)
    except ValueError as e:
        print(f"❌ ThumbnailGenerator 초기화 실패: {e}")
        conn.close()
        sys.exit(1)

    print(f"\n🎨 썸네일 생성 시작 (저장 경로: {gen.output_dir})\n")

    # 카테고리별 인덱스 추적
    cat_counters = {}
    success = 0
    skipped = 0

    for i, article in enumerate(articles, 1):
        category = article["category"]
        cat_counters[category] = cat_counters.get(category, 0) + 1
        idx = cat_counters[category]

        title_short = article["title"][:30]
        print(f"[{i}/{len(articles)}] {category} | {title_short}...")

        image_url = gen.generate_one(article, idx)

        if image_url:
            update_image_url(conn, article["news_id"], image_url)
            print(f"  → {image_url}")
            success += 1
        else:
            print(f"  → 생성 실패, DB 업데이트 건너뜀")
            skipped += 1

        # rate limit 대기 (마지막 항목 제외)
        if i < len(articles) and gen.interval > 0:
            time.sleep(gen.interval)

    conn.close()
    print(f"\n✅ 백필 완료: {success}건 성공, {skipped}건 실패")
    print(f"   이미지 저장 경로: {gen.output_dir}")


if __name__ == "__main__":
    main()
