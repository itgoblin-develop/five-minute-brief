#!/usr/bin/env python3
"""
Five Minute Brief - Daily Pipeline Runner

Unified orchestrator that runs the full pipeline:
  1. Crawling + Ranking + Trend matching (run_batch.py)
  2. AI Reconstruction + Thumbnail + DB loading (reconstruct.py)

Usage:
  python run_daily.py                          # Full run (today KST)
  python run_daily.py --skip-crawl             # Skip crawling, use existing data
  python run_daily.py --dry-run                # No DB loading
  python run_daily.py --date 2026-02-09        # Specific date
  python run_daily.py --skip-crawl --dry-run   # Reconstruction only, no DB
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


def main():
    parser = argparse.ArgumentParser(description="Five Minute Brief - Daily Pipeline Runner")
    parser.add_argument("--skip-crawl", action="store_true", help="Skip crawling, use existing data")
    parser.add_argument("--dry-run", action="store_true", help="Skip DB loading (reconstruct --dry-run)")
    parser.add_argument("--date", type=str, default=None, help="Target date YYYY-MM-DD (default: today KST)")
    args = parser.parse_args()

    # Determine target date in KST
    if args.date:
        try:
            target_date = datetime.strptime(args.date, "%Y-%m-%d").replace(tzinfo=KST)
        except ValueError:
            print("❌ --date 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요.")
            sys.exit(1)
    else:
        target_date = datetime.now(KST)

    date_str = target_date.strftime("%Y-%m-%d")
    date_compact = target_date.strftime("%Y%m%d")

    # Time window for crawling: yesterday 18:00 ~ today 18:00
    end_dt = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
    start_dt = end_dt - timedelta(days=1)

    print("=" * 60)
    print(f"🗞️  Five Minute Brief - Daily Pipeline")
    print(f"   날짜: {date_str} (KST)")
    print(f"   수집 범위: {start_dt.strftime('%Y-%m-%d %H:%M')} ~ {end_dt.strftime('%Y-%m-%d %H:%M')}")
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
    brief_path = PIPELINE_DIR / f"daily_brief_{date_compact}.json"
    # Also check in ranking_integrated directory
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
    # Summary
    # ─────────────────────────────────────────────
    print()
    print("=" * 60)
    if reconstruct_ok and crawl_ok:
        log("🎉", "파이프라인 완료 (모든 단계 성공)")
        sys.exit(0)
    elif reconstruct_ok and not crawl_ok:
        log("⚠️", "파이프라인 부분 완료 (크롤링 실패, 재구성 성공)")
        sys.exit(2)
    else:
        log("❌", "파이프라인 실패 (재구성 실패)")
        sys.exit(1)


if __name__ == "__main__":
    main()
