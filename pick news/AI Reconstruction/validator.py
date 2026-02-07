#!/usr/bin/env python3
"""
Phase 4: 품질 검증 모듈
- 5개 필드 길이/형식 검증
- bullet_summary, hashtags 자동 보정
- 원문 유사도 체크
"""

import re
from typing import Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class ArticleValidator:
    """재구성 기사 품질 검증기"""

    def __init__(self, config: dict = None):
        config = config or {}
        self.title_length = config.get("title_length", {"min": 5, "max": 30})
        self.summary_length = config.get("summary_length", {"min": 50, "max": 200})
        self.bullet_count = config.get("bullet_summary_count", 3)
        self.bullet_item_length = config.get("bullet_summary_item_length", {"min": 10, "max": 50})
        self.content_length = config.get("content_length", {"min": 300, "max": 700})
        self.content_paragraphs = config.get("content_paragraphs", {"min": 2, "max": 5})
        self.hashtag_count = config.get("hashtag_count", {"min": 3, "max": 5})
        self.hashtag_item_length = config.get("hashtag_item_length", {"min": 2, "max": 8})
        self.originality_threshold = config.get("originality_threshold", 0.8)

    def validate_all(self, articles: List[dict]) -> List[dict]:
        """전체 기사 검증 + 자동 보정"""
        validated = []

        for article in articles:
            # 자동 보정 적용
            article = self._auto_correct(article)

            # 검증
            errors = self._validate_article(article)

            if errors:
                print(f"  ⚠️ 검증 경고 [{article.get('title', '')[:20]}...]: {', '.join(errors)}")

            validated.append(article)

        passed = len(validated)
        print(f"  📊 검증 결과: {passed}/{len(articles)}건 통과")

        return validated

    def _auto_correct(self, article: dict) -> dict:
        """자동 보정 적용"""

        # title 보정
        title = article.get("title", "")
        if len(title) > self.title_length["max"]:
            article["title"] = title[:self.title_length["max"]]

        # summary 보정
        summary = article.get("summary", "")
        if len(summary) > self.summary_length["max"]:
            # 문장 경계에서 자르기
            truncated = summary[:self.summary_length["max"]]
            last_period = truncated.rfind('.')
            if last_period > self.summary_length["max"] * 0.6:
                article["summary"] = truncated[:last_period + 1]
            else:
                article["summary"] = truncated

        # bullet_summary 보정
        article["bullet_summary"] = self._fix_bullet_summary(
            article.get("bullet_summary", []),
            article.get("title", ""),
        )

        # content 보정
        content = article.get("content", "")
        if len(content) > self.content_length["max"]:
            # 문단 경계에서 자르기
            paragraphs = content.split("\n\n")
            truncated = ""
            for p in paragraphs:
                if len(truncated) + len(p) + 2 <= self.content_length["max"]:
                    truncated += ("\n\n" + p) if truncated else p
                else:
                    break
            article["content"] = truncated if truncated else content[:self.content_length["max"]]

        # hashtags 보정
        article["hashtags"] = self._fix_hashtags(
            article.get("hashtags", []),
            article.get("title", ""),
            article.get("content", ""),
        )

        return article

    def _validate_article(self, article: dict) -> List[str]:
        """개별 기사 검증, 경고 메시지 리스트 반환"""
        errors = []

        # title 길이
        title_len = len(article.get("title", ""))
        if title_len < self.title_length["min"]:
            errors.append(f"title 너무 짧음 ({title_len}자)")

        # summary 길이
        summary_len = len(article.get("summary", ""))
        if summary_len < self.summary_length["min"]:
            errors.append(f"summary 너무 짧음 ({summary_len}자)")

        # bullet_summary 개수
        bullets = article.get("bullet_summary", [])
        if len(bullets) != self.bullet_count:
            errors.append(f"bullet_summary {len(bullets)}개 (기대: {self.bullet_count}개)")

        # content 길이
        content_len = len(article.get("content", ""))
        if content_len < self.content_length["min"]:
            errors.append(f"content 너무 짧음 ({content_len}자)")

        # content 문단 수
        paragraphs = article.get("content", "").split("\n\n")
        para_count = len([p for p in paragraphs if p.strip()])
        if para_count < self.content_paragraphs["min"]:
            errors.append(f"content 문단 {para_count}개 (최소: {self.content_paragraphs['min']})")

        # hashtags 개수
        tags = article.get("hashtags", [])
        if len(tags) < self.hashtag_count["min"]:
            errors.append(f"hashtags {len(tags)}개 (최소: {self.hashtag_count['min']}개)")

        return errors

    def _fix_bullet_summary(self, bullet_summary, title: str = "") -> List[str]:
        """bullet_summary를 정확히 3개로 보정"""

        if not isinstance(bullet_summary, list):
            # 문자열이면 문장 단위로 분리
            if isinstance(bullet_summary, str):
                bullet_summary = [s.strip() for s in bullet_summary.split('.') if s.strip()]
            else:
                bullet_summary = []

        # 각 항목을 문자열로 변환 + 길이 보정
        cleaned = []
        for item in bullet_summary:
            item = str(item).strip()
            if not item:
                continue
            if len(item) > self.bullet_item_length["max"]:
                item = item[:self.bullet_item_length["max"]]
            cleaned.append(item)

        # 3개 미만이면 채우기
        while len(cleaned) < self.bullet_count:
            if title and len(cleaned) == 0:
                cleaned.append(title[:40])
            elif len(cleaned) == 1:
                cleaned.append("관련 세부 내용 확인 필요")
            else:
                cleaned.append("추가 정보는 본문을 참조하세요")

        # 3개 초과면 자르기
        return cleaned[:self.bullet_count]

    def _fix_hashtags(self, hashtags, title: str = "", content: str = "") -> List[str]:
        """hashtags를 3~5개로 보정, '#' 제거"""

        if not isinstance(hashtags, list):
            hashtags = []

        # '#' 제거 및 길이 필터링
        cleaned = []
        for tag in hashtags:
            tag = str(tag).strip().lstrip('#')
            if self.hashtag_item_length["min"] <= len(tag) <= self.hashtag_item_length["max"]:
                if tag not in cleaned:  # 중복 제거
                    cleaned.append(tag)

        # 3개 미만이면 제목/본문에서 키워드 추출
        if len(cleaned) < self.hashtag_count["min"]:
            words = re.findall(r'[가-힣]{2,6}', title + " " + content[:200])
            # 빈도순 정렬
            word_freq = {}
            for w in words:
                if w not in cleaned:
                    word_freq[w] = word_freq.get(w, 0) + 1
            sorted_words = sorted(word_freq.keys(), key=lambda w: word_freq[w], reverse=True)
            for word in sorted_words:
                if len(cleaned) >= self.hashtag_count["min"]:
                    break
                cleaned.append(word)

        return cleaned[:self.hashtag_count["max"]]

    def check_originality(self, original_contents: List[str], reconstructed_content: str,
                          threshold: float = None) -> Tuple[bool, float]:
        """
        원문과 재구성 콘텐츠의 유사도 체크

        Returns:
            (통과 여부, 최대 유사도 값)
        """
        threshold = threshold or self.originality_threshold

        if not original_contents or not reconstructed_content:
            return True, 0.0

        # 빈 문자열 필터링
        valid_originals = [c for c in original_contents if c.strip()]
        if not valid_originals:
            return True, 0.0

        all_texts = valid_originals + [reconstructed_content]

        try:
            vectorizer = TfidfVectorizer(max_features=1000)
            tfidf = vectorizer.fit_transform(all_texts)

            reconstructed_vec = tfidf[-1]
            max_similarity = 0.0
            for i in range(len(valid_originals)):
                sim = cosine_similarity(tfidf[i], reconstructed_vec)[0][0]
                max_similarity = max(max_similarity, sim)

            passed = max_similarity < threshold
            return passed, max_similarity
        except Exception as e:
            print(f"  ⚠️ 유사도 체크 실패: {e}")
            return True, 0.0


if __name__ == "__main__":
    # 간단한 테스트
    validator = ArticleValidator()

    test_article = {
        "title": "테스트 제목입니다 이것은 매우 긴 제목입니다 삼십자를 초과하는 제목",
        "summary": "요약 테스트",
        "bullet_summary": ["포인트1", "포인트2"],
        "content": "본문 내용입니다.",
        "hashtags": ["#태그1", "태그2", "이것은매우긴해시태그입니다"],
    }

    corrected = validator._auto_correct(test_article.copy())
    print("보정 전:", test_article)
    print("보정 후:", corrected)
    print("bullet_summary:", corrected["bullet_summary"])
    print("hashtags:", corrected["hashtags"])
