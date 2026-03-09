#!/usr/bin/env python3
"""
브리핑 DB 조회 모듈

주간/월간 브리핑 생성 시 JSON 파일 대신 DB에서 데이터를 조회한다.
- daily_briefs 테이블 → 트렌드 키워드 (trends_summary 대체)
- news 테이블 → 재구성 기사 (reconstructed_*.json 대체)
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional


# news 테이블은 한글 카테고리로 저장됨 → 영문으로 역변환
CATEGORY_KR_TO_EN = {
    "모바일": "mobile",
    "PC": "pc",
    "AI": "ai",
    "네트워크/통신": "network",
    "보안": "security",
    "기타": "etc",
}


def _get_db_config() -> dict:
    """DB 연결 설정 (briefing_db_loader와 동일 패턴)"""
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "five_minute_brief"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
        "connect_timeout": 5,
    }


def fetch_daily_briefs(start_date: str, end_date: str) -> List[Dict]:
    """
    daily_briefs 테이블에서 기간 내 브리핑 조회

    Args:
        start_date: 시작일 "YYYY-MM-DD"
        end_date: 종료일 "YYYY-MM-DD"

    Returns:
        [{"trends_summary": ["AI", "삼성", ...], "date_label": "2026-03-03"}, ...]
    """
    import psycopg2

    config = _get_db_config()
    conn = None

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        cur.execute(
            """
            SELECT date_label, top_keywords
            FROM daily_briefs
            WHERE date_label >= %s AND date_label <= %s
            ORDER BY date_label
            """,
            (start_date, end_date),
        )

        results = []
        for row in cur.fetchall():
            date_label, top_keywords_raw = row

            # top_keywords: JSONB [{keyword, description}] → keyword 리스트
            top_keywords = top_keywords_raw if isinstance(top_keywords_raw, list) else []
            trends = [
                kw["keyword"] for kw in top_keywords
                if isinstance(kw, dict) and "keyword" in kw
            ]

            results.append({
                "trends_summary": trends,
                "date_label": date_label,
            })

        return results

    except Exception:
        raise
    finally:
        if conn:
            conn.close()


def fetch_news(start_date: datetime, end_date: datetime) -> List[Dict]:
    """
    news 테이블에서 기간 내 재구성 기사 조회

    Args:
        start_date: 시작 datetime (해당일 00:00 포함)
        end_date: 종료 datetime (해당일 23:59까지 포함)

    Returns:
        [{"title": ..., "summary": ..., "content": ..., "category": "mobile",
          "hashtags": [...], "_published_date": "2026-03-03"}, ...]
    """
    import psycopg2

    config = _get_db_config()
    conn = None

    # end_date의 다음날 00:00까지 (end_date 당일 포함)
    end_exclusive = end_date + timedelta(days=1)

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        cur.execute(
            """
            SELECT title, summary, content, category, hashtags, published_at
            FROM news
            WHERE published_at >= %s AND published_at < %s
            ORDER BY published_at
            """,
            (start_date, end_exclusive),
        )

        results = []
        for row in cur.fetchall():
            title, summary, content, category, hashtags_raw, published_at = row

            # 카테고리 역매핑 (한글 → 영문)
            category_en = CATEGORY_KR_TO_EN.get(category, category)

            # hashtags: JSONB 또는 문자열
            if isinstance(hashtags_raw, str):
                try:
                    hashtags = json.loads(hashtags_raw)
                except (json.JSONDecodeError, TypeError):
                    hashtags = []
            elif isinstance(hashtags_raw, list):
                hashtags = hashtags_raw
            else:
                hashtags = []

            # 날짜 문자열 (월간 분석기의 daily_article_counts용)
            pub_date_str = published_at.strftime("%Y-%m-%d") if published_at else ""

            results.append({
                "title": title or "",
                "summary": summary or "",
                "content": content or "",
                "category": category_en,
                "hashtags": hashtags,
                "_published_date": pub_date_str,
            })

        return results

    except Exception:
        raise
    finally:
        if conn:
            conn.close()
