#!/usr/bin/env python3
"""
Play Store 리뷰 수집 파이프라인 오케스트레이터

순서: seed_apps → collect → analyze → summarize
독립 실행 또는 run_daily.py에서 호출

Usage:
  python run_reviews.py                      # 오늘 기준
  python run_reviews.py --date 2026-03-10    # 특정 날짜
  python run_reviews.py --dry-run            # DB 저장 없이 수집만
  python run_reviews.py --skip-collect       # 수집 스킵, 분석만
"""

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))


def log(icon: str, msg: str):
    print(f"{icon} [{datetime.now(KST).strftime('%H:%M:%S')}] {msg}")


def get_db_connection():
    """psycopg2 DB 연결 생성"""
    import psycopg2

    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "five_minute_brief"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def get_llm_router():
    """기존 ai_rewriter의 LLMRouter 재사용"""
    import yaml

    sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))
    from ai_rewriter import create_llm_router
    from dotenv import load_dotenv

    # 환경변수 로드
    env_path = PIPELINE_DIR.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    # config.yaml 로드
    config_path = PIPELINE_DIR / "reconstruction" / "config.yaml"
    llm_config = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
            llm_config = config.get("llm", {})

    # 리뷰 분석은 짧은 출력이면 충분
    llm_config["max_output_tokens"] = min(llm_config.get("max_output_tokens", 2048), 2048)

    return create_llm_router(llm_config)


def main():
    parser = argparse.ArgumentParser(description="Play Store 리뷰 수집 파이프라인")
    parser.add_argument("--date", type=str, default=None, help="기준 날짜 YYYY-MM-DD (기본: 오늘 KST)")
    parser.add_argument("--dry-run", action="store_true", help="DB 저장 없이 수집만 (미구현, 향후)")
    parser.add_argument("--skip-collect", action="store_true", help="수집 스킵, 분석+요약만")
    parser.add_argument("--max-reviews", type=int, default=50, help="앱당 최대 수집 리뷰 수 (기본: 50)")
    args = parser.parse_args()

    # 날짜 결정
    if args.date:
        target_date = datetime.strptime(args.date, "%Y-%m-%d")
    else:
        target_date = datetime.now(KST).replace(tzinfo=None)
    date_label = target_date.strftime("%Y-%m-%d")

    print("=" * 60)
    print(f"📱 Play Store 리뷰 수집 파이프라인")
    print(f"   날짜: {date_label}")
    print(f"   수집: {'SKIP' if args.skip_collect else 'ON'}")
    print(f"   앱당 최대: {args.max_reviews}개")
    print("=" * 60)

    conn = None
    try:
        conn = get_db_connection()
        log("✅", "DB 연결 성공")

        # Step 1: 앱 시딩
        log("📌", "Step 1: 앱 목록 시딩")
        from review_collection.app_config import seed_apps
        added = seed_apps(conn)
        log("✅", f"앱 시딩 완료 (신규 {added}개)")

        # Step 2: 리뷰 수집
        if not args.skip_collect:
            log("📌", "Step 2: 리뷰 수집")
            from review_collection.playstore_collector import collect_all_active_apps
            collect_result = collect_all_active_apps(conn, max_reviews_per_app=args.max_reviews)
            log("✅", f"수집 완료: {collect_result.get('total_apps', 0)}개 앱, "
                      f"{collect_result.get('total_collected', 0)}개 리뷰")
        else:
            log("⏭️", "Step 2: 수집 스킵")

        # Step 3: AI 분석
        print()
        log("📌", "Step 3: AI 리뷰 분석")
        llm_router = get_llm_router()
        from review_collection.review_analyzer import analyze_reviews
        analysis_result = analyze_reviews(conn, llm_router)
        log("✅", f"분석 완료: {analysis_result.get('analyzed', 0)}개 성공, "
                  f"{analysis_result.get('failed', 0)}개 실패")

        # Step 4: 일간 요약 생성
        print()
        log("📌", "Step 4: 일간 요약 생성")
        from review_collection.review_summarizer import generate_daily_summaries, generate_top_highlights
        summary_result = generate_daily_summaries(conn, date_label)
        log("✅", f"요약 생성: {summary_result.get('apps_processed', 0)}개 앱")

        # Step 5: Top 5 하이라이트 생성
        print()
        log("📌", "Step 5: Top 5 하이라이트 생성")
        highlights = generate_top_highlights(conn, date_label, llm_router, top_n=5)
        if highlights:
            for hl in highlights:
                log("  ", f"🏆 {hl.get('app_name', '?')}: {hl.get('highlight', '')[:60]}...")
        else:
            log("⚠️", "하이라이트 생성할 데이터 없음")

    except Exception as e:
        log("❌", f"파이프라인 오류: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if conn:
            conn.close()

    print()
    print("=" * 60)
    log("🎉", "리뷰 파이프라인 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
