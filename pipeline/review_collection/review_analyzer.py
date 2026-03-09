#!/usr/bin/env python3
"""
리뷰 AI 분석기
- 기존 ai_rewriter.py의 create_llm_router() 재사용
- 미분석 리뷰를 Gemini로 감정 분석 + 요약 + 카테고리 분류
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

# ai_rewriter 모듈 임포트를 위한 경로 설정
PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))

logger = logging.getLogger(__name__)

# 리뷰 분석 프롬프트
REVIEW_ANALYSIS_SYSTEM_PROMPT = """당신은 Play Store 앱 리뷰 분석 전문가입니다.
주어진 리뷰를 분석하여 JSON으로 응답하세요."""

REVIEW_ANALYSIS_PROMPT = """다음 Play Store 리뷰를 분석하세요.

앱: {app_name}
평점: {rating}/5
리뷰 내용: {content}
{dev_reply_section}

아래 JSON 형식으로 응답하세요:
{{
  "sentiment_score": -1.0~1.0 사이 실수 (매우 부정 -1.0, 중립 0.0, 매우 긍정 1.0),
  "summary": "리뷰 핵심 내용 한 줄 요약 (30자 이내)",
  "category": "아래 카테고리 중 하나 선택"
}}

카테고리 목록:
- bug: 앱 오류, 크래시, 오작동
- performance: 속도, 배터리, 데이터 사용량
- ux: UI/UX 불편, 사용성 문제
- feature_request: 기능 요청, 개선 제안
- update: 업데이트 관련 (호/불호)
- login: 로그인, 계정, 인증 문제
- praise: 만족, 칭찬, 추천
- other: 기타"""


def analyze_reviews(conn, llm_router, batch_size: int = 50, max_reviews: int = 200) -> Dict:
    """미분석 리뷰를 Gemini로 분석"""
    cur = conn.cursor()

    # 미분석 리뷰 조회
    cur.execute(
        """SELECT r.review_id, r.content, r.rating,
                  r.developer_reply_content, a.name as app_name
           FROM playstore_reviews r
           JOIN playstore_apps a ON r.app_id = a.app_id
           WHERE r.ai_analyzed_at IS NULL AND r.content IS NOT NULL
           ORDER BY r.collected_at DESC
           LIMIT %s""",
        (max_reviews,),
    )
    reviews = cur.fetchall()

    if not reviews:
        logger.info("분석할 리뷰가 없습니다")
        return {"analyzed": 0, "failed": 0}

    logger.info(f"미분석 리뷰 {len(reviews)}개 분석 시작")

    analyzed = 0
    failed = 0

    for review_id, content, rating, dev_reply, app_name in reviews:
        try:
            # 개발자 댓글 섹션 구성
            dev_reply_section = ""
            if dev_reply:
                dev_reply_section = f"개발자 답변: {dev_reply}"

            # 프롬프트 구성
            user_prompt = REVIEW_ANALYSIS_PROMPT.format(
                app_name=app_name,
                rating=rating or "?",
                content=content[:500],  # 토큰 절약
                dev_reply_section=dev_reply_section,
            )

            # LLM 호출
            result = llm_router.generate(REVIEW_ANALYSIS_SYSTEM_PROMPT, user_prompt)

            # DB 업데이트
            sentiment = float(result.get("sentiment_score", 0))
            sentiment = max(-1.0, min(1.0, sentiment))

            cur.execute(
                """UPDATE playstore_reviews
                   SET sentiment_score = %s, ai_summary = %s, ai_category = %s,
                       ai_analyzed_at = %s
                   WHERE review_id = %s""",
                (
                    sentiment,
                    result.get("summary", "")[:200],
                    result.get("category", "other"),
                    datetime.now(timezone.utc),
                    review_id,
                ),
            )
            analyzed += 1

            if analyzed % 10 == 0:
                conn.commit()
                logger.info(f"분석 진행: {analyzed}/{len(reviews)}")

        except Exception as e:
            logger.warning(f"리뷰 분석 실패 (review_id={review_id}): {e}")
            failed += 1

    conn.commit()
    logger.info(f"분석 완료: 성공 {analyzed}개, 실패 {failed}개")

    return {"analyzed": analyzed, "failed": failed, "total": len(reviews)}
