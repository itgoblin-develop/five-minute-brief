#!/usr/bin/env python3
"""
멀티사이트 크롤러 오케스트레이터.
33개 외부 IT 사이트에서 뉴스/보도자료를 수집하여 sites_data.json으로 출력한다.

사용법:
    python sites_crawler.py                          # 전체 실행
    python sites_crawler.py --category 빅테크_국내     # 카테고리 필터
    python sites_crawler.py --site samsung_newsroom   # 단일 사이트
    python sites_crawler.py --retry-failed            # 실패 사이트 재시도
"""
import argparse
import json
import logging
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import yaml

# 직접 실행 시 패키지 경로 설정
_current_dir = Path(__file__).resolve().parent
if str(_current_dir.parent) not in sys.path:
    sys.path.insert(0, str(_current_dir.parent))

from crawling_sites.strategies import RSSCrawler, HTMLCrawler, SeleniumCrawler
from crawling_sites.utils import DomainRateLimiter, parse_date

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("sites_crawler")

# 전략별 크롤러 매핑
STRATEGY_MAP = {
    "rss": RSSCrawler,
    "html": HTMLCrawler,
    "selenium": SeleniumCrawler,
}


def load_config(config_path: str) -> dict:
    """sites.yaml 설정 파일을 로드한다."""
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"설정 파일을 찾을 수 없습니다: {config_path}")

    with open(path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # defaults를 각 사이트 설정에 병합
    defaults = config.get("defaults", {})
    sites = config.get("sites", {})
    for site_key, site_config in sites.items():
        merged = {**defaults, **site_config}
        merged["key"] = site_key
        sites[site_key] = merged

    return config


def load_previous_report(report_path: str) -> dict:
    """이전 실행 리포트를 로드한다 (--retry-failed용)."""
    path = Path(report_path)
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def create_crawler(site_config: dict, rate_limiter: DomainRateLimiter):
    """사이트 설정에 따라 적절한 크롤러 인스턴스를 생성한다."""
    strategy = site_config.get("strategy", "html")
    crawler_class = STRATEGY_MAP.get(strategy)
    if not crawler_class:
        raise ValueError(f"지원하지 않는 전략: {strategy}")
    return crawler_class(site_config, rate_limiter)


def filter_sites(
    sites: dict,
    category: str = None,
    site_keys: list = None,
    tier: str = "all",
    retry_failed: bool = False,
    previous_report: dict = None,
) -> dict:
    """실행 조건에 따라 크롤링할 사이트를 필터링한다."""
    filtered = {}

    for key, config in sites.items():
        # 특정 사이트 필터
        if site_keys and key not in site_keys:
            continue

        # 카테고리 필터
        if category and config.get("category") != category:
            continue

        # 티어 필터
        if tier != "all" and config.get("tier", "tier_2") != tier:
            continue

        # 실패 사이트만 재시도
        if retry_failed and previous_report:
            prev_sites = previous_report.get("sites", {})
            if key in prev_sites and prev_sites[key].get("status") != "failed":
                continue

        filtered[key] = config

    return filtered


def print_header(total_sites: int, filters: dict):
    """실행 헤더를 출력한다."""
    filter_desc = []
    if filters.get("category"):
        filter_desc.append(f"카테고리={filters['category']}")
    if filters.get("site"):
        filter_desc.append(f"사이트={filters['site']}")
    if filters.get("tier") != "all":
        filter_desc.append(f"티어={filters['tier']}")
    if filters.get("retry_failed"):
        filter_desc.append("실패 재시도")

    filter_str = f" ({', '.join(filter_desc)})" if filter_desc else ""

    print(f"\n🔄 멀티사이트 크롤링 시작 ({total_sites}개 사이트{filter_str})")
    print("─" * 50)


def print_site_result(name: str, status: str, count: int = 0, elapsed: float = 0, strategy: str = "", error: str = ""):
    """사이트별 결과를 출력한다."""
    if status == "success":
        strategy_tag = f", {strategy.upper()}" if strategy == "rss" else ""
        print(f"  ✅ {name:<24} {count}건  ({elapsed:.1f}s{strategy_tag})")
    elif status == "failed":
        print(f"  ❌ {name:<24} 실패: {error}")
    elif status == "skipped":
        print(f"  ⏭️  {name:<24} 건너뜀 ({error})")


def print_summary(report: dict):
    """최종 요약을 출력한다."""
    summary = report.get("summary", {})
    print("─" * 50)
    print(
        f"📊 결과: {summary.get('success', 0)}/{summary.get('total', 0)} 성공"
        f" | {summary.get('failed', 0)} 실패"
        f" | {summary.get('skipped', 0)} 건너뜀"
        f" | 총 {summary.get('total_articles', 0)}건"
    )

    # 실패 사이트 목록
    failed_sites = [
        name for name, info in report.get("sites", {}).items()
        if info.get("status") == "failed"
    ]
    if failed_sites:
        print(f"❌ 실패 사이트: {', '.join(failed_sites)}")
    print()


def crawl_all_sites(
    config: dict,
    category: str = None,
    site_keys: list = None,
    tier: str = "all",
    retry_failed: bool = False,
    previous_report: dict = None,
    max_articles_override: int = None,
) -> tuple[dict, dict]:
    """
    모든 사이트를 크롤링하고 결과와 리포트를 반환한다.

    Returns:
        (sites_data, sites_report) 튜플
    """
    sites = config.get("sites", {})

    # 사이트 필터링
    target_sites = filter_sites(
        sites, category, site_keys, tier, retry_failed, previous_report
    )

    # max_articles 오버라이드
    if max_articles_override:
        for cfg in target_sites.values():
            cfg["max_articles"] = max_articles_override

    # 레이트 리미터 초기화
    domain_delays = {}
    for cfg in target_sites.values():
        from urllib.parse import urlparse
        domain = urlparse(cfg.get("url", "")).netloc
        delay = cfg.get("rate_limit_seconds", 2.0)
        domain_delays[domain] = delay

    rate_limiter = DomainRateLimiter(
        default_delay=config.get("defaults", {}).get("rate_limit_seconds", 2.0),
        domain_delays=domain_delays,
    )

    # 결과 데이터 구조
    now = datetime.now()
    sites_data = {
        "crawled_at": now.isoformat(),
        "source": "multi_site_crawler",
        "total_sections": 0,
        "total_articles": 0,
        "categories": [],
    }

    # 리포트 구조
    report = {
        "crawled_at": now.isoformat(),
        "summary": {"total": len(target_sites), "success": 0, "failed": 0, "skipped": 0, "total_articles": 0},
        "sites": {},
        "by_category": defaultdict(lambda: {"success": 0, "failed": 0, "total": 0}),
    }

    # 카테고리별 그룹핑
    sites_by_category = defaultdict(list)
    for key, cfg in target_sites.items():
        sites_by_category[cfg.get("category", "기타")].append((key, cfg))

    # 헤더 출력
    print_header(len(target_sites), {
        "category": category, "site": site_keys, "tier": tier, "retry_failed": retry_failed
    })

    # 카테고리별 크롤링
    for cat_name, cat_sites in sites_by_category.items():
        print(f"\n[{cat_name}]")
        category_articles = []
        report["by_category"][cat_name]["total"] = len(cat_sites)

        for key, cfg in cat_sites:
            start_time = time.time()

            try:
                crawler = create_crawler(cfg, rate_limiter)
                with crawler:
                    articles = crawler.crawl()

                elapsed = time.time() - start_time
                category_articles.extend(articles)

                # 성공 리포트
                report["sites"][key] = {
                    "status": "success",
                    "name": cfg.get("name", key),
                    "articles_count": len(articles),
                    "elapsed_seconds": round(elapsed, 1),
                    "strategy": cfg.get("strategy", "html"),
                }
                report["summary"]["success"] += 1
                report["summary"]["total_articles"] += len(articles)
                report["by_category"][cat_name]["success"] += 1

                print_site_result(
                    cfg.get("name", key), "success",
                    count=len(articles), elapsed=elapsed,
                    strategy=cfg.get("strategy", "html"),
                )

            except Exception as e:
                elapsed = time.time() - start_time
                error_msg = str(e)[:100]

                # 실패 리포트
                report["sites"][key] = {
                    "status": "failed",
                    "name": cfg.get("name", key),
                    "error": error_msg,
                    "elapsed_seconds": round(elapsed, 1),
                    "strategy": cfg.get("strategy", "html"),
                }
                report["summary"]["failed"] += 1
                report["by_category"][cat_name]["failed"] += 1

                print_site_result(cfg.get("name", key), "failed", error=error_msg)
                logger.debug(f"[{key}] 크롤링 실패 상세:", exc_info=True)

        # 카테고리 데이터 추가
        if category_articles:
            # 카테고리 내 사이트별로 sub_category 분리
            articles_by_site = defaultdict(list)
            for article in category_articles:
                articles_by_site[article.get("press", cat_name)].append(article)

            for sub_name, sub_articles in articles_by_site.items():
                sites_data["categories"].append({
                    "main_category": cat_name,
                    "sub_category": sub_name,
                    "article_count": len(sub_articles),
                    "articles": sub_articles,
                })
                sites_data["total_sections"] += 1
                sites_data["total_articles"] += len(sub_articles)

    # by_category를 일반 dict로 변환 (JSON 직렬화용)
    report["by_category"] = dict(report["by_category"])

    # 요약 출력
    print_summary(report)

    return sites_data, report


def main():
    """CLI 진입점."""
    parser = argparse.ArgumentParser(
        description="멀티사이트 IT 뉴스 크롤러",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예:
  python sites_crawler.py                          # 전체 실행
  python sites_crawler.py --category 빅테크_국내     # 카테고리 필터
  python sites_crawler.py --site samsung_newsroom   # 단일 사이트 디버깅
  python sites_crawler.py --retry-failed            # 실패 사이트만 재시도
  python sites_crawler.py --tier tier_1             # 특정 티어만
        """,
    )

    parser.add_argument("--config", default=None, help="설정 파일 경로 (기본: config/sites.yaml)")
    parser.add_argument("--output", default=None, help="출력 파일 경로 (기본: sites_data.json)")
    parser.add_argument("--report", default=None, help="리포트 파일 경로 (기본: sites_report.json)")
    parser.add_argument("--category", default=None, help="특정 카테고리만 크롤링")
    parser.add_argument("--site", action="append", default=None, help="특정 사이트만 크롤링 (여러 번 지정 가능)")
    parser.add_argument("--tier", default="all", choices=["tier_1", "tier_2", "tier_3", "all"],
                        help="특정 티어만 크롤링")
    parser.add_argument("--retry-failed", action="store_true", help="이전에 실패한 사이트만 재시도")
    parser.add_argument("--max-articles", type=int, default=None, help="사이트당 최대 기사 수 오버라이드")

    args = parser.parse_args()

    # 경로 설정
    base_dir = Path(__file__).parent
    config_path = args.config or str(base_dir / "config" / "sites.yaml")
    output_path = args.output or str(base_dir / "sites_data.json")
    report_path = args.report or str(base_dir / "sites_report.json")

    # 설정 로드
    try:
        config = load_config(config_path)
    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)

    # 이전 리포트 로드 (retry-failed용)
    previous_report = {}
    if args.retry_failed:
        previous_report = load_previous_report(report_path)
        if not previous_report:
            logger.warning("이전 리포트를 찾을 수 없습니다. 전체 사이트를 크롤링합니다.")

    # 크롤링 실행
    try:
        sites_data, report = crawl_all_sites(
            config=config,
            category=args.category,
            site_keys=args.site,
            tier=args.tier,
            retry_failed=args.retry_failed,
            previous_report=previous_report,
            max_articles_override=args.max_articles,
        )
    except KeyboardInterrupt:
        logger.info("사용자에 의해 중단되었습니다.")
        sys.exit(130)

    # 결과 저장
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sites_data, f, ensure_ascii=False, indent=2)
    logger.info(f"📁 크롤링 데이터 저장: {output_path}")

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    logger.info(f"📋 리포트 저장: {report_path}")

    # 종료 코드
    failed_count = report.get("summary", {}).get("failed", 0)
    if failed_count > 0:
        sys.exit(2)  # 일부 실패
    sys.exit(0)


if __name__ == "__main__":
    main()
