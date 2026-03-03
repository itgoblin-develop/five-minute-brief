#!/usr/bin/env python3
"""
월간 브리핑 생성기

30일치 일간/주간 데이터를 집계하여 IT 도깨비 스타일 월간 심층 리포트를 생성한다.

입력: daily_brief_YYYYMMDD.json × 30 + reconstructed_YYYYMMDD.json × 30
출력: monthly_brief_YYYYMM.json

사용법:
  python monthly_generator.py                      # 직전 월
  python monthly_generator.py --month 2026-02      # 특정 월
  python monthly_generator.py --dry-run             # DB 적재 없이 결과만 출력
"""

import argparse
import calendar
import json
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

# 프로젝트 루트를 PATH에 추가
PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))

KST = timezone(timedelta(hours=9))

CATEGORY_KR = {
    "mobile": "모바일",
    "pc": "PC",
    "ai": "AI",
    "network": "네트워크/통신",
    "security": "보안",
    "etc": "기타",
}


class MonthlyBriefingGenerator:
    """일간 데이터 한 달치를 집계하여 월간 심층 리포트 생성"""

    def __init__(self, pipeline_dir: Path = None):
        self.pipeline_dir = pipeline_dir or PIPELINE_DIR
        self.prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "monthly_prompt.txt"
        self.system_prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "system_prompt.txt"

    def collect_monthly_data(self, year: int, month: int) -> Dict:
        """한 달치 일간 데이터 수집"""
        _, last_day = calendar.monthrange(year, month)
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month, last_day)

        daily_briefs = []
        reconstructed_articles = []
        all_trends = Counter()
        daily_article_counts = []

        current = start_date
        while current <= end_date:
            date_str = current.strftime("%Y%m%d")

            # daily_brief 수집
            brief_path = self._find_file(f"daily_brief_{date_str}.json")
            if brief_path:
                try:
                    with open(brief_path, "r", encoding="utf-8") as f:
                        brief = json.load(f)
                    daily_briefs.append(brief)
                    for kw in brief.get("trends_summary", []):
                        all_trends[kw] += 1
                except Exception as e:
                    print(f"  ⚠️ daily_brief_{date_str}.json 로드 실패: {e}")

            # reconstructed 수집
            recon_path = self._find_file(f"reconstructed_{date_str}.json")
            if recon_path:
                try:
                    with open(recon_path, "r", encoding="utf-8") as f:
                        articles = json.load(f)
                    daily_article_counts.append(len(articles))
                    reconstructed_articles.extend(articles)
                except Exception as e:
                    print(f"  ⚠️ reconstructed_{date_str}.json 로드 실패: {e}")

            current += timedelta(days=1)

        return {
            "daily_briefs": daily_briefs,
            "reconstructed_articles": reconstructed_articles,
            "trend_keywords": all_trends,
            "daily_article_counts": daily_article_counts,
            "period": {
                "year": year,
                "month": month,
                "label": f"{year}년 {month:02d}월",
            },
        }

    def _find_file(self, filename: str) -> Optional[Path]:
        """파이프라인 디렉토리 내에서 파일 탐색"""
        direct = self.pipeline_dir / filename
        if direct.exists():
            return direct
        alt = self.pipeline_dir / "ranking_integrated" / filename
        if alt.exists():
            return alt
        return None

    def deep_analysis(self, data: Dict) -> Dict:
        """월간 심층 트렌드 분석"""
        # 키워드 빈도 TOP 20
        top_keywords = data["trend_keywords"].most_common(20)

        # 카테고리별 기사 분포
        category_counts = Counter()
        category_articles = {}
        for article in data["reconstructed_articles"]:
            cat = article.get("category", "etc")
            category_counts[cat] += 1
            if cat not in category_articles:
                category_articles[cat] = []
            category_articles[cat].append(article)

        # 일별 기사 수 통계
        daily_counts = data["daily_article_counts"]
        avg_daily = sum(daily_counts) / len(daily_counts) if daily_counts else 0
        max_daily = max(daily_counts) if daily_counts else 0

        # 가장 많이 등장한 해시태그
        hashtag_counter = Counter()
        for article in data["reconstructed_articles"]:
            for tag in article.get("hashtags", []):
                hashtag_counter[tag.replace("#", "")] += 1

        return {
            "top_keywords": top_keywords,
            "category_counts": dict(category_counts),
            "category_articles": category_articles,
            "total_articles": len(data["reconstructed_articles"]),
            "total_days_with_data": len(data["daily_briefs"]),
            "avg_daily_articles": round(avg_daily, 1),
            "max_daily_articles": max_daily,
            "top_hashtags": hashtag_counter.most_common(15),
        }

    def build_monthly_summary(self, data: Dict, analysis: Dict) -> str:
        """LLM에 전달할 월간 요약 텍스트 생성"""
        lines = []
        lines.append(f"기간: {data['period']['label']}")
        lines.append(f"수집 일수: {analysis['total_days_with_data']}일")
        lines.append(f"총 재구성 기사: {analysis['total_articles']}건")
        lines.append(f"일 평균 기사: {analysis['avg_daily_articles']}건")
        lines.append("")

        # 트렌드 키워드 TOP 10
        lines.append("== 월간 트렌드 키워드 TOP 10 ==")
        for kw, count in analysis["top_keywords"][:10]:
            lines.append(f"  - {kw} ({count}일 등장)")
        lines.append("")

        # 인기 해시태그
        lines.append("== 인기 해시태그 ==")
        for tag, count in analysis["top_hashtags"][:10]:
            lines.append(f"  #{tag} ({count}회)")
        lines.append("")

        # 카테고리별 주요 기사 (상위 5개씩)
        lines.append("== 카테고리별 주요 기사 ==")
        for cat, articles in sorted(analysis["category_articles"].items(),
                                     key=lambda x: len(x[1]), reverse=True):
            cat_kr = CATEGORY_KR.get(cat, cat)
            lines.append(f"\n[{cat_kr}] ({len(articles)}건)")
            sorted_articles = sorted(articles, key=lambda a: len(a.get("content", "")), reverse=True)
            for article in sorted_articles[:5]:
                lines.append(f"  제목: {article.get('title', '')}")
                lines.append(f"  요약: {article.get('summary', '')[:120]}")
                lines.append("")

        return "\n".join(lines)

    def generate_report(self, data: Dict, analysis: Dict) -> Optional[Dict]:
        """AI로 월간 리포트 생성"""
        import yaml
        from dotenv import load_dotenv
        from ai_rewriter import create_llm_router

        # 환경변수 로드
        project_root = self.pipeline_dir.parent
        env_path = project_root / ".env"
        if env_path.exists():
            load_dotenv(env_path)

        # config 로드
        config_path = self.pipeline_dir / "reconstruction" / "config.yaml"
        config = {}
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)

        # LLM 라우터 생성 (월간은 더 긴 출력)
        llm_config = config.get("llm", {})
        llm_config["max_output_tokens"] = max(llm_config.get("max_output_tokens", 4096), 32768)
        llm_router = create_llm_router(llm_config)

        # 프롬프트 준비
        system_prompt = ""
        if self.system_prompt_path.exists():
            with open(self.system_prompt_path, "r", encoding="utf-8") as f:
                system_prompt = f.read()

        monthly_prompt_template = ""
        if self.prompt_path.exists():
            with open(self.prompt_path, "r", encoding="utf-8") as f:
                monthly_prompt_template = f.read()

        monthly_summary = self.build_monthly_summary(data, analysis)
        user_prompt = monthly_prompt_template.replace("{monthly_data}", monthly_summary)

        # LLM 호출
        try:
            result = llm_router.generate(system_prompt, user_prompt)
            result["period"] = data["period"]["label"]
            result["generated_at"] = datetime.now(KST).isoformat()
            result["stats"] = {
                "total_articles": analysis["total_articles"],
                "total_days": analysis["total_days_with_data"],
                "avg_daily": analysis["avg_daily_articles"],
                "max_daily": analysis["max_daily_articles"],
                "category_counts": analysis["category_counts"],
            }
            return result
        except Exception as e:
            print(f"  ❌ 월간 리포트 AI 생성 실패: {e}")
            return self._fallback_report(data, analysis)

    def _fallback_report(self, data: Dict, analysis: Dict) -> Dict:
        """LLM 실패 시 간이 리포트 생성"""
        top_kw = [kw for kw, _ in analysis["top_keywords"][:10]]

        deep_articles = []
        for cat in ["ai", "mobile", "pc"]:
            articles = analysis["category_articles"].get(cat, [])
            if articles:
                best = sorted(articles, key=lambda a: len(a.get("content", "")), reverse=True)[0]
                deep_articles.append({
                    "title": best.get("title", ""),
                    "content": best.get("content", "")[:1500],
                    "hashtags": best.get("hashtags", []),
                })

        return {
            "title": f"IT 도깨비 월간 리포트 ({data['period']['label']})",
            "period": data["period"]["label"],
            "top_keywords": [{"keyword": kw, "description": "이번 달 IT판에서 계속 들린 이름이야"} for kw in top_kw],
            "deep_articles": deep_articles,
            "monthly_editorial": f"{data['period']['label']}, IT 세계가 참 바빴어. {analysis['total_articles']}건의 소식 속에서 "
                                 f"{', '.join(top_kw[:3])} 이야기가 유독 크게 울렸지. "
                                 f"비형이 다음 달엔 더 깊이 파고들어서 김서방들의 내일이 어떻게 달라지는지 짚어줄게. "
                                 f"읽어줘서 고마워! 🪄✨ — IT 도깨비 비형",
            "stats": [
                {"label": "총 기사 수", "value": str(analysis["total_articles"]), "description": "비형이 이번 달 다룬 전체 기사"},
                {"label": "일 평균", "value": str(analysis["avg_daily_articles"]), "description": "하루에 평균 이만큼의 소식이 쏟아졌어"},
                {"label": "최다 일", "value": str(analysis["max_daily_articles"]), "description": "가장 바빴던 날의 기사 수야!"},
            ],
            "generated_at": datetime.now(KST).isoformat(),
            "_fallback": True,
        }


def main():
    parser = argparse.ArgumentParser(description="IT 도깨비 - 월간 브리핑 생성기")
    parser.add_argument("--month", type=str, default=None,
                        help="대상 월 YYYY-MM (기본: 직전 월)")
    parser.add_argument("--dry-run", action="store_true",
                        help="DB 적재 없이 JSON 결과만 저장")
    parser.add_argument("--output", type=str, default=None,
                        help="출력 파일 경로 (기본: monthly_brief_YYYYMM.json)")
    args = parser.parse_args()

    # 대상 월 결정
    if args.month:
        try:
            target = datetime.strptime(args.month, "%Y-%m")
            year, month = target.year, target.month
        except ValueError:
            print("❌ --month 형식: YYYY-MM")
            sys.exit(1)
    else:
        # 직전 월
        now = datetime.now(KST).replace(tzinfo=None)
        if now.month == 1:
            year, month = now.year - 1, 12
        else:
            year, month = now.year, now.month - 1

    generator = MonthlyBriefingGenerator()

    print("=" * 60)
    print(f"📅 IT 도깨비 - 월간 브리핑 생성")
    print(f"   대상: {year}년 {month:02d}월")
    print("=" * 60)

    # 1. 데이터 수집
    print("\n📥 Step 1: 월간 데이터 수집")
    data = generator.collect_monthly_data(year, month)
    print(f"  ✅ 일간 브리핑: {len(data['daily_briefs'])}일치")
    print(f"  ✅ 재구성 기사: {len(data['reconstructed_articles'])}건")
    print(f"  ✅ 트렌드 키워드: {len(data['trend_keywords'])}종")

    if not data["daily_briefs"] and not data["reconstructed_articles"]:
        print("\n⚠️ 수집된 데이터가 없습니다. 월간 리포트를 생성할 수 없습니다.")
        sys.exit(1)

    # 2. 심층 분석
    print("\n📊 Step 2: 월간 심층 분석")
    analysis = generator.deep_analysis(data)
    print(f"  ✅ 총 기사: {analysis['total_articles']}건")
    print(f"  ✅ 일 평균: {analysis['avg_daily_articles']}건")
    for cat, count in sorted(analysis["category_counts"].items(), key=lambda x: x[1], reverse=True):
        cat_kr = CATEGORY_KR.get(cat, cat)
        print(f"     {cat_kr}: {count}건")

    # 3. AI 리포트 생성
    print("\n🤖 Step 3: AI 월간 리포트 생성")
    report = generator.generate_report(data, analysis)

    if report:
        # 출력 파일 결정
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = PIPELINE_DIR / f"monthly_brief_{year}{month:02d}.json"

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n✅ 월간 리포트 저장: {output_path}")
        if report.get("_fallback"):
            print("  ⚠️ AI 생성 실패 → 폴백 리포트 사용")
    else:
        print("\n❌ 월간 리포트 생성 실패")
        sys.exit(1)

    # 3.5. 현결 자동 코멘트 생성
    print("\n🎙️ Step 3.5: 현결 자동 코멘트 생성")
    try:
        from hyungyeol_comment_generator import generate_hyungyeol_comment
        editor_comment = generate_hyungyeol_comment(report, "monthly")
        if editor_comment:
            report["editor_comment"] = editor_comment
            report["editor_comment_auto"] = True
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"  ✅ 현결 코멘트: {editor_comment[:60]}...")
        else:
            print("  ⚠️ 현결 코멘트 생성 실패 (브리핑은 정상)")
    except Exception as e:
        print(f"  ⚠️ 현결 코멘트 생성 오류: {e}")

    # 3.6. 커버 이미지 생성
    print("\n🎨 Step 3.6: 커버 이미지 생성")
    try:
        sys.path.insert(0, str(PIPELINE_DIR / "content_generator"))
        from briefing_image_generator import BriefingCoverGenerator
        cover_gen = BriefingCoverGenerator()
        keywords = [kw.get("keyword", kw) if isinstance(kw, dict) else kw
                    for kw in report.get("top_keywords", [])[:5]]
        date_compact = f"{year}{month:02d}"
        cover_url = cover_gen.generate("monthly", report.get("title", ""), keywords, date_compact)
        if cover_url:
            report["cover_image_url"] = cover_url
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"  ✅ 커버 이미지: {cover_url}")
        else:
            print("  ⚠️ 커버 이미지 생성 실패 (브리핑은 정상 저장)")
    except Exception as e:
        print(f"  ⚠️ 커버 이미지 생성 오류: {e}")

    # 4. DB 적재
    if not args.dry_run:
        print("\n📌 Step 4: DB 적재")
        try:
            sys.path.insert(0, str(PIPELINE_DIR / "content_generator"))
            from briefing_db_loader import load_monthly_to_db
            month_label = f"{year}-{month:02d}"
            load_monthly_to_db(report, month_label)
        except Exception as e:
            print(f"  ⚠️ DB 적재 실패 (JSON은 저장됨): {e}")

    print("\n" + "=" * 60)
    print(f"🎉 월간 브리핑 생성 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
