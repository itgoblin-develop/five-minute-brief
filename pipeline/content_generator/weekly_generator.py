#!/usr/bin/env python3
"""
주간 브리핑 생성기

7일치 일간 브리핑 데이터를 집계하여 IT 도깨비 스타일 주간 리포트를 생성한다.

입력: daily_brief_YYYYMMDD.json × 7 + reconstructed_YYYYMMDD.json × 7
출력: weekly_brief_YYYYWNN.json

사용법:
  python weekly_generator.py                      # 직전 7일 (월요일 기준)
  python weekly_generator.py --date 2026-03-02    # 해당 주 (월~일)
  python weekly_generator.py --dry-run             # DB 적재 없이 결과만 출력
"""

import argparse
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

# 카테고리 한글 매핑
CATEGORY_KR = {
    "mobile": "모바일",
    "pc": "PC",
    "ai": "AI",
    "network": "네트워크/통신",
    "security": "보안",
    "etc": "기타",
}


class WeeklyBriefingGenerator:
    """일간 브리핑 데이터 7일치를 집계하여 주간 리포트 생성"""

    def __init__(self, pipeline_dir: Path = None):
        self.pipeline_dir = pipeline_dir or PIPELINE_DIR
        self.prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "weekly_prompt.txt"
        self.dialogue_prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "weekly_dialogue_prompt.txt"
        self.system_prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "system_prompt.txt"

    def get_week_range(self, ref_date: datetime) -> tuple:
        """기준 날짜가 속한 주의 월요일~일요일 범위 반환"""
        # 월요일로 이동 (weekday: 0=월, 6=일)
        monday = ref_date - timedelta(days=ref_date.weekday())
        sunday = monday + timedelta(days=6)
        return monday, sunday

    def collect_weekly_data(self, monday: datetime, sunday: datetime) -> Dict:
        """
        7일치 일간 데이터 수집

        1) DB 우선 조회 (daily_briefs + news 테이블)
        2) 실패 시 파일 폴백 (daily_brief_YYYYMMDD.json + reconstructed_YYYYMMDD.json)
        """
        # DB 우선 시도
        db_result = self._collect_from_db(monday, sunday)
        if db_result:
            return db_result

        # 파일 폴백
        daily_briefs = []
        reconstructed_articles = []
        all_trends = Counter()

        current = monday
        while current <= sunday:
            date_str = current.strftime("%Y%m%d")

            # daily_brief 수집 (트렌드 키워드 + 원본 기사)
            brief_path = self._find_file(f"daily_brief_{date_str}.json")
            if brief_path:
                try:
                    with open(brief_path, "r", encoding="utf-8") as f:
                        brief = json.load(f)
                    daily_briefs.append(brief)

                    # 트렌드 키워드 집계
                    for kw in brief.get("trends_summary", []):
                        all_trends[kw] += 1
                except Exception as e:
                    print(f"  ⚠️ daily_brief_{date_str}.json 로드 실패: {e}")

            # reconstructed 수집 (재구성 기사)
            recon_path = self._find_file(f"reconstructed_{date_str}.json")
            if recon_path:
                try:
                    with open(recon_path, "r", encoding="utf-8") as f:
                        articles = json.load(f)
                    reconstructed_articles.extend(articles)
                except Exception as e:
                    print(f"  ⚠️ reconstructed_{date_str}.json 로드 실패: {e}")

            current += timedelta(days=1)

        return {
            "daily_briefs": daily_briefs,
            "reconstructed_articles": reconstructed_articles,
            "trend_keywords": all_trends,
            "period": {
                "start": monday.strftime("%Y.%m.%d"),
                "end": sunday.strftime("%Y.%m.%d"),
            },
        }

    def _collect_from_db(self, monday: datetime, sunday: datetime) -> Optional[Dict]:
        """DB에서 주간 데이터 수집 (실패 시 None → 파일 폴백)"""
        try:
            from briefing_db_reader import fetch_daily_briefs, fetch_news
        except ImportError:
            return None

        try:
            start_str = monday.strftime("%Y-%m-%d")
            end_str = sunday.strftime("%Y-%m-%d")

            briefs = fetch_daily_briefs(start_str, end_str)
            articles = fetch_news(monday, sunday)
        except Exception as e:
            print(f"  ⚠️ DB 조회 실패, 파일 폴백: {e}")
            return None

        if not briefs and not articles:
            return None

        # 트렌드 키워드 집계
        all_trends = Counter()
        for brief in briefs:
            for kw in brief.get("trends_summary", []):
                all_trends[kw] += 1

        print(f"  📊 DB에서 데이터 수집: 브리핑 {len(briefs)}일, 기사 {len(articles)}건")

        return {
            "daily_briefs": briefs,
            "reconstructed_articles": articles,
            "trend_keywords": all_trends,
            "period": {
                "start": monday.strftime("%Y.%m.%d"),
                "end": sunday.strftime("%Y.%m.%d"),
            },
        }

    def _find_file(self, filename: str) -> Optional[Path]:
        """파이프라인 디렉토리 내에서 파일 탐색"""
        # 직접 경로
        direct = self.pipeline_dir / filename
        if direct.exists():
            return direct

        # ranking_integrated 하위
        alt = self.pipeline_dir / "ranking_integrated" / filename
        if alt.exists():
            return alt

        return None

    def analyze_trends(self, data: Dict) -> Dict:
        """주간 트렌드 키워드 + 카테고리별 기사 분포 분석"""
        # 키워드 빈도 TOP 10
        top_keywords = data["trend_keywords"].most_common(10)

        # 카테고리별 기사 수 집계
        category_counts = Counter()
        category_articles = {}
        for article in data["reconstructed_articles"]:
            cat = article.get("category", "etc")
            category_counts[cat] += 1
            if cat not in category_articles:
                category_articles[cat] = []
            category_articles[cat].append(article)

        return {
            "top_keywords": top_keywords,
            "category_counts": dict(category_counts),
            "category_articles": category_articles,
            "total_articles": len(data["reconstructed_articles"]),
            "total_days_with_data": len(data["daily_briefs"]),
        }

    def build_weekly_summary(self, data: Dict, analysis: Dict) -> str:
        """LLM에 전달할 주간 요약 텍스트 생성"""
        lines = []
        lines.append(f"기간: {data['period']['start']} ~ {data['period']['end']}")
        lines.append(f"수집 일수: {analysis['total_days_with_data']}일")
        lines.append(f"총 재구성 기사: {analysis['total_articles']}건")
        lines.append("")

        # 트렌드 키워드
        lines.append("== 주간 트렌드 키워드 ==")
        for kw, count in analysis["top_keywords"][:10]:
            lines.append(f"  - {kw} ({count}일 등장)")
        lines.append("")

        # 카테고리별 주요 기사
        lines.append("== 카테고리별 주요 기사 ==")
        for cat, articles in analysis["category_articles"].items():
            cat_kr = CATEGORY_KR.get(cat, cat)
            lines.append(f"\n[{cat_kr}] ({len(articles)}건)")
            # 상위 3개 기사만 제목+요약 포함
            sorted_articles = sorted(articles, key=lambda a: len(a.get("content", "")), reverse=True)
            for article in sorted_articles[:3]:
                lines.append(f"  제목: {article.get('title', '')}")
                lines.append(f"  요약: {article.get('summary', '')[:100]}")
                lines.append("")

        return "\n".join(lines)

    def generate_report(self, data: Dict, analysis: Dict) -> Optional[Dict]:
        """AI로 주간 리포트 생성"""
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

        # LLM 라우터 생성
        llm_config = config.get("llm", {})
        # 주간 리포트는 더 긴 출력 필요
        llm_config["max_output_tokens"] = max(llm_config.get("max_output_tokens", 4096), 16384)
        llm_router = create_llm_router(llm_config)

        # 프롬프트 준비
        system_prompt = ""
        if self.system_prompt_path.exists():
            with open(self.system_prompt_path, "r", encoding="utf-8") as f:
                system_prompt = f.read()

        weekly_prompt_template = ""
        if self.prompt_path.exists():
            with open(self.prompt_path, "r", encoding="utf-8") as f:
                weekly_prompt_template = f.read()

        weekly_summary = self.build_weekly_summary(data, analysis)
        user_prompt = weekly_prompt_template.replace("{weekly_data}", weekly_summary)

        # LLM 호출
        try:
            result = llm_router.generate(system_prompt, user_prompt)
            result["period"] = f"{data['period']['start']} ~ {data['period']['end']}"
            result["generated_at"] = datetime.now(KST).isoformat()
            result["stats"] = {
                "total_articles": analysis["total_articles"],
                "total_days": analysis["total_days_with_data"],
                "category_counts": analysis["category_counts"],
            }
            return result
        except Exception as e:
            print(f"  ❌ 주간 리포트 AI 생성 실패: {e}")
            return self._fallback_report(data, analysis)

    def generate_dialogue(self, report: Dict, llm_router) -> Optional[Dict]:
        """비형↔현결 티키타카 대화 생성 (두 번째 LLM 호출)"""
        if not self.dialogue_prompt_path.exists():
            print("  ⚠️ weekly_dialogue_prompt.txt 없음, 대화 생성 스킵")
            return None

        with open(self.dialogue_prompt_path, "r", encoding="utf-8") as f:
            dialogue_prompt_template = f.read()

        # 입력 데이터: top_keywords + category_highlights 요약
        keywords_text = "\n".join(
            f"  - {kw['keyword']}: {kw.get('description', '')}"
            for kw in report.get("top_keywords", [])[:7]
            if isinstance(kw, dict)
        )
        highlights_text = "\n\n".join(
            f"[{hl['category']}]\n{hl['content'][:300]}"
            for hl in report.get("category_highlights", [])
            if isinstance(hl, dict)
        )
        analysis_data = (
            f"기간: {report.get('period', '')}\n\n"
            f"== 이번 주 핵심 키워드 ==\n{keywords_text}\n\n"
            f"== 카테고리별 주요 이슈 (요약) ==\n{highlights_text}"
        )

        user_prompt = dialogue_prompt_template.replace("{analysis_data}", analysis_data)

        system_prompt = ""
        if self.system_prompt_path.exists():
            with open(self.system_prompt_path, "r", encoding="utf-8") as f:
                system_prompt = f.read()

        try:
            result = llm_router.generate(system_prompt, user_prompt)
            if isinstance(result, dict) and "dialogue" in result:
                return result
            print("  ⚠️ 대화 생성 결과 형식 오류")
            return None
        except Exception as e:
            print(f"  ❌ 대화 생성 실패: {e}")
            return None

    def _fallback_report(self, data: Dict, analysis: Dict) -> Dict:
        """LLM 실패 시 간이 리포트 생성"""
        top_kw = [kw for kw, _ in analysis["top_keywords"][:5]]

        category_highlights = []
        for cat, articles in analysis["category_articles"].items():
            cat_kr = CATEGORY_KR.get(cat, cat)
            titles = [a.get("title", "") for a in articles[:3]]
            category_highlights.append({
                "category": cat_kr,
                "content": f"이번 주 {cat_kr} 쪽이 바빴어! {len(articles)}건의 소식 중에서 특히 눈에 띈 건 "
                           f"{', '.join(titles[:2])}. 자세한 이야기는 비형이 다음에 더 풀어볼게!",
            })

        return {
            "title": f"IT 도깨비 주간 브리핑 ({data['period']['start']}~{data['period']['end']})",
            "period": f"{data['period']['start']} ~ {data['period']['end']}",
            "top_keywords": [{"keyword": kw, "description": "이번 주 IT판에서 자주 들린 이름이야"} for kw in top_kw],
            "category_highlights": category_highlights,
            "weekly_comment": f"이번 주 IT판 정리! 총 {analysis['total_articles']}건의 소식 중에서 "
                              f"{', '.join(top_kw[:3])} 이야기가 계속 나왔어. "
                              f"비형이 다음 주엔 더 깊이 있는 분석으로 찾아올게. 김서방들 한 주 고생했어! 🪄✨ — IT 도깨비 비형",
            "next_week_preview": ["비형이 다음 주에 더 자세히 정리해서 돌아올게! 🪄"],
            "generated_at": datetime.now(KST).isoformat(),
            "stats": {
                "total_articles": analysis["total_articles"],
                "total_days": analysis["total_days_with_data"],
                "category_counts": analysis["category_counts"],
            },
            "_fallback": True,
        }


def main():
    parser = argparse.ArgumentParser(description="IT 도깨비 - 주간 브리핑 생성기")
    parser.add_argument("--date", type=str, default=None,
                        help="기준 날짜 YYYY-MM-DD (해당 주 기준, 기본: 오늘)")
    parser.add_argument("--dry-run", action="store_true",
                        help="DB 적재 없이 JSON 결과만 저장")
    parser.add_argument("--output", type=str, default=None,
                        help="출력 파일 경로 (기본: weekly_brief_YYYYWNN.json)")
    args = parser.parse_args()

    # 기준 날짜 결정
    if args.date:
        try:
            ref_date = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print("❌ --date 형식: YYYY-MM-DD")
            sys.exit(1)
    else:
        ref_date = datetime.now(KST).replace(tzinfo=None)

    generator = WeeklyBriefingGenerator()
    monday, sunday = generator.get_week_range(ref_date)
    week_num = monday.isocalendar()[1]

    print("=" * 60)
    print(f"📅 IT 도깨비 - 주간 브리핑 생성")
    print(f"   기준일: {ref_date.strftime('%Y-%m-%d')}")
    print(f"   주간 범위: {monday.strftime('%Y-%m-%d')} (월) ~ {sunday.strftime('%Y-%m-%d')} (일)")
    print(f"   Week: {monday.year}-W{week_num:02d}")
    print("=" * 60)

    # 1. 데이터 수집
    print("\n📥 Step 1: 7일치 데이터 수집")
    data = generator.collect_weekly_data(monday, sunday)
    print(f"  ✅ 일간 브리핑: {len(data['daily_briefs'])}일치")
    print(f"  ✅ 재구성 기사: {len(data['reconstructed_articles'])}건")
    print(f"  ✅ 트렌드 키워드: {len(data['trend_keywords'])}종")

    if not data["daily_briefs"] and not data["reconstructed_articles"]:
        print("\n⚠️ 수집된 데이터가 없습니다. 주간 리포트를 생성할 수 없습니다.")
        sys.exit(1)

    # 2. 분석
    print("\n📊 Step 2: 주간 트렌드 분석")
    analysis = generator.analyze_trends(data)
    print(f"  ✅ 총 기사: {analysis['total_articles']}건")
    for cat, count in sorted(analysis["category_counts"].items(), key=lambda x: x[1], reverse=True):
        cat_kr = CATEGORY_KR.get(cat, cat)
        print(f"     {cat_kr}: {count}건")

    # 3. AI 리포트 생성
    print("\n🤖 Step 3: AI 주간 리포트 생성")
    report = generator.generate_report(data, analysis)

    if report:
        # 출력 파일 결정
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = PIPELINE_DIR / f"weekly_brief_{monday.year}W{week_num:02d}.json"

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n✅ 주간 리포트 저장: {output_path}")
        if report.get("_fallback"):
            print("  ⚠️ AI 생성 실패 → 폴백 리포트 사용")
    else:
        print("\n❌ 주간 리포트 생성 실패")
        sys.exit(1)

    # 3.5. 비형↔현결 티키타카 대화 생성
    print("\n🗣️ Step 3.5: 비형↔현결 티키타카 대화 생성")
    try:
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
        llm_config["max_output_tokens"] = max(llm_config.get("max_output_tokens", 4096), 8192)
        llm_router = create_llm_router(llm_config)

        dialogue_result = generator.generate_dialogue(report, llm_router)
        if dialogue_result:
            report["dialogue"] = dialogue_result.get("dialogue", [])
            report["central_keyword"] = dialogue_result.get("central_keyword", "")
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            kw = report["central_keyword"]
            turns = len(report["dialogue"])
            print(f"  ✅ 대화 생성 완료: 핵심 키워드 '{kw}', {turns}턴")
        else:
            print("  ⚠️ 대화 생성 실패 (브리핑은 정상 저장)")
    except Exception as e:
        print(f"  ⚠️ 대화 생성 오류: {e}")

    # 3.6. 커버 이미지 생성
    print("\n🎨 Step 3.6: 커버 이미지 생성")
    try:
        sys.path.insert(0, str(PIPELINE_DIR / "content_generator"))
        from briefing_image_generator import BriefingCoverGenerator
        cover_gen = BriefingCoverGenerator()
        keywords = [kw.get("keyword", kw) if isinstance(kw, dict) else kw
                    for kw in report.get("top_keywords", [])[:5]]
        date_compact = monday.strftime("%Y%m%d")
        cover_url = cover_gen.generate("weekly", report.get("title", ""), keywords, date_compact)
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
            from briefing_db_loader import load_weekly_to_db
            week_label = f"{monday.year}-W{week_num:02d}"
            load_weekly_to_db(report, week_label)
        except Exception as e:
            print(f"  ⚠️ DB 적재 실패 (JSON은 저장됨): {e}")

    print("\n" + "=" * 60)
    print(f"🎉 주간 브리핑 생성 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
