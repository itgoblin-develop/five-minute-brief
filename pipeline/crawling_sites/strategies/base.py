"""
멀티사이트 크롤러의 기반 클래스 및 데이터 모델
"""
import logging
import time
import gc
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse, urlencode, parse_qs, urlunparse

import requests
from bs4 import BeautifulSoup


@dataclass
class Article:
    """수집된 기사 데이터 모델 — news_data.json 포맷과 호환"""
    title: str = ""
    content: str = ""
    link: str = ""
    press: str = ""  # 출처 이름 (예: "삼성전자 뉴스룸")
    published_time: str = ""  # 표준 포맷: "YYYY-MM-DD HH:MM" 또는 원본
    comment_count: int = 0
    reaction_count: int = 0
    source_site: str = ""  # sites.yaml의 사이트 키

    def to_dict(self) -> dict:
        """news_data.json 호환 딕셔너리로 변환"""
        return asdict(self)


class BaseCrawler(ABC):
    """
    모든 크롤링 전략의 기반 클래스.

    서브클래스는 fetch_article_list()와 fetch_article_content()를 구현해야 한다.
    crawl() 메서드가 템플릿 패턴으로 전체 흐름을 관리한다.
    """

    # 기본 User-Agent
    DEFAULT_USER_AGENT = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )

    def __init__(self, site_config: dict, rate_limiter=None):
        self.config = site_config
        self.site_key = site_config.get("key", "unknown")
        self.name = site_config.get("name", "Unknown")
        self.url = site_config.get("url", "")
        self.max_articles = site_config.get("max_articles", 10)
        self.timeout = site_config.get("timeout_seconds", 15)
        self.max_pages = site_config.get("max_pages", 1)
        self.pagination_type = site_config.get("pagination_type", "none")
        self.pagination_param = site_config.get("pagination_param", "page")
        self.pagination_start = site_config.get("pagination_start", 1)
        self.rate_limiter = rate_limiter
        self.logger = logging.getLogger(f"crawler.{self.site_key}")
        self._session = None

    @property
    def session(self) -> requests.Session:
        """재사용 가능한 HTTP 세션 (lazy 초기화)"""
        if self._session is None:
            self._session = requests.Session()
            self._session.headers.update({
                "User-Agent": self.config.get("user_agent", self.DEFAULT_USER_AGENT),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            })
        return self._session

    def crawl(self) -> list[dict]:
        """
        메인 크롤링 메서드 (템플릿 패턴).

        1. 레이트 리미팅 대기
        2. 기사 목록 수집
        3. 각 기사 상세 페이지 본문 수집
        4. 정규화 및 검증

        Returns:
            news_data.json 호환 딕셔너리 리스트
        """
        domain = self._get_domain()

        # 1단계: 기사 목록 수집
        self._wait_rate_limit(domain)
        try:
            articles = self.fetch_article_list()
        except Exception as e:
            self.logger.error(f"[{self.name}] 기사 목록 수집 실패: {e}")
            raise

        self.logger.info(f"[{self.name}] 목록에서 {len(articles)}건 발견")

        # 2단계: 상세 페이지 본문 수집
        if self.config.get("fetch_full_content", True):
            for i, article in enumerate(articles):
                if article.link and not article.content:
                    self._wait_rate_limit(domain)
                    try:
                        full_content = self.fetch_article_content(article.link)
                        if full_content:
                            article.content = full_content
                    except Exception as e:
                        self.logger.warning(
                            f"[{self.name}] 상세 페이지 수집 실패 ({i+1}/{len(articles)}): {e}"
                        )

        # 3단계: 정규화 및 검증
        results = []
        for article in articles:
            article.press = article.press or self.name
            article.source_site = self.site_key
            normalized = article.to_dict()
            if self._validate(normalized):
                results.append(normalized)

        self.logger.info(f"[{self.name}] 최종 {len(results)}건 수집 완료")
        return results

    @abstractmethod
    def fetch_article_list(self) -> list[Article]:
        """
        기사 목록을 수집한다.

        Returns:
            Article 리스트 (content는 비어있을 수 있음 — 상세 페이지에서 채움)
        """
        pass

    def fetch_article_content(self, url: str) -> Optional[str]:
        """
        기사 상세 페이지에서 본문을 수집한다.
        기본 구현: requests + BeautifulSoup로 본문 추출.
        서브클래스에서 오버라이드 가능.
        """
        content_selector = self.config.get("selectors", {}).get("detail_content", "article")

        try:
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # 셀렉터로 본문 영역 찾기
            content_el = soup.select_one(content_selector)
            if content_el:
                # 불필요한 태그 제거
                for tag in content_el.select("script, style, nav, footer, .ad, .advertisement"):
                    tag.decompose()
                text = content_el.get_text(separator="\n", strip=True)
                # 최대 길이 제한 (2000자)
                max_len = self.config.get("max_content_length", 2000)
                if len(text) > max_len:
                    # 문장 경계에서 자르기
                    cut_text = text[:max_len]
                    last_period = max(
                        cut_text.rfind("."),
                        cut_text.rfind("다."),
                        cut_text.rfind("!"),
                        cut_text.rfind("?")
                    )
                    if last_period > max_len * 0.5:
                        text = cut_text[:last_period + 1]
                    else:
                        text = cut_text
                return text
        except Exception as e:
            self.logger.warning(f"[{self.name}] 본문 추출 실패 ({url}): {e}")

        return None

    def _validate(self, article_dict: dict) -> bool:
        """기사 데이터 유효성 검사"""
        title = article_dict.get("title", "").strip()
        if not title or len(title) < 2:
            return False
        if not article_dict.get("link", ""):
            return False
        return True

    def _get_domain(self) -> str:
        """URL에서 도메인 추출"""
        parsed = urlparse(self.url)
        return parsed.netloc

    def _wait_rate_limit(self, domain: str):
        """레이트 리미터가 있으면 대기"""
        if self.rate_limiter:
            self.rate_limiter.wait(domain)

    def _build_page_url(self, page_num: int) -> str:
        """페이지 번호에 해당하는 URL을 생성한다."""
        if self.pagination_type == "none" or page_num == self.pagination_start:
            return self.url

        if self.pagination_type == "query_param":
            # URL 쿼리 파라미터에 페이지 번호 추가/교체
            parsed = urlparse(self.url)
            params = parse_qs(parsed.query, keep_blank_values=True)
            params[self.pagination_param] = [str(page_num)]
            new_query = urlencode(params, doseq=True)
            return urlunparse(parsed._replace(query=new_query))

        if self.pagination_type == "path_segment":
            # URL 경로 끝에 /page/{num} 추가
            base = self.url.rstrip("/")
            return f"{base}/{self.pagination_param}/{page_num}"

        return self.url

    def _resolve_url(self, href: str) -> str:
        """상대 URL을 절대 URL로 변환"""
        if not href:
            return ""
        if href.startswith(("http://", "https://")):
            return href
        return urljoin(self.url, href)

    def close(self):
        """리소스 정리"""
        if self._session:
            self._session.close()
            self._session = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
