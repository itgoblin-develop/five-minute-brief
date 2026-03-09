#!/usr/bin/env python3
"""
Play Store 리뷰 수집기
- google-play-scraper로 리뷰 수집
- psycopg2로 DB 직접 저장
- ica_2week_ai_feedback_automation 프로젝트 기반 (SQLAlchemy → psycopg2 전환)
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Optional

from google_play_scraper import reviews_all, Sort

logger = logging.getLogger(__name__)


def collect_reviews_for_app(
    conn,
    app_id: int,
    package_id: str,
    app_name: str,
    max_reviews: int = 100,
    lang: str = "ko",
    country: str = "kr",
) -> Dict:
    """단일 앱 리뷰 수집"""
    cur = conn.cursor()

    logger.info(f"리뷰 수집 시작: {app_name} ({package_id})")

    # Play Store에서 리뷰 수집 (재시도 로직 포함)
    max_retries = 3
    result = None

    for attempt in range(max_retries):
        try:
            result = reviews_all(
                package_id,
                sleep_milliseconds=2000,
                lang=lang,
                country=country,
                sort=Sort.NEWEST,
            )
            break
        except Exception as e:
            error_msg = str(e).lower()
            is_rate_limit = any(
                kw in error_msg
                for kw in ["rate", "limit", "block", "429", "503", "timeout"]
            )
            wait = 2 * (2 ** attempt) if is_rate_limit else 2
            logger.warning(
                f"수집 실패 (시도 {attempt + 1}/{max_retries}): {e}"
            )
            if attempt < max_retries - 1:
                time.sleep(wait)
            else:
                logger.error(f"최대 재시도 초과: {app_name}")
                return {"success": False, "error": str(e), "collected_count": 0}

    if not result:
        return {"success": True, "collected_count": 0, "app_name": app_name}

    # max_reviews 제한
    if len(result) > max_reviews:
        result = result[:max_reviews]

    # DB에 저장
    collected = 0
    skipped = 0

    for review_data in result:
        external_id = review_data.get("reviewId")
        content = review_data.get("content")
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

        # 리뷰 날짜 처리
        review_date = review_data.get("at")
        if isinstance(review_date, str):
            try:
                review_date = datetime.fromisoformat(review_date.replace("Z", "+00:00"))
            except ValueError:
                review_date = None

        # 개발자 댓글 처리
        dev_reply = review_data.get("replyContent")
        dev_reply_date = review_data.get("repliedAt")
        if dev_reply and dev_reply_date:
            if isinstance(dev_reply_date, str):
                try:
                    dev_reply_date = datetime.fromisoformat(
                        dev_reply_date.replace("Z", "+00:00")
                    )
                except ValueError:
                    dev_reply_date = None
            # 개발자 댓글 날짜가 리뷰 날짜 이전이면 무시
            if dev_reply_date and review_date and dev_reply_date < review_date:
                dev_reply_date = None
        else:
            dev_reply = None
            dev_reply_date = None

        cur.execute(
            """INSERT INTO playstore_reviews
               (app_id, external_review_id, author, content, rating,
                review_date, developer_reply_content, developer_reply_date, collected_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                app_id,
                external_id,
                review_data.get("userName"),
                content,
                review_data.get("score"),
                review_date,
                dev_reply,
                dev_reply_date,
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
        f"수집 완료: {app_name} — 신규 {collected}개, 중복 {skipped}개, 전체 {len(result)}개"
    )

    return {
        "success": True,
        "app_name": app_name,
        "package_id": package_id,
        "collected_count": collected,
        "skipped_duplicate_count": skipped,
        "total_fetched": len(result),
    }


def collect_all_active_apps(conn, max_reviews_per_app: int = 100) -> Dict:
    """모든 활성 앱의 리뷰 수집"""
    cur = conn.cursor()
    cur.execute(
        "SELECT app_id, package_id, name FROM playstore_apps WHERE is_active = TRUE ORDER BY app_id"
    )
    apps = cur.fetchall()

    if not apps:
        logger.warning("활성화된 앱이 없습니다")
        return {"success": True, "total_apps": 0, "total_collected": 0}

    logger.info(f"전체 앱 리뷰 수집 시작: {len(apps)}개 앱")

    results = []
    total_collected = 0

    for app_id, package_id, name in apps:
        result = collect_reviews_for_app(
            conn, app_id, package_id, name, max_reviews=max_reviews_per_app
        )
        results.append(result)
        total_collected += result.get("collected_count", 0)

        # 앱 간 딜레이 (rate limit 방지)
        time.sleep(1)

    logger.info(f"전체 수집 완료: {len(apps)}개 앱, 총 {total_collected}개 리뷰")

    return {
        "success": True,
        "total_apps": len(apps),
        "total_collected": total_collected,
        "results": results,
    }
