#!/usr/bin/env python3
"""
주간/월간 브리핑 DB 적재 모듈

weekly_briefs / monthly_briefs 테이블에 리포트를 INSERT한다.
"""

import json
import os
from datetime import datetime
from typing import Dict, Optional


DAILY_INSERT_SQL = """
    INSERT INTO daily_briefs (
        title, date_label, intro_comment, top_keywords,
        category_highlights, daily_comment, stats, raw_data,
        is_fallback, generated_at, cover_image_url,
        editor_comment, editor_comment_at, editor_comment_auto
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING brief_id
"""

WEEKLY_INSERT_SQL = """
    INSERT INTO weekly_briefs (
        title, period, week_label, top_keywords, category_highlights,
        weekly_comment, next_week_preview, stats, raw_data,
        is_fallback, generated_at, cover_image_url,
        editor_comment, editor_comment_at, editor_comment_auto
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING brief_id
"""

MONTHLY_INSERT_SQL = """
    INSERT INTO monthly_briefs (
        title, period, month_label, top_keywords, deep_articles,
        monthly_editorial, stats, raw_data,
        is_fallback, generated_at, cover_image_url,
        editor_comment, editor_comment_at, editor_comment_auto
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING brief_id
"""


def _get_db_config(db_config: dict = None) -> dict:
    """DB 연결 설정 반환"""
    if db_config:
        return db_config
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "five_minute_brief"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
    }


def load_daily_to_db(report: Dict, date_label: str, db_config: dict = None) -> Optional[int]:
    """
    일간 뉴스레터를 DB에 적재

    Args:
        report: 일간 뉴스레터 딕셔너리
        date_label: 날짜 라벨 (예: "2026-03-02")
        db_config: DB 연결 설정

    Returns:
        brief_id (성공 시) 또는 None
    """
    import psycopg2

    config = _get_db_config(db_config)
    conn = None

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        generated_at = report.get("generated_at", datetime.now().isoformat())

        editor_comment = report.get("editor_comment")
        editor_comment_at = report.get("editor_comment_at") if editor_comment else None
        editor_comment_auto = report.get("editor_comment_auto", False) if editor_comment else None

        cur.execute(DAILY_INSERT_SQL, (
            report.get("title", ""),
            date_label,
            report.get("intro_comment", ""),
            json.dumps(report.get("top_keywords", []), ensure_ascii=False),
            json.dumps(report.get("category_highlights", []), ensure_ascii=False),
            report.get("daily_comment", ""),
            json.dumps(report.get("stats", {}), ensure_ascii=False),
            json.dumps(report, ensure_ascii=False),
            report.get("_fallback", False),
            generated_at,
            report.get("cover_image_url"),
            editor_comment,
            editor_comment_at,
            editor_comment_auto,
        ))

        brief_id = cur.fetchone()[0]
        conn.commit()
        print(f"  ✅ 일간 뉴스레터 DB 적재 완료 (brief_id: {brief_id})")
        return brief_id

    except Exception as e:
        print(f"  ❌ 일간 뉴스레터 DB 적재 실패: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()


def load_weekly_to_db(report: Dict, week_label: str, db_config: dict = None) -> Optional[int]:
    """
    주간 리포트를 DB에 적재

    Args:
        report: 주간 리포트 딕셔너리
        week_label: 주차 라벨 (예: "2026-W09")
        db_config: DB 연결 설정

    Returns:
        brief_id (성공 시) 또는 None
    """
    import psycopg2

    config = _get_db_config(db_config)
    conn = None

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        generated_at = report.get("generated_at", datetime.now().isoformat())

        editor_comment = report.get("editor_comment")
        editor_comment_at = report.get("editor_comment_at") if editor_comment else None
        editor_comment_auto = report.get("editor_comment_auto", False) if editor_comment else None

        cur.execute(WEEKLY_INSERT_SQL, (
            report.get("title", ""),
            report.get("period", ""),
            week_label,
            json.dumps(report.get("top_keywords", []), ensure_ascii=False),
            json.dumps(report.get("category_highlights", []), ensure_ascii=False),
            report.get("weekly_comment", ""),
            json.dumps(report.get("next_week_preview", []), ensure_ascii=False),
            json.dumps(report.get("stats", {}), ensure_ascii=False),
            json.dumps(report, ensure_ascii=False),
            report.get("_fallback", False),
            generated_at,
            report.get("cover_image_url"),
            editor_comment,
            editor_comment_at,
            editor_comment_auto,
        ))

        brief_id = cur.fetchone()[0]
        conn.commit()
        print(f"  ✅ 주간 브리핑 DB 적재 완료 (brief_id: {brief_id})")
        return brief_id

    except Exception as e:
        print(f"  ❌ 주간 브리핑 DB 적재 실패: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()


def load_monthly_to_db(report: Dict, month_label: str, db_config: dict = None) -> Optional[int]:
    """
    월간 리포트를 DB에 적재

    Args:
        report: 월간 리포트 딕셔너리
        month_label: 월 라벨 (예: "2026-02")
        db_config: DB 연결 설정

    Returns:
        brief_id (성공 시) 또는 None
    """
    import psycopg2

    config = _get_db_config(db_config)
    conn = None

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        generated_at = report.get("generated_at", datetime.now().isoformat())

        editor_comment = report.get("editor_comment")
        editor_comment_at = report.get("editor_comment_at") if editor_comment else None
        editor_comment_auto = report.get("editor_comment_auto", False) if editor_comment else None

        cur.execute(MONTHLY_INSERT_SQL, (
            report.get("title", ""),
            report.get("period", ""),
            month_label,
            json.dumps(report.get("top_keywords", []), ensure_ascii=False),
            json.dumps(report.get("deep_articles", []), ensure_ascii=False),
            report.get("monthly_editorial", ""),
            json.dumps(report.get("stats", {}), ensure_ascii=False),
            json.dumps(report, ensure_ascii=False),
            report.get("_fallback", False),
            generated_at,
            report.get("cover_image_url"),
            editor_comment,
            editor_comment_at,
            editor_comment_auto,
        ))

        brief_id = cur.fetchone()[0]
        conn.commit()
        print(f"  ✅ 월간 브리핑 DB 적재 완료 (brief_id: {brief_id})")
        return brief_id

    except Exception as e:
        print(f"  ❌ 월간 브리핑 DB 적재 실패: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()
