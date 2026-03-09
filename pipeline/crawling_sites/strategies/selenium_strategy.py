"""
Selenium 기반 크롤링 전략.
JavaScript 렌더링이 필요한 동적 페이지에서 기사를 수집한다.
정부 사이트, SPA 등에 적합.

기존 news_crawler.py의 setup_driver 패턴을 재사용한다.
"""
import gc
import time
import logging
from typing import Optional

from bs4 import BeautifulSoup

from .base import BaseCrawler, Article

logger = logging.getLogger(__name__)

# Selenium 관련 임포트 (설치되지 않았을 때 에러 방지)
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, WebDriverException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    logger.warning("Selenium이 설치되지 않았습니다. SeleniumCrawler를 사용할 수 없습니다.")

try:
    from webdriver_manager.chrome import ChromeDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False


class SeleniumCrawler(BaseCrawler):
    """
    Selenium 크롤러.

    sites.yaml 설정 예:
        strategy: selenium
        selectors:
            article_list: ".board-list tbody tr"
            title: "td.title a"
            link: "td.title a"
            date: "td.date"
            detail_content: ".view-content"  # 상세 페이지 본문
        page_load_wait: 3  # 페이지 로드 대기 시간(초)
        scroll_count: 0  # 무한스크롤 횟수 (0이면 스크롤 안 함)
    """

    def __init__(self, site_config: dict, rate_limiter=None):
        if not SELENIUM_AVAILABLE:
            raise RuntimeError("Selenium이 설치되지 않았습니다. pip install selenium")
        super().__init__(site_config, rate_limiter)
        self._driver = None

    def fetch_article_list(self) -> list[Article]:
        """Selenium으로 페이지를 로드하고 기사 목록을 반환한다 (멀티페이지 지원)."""
        selectors = self.config.get("selectors", {})
        if not selectors.get("article_list"):
            raise ValueError(f"[{self.name}] selectors.article_list가 설정되지 않았습니다")

        driver = self._get_driver()
        all_articles = []

        try:
            for page_num in range(self.pagination_start, self.pagination_start + self.max_pages):
                page_url = self._build_page_url(page_num)

                # 페이지 로드
                driver.get(page_url)
                wait_time = self.config.get("page_load_wait", 3)
                time.sleep(wait_time)

                # 무한스크롤 처리 (첫 페이지만)
                if page_num == self.pagination_start:
                    scroll_count = self.config.get("scroll_count", 0)
                    for _ in range(scroll_count):
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                        time.sleep(1.5)

                # 페이지 소스 파싱
                soup = BeautifulSoup(driver.page_source, "html.parser")
                items = soup.select(selectors["article_list"])

                if not items:
                    if page_num == self.pagination_start:
                        self.logger.warning(
                            f"[{self.name}] 기사 목록을 찾을 수 없습니다: {selectors['article_list']}"
                        )
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

                # 다음 페이지 전 대기
                if page_num < self.pagination_start + self.max_pages - 1:
                    domain = self._get_domain()
                    self._wait_rate_limit(domain)

            return all_articles[:self.max_articles]

        except TimeoutException:
            self.logger.error(f"[{self.name}] 페이지 로드 타임아웃: {self.url}")
            raise
        except Exception as e:
            self.logger.error(f"[{self.name}] Selenium 크롤링 실패: {e}")
            raise

    def fetch_article_content(self, url: str) -> Optional[str]:
        """Selenium으로 상세 페이지의 본문을 수집한다."""
        content_selector = self.config.get("selectors", {}).get("detail_content", "article")
        driver = self._get_driver()

        try:
            driver.get(url)
            time.sleep(self.config.get("page_load_wait", 2))

            soup = BeautifulSoup(driver.page_source, "html.parser")
            content_el = soup.select_one(content_selector)

            if content_el:
                # 불필요한 태그 제거
                for tag in content_el.select("script, style, nav, footer, .ad, .advertisement"):
                    tag.decompose()
                text = content_el.get_text(separator="\n", strip=True)

                # 최대 길이 제한
                max_len = self.config.get("max_content_length", 2000)
                if len(text) > max_len:
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
            self.logger.warning(f"[{self.name}] Selenium 본문 추출 실패 ({url}): {e}")

        return None

    def _parse_article_item(self, item, selectors: dict) -> Optional[Article]:
        """단일 기사 항목을 파싱한다."""
        # 제목
        title = ""
        title_selector = selectors.get("title", "")
        if title_selector:
            title_el = item.select_one(title_selector)
            if title_el:
                title = title_el.get_text(strip=True)

        # 링크
        link = ""
        link_selector = selectors.get("link", "a")
        link_el = item.select_one(link_selector)
        if link_el:
            link = link_el.get("href", "")
            link = self._resolve_url(link)

        # 날짜
        date_str = ""
        date_selector = selectors.get("date", "")
        if date_selector:
            date_el = item.select_one(date_selector)
            if date_el:
                date_str = date_el.get_text(strip=True)

        if not title and not link:
            return None

        return Article(
            title=title,
            content="",  # 상세 페이지에서 채움
            link=link,
            press=self.name,
            published_time=date_str,
            source_site=self.site_key,
        )

    def _get_driver(self):
        """Selenium WebDriver 인스턴스를 반환한다 (lazy 초기화)."""
        if self._driver is None:
            self._driver = self._setup_driver()
        return self._driver

    def _setup_driver(self):
        """
        Chrome WebDriver를 설정한다.
        기존 news_crawler.py의 setup_driver() 패턴을 재사용.
        """
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--blink-settings=imagesEnabled=false")  # 이미지 로딩 비활성화
        options.add_argument("--js-flags=--max-old-space-size=512")  # 메모리 제한
        options.add_argument(
            f"--user-agent={self.config.get('user_agent', self.DEFAULT_USER_AGENT)}"
        )

        # 불필요한 로그 억제
        options.add_experimental_option("excludeSwitches", ["enable-logging"])

        # 시스템 chromedriver 우선, 없으면 webdriver_manager 폴백
        import shutil
        chromedriver_path = shutil.which('chromedriver')
        try:
            if chromedriver_path:
                service = Service(chromedriver_path)
                driver = webdriver.Chrome(service=service, options=options)
            elif WEBDRIVER_MANAGER_AVAILABLE:
                service = Service(ChromeDriverManager().install())
                driver = webdriver.Chrome(service=service, options=options)
            else:
                driver = webdriver.Chrome(options=options)
        except Exception as e:
            self.logger.error(f"ChromeDriver 초기화 실패: {e}")
            raise RuntimeError(f"ChromeDriver를 찾을 수 없습니다: {e}")

        driver.set_page_load_timeout(self.config.get("timeout_seconds", 30))
        return driver

    def close(self):
        """WebDriver 및 HTTP 세션 정리"""
        if self._driver:
            try:
                self._driver.quit()
            except Exception:
                pass
            self._driver = None
            gc.collect()
        super().close()
