#!/usr/bin/env python3
"""
기존 기사 재톤 스크립트
- DB에서 기존 기사를 읽어와 새 에디토리얼 스타일로 재작성
- 직접 인용 제거, Hook→Context→Impact→Outlook 구조 적용

사용법:
  python retone_existing.py --dry-run              # JSON 저장만 (DB 수정 없음)
  python retone_existing.py                        # DB 직접 업데이트
  python retone_existing.py --ids 1 2 3            # 특정 기사만 재톤
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

# 프로젝트 루트 & PATH 설정
sys.path.insert(0, str(Path(__file__).parent))

from ai_rewriter import create_llm_router
from validator import ArticleValidator


RETONE_PROMPT = """다음은 기존에 작성된 [{category}] 카테고리 기사입니다.

[제목] {title}
[내용]
{content}

위 기사를 새로운 에디토리얼 가이드라인에 맞게 재작성해 주세요.

재작성 지침:
1. 기존 기사의 핵심 팩트와 수치를 보존하면서, IT 도깨비만의 시선으로 새로 써주세요.
2. 특정 인물의 발언을 직접 인용("")하지 마세요. 핵심 의미만 자연스럽게 녹이세요.
3. 첫 문단은 독자의 관심을 끄는 훅(Hook)으로 시작하세요. 질문, 비유, 의외의 사실 등.
4. "이게 왜 중요한지", "독자에게 어떤 영향이 있는지"를 반드시 포함하세요.
5. IT 도깨비의 목소리가 기사 전체에 자연스럽게 녹아야 합니다.
6. 제목은 사실 나열이 아닌 관점/인사이트를 담은 제목으로 변경하세요.
7. 제목에 이모지를 사용하지 마세요.

반드시 지정된 JSON 형식으로 응답하세요."""


def find_project_root() -> Path:
    """프로젝트 루트 디렉토리 탐색"""
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / ".git").exists() or (current / ".env").exists():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return Path(__file__).resolve().parent.parent.parent


def load_config() -> dict:
    """config.yaml 로드"""
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def fetch_articles(db_config: dict, ids: list = None) -> list:
    """DB에서 기사 목록 조회"""
    import psycopg2

    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()

    if ids:
        placeholders = ", ".join(["%s"] * len(ids))
        cur.execute(
            f"SELECT news_id, title, summary, bullet_summary, content, category, hashtags "
            f"FROM news WHERE news_id IN ({placeholders}) ORDER BY news_id",
            ids,
        )
    else:
        cur.execute(
            "SELECT news_id, title, summary, bullet_summary, content, category, hashtags "
            "FROM news ORDER BY news_id"
        )

    columns = ["news_id", "title", "summary", "bullet_summary", "content", "category", "hashtags"]
    articles = [dict(zip(columns, row)) for row in cur.fetchall()]

    conn.close()
    return articles


def update_article(db_config: dict, news_id: int, data: dict):
    """DB에서 기사 업데이트"""
    import psycopg2

    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()

    cur.execute(
        """UPDATE news
        SET title = %s, summary = %s, bullet_summary = %s,
            content = %s, hashtags = %s
        WHERE news_id = %s""",
        (
            data["title"],
            data["summary"],
            json.dumps(data["bullet_summary"], ensure_ascii=False),
            data["content"],
            json.dumps(data["hashtags"], ensure_ascii=False),
            news_id,
        ),
    )

    conn.commit()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="기존 기사 재톤 스크립트")
    parser.add_argument("--dry-run", action="store_true", help="DB 수정 없이 결과만 저장")
    parser.add_argument("--ids", nargs="+", type=int, help="특정 기사 ID만 재톤")
    parser.add_argument("--output", type=str, default=None, help="결과 JSON 저장 경로")
    args = parser.parse_args()

    # 환경 설정
    project_root = find_project_root()
    load_dotenv(project_root / ".env")

    config = load_config()

    db_config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "five_minute_brief"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
    }

    print("=" * 60)
    print("🔄 기존 기사 재톤 시작")
    print(f"   시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   모드: {'DRY-RUN' if args.dry_run else 'DB UPDATE'}")
    print("=" * 60)

    # 1. DB에서 기사 조회
    print("\n📌 Phase 1: DB에서 기사 조회")
    articles = fetch_articles(db_config, args.ids)
    print(f"  📊 조회된 기사: {len(articles)}건")

    if not articles:
        print("  ⚠️ 재톤할 기사가 없습니다.")
        return

    # 2. LLM 라우터 생성
    print("\n📌 Phase 2: LLM 준비")
    llm_router = create_llm_router(config.get("llm", {}))

    # 시스템 프롬프트 로드
    prompt_dir = Path(__file__).parent / "prompts"
    with open(prompt_dir / "system_prompt.txt", "r", encoding="utf-8") as f:
        system_prompt = f.read()

    # 검증기 생성
    validator = ArticleValidator(config.get("validation", {}))

    # 3. 기사별 재톤
    print(f"\n📌 Phase 3: AI 재톤 ({len(articles)}건)")
    results = []
    success_count = 0
    fail_count = 0
    request_interval = config.get("llm", {}).get("request_interval", 0.5)

    for i, article in enumerate(articles, 1):
        news_id = article["news_id"]
        old_title = article["title"]
        category = article["category"]

        print(f"  🔄 [{i}/{len(articles)}] news_id={news_id}: {old_title[:30]}...")

        user_prompt = RETONE_PROMPT.format(
            category=category,
            title=old_title,
            content=article["content"],
        )

        try:
            result = llm_router.generate(system_prompt, user_prompt)

            # 검증 + 자동 보정
            result = validator._auto_correct(result)

            new_title = result.get("title", old_title)
            print(f"     ✅ {old_title[:20]}... → {new_title[:30]}")

            results.append({
                "news_id": news_id,
                "old_title": old_title,
                "new_title": new_title,
                "title": new_title,
                "summary": result.get("summary", ""),
                "bullet_summary": result.get("bullet_summary", []),
                "content": result.get("content", ""),
                "hashtags": result.get("hashtags", []),
                "category": category,
            })
            success_count += 1

        except Exception as e:
            print(f"     ❌ 실패: {e}")
            fail_count += 1

        # API 요청 간 인터벌
        if i < len(articles):
            time.sleep(request_interval)

    # 4. 결과 저장/업데이트
    print(f"\n📌 Phase 4: 결과 적용")
    print(f"  📊 성공: {success_count}건, 실패: {fail_count}건")

    # JSON 저장
    output_path = args.output or f"/tmp/retone_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  💾 결과 JSON: {output_path}")

    # DB 업데이트
    if not args.dry_run:
        print("\n  🔧 DB 업데이트 중...")
        updated = 0
        for item in results:
            try:
                update_article(db_config, item["news_id"], item)
                updated += 1
            except Exception as e:
                print(f"     ❌ news_id={item['news_id']} 업데이트 실패: {e}")
        print(f"  ✅ DB 업데이트 완료: {updated}/{len(results)}건")
    else:
        print("  ⏭️  DRY-RUN 모드: DB 업데이트 건너뜀")

    # LLM 통계
    stats = llm_router.get_stats()
    print(f"\n  📊 LLM 호출 통계:")
    print(f"     메인 성공: {stats['primary_success']}회")
    print(f"     메인 실패: {stats['primary_fail']}회")

    print("\n" + "=" * 60)
    print("✅ 재톤 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
