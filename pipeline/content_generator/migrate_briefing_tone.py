#!/usr/bin/env python3
"""
기존 브리핑 톤 마이그레이션 스크립트

DB에 저장된 브리핑 텍스트를 비형의 새로운 톤(반말 + "김서방들")으로 변환한다.

사용법:
  python migrate_briefing_tone.py --dry-run               # 미리보기 (DB 변경 없음)
  python migrate_briefing_tone.py                          # 전체 마이그레이션
  python migrate_briefing_tone.py --type daily             # 일간만
  python migrate_briefing_tone.py --type weekly --id 3     # 주간 #3만
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import psycopg2

# 프로젝트 루트를 PATH에 추가
PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))

TONE_CONVERSION_PROMPT = """\
당신은 텍스트 톤 변환 전문가입니다.

아래 텍스트를 IT 도깨비 비형의 새로운 말투로 변환하세요.

비형 말투 규칙:
- 반말 기조 (~해/~거든/~인데/~잖아/~야). 경어체(합니다/습니다) 절대 사용 금지
- 독자를 "김서방들"(복수)로 호칭
- 자조적 유머, 인터넷 표현(ㅋㅋ, 그치?, ㅎㅎ, 히힛) 자연스럽게 섞기
- 이모지를 감정 표현에 활용 (🪄✨💥🔥🤔😎👀 등)
- 개인 의견·경험 삽입 ("솔직히 나는...", "나도 써봤는데...")
- 독자 참여 유도 ("김서방들은 어떻게 생각해?")
- 겉보기엔 가볍지만, 팩트와 인사이트는 정확히 유지
- 기술 용어 영문 병기 유지
- 서명은 "— IT 도깨비 비형" 사용

변환 원칙:
- 팩트, 수치, 기업명, 제품명은 절대 변경하지 않음
- 문장 구조와 내용은 유지하되, 톤만 변환
- 과도한 변환보다는 자연스러운 반말 전환이 중요
- 원문의 길이와 비슷하게 유지 (±20%)

원문:
{text}

반드시 아래 JSON 형식으로 응답하세요:
{{"converted": "변환된 텍스트"}}
"""


def get_db_connection():
    """psycopg2 DB 연결 생성"""
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ.get("DB_NAME", "five_minute_brief"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "postgres"),
    )


def create_llm():
    """톤 변환용 LLM 라우터 생성"""
    import yaml
    from dotenv import load_dotenv
    from ai_rewriter import create_llm_router

    project_root = PIPELINE_DIR.parent
    env_path = project_root / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    config_path = PIPELINE_DIR / "reconstruction" / "config.yaml"
    config = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

    llm_config = config.get("llm", {})
    llm_config["temperature"] = 0.5  # 톤 변환은 낮은 temperature
    llm_config["max_output_tokens"] = 4096
    return create_llm_router(llm_config)


def convert_text(llm_router, text: str) -> str:
    """LLM으로 텍스트 톤 변환"""
    if not text or len(text.strip()) < 10:
        return text

    # 이미 반말 톤인지 간이 체크
    casual_markers = ["김서방들", "~거든", "~잖아", "🪄", "ㅋㅋ"]
    formal_markers = ["습니다", "합니다", "드립니다", "겠습니다", "주세요"]
    has_casual = any(m in text for m in casual_markers)
    has_formal = any(m in text for m in formal_markers)
    if has_casual and not has_formal:
        return text  # 이미 반말 톤

    prompt = TONE_CONVERSION_PROMPT.replace("{text}", text)
    try:
        result = llm_router.generate("", prompt)
        converted = result.get("converted", "")
        if converted and len(converted) > 10:
            return converted
    except Exception as e:
        print(f"    ⚠️ LLM 변환 실패: {e}")

    return text  # 실패 시 원문 유지


def migrate_daily(conn, llm_router, brief_id=None, dry_run=False):
    """일간 브리핑 톤 변환"""
    cur = conn.cursor()

    query = "SELECT brief_id, title, date_label, intro_comment, daily_comment, category_highlights FROM daily_briefs"
    if brief_id:
        query += f" WHERE brief_id = {brief_id}"
    query += " ORDER BY brief_id"
    cur.execute(query)
    rows = cur.fetchall()

    print(f"\n📰 일간 브리핑: {len(rows)}건 대상")

    for row in rows:
        bid, title, date_label, intro_comment, daily_comment, cat_highlights = row
        print(f"\n  [{bid}] {title} ({date_label})")
        changed = False

        # intro_comment 변환
        if intro_comment:
            new_intro = convert_text(llm_router, intro_comment)
            if new_intro != intro_comment:
                print(f"    intro_comment: {intro_comment[:50]}...")
                print(f"    → {new_intro[:50]}...")
                intro_comment = new_intro
                changed = True

        # daily_comment 변환
        if daily_comment:
            new_daily = convert_text(llm_router, daily_comment)
            if new_daily != daily_comment:
                print(f"    daily_comment: {daily_comment[:50]}...")
                print(f"    → {new_daily[:50]}...")
                daily_comment = new_daily
                changed = True

        # category_highlights 내부 텍스트 변환
        if cat_highlights:
            highlights = cat_highlights if isinstance(cat_highlights, list) else json.loads(cat_highlights)
            highlights_changed = False
            for item in highlights:
                for field in ["summary", "content"]:
                    if field in item and item[field]:
                        new_val = convert_text(llm_router, item[field])
                        if new_val != item[field]:
                            print(f"    category[{item.get('category', '?')}].{field}: 변환됨")
                            item[field] = new_val
                            highlights_changed = True
            if highlights_changed:
                cat_highlights = json.dumps(highlights, ensure_ascii=False)
                changed = True

        if changed and not dry_run:
            cur.execute(
                """UPDATE daily_briefs
                   SET intro_comment = %s, daily_comment = %s, category_highlights = %s
                   WHERE brief_id = %s""",
                (intro_comment, daily_comment, cat_highlights, bid),
            )
            conn.commit()
            print(f"    ✅ DB 업데이트 완료")
        elif changed:
            print(f"    🔍 [dry-run] 변경사항 있음")
        else:
            print(f"    ⏭️ 변환 불필요 (이미 반말 톤)")

        time.sleep(0.5)

    cur.close()


def migrate_weekly(conn, llm_router, brief_id=None, dry_run=False):
    """주간 브리핑 톤 변환"""
    cur = conn.cursor()

    query = "SELECT brief_id, title, period, weekly_comment, category_highlights FROM weekly_briefs"
    if brief_id:
        query += f" WHERE brief_id = {brief_id}"
    query += " ORDER BY brief_id"
    cur.execute(query)
    rows = cur.fetchall()

    print(f"\n📅 주간 브리핑: {len(rows)}건 대상")

    for row in rows:
        bid, title, period, weekly_comment, cat_highlights = row
        print(f"\n  [{bid}] {title} ({period})")
        changed = False

        # weekly_comment 변환
        if weekly_comment:
            new_comment = convert_text(llm_router, weekly_comment)
            if new_comment != weekly_comment:
                print(f"    weekly_comment: {weekly_comment[:50]}...")
                print(f"    → {new_comment[:50]}...")
                weekly_comment = new_comment
                changed = True

        # category_highlights 내부 텍스트 변환
        if cat_highlights:
            highlights = cat_highlights if isinstance(cat_highlights, list) else json.loads(cat_highlights)
            highlights_changed = False
            for item in highlights:
                if "content" in item and item["content"]:
                    new_val = convert_text(llm_router, item["content"])
                    if new_val != item["content"]:
                        print(f"    category[{item.get('category', '?')}].content: 변환됨")
                        item["content"] = new_val
                        highlights_changed = True
            if highlights_changed:
                cat_highlights = json.dumps(highlights, ensure_ascii=False)
                changed = True

        if changed and not dry_run:
            cur.execute(
                """UPDATE weekly_briefs
                   SET weekly_comment = %s, category_highlights = %s
                   WHERE brief_id = %s""",
                (weekly_comment, cat_highlights, bid),
            )
            conn.commit()
            print(f"    ✅ DB 업데이트 완료")
        elif changed:
            print(f"    🔍 [dry-run] 변경사항 있음")
        else:
            print(f"    ⏭️ 변환 불필요 (이미 반말 톤)")

        time.sleep(0.5)

    cur.close()


def migrate_monthly(conn, llm_router, brief_id=None, dry_run=False):
    """월간 브리핑 톤 변환"""
    cur = conn.cursor()

    query = "SELECT brief_id, title, period, monthly_editorial, deep_articles FROM monthly_briefs"
    if brief_id:
        query += f" WHERE brief_id = {brief_id}"
    query += " ORDER BY brief_id"
    cur.execute(query)
    rows = cur.fetchall()

    print(f"\n📊 월간 브리핑: {len(rows)}건 대상")

    for row in rows:
        bid, title, period, editorial, deep_articles = row
        print(f"\n  [{bid}] {title} ({period})")
        changed = False

        # monthly_editorial 변환
        if editorial:
            new_editorial = convert_text(llm_router, editorial)
            if new_editorial != editorial:
                print(f"    monthly_editorial: {editorial[:50]}...")
                print(f"    → {new_editorial[:50]}...")
                editorial = new_editorial
                changed = True

        # deep_articles 내부 content 변환
        if deep_articles:
            articles = deep_articles if isinstance(deep_articles, list) else json.loads(deep_articles)
            articles_changed = False
            for article in articles:
                if "content" in article and article["content"]:
                    new_content = convert_text(llm_router, article["content"])
                    if new_content != article["content"]:
                        print(f"    deep_article[{article.get('title', '?')[:20]}].content: 변환됨")
                        article["content"] = new_content
                        articles_changed = True
            if articles_changed:
                deep_articles = json.dumps(articles, ensure_ascii=False)
                changed = True

        if changed and not dry_run:
            cur.execute(
                """UPDATE monthly_briefs
                   SET monthly_editorial = %s, deep_articles = %s
                   WHERE brief_id = %s""",
                (editorial, deep_articles, bid),
            )
            conn.commit()
            print(f"    ✅ DB 업데이트 완료")
        elif changed:
            print(f"    🔍 [dry-run] 변경사항 있음")
        else:
            print(f"    ⏭️ 변환 불필요 (이미 반말 톤)")

        time.sleep(0.5)

    cur.close()


def main():
    parser = argparse.ArgumentParser(description="IT 도깨비 브리핑 톤 마이그레이션")
    parser.add_argument("--dry-run", action="store_true",
                        help="DB 변경 없이 미리보기만")
    parser.add_argument("--type", choices=["daily", "weekly", "monthly"],
                        help="특정 타입만 마이그레이션 (기본: 전체)")
    parser.add_argument("--id", type=int, default=None,
                        help="특정 brief_id만 마이그레이션")
    args = parser.parse_args()

    print("=" * 60)
    print("🪄 IT 도깨비 브리핑 톤 마이그레이션")
    print(f"   모드: {'미리보기 (dry-run)' if args.dry_run else '실행'}")
    print(f"   대상: {args.type or '전체'}")
    if args.id:
        print(f"   ID: {args.id}")
    print("=" * 60)

    # LLM 초기화
    print("\n🤖 LLM 초기화...")
    llm_router = create_llm()
    print("  ✅ LLM 준비 완료")

    # DB 연결
    print("\n🔗 DB 연결...")
    conn = get_db_connection()
    print("  ✅ DB 연결 완료")

    try:
        if not args.type or args.type == "daily":
            migrate_daily(conn, llm_router, args.id, args.dry_run)

        if not args.type or args.type == "weekly":
            migrate_weekly(conn, llm_router, args.id, args.dry_run)

        if not args.type or args.type == "monthly":
            migrate_monthly(conn, llm_router, args.id, args.dry_run)
    finally:
        conn.close()

    print("\n" + "=" * 60)
    print("🎉 마이그레이션 완료!")
    if args.dry_run:
        print("   ℹ️ dry-run 모드 — 실제 DB 변경 없음")
        print("   실행하려면 --dry-run 없이 다시 실행하세요")
    print("=" * 60)


if __name__ == "__main__":
    main()
