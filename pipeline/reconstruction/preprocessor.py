#!/usr/bin/env python3
"""
Phase 1: 전처리 모듈
- 중복 제거 (제목 기준)
- YouTube 기사 처리
- 콘텐츠 정규화 (뉴스 아티팩트 제거)
"""

import json
import re
from pathlib import Path
from typing import Dict, List


# 뉴스 원문 정리용 정규식 패턴
CLEANUP_PATTERNS = [
    r'\[앵커\]|\[기자\]|\[앵커멘트\s*\]',
    r'▶\s*(인터뷰|스탠딩)\s*[:：].*',
    r'#\w+(\s+#\w+)*\s*$',
    r'[가-힣]+뉴스(TV)?\s+[가-힣]+입니다\.?',
    r'기사문의\s*(및|&)\s*제보\s*[:：].*',
    r'영상(취재|편집|촬영)\s*[:：].*',
    r'그래픽\s*[:：]?\s*[가-힣]+',
    r'\[뉴스리뷰\]',
    r'저작권자\s*©.*',
    r'무단\s*(전재|복사|배포)\s*(및\s*재배포)?\s*금지.*',
    r'▶\s*기사\s*원문.*',
    r'Copyright\s*©.*',
]

# 컴파일된 패턴 (성능 최적화)
COMPILED_PATTERNS = [re.compile(p, re.MULTILINE) for p in CLEANUP_PATTERNS]


class Preprocessor:
    """뉴스 기사 전처리기"""

    def __init__(self, max_content_length: int = 2000):
        self.max_content_length = max_content_length

    def process(self, brief_data: dict) -> Dict[str, List[dict]]:
        """
        전체 전처리 파이프라인 실행

        Args:
            brief_data: daily_brief JSON 데이터

        Returns:
            카테고리별 전처리된 기사 리스트
            {"Economy": [...], "Money": [...], ...}
        """
        categories = brief_data.get("categories", {})
        result = {}

        total_before = 0
        total_after = 0

        for category, articles in categories.items():
            total_before += len(articles)

            # Step 1: 중복 제거
            deduped = self._deduplicate(articles)

            # Step 2: YouTube 처리
            processed = self._handle_youtube(deduped)

            # Step 3: 콘텐츠 정규화
            cleaned = [self._cleanup_article(a) for a in processed]

            # Step 4: 빈 콘텐츠 필터링 (YouTube 제외)
            filtered = [
                a for a in cleaned
                if a.get("type") == "youtube" or len(a.get("content", "").strip()) >= 50
            ]

            result[category] = filtered
            total_after += len(filtered)

        print(f"  📊 전처리 결과: {total_before}건 → {total_after}건 (중복/빈콘텐츠 {total_before - total_after}건 제거)")
        for cat, arts in result.items():
            news_count = sum(1 for a in arts if a.get("type") != "youtube")
            yt_count = sum(1 for a in arts if a.get("type") == "youtube")
            print(f"     {cat}: {len(arts)}건 (뉴스 {news_count}, YouTube {yt_count})")

        return result

    def _deduplicate(self, articles: List[dict]) -> List[dict]:
        """제목 기준 중복 제거 — 반응수 높은 쪽 유지"""
        seen = {}
        for article in articles:
            key = article.get("title", "").strip()
            if not key:
                continue

            if key in seen:
                existing = seen[key]
                new_score = (article.get("reaction_count", 0) or 0) + (article.get("comment_count", 0) or 0)
                old_score = (existing.get("reaction_count", 0) or 0) + (existing.get("comment_count", 0) or 0)
                if new_score > old_score:
                    seen[key] = article
            else:
                seen[key] = article

        return list(seen.values())

    def _handle_youtube(self, articles: List[dict]) -> List[dict]:
        """
        YouTube 기사 처리
        - content가 비어있으면 제목을 content로 설정 (클러스터링용)
        - youtube 타입 마킹
        """
        for article in articles:
            if article.get("type") == "youtube":
                content = article.get("content", "").strip()
                if not content:
                    # 클러스터링에서 TF-IDF 참여를 위해 제목을 content로 복사
                    article["content"] = article.get("title", "")
                    article["_youtube_no_content"] = True

        return articles

    def _cleanup_article(self, article: dict) -> dict:
        """개별 기사 콘텐츠 정규화"""
        content = article.get("content", "")

        # YouTube는 클리닝 건너뛰기
        if article.get("type") == "youtube":
            return article

        # 정규식 패턴 적용
        for pattern in COMPILED_PATTERNS:
            content = pattern.sub("", content)

        # 중복 공백/개행 정리
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r' {2,}', ' ', content)
        content = content.strip()

        # 최대 길이 제한
        if len(content) > self.max_content_length:
            # 문장 경계에서 자르기
            truncated = content[:self.max_content_length]
            last_period = truncated.rfind('.')
            if last_period > self.max_content_length * 0.7:
                content = truncated[:last_period + 1]
            else:
                content = truncated

        article["content"] = content
        return article


def load_daily_brief(file_path: str) -> dict:
    """daily_brief JSON 파일 로드"""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Phase 1: 뉴스 전처리")
    parser.add_argument("--input", required=True, help="daily_brief JSON 파일 경로")
    parser.add_argument("--output", default=None, help="전처리 결과 출력 경로")
    args = parser.parse_args()

    print("🚀 Phase 1: 전처리 시작")
    brief_data = load_daily_brief(args.input)
    preprocessor = Preprocessor()
    result = preprocessor.process(brief_data)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"✅ 결과 저장: {args.output}")
    else:
        total = sum(len(v) for v in result.values())
        print(f"✅ 전처리 완료: 총 {total}건")
