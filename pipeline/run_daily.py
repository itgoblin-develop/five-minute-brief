#!/usr/bin/env python3
"""
IT 도깨비 - Pipeline Runner

일간/주간/월간 파이프라인 오케스트레이터:
  daily  : 크롤링 → 랭킹 → AI 재구성 → DB 적재
  weekly : 7일치 집계 → 주간 리포트 생성
  monthly: 30일치 집계 → 월간 심층 리포트 생성

Usage:
  python run_daily.py                          # 일간 모드 (기본)
  python run_daily.py --mode daily             # 일간 모드 (명시)
  python run_daily.py --mode weekly            # 주간 모드
  python run_daily.py --mode monthly           # 월간 모드
  python run_daily.py --skip-crawl             # 크롤링 건너뛰기
  python run_daily.py --dry-run                # DB 적재 없이 실행
  python run_daily.py --date 2026-02-09        # 특정 날짜 기준
"""

import argparse
import subprocess
import sys
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

KST = timezone(timedelta(hours=9))
PIPELINE_DIR = Path(__file__).resolve().parent


def log(icon: str, msg: str):
    print(f"{icon} [{datetime.now(KST).strftime('%H:%M:%S')}] {msg}")


def run_step(cmd: list, cwd: Path, timeout: int, label: str) -> bool:
    """Run a subprocess step. Returns True on success."""
    log("▶️", f"{label} 시작...")
    log("  ", f"cmd: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            timeout=timeout,
            capture_output=False,
        )
        if result.returncode == 0:
            log("✅", f"{label} 완료")
            return True
        else:
            log("❌", f"{label} 실패 (exit code: {result.returncode})")
            return False
    except subprocess.TimeoutExpired:
        log("⏰", f"{label} 타임아웃 ({timeout}초)")
        return False
    except FileNotFoundError as e:
        log("❌", f"{label} 실행 불가: {e}")
        return False


def _generate_cover_image(report: dict, briefing_type: str, date_str: str):
    """브리핑 커버 이미지 생성 (실패해도 파이프라인 중단하지 않음)"""
    try:
        from briefing_image_generator import BriefingCoverGenerator
        cover_gen = BriefingCoverGenerator()
        keywords = [kw.get("keyword", kw) if isinstance(kw, dict) else kw
                    for kw in report.get("top_keywords", [])[:5]]
        cover_url = cover_gen.generate(briefing_type, report.get("title", ""), keywords, date_str)
        if cover_url:
            report["cover_image_url"] = cover_url
            log("✅", f"커버 이미지: {cover_url}")
        else:
            log("⚠️", "커버 이미지 생성 실패 (브리핑은 정상)")
    except Exception as e:
        log("⚠️", f"커버 이미지 오류: {e}")


def run_weekly(args, target_date):
    """주간 브리핑 생성 모드"""
    sys.path.insert(0, str(PIPELINE_DIR / "content_generator"))
    from weekly_generator import WeeklyBriefingGenerator

    generator = WeeklyBriefingGenerator(pipeline_dir=PIPELINE_DIR)
    ref_date = target_date.replace(tzinfo=None)
    monday, sunday = generator.get_week_range(ref_date)
    week_num = monday.isocalendar()[1]

    print("=" * 60)
    print(f"📅 IT 도깨비 - 주간 브리핑 생성")
    print(f"   기준일: {ref_date.strftime('%Y-%m-%d')}")
    print(f"   주간 범위: {monday.strftime('%Y-%m-%d')} (월) ~ {sunday.strftime('%Y-%m-%d')} (일)")
    print(f"   Week: {monday.year}-W{week_num:02d}")
    print(f"   모드: {'DRY-RUN' if args.dry_run else 'PRODUCTION'}")
    print("=" * 60)

    # 1. 데이터 수집
    log("📥", "Step 1: 7일치 데이터 수집")
    data = generator.collect_weekly_data(monday, sunday)
    log("✅", f"일간 브리핑: {len(data['daily_briefs'])}일치")
    log("✅", f"재구성 기사: {len(data['reconstructed_articles'])}건")
    log("✅", f"트렌드 키워드: {len(data['trend_keywords'])}종")

    if not data["daily_briefs"] and not data["reconstructed_articles"]:
        log("⚠️", "수집된 데이터가 없습니다. 주간 리포트를 생성할 수 없습니다.")
        sys.exit(1)

    # 2. 분석
    print()
    log("📊", "Step 2: 주간 트렌드 분석")
    analysis = generator.analyze_trends(data)
    log("✅", f"총 기사: {analysis['total_articles']}건")

    # 3. AI 리포트 생성
    print()
    log("🤖", "Step 3: AI 주간 리포트 생성")
    report = generator.generate_report(data, analysis)

    if report:
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = PIPELINE_DIR / f"weekly_brief_{monday.year}W{week_num:02d}.json"

        import json
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        log("✅", f"주간 리포트 저장: {output_path}")
        if report.get("_fallback"):
            log("⚠️", "AI 생성 실패 → 폴백 리포트 사용")

        # 커버 이미지 생성
        _generate_cover_image(report, "weekly", monday.strftime("%Y%m%d"))
        if report.get("cover_image_url"):
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)

        # DB 적재
        if not args.dry_run:
            print()
            log("📌", "Step 4: DB 적재")
            try:
                from briefing_db_loader import load_weekly_to_db
                week_label = f"{monday.year}-W{week_num:02d}"
                load_weekly_to_db(report, week_label)
            except Exception as e:
                log("⚠️", f"DB 적재 실패 (JSON은 저장됨): {e}")
    else:
        log("❌", "주간 리포트 생성 실패")
        sys.exit(1)

    print()
    print("=" * 60)
    log("🎉", "주간 브리핑 생성 완료!")
    print("=" * 60)


def run_monthly(args, target_date):
    """월간 브리핑 생성 모드"""
    sys.path.insert(0, str(PIPELINE_DIR / "content_generator"))
    from monthly_generator import MonthlyBriefingGenerator

    generator = MonthlyBriefingGenerator(pipeline_dir=PIPELINE_DIR)

    # 대상 월 결정: 지정 날짜가 있으면 해당 월, 없으면 직전 월
    ref = target_date.replace(tzinfo=None)
    if args.date:
        year, month = ref.year, ref.month
    else:
        # 직전 월
        if ref.month == 1:
            year, month = ref.year - 1, 12
        else:
            year, month = ref.year, ref.month - 1

    print("=" * 60)
    print(f"📅 IT 도깨비 - 월간 브리핑 생성")
    print(f"   대상: {year}년 {month:02d}월")
    print(f"   모드: {'DRY-RUN' if args.dry_run else 'PRODUCTION'}")
    print("=" * 60)

    # 1. 데이터 수집
    log("📥", "Step 1: 월간 데이터 수집")
    data = generator.collect_monthly_data(year, month)
    log("✅", f"일간 브리핑: {len(data['daily_briefs'])}일치")
    log("✅", f"재구성 기사: {len(data['reconstructed_articles'])}건")
    log("✅", f"트렌드 키워드: {len(data['trend_keywords'])}종")

    if not data["daily_briefs"] and not data["reconstructed_articles"]:
        log("⚠️", "수집된 데이터가 없습니다. 월간 리포트를 생성할 수 없습니다.")
        sys.exit(1)

    # 2. 심층 분석
    print()
    log("📊", "Step 2: 월간 심층 분석")
    analysis = generator.deep_analysis(data)
    log("✅", f"총 기사: {analysis['total_articles']}건")
    log("✅", f"일 평균: {analysis['avg_daily_articles']}건")

    # 3. AI 리포트 생성
    print()
    log("🤖", "Step 3: AI 월간 리포트 생성")
    report = generator.generate_report(data, analysis)

    if report:
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = PIPELINE_DIR / f"monthly_brief_{year}{month:02d}.json"

        import json
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        log("✅", f"월간 리포트 저장: {output_path}")
        if report.get("_fallback"):
            log("⚠️", "AI 생성 실패 → 폴백 리포트 사용")

        # 커버 이미지 생성
        month_compact = f"{year}{month:02d}"
        _generate_cover_image(report, "monthly", month_compact)
        if report.get("cover_image_url"):
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)

        # DB 적재
        if not args.dry_run:
            print()
            log("📌", "Step 4: DB 적재")
            try:
                from briefing_db_loader import load_monthly_to_db
                month_label = f"{year}-{month:02d}"
                load_monthly_to_db(report, month_label)
            except Exception as e:
                log("⚠️", f"DB 적재 실패 (JSON은 저장됨): {e}")
    else:
        log("❌", "월간 리포트 생성 실패")
        sys.exit(1)

    print()
    print("=" * 60)
    log("🎉", "월간 브리핑 생성 완료!")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="IT 도깨비 - Pipeline Runner")
    parser.add_argument("--mode", type=str, default="daily",
                        choices=["daily", "weekly", "monthly"],
                        help="실행 모드: daily(기본), weekly, monthly")
    parser.add_argument("--skip-crawl", action="store_true", help="크롤링 건너뛰기 (daily 모드)")
    parser.add_argument("--dry-run", action="store_true", help="DB 적재 없이 실행")
    parser.add_argument("--date", type=str, default=None, help="기준 날짜 YYYY-MM-DD (기본: 오늘 KST)")
    parser.add_argument("--output", type=str, default=None, help="출력 파일 경로 (weekly/monthly 모드)")
    args = parser.parse_args()

    # 기준 날짜 결정 (KST)
    if args.date:
        try:
            target_date = datetime.strptime(args.date, "%Y-%m-%d").replace(tzinfo=KST)
        except ValueError:
            print("❌ --date 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요.")
            sys.exit(1)
    else:
        target_date = datetime.now(KST)

    # 주간/월간 모드 분기
    if args.mode == "weekly":
        run_weekly(args, target_date)
        return
    elif args.mode == "monthly":
        run_monthly(args, target_date)
        return

    # ─────────────────────────────────────────────
    # 일간 모드 (daily)
    # ─────────────────────────────────────────────
    date_str = target_date.strftime("%Y-%m-%d")
    date_compact = target_date.strftime("%Y%m%d")

    # Time window for crawling: yesterday 18:00 KST ~ today 18:00 KST
    # run_batch.py uses UTC naive datetimes internally (datetime.now() on UTC server),
    # so we convert KST boundaries to UTC for consistent date filtering.
    end_kst = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
    start_kst = end_kst - timedelta(days=1)
    # KST (UTC+9) → UTC: subtract 9 hours, strip timezone for naive comparison
    start_dt = (start_kst - timedelta(hours=9)).replace(tzinfo=None)
    end_dt = (end_kst - timedelta(hours=9)).replace(tzinfo=None)

    print("=" * 60)
    print(f"🗞️  IT 도깨비 - Daily Pipeline")
    print(f"   날짜: {date_str} (KST)")
    print(f"   수집 범위: {start_kst.strftime('%Y-%m-%d %H:%M')} ~ {end_kst.strftime('%Y-%m-%d %H:%M')} KST")
    print(f"   (UTC 변환: {start_dt.strftime('%Y-%m-%d %H:%M')} ~ {end_dt.strftime('%Y-%m-%d %H:%M')} UTC)")
    print(f"   모드: {'DRY-RUN' if args.dry_run else 'PRODUCTION'}")
    print(f"   크롤링: {'SKIP' if args.skip_crawl else 'ON'}")
    print("=" * 60)

    crawl_ok = True
    ranking_ok = False
    reconstruct_ok = False

    # ─────────────────────────────────────────────
    # Step 1: Crawling + Ranking + Trend Matching
    # ─────────────────────────────────────────────
    log("📌", "Step 1: 크롤링 + 랭킹 + 트렌드 매칭")

    batch_cmd = [
        sys.executable,
        str(PIPELINE_DIR / "ranking_integrated" / "run_batch.py"),
        "--start", start_dt.strftime("%Y-%m-%d %H:%M"),
        "--end", end_dt.strftime("%Y-%m-%d %H:%M"),
    ]
    if args.skip_crawl:
        batch_cmd.append("--skip-crawl")

    crawl_ok = run_step(
        cmd=batch_cmd,
        cwd=PIPELINE_DIR / "ranking_integrated",
        timeout=600,
        label="크롤링 + 랭킹",
    )

    # Check if daily_brief file was generated
    # run_batch.py uses start_dt (UTC) for filename, so check both UTC start and KST dates
    start_compact = start_dt.strftime("%Y%m%d")
    start_kst_compact = start_kst.strftime("%Y%m%d")
    brief_path = PIPELINE_DIR / f"daily_brief_{start_compact}.json"
    if not brief_path.exists():
        brief_path = PIPELINE_DIR / f"daily_brief_{date_compact}.json"
    # Also check in ranking_integrated directory
    alt_brief_path = PIPELINE_DIR / "ranking_integrated" / f"daily_brief_{start_compact}.json"
    if not alt_brief_path.exists():
        alt_brief_path = PIPELINE_DIR / "ranking_integrated" / f"daily_brief_{date_compact}.json"

    if not brief_path.exists() and alt_brief_path.exists():
        brief_path = alt_brief_path

    if not brief_path.exists():
        if crawl_ok:
            log("⚠️", f"daily_brief_{date_compact}.json 파일이 생성되지 않았습니다.")
        else:
            log("⚠️", "크롤링 실패. 기존 daily_brief 파일을 찾습니다...")

        # Try to find any existing daily_brief file
        existing = sorted(PIPELINE_DIR.glob("daily_brief_*.json"), reverse=True)
        if not existing:
            existing = sorted((PIPELINE_DIR / "ranking_integrated").glob("daily_brief_*.json"), reverse=True)

        if existing:
            brief_path = existing[0]
            log("📂", f"기존 파일 사용: {brief_path.name}")
        else:
            log("❌", "사용 가능한 daily_brief 파일이 없습니다. 파이프라인 중단.")
            sys.exit(1)
    else:
        log("📂", f"입력 파일: {brief_path.name}")

    # ─────────────────────────────────────────────
    # Step 1.5: Play Store 리뷰 수집 + 분석
    # ─────────────────────────────────────────────
    print()
    log("📌", "Step 1.5: Play Store 리뷰 수집 + 분석")
    review_ok = run_step(
        cmd=[
            sys.executable,
            str(PIPELINE_DIR / "review_collection" / "run_reviews.py"),
            "--date", date_str,
            "--max-reviews", "50",
        ],
        cwd=PIPELINE_DIR,
        timeout=300,
        label="리뷰 수집+분석",
    )
    if not review_ok:
        log("⚠️", "리뷰 수집 실패 (뉴스 브리핑은 정상 진행)")

    # ─────────────────────────────────────────────
    # Step 2: AI Reconstruction + Thumbnail + DB
    # ─────────────────────────────────────────────
    print()
    log("📌", "Step 2: AI 재구성 + 썸네일 + DB 적재")

    reconstruct_cmd = [
        sys.executable,
        str(PIPELINE_DIR / "reconstruction" / "reconstruct.py"),
        "--input", str(brief_path),
    ]
    if args.dry_run:
        reconstruct_cmd.append("--dry-run")

    # Also save output JSON for artifact upload
    output_json = PIPELINE_DIR / f"reconstructed_{date_compact}.json"
    reconstruct_cmd.extend(["--output", str(output_json)])

    reconstruct_ok = run_step(
        cmd=reconstruct_cmd,
        cwd=PIPELINE_DIR / "reconstruction",
        timeout=900,
        label="AI 재구성",
    )

    # ─────────────────────────────────────────────
    # Step 3: Daily Newsletter (일간 뉴스레터)
    # ─────────────────────────────────────────────
    newsletter_ok = False
    if reconstruct_ok:
        print()
        log("📌", "Step 3: 일간 뉴스레터 생성")
        try:
            sys.path.insert(0, str(PIPELINE_DIR / "content_generator"))
            from daily_generator import DailyBriefingGenerator

            generator = DailyBriefingGenerator(pipeline_dir=PIPELINE_DIR)
            nl_date = target_date.replace(tzinfo=None)
            data = generator.collect_daily_data(nl_date)

            if data["reconstructed_articles"]:
                analysis = generator.analyze_daily(data)
                log("✅", f"일간 분석: {analysis['total_articles']}건")

                report = generator.generate_report(data, analysis)
                if report:
                    import json as _json
                    nl_output = PIPELINE_DIR / f"daily_newsletter_{date_compact}.json"
                    with open(nl_output, "w", encoding="utf-8") as f:
                        _json.dump(report, f, ensure_ascii=False, indent=2)
                    log("✅", f"일간 뉴스레터 저장: {nl_output.name}")

                    # 커버 이미지 생성
                    _generate_cover_image(report, "daily", date_compact)
                    # 커버 이미지 포함하여 JSON 재저장
                    if report.get("cover_image_url"):
                        with open(nl_output, "w", encoding="utf-8") as f:
                            _json.dump(report, f, ensure_ascii=False, indent=2)

                    # DB 적재
                    if not args.dry_run:
                        try:
                            from briefing_db_loader import load_daily_to_db
                            load_daily_to_db(report, data["date_label"])
                        except Exception as e:
                            log("⚠️", f"뉴스레터 DB 적재 실패 (JSON은 저장됨): {e}")

                    newsletter_ok = True
                else:
                    log("⚠️", "일간 뉴스레터 생성 실패 (폴백도 실패)")
            else:
                log("⚠️", "재구성 기사 0건 → 뉴스레터 생성 스킵")
        except Exception as e:
            log("⚠️", f"일간 뉴스레터 생성 오류: {e}")
    else:
        log("⚠️", "재구성 실패 → 뉴스레터 생성 스킵")

    # ─────────────────────────────────────────────
    # Summary
    # ─────────────────────────────────────────────
    print()
    print("=" * 60)
    if reconstruct_ok and crawl_ok:
        if newsletter_ok:
            log("🎉", "파이프라인 완료 (모든 단계 성공)")
        else:
            log("🎉", "파이프라인 완료 (뉴스레터 생성 제외)")
        sys.exit(0)
    elif reconstruct_ok and not crawl_ok:
        log("⚠️", "파이프라인 부분 완료 (크롤링 실패, 재구성 성공)")
        sys.exit(2)
    else:
        log("❌", "파이프라인 실패 (재구성 실패)")
        sys.exit(1)


if __name__ == "__main__":
    main()
