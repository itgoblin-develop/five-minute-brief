"""
네이버 뉴스 크롤러
- 크롤링.md 파일의 섹션 URL에서 기사 정보 수집
- JSON 형태로 저장
"""

import gc
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


def parse_crawling_md(file_path: str) -> list[dict]:
    """크롤링.md 파일을 파싱하여 카테고리별 URL 추출"""
    sections = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.strip().split('\n')
    current_h2 = ""
    current_h3 = ""
    
    for line in lines:
        line = line.strip()
        
        # H2 (대분류)
        if line.startswith('## ') and not line.startswith('###'):
            current_h2 = line[3:].strip()
            current_h3 = ""
        
        # H3 (소분류)
        elif line.startswith('### '):
            current_h3 = line[4:].strip()
        
        # URL
        elif line.startswith('https://news.naver.com/'):
            sections.append({
                'main_category': current_h2,
                'sub_category': current_h3,
                'section_url': line
            })
    
    return sections


def setup_driver() -> webdriver.Chrome:
    """Selenium Chrome 드라이버 설정 (메모리 최적화)"""
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')

    # 메모리 최적화 옵션 (안정적인 것만)
    options.add_argument('--disable-extensions')
    options.add_argument('--disable-background-networking')
    options.add_argument('--disable-default-apps')
    options.add_argument('--disable-sync')
    options.add_argument('--disable-translate')
    options.add_argument('--no-first-run')
    options.add_argument('--blink-settings=imagesEnabled=false')  # 이미지 로딩 비활성화
    options.add_argument('--js-flags=--max-old-space-size=512')  # JS 힙 제한

    # 시스템 chromedriver 우선 사용, 없으면 webdriver_manager 폴백
    import shutil
    chromedriver_path = shutil.which('chromedriver')
    if chromedriver_path:
        service = Service(chromedriver_path)
    else:
        service = Service(ChromeDriverManager().install())

    driver = webdriver.Chrome(service=service, options=options)
    return driver


def extract_articles_from_section(driver: webdriver.Chrome, section_url: str, max_articles: int = 10) -> list[dict]:
    """섹션 페이지에서 기사 목록 추출"""
    articles = []
    
    try:
        driver.get(section_url)
        time.sleep(2)  # 페이지 로딩 대기
        
        # 기사 목록 추출 (sa_text_title 클래스를 가진 링크)
        article_elements = driver.find_elements(By.CSS_SELECTOR, '.sa_text_title')[:max_articles]
        
        for elem in article_elements:
            try:
                title = elem.text.strip()
                link = elem.get_attribute('href')
                
                # 기사 요약 추출 (형제 요소에서)
                parent = elem.find_element(By.XPATH, './..')
                try:
                    lede_elem = parent.find_element(By.CSS_SELECTOR, '.sa_text_lede')
                    content = lede_elem.text.strip()
                except:
                    content = ""
                
                # 언론사와 시간 추출
                try:
                    press_elem = parent.find_element(By.CSS_SELECTOR, '.sa_text_press')
                    press = press_elem.text.strip()
                except:
                    press = ""
                
                try:
                    time_elem = parent.find_element(By.CSS_SELECTOR, '.sa_text_datetime')
                    published_time = time_elem.text.strip()
                except:
                    published_time = ""
                
                if title and link:
                    articles.append({
                        'title': title,
                        'content': content,
                        'link': link,
                        'press': press,
                        'published_time': published_time,
                        'comment_count': 0,
                        'reaction_count': 0
                    })
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"섹션 크롤링 오류 ({section_url}): {e}")
    
    return articles


def get_article_full_content(driver: webdriver.Chrome, article_url: str) -> dict:
    """개별 기사 페이지에서 본문과 댓글/반응 수 추출"""
    result = {
        'content': "",
        'comment_count': 0,
        'reaction_count': 0
    }
    
    try:
        driver.get(article_url)
        time.sleep(1)
        
        # 1. 본문 추출
        try:
            # 네이버 뉴스 본문 공통 선택자 (dic_area)
            content_elem = driver.find_element(By.CSS_SELECTOR, '#dic_area')
            result['content'] = content_elem.text.strip()
        except:
            pass
            
        # 2. 반응 수 추출
        try:
            reaction_elements = driver.find_elements(By.CSS_SELECTOR, '.u_likeit_list_count')
            for elem in reaction_elements:
                try:
                    count = int(elem.text.strip().replace(',', ''))
                    result['reaction_count'] += count
                except:
                    continue
        except:
            pass
        
        # 3. 댓글 수 추출
        try:
            comment_elem = driver.find_element(By.CSS_SELECTOR, '.media_end_head_cmtcount_button span')
            result['comment_count'] = int(comment_elem.text.strip().replace(',', ''))
        except:
            pass
            
    except Exception as e:
        pass
    
    return result


def crawl_news(
    crawling_md_path: str,
    output_path: str,
    articles_per_section: int = 10,
    fetch_full_content: bool = True
) -> dict:
    """메인 크롤링 함수"""
    
    print("=" * 60)
    print("네이버 뉴스 크롤러 시작")
    print("=" * 60)
    
    # 크롤링.md 파싱
    sections = parse_crawling_md(crawling_md_path)
    print(f"\n총 {len(sections)}개 섹션 발견")
    
    # 드라이버 설정
    driver = setup_driver()
    
    result = {
        'crawled_at': datetime.now().isoformat(),
        'total_sections': len(sections),
        'total_articles': 0,
        'categories': []
    }
    
    try:
        for i, section in enumerate(sections, 1):
            print(f"\n[{i}/{len(sections)}] {section['main_category']} > {section['sub_category']}")
            print(f"    URL: {section['section_url']}")
            
            # 섹션에서 기사 목록 추출 (요약본만 있음)
            articles = extract_articles_from_section(
                driver, 
                section['section_url'],
                max_articles=articles_per_section
            )
            
            print(f"    → {len(articles)}개 기사 발견")
            
            # 개별 기사 상세 페이지 진입 (본문 + 반응)
            if fetch_full_content and articles:
                print(f"    → 본문 및 반응 수집 중...")
                for j, article in enumerate(articles):
                    details = get_article_full_content(driver, article['link'])
                    
                    # 상세 내용 업데이트
                    if details['content']:
                        article['content'] = details['content'] # 본문 덮어쓰기
                    
                    article['comment_count'] = details['comment_count']
                    article['reaction_count'] = details['reaction_count']
                    
                    # 진행 상황 표시 (5개마다)
                    if (j + 1) % 5 == 0:
                        print(f"       {j + 1}/{len(articles)} 완료")
            
            # 결과에 추가
            category_data = {
                'main_category': section['main_category'],
                'sub_category': section['sub_category'],
                'section_url': section['section_url'],
                'article_count': len(articles),
                'articles': articles
            }
            result['categories'].append(category_data)
            result['total_articles'] += len(articles)
            
            # 메모리 정리 + 속도 제한
            try:
                driver.execute_script("window.gc && window.gc();")
            except:
                pass
            gc.collect()
            time.sleep(0.5)
    
    finally:
        driver.quit()
    
    # JSON 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"크롤링 완료!")
    print(f"  - 총 섹션: {result['total_sections']}개")
    print(f"  - 총 기사: {result['total_articles']}개")
    print(f"  - 저장 위치: {output_path}")
    print("=" * 60)
    
    return result


if __name__ == '__main__':
    # 경로 설정
    base_dir = Path(__file__).parent
    crawling_md_path = base_dir / '크롤링.md'
    output_path = base_dir / 'news_data.json'
    
    # 크롤링 실행
    crawl_news(
        crawling_md_path=str(crawling_md_path),
        output_path=str(output_path),
        articles_per_section=10,  # 섹션당 기사 수
        fetch_full_content=True   # 본문 및 반응 수집 여부
    )
