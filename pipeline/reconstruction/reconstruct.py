#!/usr/bin/env python3
"""
AI 뉴스 재구성 메인 실행 스크립트

사용법:
  python reconstruct.py --input daily_brief_20260202.json
  python reconstruct.py --input daily_brief_20260202.json --dry-run
  python reconstruct.py --input daily_brief_20260202.json --output reconstructed.json --dry-run
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import yaml
from dotenv import load_dotenv

# 프로젝트 루트를 PATH에 추가
sys.path.insert(0, str(Path(__file__).parent))

from preprocessor import Preprocessor, load_daily_brief
from clusterer import ArticleClusterer
from ai_rewriter import AIRewriter, create_llm_router
from validator import ArticleValidator
from db_loader import load_to_db
from image_generator import ThumbnailGenerator


def _find_project_root() -> Path:
    """프로젝트 루트 디렉토리 탐색 (.git 기준, 없으면 상위 3단계)"""
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / ".git").exists() or (current / ".env").exists():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    # 폴백: reconstruction → pipeline → 프로젝트 루트
    return Path(__file__).resolve().parent.parent.parent


def load_config(config_path: str = None) -> dict:
    """설정 파일 로드"""
    if config_path is None:
        config_path = Path(__file__).parent / "config.yaml"
    else:
        config_path = Path(config_path)

    if not config_path.exists():
        print(f"  ⚠️ 설정 파일 없음: {config_path}, 기본값 사용")
        return {}

    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description="AI 뉴스 재구성 파이프라인")
    parser.add_argument("--input", required=True, help="daily_brief JSON 파일 경로")
    parser.add_argument("--output", default=None, help="재구성 결과 JSON 출력 경로")
    parser.add_argument("--dry-run", action="store_true", help="DB 적재 없이 결과만 출력")
    parser.add_argument("--config", default=None, help="설정 파일 경로")
    args = parser.parse_args()

    # 환경변수 로드 (프로젝트 루트 .env)
    env_path = _find_project_root() / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        print(f"  ⚠️ .env 파일을 찾을 수 없습니다: {env_path}")

    # 설정 로드
    config = load_config(args.config)

    start_time = time.time()
    print("=" * 60)
    print(f"🚀 AI 뉴스 재구성 파이프라인 시작")
    print(f"   시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   입력: {args.input}")
    print(f"   모드: {'DRY-RUN (DB 적재 없음)' if args.dry_run else 'PRODUCTION'}")
    print("=" * 60)

    # ─────────────────────────────────────────────
    # Phase 1: 전처리
    # ─────────────────────────────────────────────
    print(f"\n📌 Phase 1: 전처리")
    brief_data = load_daily_brief(args.input)
    preprocessor = Preprocessor(
        max_content_length=config.get("preprocessing", {}).get("max_content_per_article", 2000)
    )
    articles_by_category = preprocessor.process(brief_data)
    total_articles = sum(len(v) for v in articles_by_category.values())
    print(f"  ✅ 전처리 완료: {total_articles}건\n")

    # ─────────────────────────────────────────────
    # Phase 2: 주제 클러스터링
    # ─────────────────────────────────────────────
    print(f"📌 Phase 2: 주제 클러스터링")
    clusterer = ArticleClusterer(config.get("clustering", {}))
    clustered = clusterer.cluster_by_category(articles_by_category)
    total_clusters = sum(len(v) for v in clustered.values())
    print(f"  ✅ 클러스터링 완료: {total_clusters}개 클러스터\n")

    # ─────────────────────────────────────────────
    # Phase 3: AI 재구성
    # ─────────────────────────────────────────────
    print(f"📌 Phase 3: AI 재구성 (페르소나 기반)")
    llm_config = config.get("llm", {})
    llm_config["persona_map"] = config.get("persona_map", {})
    llm_router = create_llm_router(llm_config)
    rewriter = AIRewriter(llm_router, llm_config)
    reconstructed = rewriter.reconstruct_all(clustered)
    print(f"  ✅ AI 재구성 완료: {len(reconstructed)}건\n")

    # LLM 통계 출력
    stats = llm_router.get_stats()
    if any(stats.values()):
        print(f"  📊 LLM 호출 통계:")
        print(f"     메인 성공: {stats['primary_success']}회")
        if stats['primary_fail']:
            print(f"     메인 실패: {stats['primary_fail']}회")
        if stats['fallback_success']:
            print(f"     폴백 성공: {stats['fallback_success']}회")
        if stats['fallback_fail']:
            print(f"     폴백 실패: {stats['fallback_fail']}회")
        print()

    # ─────────────────────────────────────────────
    # Phase 3.5: 썸네일 생성
    # ─────────────────────────────────────────────
    image_config = config.get("image", {})
    if image_config.get("enabled", False):
        print(f"📌 Phase 3.5: AI 썸네일 생성")
        try:
            thumbnail_gen = ThumbnailGenerator(image_config)
            reconstructed = thumbnail_gen.generate_all(reconstructed)
        except Exception as e:
            print(f"  ⚠️ 썸네일 생성 모듈 초기화 실패: {e}")
            print(f"  → default_images로 폴백합니다.")
            default_images = image_config.get("default_images", {})
            category_kr_map = config.get("category_map", {"IT": "IT 소식", "Review": "리뷰", "HowTo": "사용 방법"})
            for article in reconstructed:
                cat_kr = category_kr_map.get(article.get("category", ""), article.get("category", ""))
                article["image_url"] = default_images.get(cat_kr, "")
        print()
    else:
        default_images = image_config.get("default_images", {})
        category_kr_map = config.get("category_map", {"IT": "IT 소식", "Review": "리뷰", "HowTo": "사용 방법"})
        for article in reconstructed:
            cat_kr = category_kr_map.get(article.get("category", ""), article.get("category", ""))
            article["image_url"] = default_images.get(cat_kr, "")

    # ─────────────────────────────────────────────
    # Phase 4: 품질 검증
    # ─────────────────────────────────────────────
    print(f"📌 Phase 4: 품질 검증")
    validator = ArticleValidator(config.get("validation", {}))
    validated = validator.validate_all(reconstructed)

    # 원문 유사도 체크
    originality_warnings = 0
    for article in validated:
        source_articles = article.get("_source_articles", [])
        original_contents = [a.get("content", "") for a in source_articles]
        passed, similarity = validator.check_originality(
            original_contents, article.get("content", "")
        )
        if not passed:
            originality_warnings += 1
            print(f"  ⚠️ 유사도 경고 [{article.get('title', '')[:20]}...]: {similarity:.2f}")

    print(f"  ✅ 품질 검증 완료: {len(validated)}건 (유사도 경고: {originality_warnings}건)\n")

    # ─────────────────────────────────────────────
    # 결과 출력 (JSON)
    # ─────────────────────────────────────────────
    if args.output:
        output_data = []
        for article in validated:
            output_data.append({
                "title": article["title"],
                "summary": article["summary"],
                "bullet_summary": article["bullet_summary"],
                "content": article["content"],
                "hashtags": article["hashtags"],
                "category": article["category"],
                "persona": article.get("persona", ""),
                "image_url": article.get("image_url", ""),
                "source_count": article.get("source_count", 1),
                "source_links": article.get("source_links", []),
            })
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"💾 결과 저장: {args.output}")

    # ─────────────────────────────────────────────
    # Phase 5: DB 적재
    # ─────────────────────────────────────────────
    if not args.dry_run:
        print(f"\n📌 Phase 5: DB 적재")
        db_config_raw = config.get("database") or {}
        load_to_db(validated, db_config_raw if db_config_raw.get("host") else None)
        print(f"  ✅ DB 적재 완료")
    else:
        print(f"\n⏭️  DRY-RUN 모드: DB 적재 건너뜀")

    # ─────────────────────────────────────────────
    # 최종 요약
    # ─────────────────────────────────────────────
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"✅ AI 뉴스 재구성 완료!")
    print(f"   총 소요 시간: {elapsed:.1f}초")
    print(f"   입력 기사: {total_articles}건")
    print(f"   클러스터: {total_clusters}개")
    print(f"   재구성 기사: {len(validated)}건")

    # 카테고리별 분포
    cat_counts = {}
    for article in validated:
        cat = article.get("category", "Unknown")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print(f"   카테고리별: {', '.join(f'{k}({v})' for k, v in sorted(cat_counts.items()))}")

    fallback_count = sum(1 for a in validated if a.get("_fallback"))
    if fallback_count:
        print(f"   ⚠️ 폴백 재구성: {fallback_count}건")

    print("=" * 60)


if __name__ == "__main__":
    main()
