#!/usr/bin/env python3
"""
일간 리뷰 요약 생성기
- 앱별 당일 통계 집계 → review_daily_summaries 테이블
- notability_score 계산으로 Top 5 앱 선정
- Top 5 앱에 대해 Gemini로 ai_highlight 생성
"""

import json
import logging
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))

logger = logging.getLogger(__name__)

# Top 5 하이라이트 프롬프트
HIGHLIGHT_SYSTEM_PROMPT = "당신은 IT 앱 트렌드 분석가입니다. 반말 기조로 간결하게 작성하세요."

HIGHLIGHT_PROMPT = """오늘 Play Store 리뷰에서 주목할 만한 앱 Top {count}개의 하이라이트를 작성해주세요.

{app_data}

각 앱에 대해 100-200자로 리뷰 트렌드를 요약하세요.
비형(IT 도깨비) 스타일: 반말, 자조적 유머, 이모지 적극 활용.
"오늘 카카오톡은 업데이트 후 배터리 이슈로 난리 🔥" 이런 느낌.

JSON 형식:
{{
  "highlights": [
    {{"app_name": "앱이름", "package_id": "com.xxx", "highlight": "100-200자 트렌드 요약"}}
  ]
}}"""


def generate_daily_summaries(conn, date_label: str) -> Dict:
    """당일 앱별 리뷰 통계를 집계하여 review_daily_summaries에 저장"""
    cur = conn.cursor()

    # 당일 수집된 리뷰가 있는 앱 목록
    cur.execute(
        """SELECT a.app_id, a.name, a.package_id
           FROM playstore_apps a
           WHERE a.is_active = TRUE
           ORDER BY a.app_id""",
    )
    apps = cur.fetchall()

    if not apps:
        return {"apps_processed": 0}

    processed = 0

    for app_id, app_name, package_id in apps:
        # 당일 수집된 리뷰 통계
        cur.execute(
            """SELECT COUNT(*), AVG(rating), AVG(sentiment_score)
               FROM playstore_reviews
               WHERE app_id = %s AND collected_at::date = %s::date""",
            (app_id, date_label),
        )
        row = cur.fetchone()
        review_count = row[0] or 0

        if review_count == 0:
            continue

        avg_rating = round(float(row[1] or 0), 2)
        sentiment_avg = round(float(row[2] or 0), 3) if row[2] else 0.0

        # 평점 분포
        cur.execute(
            """SELECT rating, COUNT(*)
               FROM playstore_reviews
               WHERE app_id = %s AND collected_at::date = %s::date AND rating IS NOT NULL
               GROUP BY rating""",
            (app_id, date_label),
        )
        rating_dist = {str(r): c for r, c in cur.fetchall()}

        # 카테고리별 이슈 집계
        cur.execute(
            """SELECT ai_category, COUNT(*), MIN(content)
               FROM playstore_reviews
               WHERE app_id = %s AND collected_at::date = %s::date
                     AND ai_category IS NOT NULL
               GROUP BY ai_category
               ORDER BY COUNT(*) DESC
               LIMIT 5""",
            (app_id, date_label),
        )
        top_issues = [
            {"category": cat, "count": cnt, "sample": (sample or "")[:100]}
            for cat, cnt, sample in cur.fetchall()
        ]

        # 전일 대비 감정 변화 계산
        prev_date = (datetime.strptime(date_label, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
        cur.execute(
            "SELECT sentiment_avg FROM review_daily_summaries WHERE app_id = %s AND date_label = %s",
            (app_id, prev_date),
        )
        prev = cur.fetchone()
        sentiment_change = round(sentiment_avg - float(prev[0]), 3) if prev and prev[0] else 0.0

        # notability_score 계산
        # 높을수록 주목할 만함: 리뷰 수 + 감정 변화 폭 + 저평점 비율
        low_ratings = sum(int(rating_dist.get(str(r), 0)) for r in [1, 2])
        low_ratio = low_ratings / review_count if review_count > 0 else 0
        notability = (
            min(review_count / 10, 5)  # 리뷰 수 기여 (최대 5)
            + abs(sentiment_change) * 10  # 감정 변화폭 기여
            + low_ratio * 3  # 저평점 비율 기여
        )
        notability = round(notability, 3)

        # UPSERT
        cur.execute(
            """INSERT INTO review_daily_summaries
               (app_id, date_label, review_count, avg_rating, sentiment_avg,
                sentiment_change, rating_distribution, top_issues, notability_score)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (app_id, date_label)
               DO UPDATE SET
                 review_count = EXCLUDED.review_count,
                 avg_rating = EXCLUDED.avg_rating,
                 sentiment_avg = EXCLUDED.sentiment_avg,
                 sentiment_change = EXCLUDED.sentiment_change,
                 rating_distribution = EXCLUDED.rating_distribution,
                 notability_score = EXCLUDED.notability_score""",
            (
                app_id, date_label, review_count, avg_rating, sentiment_avg,
                sentiment_change,
                json.dumps(rating_dist, ensure_ascii=False),
                json.dumps(top_issues, ensure_ascii=False),
                notability,
            ),
        )
        processed += 1

    conn.commit()
    logger.info(f"일간 요약 생성 완료: {processed}개 앱")
    return {"apps_processed": processed}


def generate_top_highlights(conn, date_label: str, llm_router, top_n: int = 5) -> List[Dict]:
    """Top N 앱에 대해 Gemini로 ai_highlight 생성"""
    cur = conn.cursor()

    # Top N 조회
    cur.execute(
        """SELECT s.summary_id, s.app_id, a.name, a.package_id,
                  s.review_count, s.avg_rating, s.sentiment_avg, s.sentiment_change,
                  s.top_issues, s.notability_score
           FROM review_daily_summaries s
           JOIN playstore_apps a ON s.app_id = a.app_id
           WHERE s.date_label = %s AND s.review_count > 0
           ORDER BY s.notability_score DESC
           LIMIT %s""",
        (date_label, top_n),
    )
    top_apps = cur.fetchall()

    if not top_apps:
        logger.info("하이라이트 생성할 앱이 없습니다")
        return []

    # LLM용 데이터 구성
    app_data_lines = []
    for (summary_id, app_id, name, pkg, rev_count, avg_r, sent_avg,
         sent_change, top_issues, notability) in top_apps:
        issues_str = ""
        if top_issues:
            issues = top_issues if isinstance(top_issues, list) else json.loads(top_issues)
            issues_str = ", ".join(f"{i['category']}({i['count']}건)" for i in issues[:3])

        app_data_lines.append(
            f"- {name} ({pkg}): 리뷰 {rev_count}개, 평점 {avg_r:.1f}, "
            f"감정 {sent_avg:+.2f} (변화 {sent_change:+.2f}), "
            f"이슈: {issues_str or '없음'}"
        )

    app_data_text = "\n".join(app_data_lines)

    try:
        prompt = HIGHLIGHT_PROMPT.format(count=len(top_apps), app_data=app_data_text)
        result = llm_router.generate(HIGHLIGHT_SYSTEM_PROMPT, prompt)
        highlights = result.get("highlights", [])

        # DB 업데이트
        for hl in highlights:
            cur.execute(
                """UPDATE review_daily_summaries
                   SET ai_highlight = %s
                   WHERE app_id = (SELECT app_id FROM playstore_apps WHERE package_id = %s)
                         AND date_label = %s""",
                (hl.get("highlight", ""), hl.get("package_id", ""), date_label),
            )

        conn.commit()
        logger.info(f"Top {len(highlights)} 하이라이트 생성 완료")
        return highlights

    except Exception as e:
        logger.error(f"하이라이트 생성 실패: {e}")
        return []


def get_top_review_summaries(conn, date_label: str, top_n: int = 5) -> List[Dict]:
    """브리핑 생성용 Top N 앱 리뷰 요약 조회"""
    cur = conn.cursor()
    cur.execute(
        """SELECT a.name, a.package_id, s.review_count, s.avg_rating,
                  s.sentiment_avg, s.sentiment_change, s.ai_highlight,
                  s.top_issues, s.notability_score
           FROM review_daily_summaries s
           JOIN playstore_apps a ON s.app_id = a.app_id
           WHERE s.date_label = %s AND s.review_count > 0
           ORDER BY s.notability_score DESC
           LIMIT %s""",
        (date_label, top_n),
    )
    rows = cur.fetchall()

    return [
        {
            "app_name": name,
            "package_id": pkg,
            "review_count": rev_count,
            "avg_rating": round(float(avg_r or 0), 1),
            "sentiment_avg": round(float(sent_avg or 0), 2),
            "sentiment_change": round(float(sent_change or 0), 2),
            "ai_highlight": highlight or "",
            "top_issues": issues if isinstance(issues, list) else (json.loads(issues) if issues else []),
            "notability_score": round(float(notability or 0), 2),
        }
        for name, pkg, rev_count, avg_r, sent_avg, sent_change, highlight, issues, notability in rows
    ]
