"""
RSS/Atom 피드 기반 크롤링 전략.
feedparser를 사용하여 RSS 피드에서 기사를 수집한다.
블로그, IT 미디어 등 RSS를 제공하는 사이트에 적합.
"""
import logging
from typing import Optional
from datetime import datetime

import feedparser
import requests
from bs4 import BeautifulSoup

from .base import BaseCrawler, Article

logger = logging.getLogger(__name__)


class RSSCrawler(BaseCrawler):
    """
    RSS/Atom 피드 크롤러.

    sites.yaml 설정 예:
        strategy: rss
        rss_url: "https://example.com/feed"  # RSS 피드 URL (없으면 url 사용)
    """

    def fetch_article_list(self) -> list[Article]:
        """RSS 피드를 파싱하여 기사 목록을 반환한다."""
        rss_url = self.config.get("rss_url", self.url)

        try:
            # feedparser에 User-Agent와 타임아웃 설정
            feed = feedparser.parse(
                rss_url,
                agent=self.config.get("user_agent", self.DEFAULT_USER_AGENT),
            )
        except Exception as e:
            self.logger.error(f"[{self.name}] RSS 피드 파싱 실패: {e}")
            raise

        if feed.bozo and not feed.entries:
            self.logger.warning(f"[{self.name}] RSS 피드 오류: {feed.bozo_exception}")
            raise ValueError(f"RSS 피드를 읽을 수 없습니다: {rss_url}")

        articles = []
        entries = feed.entries[:self.max_articles]

        for entry in entries:
            try:
                article = Article(
                    title=self._clean_title(entry.get("title", "")),
                    content=self._extract_summary(entry),
                    link=entry.get("link", ""),
                    press=self.name,
                    published_time=self._parse_feed_date(entry),
                    source_site=self.site_key,
                )
                articles.append(article)
            except Exception as e:
                self.logger.warning(f"[{self.name}] 피드 항목 파싱 실패: {e}")
                continue

        return articles

    def _extract_summary(self, entry) -> str:
        """피드 항목에서 요약/콘텐츠 추출 (HTML 태그 제거)"""
        # content 필드 우선 (더 상세)
        if "content" in entry and entry.content:
            raw = entry.content[0].get("value", "")
        elif "summary" in entry:
            raw = entry.get("summary", "")
        elif "description" in entry:
            raw = entry.get("description", "")
        else:
            return ""

        # HTML 태그 제거
        if raw and ("<" in raw and ">" in raw):
            soup = BeautifulSoup(raw, "html.parser")
            return soup.get_text(separator=" ", strip=True)
        return raw.strip()

    def _parse_feed_date(self, entry) -> str:
        """피드 항목의 날짜를 표준 포맷으로 변환"""
        # feedparser가 파싱한 구조화된 시간 사용
        for date_field in ("published_parsed", "updated_parsed"):
            parsed_time = entry.get(date_field)
            if parsed_time:
                try:
                    dt = datetime(*parsed_time[:6])
                    return dt.strftime("%Y-%m-%d %H:%M")
                except (ValueError, TypeError):
                    continue

        # 원본 문자열 반환
        for date_field in ("published", "updated", "created"):
            date_str = entry.get(date_field, "")
            if date_str:
                return date_str

        return datetime.now().strftime("%Y-%m-%d %H:%M")

    def _clean_title(self, title: str) -> str:
        """제목 정리 (HTML 엔티티, 불필요한 공백 제거)"""
        if not title:
            return ""
        # HTML 엔티티 디코딩
        if "&" in title:
            soup = BeautifulSoup(title, "html.parser")
            title = soup.get_text()
        return " ".join(title.split()).strip()
