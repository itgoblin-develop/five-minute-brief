#!/usr/bin/env python3
"""
리뷰 분석기 (앱별 배치)
- 개별 감정 분석: 평점 기반 로컬 계산 (API 호출 없음)
- 앱별 종합 분석: Gemini 1회 호출 (이슈 요약, 개발자 대응, 키워드)
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))

logger = logging.getLogger(__name__)

# ── 평점 기반 감정 점수 (API 호출 없음) ──
RATING_SENTIMENT = {
    1: -0.9,
    2: -0.5,
    3: 0.0,
    4: 0.5,
    5: 0.9,
}

# ── 앱별 종합 분석 프롬프트 (Gemini 1회) ──
BATCH_SYSTEM_PROMPT = """당신은 Play Store 앱 리뷰 트렌드 분석 전문가입니다.
한 앱의 최근 리뷰들을 종합적으로 분석하여 JSON으로 응답하세요."""

BATCH_PROMPT = """'{app_name}' 앱의 최근 리뷰 {review_count}개를 종합 분석하세요.

=== 리뷰 ===
{reviews_block}

JSON 형식:
{{
  "summary": "오늘 이 앱 리뷰 종합 요약 (100자 이내)",
  "main_issues": [
    {{"category": "카테고리", "description": "이슈 설명 (50자)", "count": 관련 리뷰 수}}
  ],
  "developer_response": "개발자 답변 대응 방향 요약 (50자, 없으면 빈 문자열)",
  "positive_points": ["긍정 포인트1", "긍정 포인트2"],
  "negative_points": ["부정 포인트1", "부정 포인트2"],
  "keywords": ["키워드1", "키워드2", "키워드3"]
}}

카테고리: bug, performance, ux, feature_request, update, login, praise, other
main_issues는 많이 언급된 순 최대 5개."""


def _rating_to_sentiment(rating: int) -> float:
    """평점 → 감정 점수 (로컬 계산, API 없음)"""
    return RATING_SENTIMENT.get(rating, 0.0)


def _build_reviews_block(reviews: list) -> str:
    """리뷰 목록을 프롬프트 텍스트로 변환"""
    blocks = []
    for i, (review_id, content, rating, dev_reply) in enumerate(reviews, 1):
        block = f"[{i}] ★{rating or '?'} | {(content or '')[:300]}"
        if dev_reply:
            block += f"\n  → 개발자: {dev_reply[:200]}"
        blocks.append(block)
    return "\n".join(blocks)


def analyze_reviews(conn, llm_router, date_label: str = None) -> Dict:
    """
    1단계: 개별 리뷰 감정 → 평점 기반 로컬 계산 (즉시, API 없음)
    2단계: 앱별 종합 분석 → Gemini 1회 호출 (이슈/요약/키워드)
    """
    cur = conn.cursor()

    if not date_label:
        date_label = datetime.now().strftime("%Y-%m-%d")

    # ── 1단계: 평점 기반 감정 점수 일괄 업데이트 (로컬, 0 API 호출) ──
    cur.execute(
        """SELECT review_id, rating
           FROM playstore_reviews
           WHERE (collected_at AT TIME ZONE 'Asia/Seoul')::date = %s::date
             AND ai_analyzed_at IS NULL
             AND rating IS NOT NULL""",
        (date_label,),
    )
    unanalyzed = cur.fetchall()

    if unanalyzed:
        for review_id, rating in unanalyzed:
            sentiment = _rating_to_sentiment(rating)
            cur.execute(
                """UPDATE playstore_reviews
                   SET sentiment_score = %s, ai_analyzed_at = %s
                   WHERE review_id = %s""",
                (sentiment, datetime.now(timezone.utc), review_id),
            )
        conn.commit()
        logger.info(f"감정 점수 로컬 계산 완료: {len(unanalyzed)}개 리뷰")

    # ── 2단계: 앱별 종합 분석 (Gemini 앱당 1회) ──
    cur.execute(
        """SELECT DISTINCT a.app_id, a.name
           FROM playstore_apps a
           JOIN playstore_reviews r ON a.app_id = r.app_id
           WHERE a.is_active = TRUE
             AND (r.collected_at AT TIME ZONE 'Asia/Seoul')::date = %s::date
           ORDER BY a.name""",
        (date_label,),
    )
    apps = cur.fetchall()

    if not apps:
        logger.info("종합 분석할 앱이 없습니다")
        return {"local_sentiment": len(unanalyzed), "apps_analyzed": 0, "failed": 0}

    logger.info(f"앱 {len(apps)}개 종합 분석 시작 (Gemini 앱당 1회)")

    analyzed = 0
    failed = 0

    for app_id, app_name in apps:
        try:
            # 당일 리뷰 조회
            cur.execute(
                """SELECT review_id, content, rating, developer_reply_content
                   FROM playstore_reviews
                   WHERE app_id = %s AND (collected_at AT TIME ZONE 'Asia/Seoul')::date = %s::date
                     AND content IS NOT NULL
                   ORDER BY rating ASC, review_date DESC""",
                (app_id, date_label),
            )
            reviews = cur.fetchall()

            if not reviews:
                continue

            logger.info(f"  {app_name}: 리뷰 {len(reviews)}개 종합 분석 중...")

            # Gemini 1회 호출
            reviews_block = _build_reviews_block(reviews)
            user_prompt = BATCH_PROMPT.format(
                app_name=app_name,
                review_count=len(reviews),
                reviews_block=reviews_block,
            )
            result = llm_router.generate(BATCH_SYSTEM_PROMPT, user_prompt)

            # 평균 감정 (이미 로컬 계산된 값의 평균)
            cur.execute(
                """SELECT AVG(sentiment_score), AVG(rating)
                   FROM playstore_reviews
                   WHERE app_id = %s AND (collected_at AT TIME ZONE 'Asia/Seoul')::date = %s::date""",
                (app_id, date_label),
            )
            avg_row = cur.fetchone()
            sentiment_avg = round(float(avg_row[0] or 0), 3)
            avg_rating = round(float(avg_row[1] or 0), 2)

            # 종합 분석 결과 → review_daily_summaries
            top_issues = [
                {"category": issue.get("category", "other"),
                 "count": issue.get("count", 0),
                 "sample": issue.get("description", "")}
                for issue in result.get("main_issues", [])[:5]
            ]

            # ai_highlight에 종합 분석 결과 저장
            ai_highlight = json.dumps({
                "summary": result.get("summary", ""),
                "developer_response": result.get("developer_response", ""),
                "positive": result.get("positive_points", []),
                "negative": result.get("negative_points", []),
                "keywords": result.get("keywords", []),
            }, ensure_ascii=False)

            # 개별 리뷰에 대표 카테고리 업데이트
            main_category = (result.get("main_issues", [{}])[0].get("category", "other")
                             if result.get("main_issues") else "other")
            review_ids = [r[0] for r in reviews]
            cur.execute(
                """UPDATE playstore_reviews
                   SET ai_summary = %s, ai_category = %s
                   WHERE review_id = ANY(%s)""",
                (result.get("summary", "")[:200], main_category, review_ids),
            )

            cur.execute(
                """INSERT INTO review_daily_summaries
                   (app_id, date_label, review_count, avg_rating, sentiment_avg,
                    top_issues, ai_highlight)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (app_id, date_label)
                   DO UPDATE SET
                     review_count = EXCLUDED.review_count,
                     avg_rating = EXCLUDED.avg_rating,
                     sentiment_avg = EXCLUDED.sentiment_avg,
                     top_issues = EXCLUDED.top_issues,
                     ai_highlight = EXCLUDED.ai_highlight""",
                (app_id, date_label, len(reviews), avg_rating, sentiment_avg,
                 json.dumps(top_issues, ensure_ascii=False), ai_highlight),
            )

            conn.commit()
            analyzed += 1
            logger.info(f"  ✅ {app_name}: 감정 {sentiment_avg:+.2f}, "
                        f"이슈 {len(top_issues)}개")

        except Exception as e:
            logger.warning(f"앱 분석 실패 ({app_name}): {e}")
            failed += 1

    logger.info(f"종합 분석 완료: 앱 {analyzed}개 성공, {failed}개 실패 "
                f"(Gemini 호출: {analyzed}회)")
    return {
        "local_sentiment": len(unanalyzed),
        "apps_analyzed": analyzed,
        "failed": failed,
        "total_apps": len(apps),
        "gemini_calls": analyzed,
    }
