#!/usr/bin/env python3
"""
Apple App Store 리뷰 수집기
- iTunes RSS 피드 기반 (공식, 인증 불필요)
- 기존 playstore_reviews 테이블에 통합 저장
"""

import json
import logging
import time
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List

logger = logging.getLogger(__name__)

RSS_URL = "https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={app_store_id}/json"


def _fetch_rss_reviews(app_store_id: int, country: str = "kr", max_pages: int = 5) -> List[Dict]:
    """RSS 피드에서 리뷰 가져오기 (페이지당 최대 50건)"""
    all_reviews = []

    for page in range(1, max_pages + 1):
        url = RSS_URL.format(country=country, page=page, app_store_id=app_store_id)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())

            entries = data.get("feed", {}).get("entry", [])
            if not entries:
                break

            for entry in entries:
                # 첫 번째 entry는 앱 메타데이터 (im:rating 없음)
                if "im:rating" not in entry:
                    continue

                review = {
                    "id": entry.get("id", {}).get("label", ""),
                    "author": entry.get("author", {}).get("name", {}).get("label", ""),
                    "rating": int(entry.get("im:rating", {}).get("label", "0")),
                    "title": entry.get("title", {}).get("label", ""),
                    "content": entry.get("content", {}).get("label", ""),
                    "version": entry.get("im:version", {}).get("label", ""),
                }
                all_reviews.append(review)

            logger.debug(f"  RSS 페이지 {page}: {len(entries)}건")

            # 다음 페이지가 있는지 확인
            if len(entries) < 50:
                break

            time.sleep(1)

        except Exception as e:
            logger.warning(f"RSS 피드 조회 실패 (page={page}): {e}")
            break

    return all_reviews


def collect_reviews_for_app_appstore(
    conn,
    app_id: int,
    app_store_id: int,
    app_name: str,
    max_reviews: int = 100,
    country: str = "kr",
) -> Dict:
    """단일 앱 리뷰 수집 (Apple App Store)"""
    cur = conn.cursor()

    max_pages = min(max_reviews // 50 + 1, 10)
    reviews = _fetch_rss_reviews(app_store_id, country=country, max_pages=max_pages)

    if not reviews:
        logger.info(f"App Store 리뷰 없음: {app_name} (id={app_store_id})")
        return {"success": True, "app_name": app_name, "collected_count": 0, "skipped_duplicate_count": 0, "total_fetched": 0}

    collected = 0
    skipped = 0

    for review in reviews[:max_reviews]:
        external_id = f"appstore_{review['id']}"
        content = review.get("content", "").strip()
        if not content:
            continue

        # 중복 체크
        cur.execute(
            "SELECT 1 FROM playstore_reviews WHERE app_id = %s AND external_review_id = %s",
            (app_id, external_id),
        )
        if cur.fetchone():
            skipped += 1
            continue

        # 제목이 있으면 내용 앞에 추가
        title = review.get("title", "").strip()
        if title and title != content[:len(title)]:
            content = f"{title}\n{content}"

        cur.execute(
            """INSERT INTO playstore_reviews
               (app_id, external_review_id, author, content, rating,
                review_date, developer_reply_content, developer_reply_date, collected_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                app_id,
                external_id,
                review.get("author"),
                content,
                review.get("rating"),
                None,  # RSS 피드는 정확한 날짜 제공 안 함
                None,  # App Store는 개발자 답글 미제공
                None,
                datetime.now(timezone.utc),
            ),
        )
        collected += 1

    # 마지막 수집 시각 업데이트
    cur.execute(
        "UPDATE playstore_apps SET last_collected_at = %s WHERE app_id = %s",
        (datetime.now(timezone.utc), app_id),
    )

    conn.commit()
    logger.info(
        f"App Store 수집 완료: {app_name} — 신규 {collected}개, 중복 {skipped}개, 전체 {len(reviews)}개"
    )

    return {
        "success": True,
        "app_name": app_name,
        "collected_count": collected,
        "skipped_duplicate_count": skipped,
        "total_fetched": len(reviews),
    }


def collect_all_appstore_apps(conn, max_reviews_per_app: int = 100) -> Dict:
    """App Store ID가 있는 모든 활성 앱의 리뷰 수집"""
    cur = conn.cursor()
    cur.execute(
        "SELECT app_id, app_store_id, name FROM playstore_apps WHERE is_active = TRUE AND app_store_id IS NOT NULL ORDER BY app_id"
    )
    apps = cur.fetchall()

    if not apps:
        logger.warning("App Store ID가 설정된 활성 앱이 없습니다")
        return {"success": True, "total_apps": 0, "total_collected": 0}

    logger.info(f"App Store 리뷰 수집 시작: {len(apps)}개 앱")

    results = []
    total_collected = 0

    for app_id, app_store_id, name in apps:
        result = collect_reviews_for_app_appstore(
            conn, app_id, app_store_id, name, max_reviews=max_reviews_per_app
        )
        results.append(result)
        total_collected += result.get("collected_count", 0)

        # 앱 간 딜레이 (rate limit 방지)
        time.sleep(2)

    logger.info(f"App Store 수집 완료: {len(apps)}개 앱, 총 {total_collected}개 리뷰")

    return {
        "success": True,
        "total_apps": len(apps),
        "total_collected": total_collected,
        "results": results,
    }
