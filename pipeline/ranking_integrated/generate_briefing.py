import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Set

# 상위 폴더(루트)를 경로에 추가하여 다른 모듈 import 가능하게 함
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 각 트렌드 모듈 import
# (주의: 각 파일이 모듈로서 import 가능한 구조여야 함. 함수들이 if __name__ == "__main__": 블록 밖에 정의되어 있어야 함)
# 일단 여기서는 직접 로직을 import 하거나, 각 파일의 핵심 함수를 복사해와서 통합 클래스로 구성할 예정.
# 하지만 기존 파일들을 수정하지 않고 import 하려면 해당 파일들의 구조가 중요함.
# 편의상 핵심 로직을 이 파일에서 직접 호출하거나, subprocess로 실행하여 결과만 파싱하는 방법도 있음.
# 가장 깔끔한 건 여기서 라이브러리처럼 쓰는 것.

try:
    # Google Trends
    from ranking_google_trends.check_google_trends_rss import *
    # BlackKiwi
    from ranking_blackkiwi.check_blackkiwi_trend import *
except ImportError:
    pass

# =========================================================================================
# 1. 트렌드 수집 클래스
# =========================================================================================
import requests
import xml.etree.ElementTree as ET
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv

class TrendCollector:
    def __init__(self):
        self.load_env()
        
    def load_env(self):
        # pipeline/ranking_integrated/generate_briefing.py -> pipeline -> project root -> .env
        env_path = Path(__file__).resolve().parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path)
        self.naver_client_id = os.getenv("NAVER_CLIENT_ID")
        self.naver_client_secret = os.getenv("NAVER_CLIENT_SECRET")

    def get_google_trends(self) -> List[str]:
        """구글 트렌드 RSS에서 실시간 검색어 추출"""
        print("   [Google] 트렌드 수집 중...")
        url = "https://trends.google.co.kr/trending/rss?geo=KR"
        keywords = []
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                for item in root.findall('.//item'):
                    title = item.find('title').text
                    keywords.append(title)
        except Exception as e:
            print(f"      ❌ Google 오류: {e}")
        return keywords

    def get_naver_datalab_trends(self) -> List[str]:
        """네이버 데이터랩 API에서 경제/주식/사회 트렌드 추출"""
        print("   [Naver] 데이터랩 트렌드 수집 중...")
        if not self.naver_client_id or not self.naver_client_secret:
            print("      ⚠️ 네이버 API 키 없음")
            return []
            
        url = "https://openapi.naver.com/v1/datalab/search"
        headers = {
            "X-Naver-Client-Id": self.naver_client_id,
            "X-Naver-Client-Secret": self.naver_client_secret,
            "Content-Type": "application/json",
        }
        
        # 조회할 키워드 그룹 (경제 위주)
        groups = [
            {"groupName": "경제", "keywords": ["경제", "금리", "환율", "물가"]},
            {"groupName": "주식", "keywords": ["주식", "코스피", "코스닥", "상장"]},
            {"groupName": "부동산", "keywords": ["부동산", "아파트", "청약", "전세"]},
             {"groupName": "반도체/AI", "keywords": ["반도체", "AI", "인공지능", "삼성전자", "하이닉스"]},
        ]
        
        end_date = datetime.now().date()
        start_date = end_date  # 오늘 데이터 조회 시도 (없으면 어제꺼 씀 등 로직 필요하지만 일단 오늘)
        # 데이터랩은 하루 전 데이터까지만 보통 정확히 나옴
        from datetime import timedelta
        start_date = end_date - timedelta(days=1)
        
        body = {
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d"),
            "timeUnit": "date",
            "keywordGroups": groups
        }
        
        keywords = []
        try:
            resp = requests.post(url, headers=headers, json=body, timeout=5)
            if resp.json().get('results'):
                # ratio가 높은 순서대로 정렬하거나, 그냥 그룹명 자체를 키워드로 활용
                # 여기서는 간단히 결과에 있는 그룹명만 가져옴
                for result in resp.json()['results']:
                     # ratio 확인
                    data = result.get('data', [])
                    if data:
                        last_ratio = data[-1].get('ratio', 0)
                        if last_ratio > 10: # 의미있는 검색량이 있을 때만
                            keywords.append(result['title']) 
                            # 상세 키워드도 추가하면 좋음
        except Exception as e:
            print(f"      ❌ Naver 오류: {e}")
            
        return keywords

    def get_blackkiwi_trends(self) -> Dict[str, List[str]]:
        """블랙키위에서 급상승/신규 키워드 크롤링 (Selenium)"""
        print("   [BlackKiwi] 트렌드 수집 중 (브라우저 실행)...")
        url = "https://blackkiwi.net/service/trend"
        results = {"rising": [], "new": []}
        
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        driver = None
        try:
            driver = webdriver.Chrome(options=options)
            driver.get(url)
            wait = WebDriverWait(driver, 10)
            
            # Rising
            try:
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#popularKeywordList a")))
                elems = driver.find_elements(By.CSS_SELECTOR, "#popularKeywordList a")
                results["rising"] = [e.text.strip() for e in elems if e.text.strip()][:10]
            except: pass
            
            # New
            try:
                elems = driver.find_elements(By.CSS_SELECTOR, "div[class*='NewKeywordsList'] a")
                results["new"] = [e.text.strip() for e in elems if e.text.strip()][:10]
            except: pass
            
        except Exception as e:
            print(f"      ❌ BlackKiwi 오류: {e}")
        finally:
            if driver:
                driver.quit()
                
        return results

# =========================================================================================
# 2. 뉴스 매칭 클래스
# =========================================================================================
class BriefingGenerator:
    def __init__(self, news_json_path: str):
        self.news_data = self.load_news(news_json_path)
        
    def load_news(self, path: str):
        if not os.path.exists(path):
            print(f"⚠️ 뉴스 데이터 파일이 없습니다: {path}")
            return []
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # data가 category별로 묶여있다면 flat하게 풀어서 검색하기 쉽게 만듦
            all_articles = []
            if 'categories' in data:
                for cat in data['categories']:
                    all_articles.extend(cat.get('articles', []))
            return all_articles

    def match_trends(self, trend_keywords: Dict[str, float]) -> List[Dict]:
        """
        트렌드 키워드(가중치 포함)와 뉴스 기사를 매칭
        trend_keywords: {'키워드': 가중치점수}
        """
        matched_results = []
        
        # 뉴스 데이터를 순회하며 키워드 검색
        # (단순 문자열 포함 여부 체크)
        
        for article in self.news_data:
            title = article.get('title', '')
            content = article.get('content', '')
            score = 0
            matched_kws = []
            
            for rank_kw, weight in trend_keywords.items():
                # 키워드가 제목이나 내용에 있는지 확인
                if rank_kw in title:
                    score += weight * 2.0  # 제목에 있으면 가중치 2배
                    matched_kws.append(rank_kw)
                elif rank_kw in content:
                    score += weight * 1.0
                    matched_kws.append(rank_kw)
            
            if score > 0:
                # 결과 저장
                matched_article = article.copy()
                matched_article['match_score'] = score
                matched_article['matched_keywords'] = matched_kws
                matched_results.append(matched_article)
        
        # 점수 내림차순 정렬
        matched_results.sort(key=lambda x: x['match_score'], reverse=True)
        return matched_results

def main():
    print("🚀 [5분 브리핑] 통합 생성기 시작\n")
    
    # 1. 트렌드 수집
    collector = TrendCollector()
    
    trends_map = {} # {키워드: 점수}
    
    # Google (가중치 1.5 - 최신성 높음)
    g_trends = collector.get_google_trends()
    for kw in g_trends:
        trends_map[kw] = trends_map.get(kw, 0) + 1.5
        
    # Naver (가중치 1.2 - 일반적 관심)
    n_trends = collector.get_naver_datalab_trends()
    for kw in n_trends:
        trends_map[kw] = trends_map.get(kw, 0) + 1.2

    # BlackKiwi (가중치 1.8 - 마케팅/실검 정확도 높음)
    bk_trends = collector.get_blackkiwi_trends()
    for kw in bk_trends['rising']:
        trends_map[kw] = trends_map.get(kw, 0) + 1.8
    for kw in bk_trends['new']:
        trends_map[kw] = trends_map.get(kw, 0) + 1.5

    print(f"\n✅ 수집된 트렌드 키워드 총 {len(trends_map)}개")
    # 상위 5개만 로그 출력
    top_5_kws = sorted(trends_map.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"   (Top 5: {', '.join([k for k,v in top_5_kws])})")

    # 2. 로컬 뉴스 로드 및 매칭
    # 경로: Crawling – Naver News/news_data.json
    news_path = Path(__file__).resolve().parent.parent / "crawling_naver_news" / "news_data.json"
    
    generator = BriefingGenerator(str(news_path))
    if not generator.news_data:
        print("\n❌ 저장된 뉴스가 없어 매칭을 건너뜁니다.")
        print("   'crawling_naver_news/news_crawler.py'를 먼저 실행해주세요.")
        return

    print(f"\n🔍 로컬 뉴스 {len(generator.news_data)}건 중에서 매칭 중...")
    briefing_articles = generator.match_trends(trends_map)
    
    print(f"✅ 매칭된 기사: {len(briefing_articles)}건")
    
    # 3. 결과 출력 (Top 5)
    print("\n" + "="*50)
    print("📰 오늘 아침 [5분 브리핑] 추천 뉴스")
    print("="*50)
    
    if not briefing_articles:
        print("⚠️ 트렌드 키워드와 일치하는 뉴스가 하나도 없습니다.")
        print("   (수집된 뉴스가 너무 예전 것이거나, 트렌드와 무관한 섹션일 수 있습니다)")
    else:
        for i, article in enumerate(briefing_articles[:5], 1):
            print(f"{i}. [{', '.join(article['matched_keywords'])}] {article['title']}")
            print(f"   - {article['press']} | 반응 {article['reaction_count']} | 댓글 {article['comment_count']}")
            print(f"   - 링크: {article['link']}")
            print(f"   - 요약: {article['content'][:50]}...")
            print("-" * 50)

if __name__ == "__main__":
    main()
