#!/usr/bin/env python3
"""
일간 뉴스레터 생성기

당일 재구성 기사 + daily_brief 데이터를 집계하여 IT 도깨비 스타일 일간 뉴스레터를 생성한다.

입력: daily_brief_YYYYMMDD.json + reconstructed_YYYYMMDD.json
출력: daily_newsletter_YYYYMMDD.json

사용법:
  python daily_generator.py                      # 오늘
  python daily_generator.py --date 2026-03-02    # 특정 날짜
  python daily_generator.py --dry-run             # DB 적재 없이 결과만 출력
"""

import argparse
import json
import os
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

# 프로젝트 루트를 PATH에 추가
PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))
sys.path.insert(0, str(PIPELINE_DIR))

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


class DailyBriefingGenerator:
    """당일 데이터를 집계하여 일간 뉴스레터 생성"""

    def __init__(self, pipeline_dir: Path = None):
        self.pipeline_dir = pipeline_dir or PIPELINE_DIR
        self.prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "daily_newsletter_prompt.txt"
        self.system_prompt_path = self.pipeline_dir / "reconstruction" / "prompts" / "system_prompt.txt"

    def collect_daily_data(self, date: datetime) -> Dict:
        """당일 데이터 수집"""
        date_str = date.strftime("%Y%m%d")

        daily_brief = None
        reconstructed_articles = []
        trend_keywords = Counter()

        # daily_brief 수집 (트렌드 키워드 + 원본 기사 정보)
        brief_path = self._find_file(f"daily_brief_{date_str}.json")
        if brief_path:
            try:
                with open(brief_path, "r", encoding="utf-8") as f:
                    daily_brief = json.load(f)
                for kw in daily_brief.get("trends_summary", []):
                    trend_keywords[kw] += 1
            except Exception as e:
                print(f"  ⚠️ daily_brief_{date_str}.json 로드 실패: {e}")

        # reconstructed 수집 (재구성 기사)
        recon_path = self._find_file(f"reconstructed_{date_str}.json")
        if recon_path:
            try:
                with open(recon_path, "r", encoding="utf-8") as f:
                    reconstructed_articles = json.load(f)
            except Exception as e:
                print(f"  ⚠️ reconstructed_{date_str}.json 로드 실패: {e}")

        # Play Store 리뷰 요약 조회 (DB에서)
        review_summaries = []
        try:
            review_summaries = self._load_review_summaries(date.strftime("%Y-%m-%d"))
            if review_summaries:
                print(f"  ✅ 앱 리뷰 Top {len(review_summaries)}개 로드")
        except Exception as e:
            print(f"  ⚠️ 앱 리뷰 요약 로드 실패 (뉴스레터는 정상): {e}")

        return {
            "daily_brief": daily_brief,
            "reconstructed_articles": reconstructed_articles,
            "trend_keywords": trend_keywords,
            "review_summaries": review_summaries,
            "date_label": date.strftime("%Y-%m-%d"),
            "date_compact": date_str,
        }

    def _load_review_summaries(self, date_label: str) -> List[Dict]:
        """DB에서 당일 Top 5 앱 리뷰 요약 조회"""
        import psycopg2

        config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv("DB_NAME", "five_minute_brief"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", ""),
        }

        conn = psycopg2.connect(**config)
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT a.name, a.package_id, s.review_count, s.avg_rating,
                          s.sentiment_avg, s.sentiment_change, s.ai_highlight,
                          s.top_issues, s.notability_score
                   FROM review_daily_summaries s
                   JOIN playstore_apps a ON s.app_id = a.app_id
                   WHERE s.date_label = %s AND s.review_count > 0
                   ORDER BY s.notability_score DESC
                   LIMIT 5""",
                (date_label,),
            )
            rows = cur.fetchall()
            return [
                {
                    "app_name": name,
                    "package_id": pkg,
                    "review_count": rev_count,
                    "avg_rating": round(float(avg_r or 0), 1),
                    "sentiment_avg": round(float(sent_avg or 0), 2),
                    "sentiment_change": round(float(sent_change or 0), 2),
                    "ai_highlight": highlight or "",
                    "top_issues": issues if isinstance(issues, list) else (json.loads(issues) if issues else []),
                }
                for name, pkg, rev_count, avg_r, sent_avg, sent_change, highlight, issues, _ in rows
            ]
        finally:
            conn.close()

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

    def analyze_daily(self, data: Dict) -> Dict:
        """일간 트렌드 키워드 + 카테고리별 기사 분포 분석"""
        # 키워드 빈도
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
        }

    def build_daily_summary(self, data: Dict, analysis: Dict) -> str:
        """LLM에 전달할 일간 요약 텍스트 생성"""
        lines = []
        lines.append(f"날짜: {data['date_label']}")
        lines.append(f"총 재구성 기사: {analysis['total_articles']}건")
        lines.append("")

        # 트렌드 키워드
        if analysis["top_keywords"]:
            lines.append("== 오늘의 트렌드 키워드 ==")
            for kw, count in analysis["top_keywords"][:10]:
                lines.append(f"  - {kw}")
            lines.append("")

        # 카테고리별 주요 기사
        lines.append("== 카테고리별 주요 기사 ==")
        for cat, articles in sorted(analysis["category_articles"].items(),
                                     key=lambda x: len(x[1]), reverse=True):
            cat_kr = CATEGORY_KR.get(cat, cat)
            lines.append(f"\n[{cat_kr}] ({len(articles)}건)")
            # 상위 3개 기사만 제목+요약 포함
            sorted_articles = sorted(articles, key=lambda a: len(a.get("content", "")), reverse=True)
            for article in sorted_articles[:3]:
                lines.append(f"  제목: {article.get('title', '')}")
                lines.append(f"  요약: {article.get('summary', '')[:120]}")
                lines.append("")

        # 앱 리뷰 핫이슈 (데이터가 있을 때만)
        review_summaries = data.get("review_summaries", [])
        if review_summaries:
            lines.append("\n== 앱 리뷰 핫이슈 (Top 5) ==")
            for rs in review_summaries:
                issues_str = ""
                if rs.get("top_issues"):
                    issues_str = ", ".join(
                        f"{i['category']}({i['count']}건)" for i in rs["top_issues"][:3]
                    )
                lines.append(
                    f"  {rs['app_name']} ({rs['package_id']}): "
                    f"리뷰 {rs['review_count']}개, 평점 {rs['avg_rating']}, "
                    f"감정 {rs['sentiment_avg']:+.2f} (변화 {rs['sentiment_change']:+.2f})"
                )
                if issues_str:
                    lines.append(f"    이슈: {issues_str}")
                if rs.get("ai_highlight"):
                    lines.append(f"    요약: {rs['ai_highlight']}")
                lines.append("")

        return "\n".join(lines)

    def generate_report(self, data: Dict, analysis: Dict) -> Optional[Dict]:
        """AI로 일간 뉴스레터 생성"""
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

        # LLM 라우터 생성 (일간은 비교적 짧은 출력)
        llm_config = config.get("llm", {})
        llm_config["max_output_tokens"] = max(llm_config.get("max_output_tokens", 4096), 8192)
        llm_router = create_llm_router(llm_config)

        # 프롬프트 준비
        system_prompt = ""
        if self.system_prompt_path.exists():
            with open(self.system_prompt_path, "r", encoding="utf-8") as f:
                system_prompt = f.read()

        daily_prompt_template = ""
        if self.prompt_path.exists():
            with open(self.prompt_path, "r", encoding="utf-8") as f:
                daily_prompt_template = f.read()

        daily_summary = self.build_daily_summary(data, analysis)
        user_prompt = daily_prompt_template.replace("{daily_data}", daily_summary)

        # LLM 호출
        try:
            result = llm_router.generate(system_prompt, user_prompt)
            result["date_label"] = data["date_label"]
            result["generated_at"] = datetime.now(KST).isoformat()
            result["stats"] = {
                "total_articles": analysis["total_articles"],
                "category_counts": analysis["category_counts"],
            }
            # review_highlights가 LLM 응답에 없으면 빈 배열로
            if "review_highlights" not in result:
                result["review_highlights"] = []
            return result
        except Exception as e:
            print(f"  ❌ 일간 뉴스레터 AI 생성 실패: {e}")
            return self._fallback_report(data, analysis)

    def _fallback_report(self, data: Dict, analysis: Dict) -> Dict:
        """LLM 실패 시 간이 리포트 생성"""
        top_kw = [kw for kw, _ in analysis["top_keywords"][:5]]

        category_highlights = []
        for cat, articles in sorted(analysis["category_articles"].items(),
                                     key=lambda x: len(x[1]), reverse=True):
            cat_kr = CATEGORY_KR.get(cat, cat)
            if articles:
                best = sorted(articles, key=lambda a: len(a.get("content", "")), reverse=True)[0]
                category_highlights.append({
                    "category": cat_kr,
                    "title": best.get("title", ""),
                    "summary": best.get("summary", "")[:150],
                })

        return {
            "title": f"IT 도깨비 일간 브리핑 ({data['date_label']})",
            "date_label": data["date_label"],
            "intro_comment": f"안녕, 김서방들~ IT 도깨비야! 🪄 오늘도 IT 세계가 바쁘게 돌아갔어. {analysis['total_articles']}건의 소식을 가져왔는데, 오늘은 간단히 핵심만 전할게!",
            "top_keywords": [{"keyword": kw, "description": "오늘 IT판에서 자주 들린 이름이야"} for kw in top_kw],
            "category_highlights": category_highlights,
            "review_highlights": [],
            "daily_comment": f"오늘은 {analysis['total_articles']}건의 IT 소식이 있었어. "
                             f"그중에서도 {', '.join(top_kw[:3]) if top_kw else '여러 주제'} 이야기가 특히 뜨거웠지. "
                             f"비형이 다음엔 더 깊이 파헤쳐서 들려줄게! 내일도 찾아올 테니 기대해 🪄✨ — IT 도깨비 비형",
            "stats": {
                "total_articles": analysis["total_articles"],
                "category_counts": analysis["category_counts"],
            },
            "generated_at": datetime.now(KST).isoformat(),
            "_fallback": True,
        }


def main():
    parser = argparse.ArgumentParser(description="IT 도깨비 - 일간 뉴스레터 생성기")
    parser.add_argument("--date", type=str, default=None,
                        help="대상 날짜 YYYY-MM-DD (기본: 오늘)")
    parser.add_argument("--dry-run", action="store_true",
                        help="DB 적재 없이 JSON 결과만 저장")
    parser.add_argument("--output", type=str, default=None,
                        help="출력 파일 경로 (기본: daily_newsletter_YYYYMMDD.json)")
    args = parser.parse_args()

    # 대상 날짜 결정
    if args.date:
        try:
            target = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print("❌ --date 형식: YYYY-MM-DD")
            sys.exit(1)
    else:
        target = datetime.now(KST).replace(tzinfo=None)

    generator = DailyBriefingGenerator()
    date_str = target.strftime("%Y-%m-%d")
    date_compact = target.strftime("%Y%m%d")

    print("=" * 60)
    print(f"📰 IT 도깨비 - 일간 뉴스레터 생성")
    print(f"   대상: {date_str}")
    print("=" * 60)

    # 1. 데이터 수집
    print("\n📥 Step 1: 당일 데이터 수집")
    data = generator.collect_daily_data(target)
    print(f"  ✅ daily_brief: {'있음' if data['daily_brief'] else '없음'}")
    print(f"  ✅ 재구성 기사: {len(data['reconstructed_articles'])}건")
    print(f"  ✅ 트렌드 키워드: {len(data['trend_keywords'])}종")

    if not data["daily_brief"] and not data["reconstructed_articles"]:
        print("\n⚠️ 수집된 데이터가 없습니다. 일간 뉴스레터를 생성할 수 없습니다.")
        sys.exit(1)

    # 2. 분석
    print("\n📊 Step 2: 일간 분석")
    analysis = generator.analyze_daily(data)
    print(f"  ✅ 총 기사: {analysis['total_articles']}건")
    for cat, count in sorted(analysis["category_counts"].items(), key=lambda x: x[1], reverse=True):
        cat_kr = CATEGORY_KR.get(cat, cat)
        print(f"     {cat_kr}: {count}건")

    # 3. AI 뉴스레터 생성
    print("\n🤖 Step 3: AI 일간 뉴스레터 생성")
    report = generator.generate_report(data, analysis)

    if report:
        # 출력 파일 결정
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = PIPELINE_DIR / f"daily_newsletter_{date_compact}.json"

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n✅ 일간 뉴스레터 저장: {output_path}")
        if report.get("_fallback"):
            print("  ⚠️ AI 생성 실패 → 폴백 리포트 사용")
    else:
        print("\n❌ 일간 뉴스레터 생성 실패")
        sys.exit(1)

    # 3.5. 현결 자동 코멘트 생성
    print("\n🎙️ Step 3.5: 현결 자동 코멘트 생성")
    try:
        from hyungyeol_comment_generator import generate_hyungyeol_comment
        editor_comment = generate_hyungyeol_comment(report, "daily")
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
        cover_url = cover_gen.generate("daily", report.get("title", ""), keywords, date_compact)
        if cover_url:
            report["cover_image_url"] = cover_url
            # JSON 파일 업데이트
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
            from briefing_db_loader import load_daily_to_db
            load_daily_to_db(report, date_str)
        except Exception as e:
            print(f"  ⚠️ DB 적재 실패 (JSON은 저장됨): {e}")

    print("\n" + "=" * 60)
    print(f"🎉 일간 뉴스레터 생성 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
