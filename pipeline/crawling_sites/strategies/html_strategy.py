"""
HTML 스크래핑 기반 크롤링 전략.
requests + BeautifulSoup로 서버 렌더링 페이지에서 기사를 수집한다.
기업 뉴스룸, 보도자료 페이지 등에 적합.
"""
import logging
import re
from typing import Optional

import requests
from bs4 import BeautifulSoup

from .base import BaseCrawler, Article
from ..utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)


class HTMLCrawler(BaseCrawler):
    """
    HTML 스크래핑 크롤러.

    sites.yaml 설정 예:
        strategy: html
        selectors:
            article_list: ".news-list .item"
            title: "h3.title"
            link: "a"
            date: ".date"
            summary: ".summary"
            detail_content: "article.content"  # 상세 페이지 본문
        link_attribute: "href"  # 링크 속성 (기본값: href)
    """

    def fetch_article_list(self) -> list[Article]:
        """HTML 페이지를 파싱하여 기사 목록을 반환한다 (멀티페이지 지원)."""
        selectors = self.config.get("selectors", {})
        if not selectors.get("article_list"):
            raise ValueError(f"[{self.name}] selectors.article_list가 설정되지 않았습니다")

        all_articles = []

        for page_num in range(self.pagination_start, self.pagination_start + self.max_pages):
            page_url = self._build_page_url(page_num)

            # 페이지 가져오기
            html = self._fetch_page(page_url)
            soup = BeautifulSoup(html, "html.parser")

            # 기사 목록 요소 선택
            items = soup.select(selectors["article_list"])
            if not items:
                if page_num == self.pagination_start:
                    self.logger.warning(f"[{self.name}] 기사 목록을 찾을 수 없습니다: {selectors['article_list']}")
                break  # 더 이상 기사 없으면 중단

            for item in items:
                try:
                    article = self._parse_article_item(item, selectors)
                    if article:
                        all_articles.append(article)
                except Exception as e:
                    self.logger.warning(f"[{self.name}] 기사 항목 파싱 실패: {e}")
                    continue

            # max_articles에 도달하면 중단
            if len(all_articles) >= self.max_articles:
                break

            # 다음 페이지 전 레이트 리밋 대기
            if page_num < self.pagination_start + self.max_pages - 1:
                domain = self._get_domain()
                self._wait_rate_limit(domain)

        return all_articles[:self.max_articles]

    def _parse_article_item(self, item, selectors: dict) -> Optional[Article]:
        """단일 기사 항목을 파싱한다."""
        # 제목 추출
        title = ""
        title_selector = selectors.get("title", "")
        if title_selector:
            title_el = item.select_one(title_selector)
            if title_el:
                title = title_el.get_text(strip=True)
        if not title:
            # 셀렉터 없으면 첫 번째 텍스트 사용
            title = item.get_text(strip=True)[:100]

        # 링크 추출
        link = ""
        link_pattern = self.config.get("link_pattern", "")
        link_selector = selectors.get("link", "a")
        link_attr = self.config.get("link_attribute", "href")
        link_el = item.select_one(link_selector)

        if link_pattern and link_el:
            # 특수 링크 패턴 처리 (예: 과기정통부 onclick="fn_detail(ID)")
            link = self._extract_pattern_link(item, link_el, link_pattern)
        elif link_el:
            link = link_el.get(link_attr, "")
            link = self._resolve_url(link)

        # 날짜 추출
        date_str = ""
        date_selector = selectors.get("date", "")
        if date_selector:
            date_el = item.select_one(date_selector)
            if date_el:
                date_str = date_el.get_text(strip=True)

        # 요약 추출
        summary = ""
        summary_selector = selectors.get("summary", "")
        if summary_selector:
            summary_el = item.select_one(summary_selector)
            if summary_el:
                summary = summary_el.get_text(strip=True)

        if not title and not link:
            return None

        return Article(
            title=title,
            content=summary,  # 상세 페이지에서 본문으로 교체됨
            link=link,
            press=self.name,
            published_time=date_str,
            source_site=self.site_key,
        )

    def _extract_pattern_link(self, item, link_el, link_pattern: str) -> str:
        """
        onclick 등 특수 속성에서 ID를 추출하여 link_pattern으로 URL을 구성한다.

        지원 패턴:
        - onclick="fn_detail('12345')" → ID: 12345
        - onclick="goView(12345)" → ID: 12345
        - data-id="12345" → ID: 12345
        - href="javascript:fn(12345)" → ID: 12345

        Args:
            item: 기사 목록의 전체 행 요소
            link_el: 링크 요소
            link_pattern: URL 패턴 (예: "https://example.com/view?id={id}")

        Returns:
            구성된 절대 URL 또는 빈 문자열
        """
        article_id = ""

        # 1. onclick 속성에서 숫자 ID 추출
        for el in [link_el, item]:
            onclick = el.get("onclick", "")
            if onclick:
                # fn_detail('12345'), goView(12345), detail(12345) 등
                match = re.search(r"\([\'\"]?(\d+)[\'\"]?\)", onclick)
                if match:
                    article_id = match.group(1)
                    break

        # 2. data-id 속성
        if not article_id:
            for el in [link_el, item]:
                data_id = el.get("data-id", "") or el.get("data-seq", "")
                if data_id:
                    article_id = str(data_id)
                    break

        # 3. href="javascript:fn(ID)" 패턴
        if not article_id:
            href = link_el.get("href", "")
            if href and "javascript" in href:
                match = re.search(r"(\d+)", href)
                if match:
                    article_id = match.group(1)

        if article_id:
            return link_pattern.replace("{id}", article_id)

        self.logger.warning(f"[{self.name}] link_pattern 사용 시 ID 추출 실패")
        return ""

    @retry_with_backoff(
        max_attempts=3,
        base_delay=1.0,
        exceptions=(requests.RequestException,),
    )
    def _fetch_page(self, url: str) -> str:
        """페이지 HTML을 가져온다 (재시도 포함)."""
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()

        # 인코딩 자동 감지
        if resp.encoding and resp.encoding.lower() == "iso-8859-1":
            resp.encoding = resp.apparent_encoding

        return resp.text
