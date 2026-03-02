import argparse
import json
import os
import sys
import subprocess
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict

# 현재 디렉토리를 path에 추가하여 generate_briefing 모듈 import
current_dir = Path(__file__).resolve().parent
sys.path.append(str(current_dir))

try:
    from generate_briefing import TrendCollector, BriefingGenerator
except ImportError as e:
    print(f"❌ generate_briefing 모듈을 불러올 수 없습니다: {e}")
    sys.exit(1)

# IT 키워드 부스트 (트렌드 스코어링 시 추가 가중치)
IT_BOOST_KEYWORDS = [
    'ai', '인공지능', 'chatgpt', 'gemini', 'claude', 'llm', 'openai',
    '반도체', 'nvidia', 'tsmc', 'amd', '삼성전자',
    '아이폰', '갤럭시', 'ios', 'android',
    '5g', '6g', '클라우드', 'aws', 'azure', 'gcp',
    '해킹', '보안', '취약점', '개인정보',
    '스타트업', 'ipo', 'skt', 'kt', 'lg',
    'meta', '구글', '애플', '마이크로소프트',
    'gpu', '딥러닝', '머신러닝', '자율주행', '로봇',
]

# 비IT 키워드 필터링 (해당 키워드만 포함된 기사는 스코어 감점)
NON_IT_FILTER = [
    '부동산', '아파트', '청약', '분양',
    '정치', '선거', '대통령', '국회', '여당', '야당',
    '야구', '축구', '골프', '농구', '배구',
    '드라마', '예능', '아이돌', '콘서트',
    '날씨', '기상', '태풍',
]


def parse_args():
    parser = argparse.ArgumentParser(description='Daily Trend Briefing Batch Job')
    parser.add_argument('--start', type=str, required=True, help='Start DateTime (YYYY-MM-DD HH:MM)')
    parser.add_argument('--end', type=str, required=True, help='End DateTime (YYYY-MM-DD HH:MM)')
    parser.add_argument('--skip-crawl', action='store_true', help='Skip crawling and use existing data')
    return parser.parse_args()

def parse_korean_datetime(date_str: str) -> datetime:
    """
    네이버 뉴스 등의 날짜 형식을 파싱
    예: '2024.02.02. 오전 10:30', '1시간 전', '5분 전'
    """
    now = datetime.now()
    date_str = date_str.strip()
    
    # 1. "N분 전", "N시간 전", "N일 전" 처리 (공백 유무 상관없이)
    if '분' in date_str and '전' in date_str:
        try:
            minutes = int(re.search(r'(\d+)', date_str).group(1))
            return now - timedelta(minutes=minutes)
        except:
            pass
    elif '시간' in date_str and '전' in date_str:
        try:
            hours = int(re.search(r'(\d+)', date_str).group(1))
            return now - timedelta(hours=hours)
        except:
            pass
    elif '일' in date_str and '전' in date_str:
        try:
            days = int(re.search(r'(\d+)', date_str).group(1))
            return now - timedelta(days=days)
        except:
            pass
    
    # 2. "2024.02.02. 오전 10:30" 형식 처리
    try:
        # '오전', '오후' 처리
        is_pm = '오후' in date_str
        cleaned = re.sub(r'(오전|오후)\s*', '', date_str).strip()
        # 점(.)이 마지막에 있을 수 있음
        cleaned = cleaned.rstrip('.')
        
        # 포맷 맞추기 (YYYY.MM.DD HH:MM)
        dt = datetime.strptime(cleaned, "%Y.%m.%d. %H:%M")
        
        if is_pm and dt.hour < 12:
            dt = dt + timedelta(hours=12)
        elif not is_pm and dt.hour == 12: # 오전 12시는 0시
            dt = dt - timedelta(hours=12)
            
        return dt
    except:
        pass

    # 3. YYYY-MM-DD 형식 등 추가 대응 가능
    try:
        return datetime.strptime(date_str, "%Y-%m-%d %H:%M")
    except:
        pass
        
    # 파싱 실패 시 현재 시간 반환하거나 None (여기선 안전하게 아주 먼 과거)
    return datetime.min

def run_crawler(script_path: Path, cwd: Path):
    """크롤러 스크립트 실행"""
    print(f"🚀 Running crawler: {script_path.name}...")
    try:
        subprocess.run(
            ["python3", str(script_path)], 
            cwd=str(cwd), 
            check=True,
            capture_output=False 
        )
        print(f"✅ Crawler finished: {script_path.name}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Crawler failed: {e}")

def load_json_data(file_path: Path) -> List[Dict]:
    if not file_path.exists():
        print(f"⚠️ File not found: {file_path}")
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
        # 뉴스 데이터 구조 (categories -> articles)
        if 'categories' in data:
            all_items = []
            for cat in data['categories']:
                articles = cat.get('articles', []) or cat.get('videos', [])
                for item in articles:
                    item['source_category'] = cat.get('main_category', 'Unknown') or cat.get('category_name', 'Unknown')
                    all_items.append(item)
            return all_items
            
        return data

def filter_by_date(items: List[Dict], start_dt: datetime, end_dt: datetime, type: str) -> List[Dict]:
    filtered = []
    for item in items:
        item_dt = datetime.min
        
        if type == 'news':
            date_str = item.get('published_time', '')
            if date_str:
                item_dt = parse_korean_datetime(date_str)
        elif type == 'youtube':
            # 유튜브는 정확한 게시일 추출이 어려울 수 있음. 
            # fetched_at을 기준으로 하거나, 텍스트 파싱 필요.
            # 여기선 fetched_at(크롤링 시점)이 범위 내인지, 혹은 영상 내 날짜 텍스트가 있다면 그것 우선
            fetched_at = item.get('fetched_at', '')
            if fetched_at:
                try:
                    item_dt = datetime.fromisoformat(fetched_at)
                except:
                    pass
        
        # 범위 체크
        if start_dt <= item_dt <= end_dt:
            # 타임스탬프 추가 (정렬용)
            item['timestamp_obj'] = item_dt.isoformat()
            filtered.append(item)
            
    return filtered

def categorize_item(item: Dict, trends: Dict[str, float]) -> str:
    """
    아이템을 6개 IT 카테고리로 분류
    1차: source_category (sites.yaml에서 온 경우)
    2차: 키워드 매칭
    """
    # 1차: source_category 기반 (멀티사이트 크롤러 데이터)
    source_cat = item.get('source_category', '')
    SOURCE_MAP = {
        '통신': 'network',
        '빅테크_국내': 'ai',
        '빅테크_글로벌': 'ai',
        'IT미디어_국내': 'etc',
        'IT미디어_해외': 'etc',
        '개발자': 'etc',
        '커뮤니티': 'etc',
        '언론_IT섹션': 'etc',
        '보안_정부': 'security',
    }
    if source_cat in SOURCE_MAP:
        return SOURCE_MAP[source_cat]

    # 2차: 키워드 매칭
    text = (item.get('title', '') + ' ' + item.get('content', '')).lower()

    KEYWORD_MAP = {
        'mobile': [
            '아이폰', '갤럭시', '스마트폰', 'ios', 'android',
            '태블릿', '웨어러블', '폴더블', '픽셀',
        ],
        'pc': [
            '노트북', '데스크톱', '윈도우', '맥북', 'gpu', '그래픽카드',
            '모니터', '키보드', '마우스', 'ssd', '메모리', '반도체',
            'nvidia', 'amd', 'tsmc', '삼성전자',
        ],
        'ai': [
            'ai', '인공지능', 'chatgpt', 'gemini', 'claude', 'llm', 'openai',
            '클라우드', 'aws', 'azure', 'gcp', '머신러닝', '딥러닝',
            '자율주행', '로봇', 'meta', '구글', '애플', '마이크로소프트',
        ],
        'network': [
            '5g', '6g', 'wifi', '네트워크', '주파수', '대역폭',
            '무선망', '유선망', '광통신',
            'skt', 'kt', 'lgu+', '통신사', '요금제', '알뜰폰',
            'mvno', '로밍',
        ],
        'security': [
            '해킹', '보안', '취약점', '랜섬웨어', '개인정보', '사이버',
            'kisa', '방통위', '과기정통부',
        ],
    }
    for cat, keywords in KEYWORD_MAP.items():
        if any(k in text for k in keywords):
            return cat

    # 기본값: 기타
    return 'etc'

def main():
    args = parse_args()
    
    try:
        start_dt = datetime.strptime(args.start, "%Y-%m-%d %H:%M")
        end_dt = datetime.strptime(args.end, "%Y-%m-%d %H:%M")
    except ValueError:
        print("❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD HH:MM 형식을 사용하세요.")
        sys.exit(1)
        
    print(f"🗓️ Target Period: {start_dt} ~ {end_dt}")
    
    base_dir = Path(__file__).resolve().parent.parent
    
    # 1. Crawl (if not skipped)
    if not args.skip_crawl:
        # Naver News
        news_script = base_dir / "crawling_naver_news" / "news_crawler.py"
        run_crawler(news_script, news_script.parent)
        
        # Youtube (Data API v3 — AWS IP 차단 우회)
        youtube_script = base_dir / "crawling_youtube" / "youtube_crawler_api.py"
        run_crawler(youtube_script, youtube_script.parent)

        # 멀티사이트 크롤러
        sites_script = base_dir / "crawling_sites" / "sites_crawler.py"
        if sites_script.exists():
            run_crawler(sites_script, sites_script.parent)

    # 2. Load Data
    news_file = base_dir / "crawling_naver_news" / "news_data.json"
    youtube_file = base_dir / "crawling_youtube" / "youtube_data.json"
    sites_file = base_dir / "crawling_sites" / "sites_data.json"

    news_items = load_json_data(news_file)
    youtube_items = load_json_data(youtube_file)
    sites_items = load_json_data(sites_file)

    print(f"\n📥 Loaded: {len(news_items)} news, {len(youtube_items)} videos, {len(sites_items)} external sites")
    
    # 3. Filter by Date
    filtered_news = filter_by_date(news_items, start_dt, end_dt, 'news')
    filtered_youtube = filter_by_date(youtube_items, start_dt, end_dt, 'youtube')
    filtered_sites = filter_by_date(sites_items, start_dt, end_dt, 'news')  # 외부 사이트도 news 타입으로 날짜 필터링

    print(f"📉 Filtered (Date): {len(filtered_news)} news, {len(filtered_youtube)} videos, {len(filtered_sites)} external")

    if not filtered_news and not filtered_youtube and not filtered_sites:
        print("⚠️ 기간 내 데이터가 없습니다.")
        # 데이터가 없어도 트렌드는 뽑아서 보여줄 수 있음
    
    # 4. Get Trends & Score
    print("\n📊 Collecting Trends...")
    collector = TrendCollector()
    
    trends_map = {}
    # Google
    for k in collector.get_google_trends(): trends_map[k] = trends_map.get(k, 0) + 1.5
    # Naver
    for k in collector.get_naver_datalab_trends(): trends_map[k] = trends_map.get(k, 0) + 1.2
    # BlackKiwi
    bk = collector.get_blackkiwi_trends()
    for k in bk.get('rising', []): trends_map[k] = trends_map.get(k, 0) + 1.8
    for k in bk.get('new', []): trends_map[k] = trends_map.get(k, 0) + 1.5
    
    # IT 키워드 부스팅: IT 관련 트렌드에 추가 가중치
    boosted = 0
    for kw in list(trends_map.keys()):
        if any(it_kw in kw.lower() for it_kw in IT_BOOST_KEYWORDS):
            trends_map[kw] = trends_map[kw] * 1.5
            boosted += 1

    # 비IT 키워드 필터링: IT 무관 키워드 제거
    filtered_out = 0
    for kw in list(trends_map.keys()):
        if any(non_it in kw.lower() for non_it in NON_IT_FILTER):
            del trends_map[kw]
            filtered_out += 1

    print(f"   Collected {len(trends_map)} trend keywords (IT boosted: {boosted}, non-IT filtered: {filtered_out})")

    # Scoring Combined List
    all_content = []
    
    # News Scoring
    for item in filtered_news:
        score = 0
        matched = []
        text = (item.get('title', '') + " " + item.get('content', '')).lower()
        for kw, weight in trends_map.items():
            if kw.lower() in text:
                score += weight
                matched.append(kw)
        
        item['trend_score'] = score
        item['matched_keywords'] = matched
        item['type'] = 'news'
        all_content.append(item)
        
    # External Sites Scoring (멀티사이트 크롤러 데이터)
    for item in filtered_sites:
        score = 0
        matched = []
        text = (item.get('title', '') + " " + item.get('content', '')).lower()
        for kw, weight in trends_map.items():
            if kw.lower() in text:
                score += weight
                matched.append(kw)

        item['trend_score'] = score
        item['matched_keywords'] = matched
        item['type'] = 'news'
        all_content.append(item)

    # Youtube Scoring
    for item in filtered_youtube:
        score = 0
        matched = []
        text = (item.get('title', '') + " " + item.get('description', '') + " " + item.get('search_keyword', '')).lower()
        if item.get('transcript'): # 자막 있으면 자막도 검색
             text += " " + item['transcript'].get('full_text', '')[:1000] # 앞부분만

        for kw, weight in trends_map.items():
            if kw.lower() in text:
                score += weight * 1.5 # 유튜브는 영상이라 가중치 조금 더 줌 (선택)
                matched.append(kw)
        
        item['trend_score'] = score
        item['matched_keywords'] = matched
        item['type'] = 'youtube'
        all_content.append(item)
    
    # 5. Categorize & Sort
    final_report = {
        "generated_at": datetime.now().isoformat(),
        "period": {"start": args.start, "end": args.end},
        "trends_summary": sorted(trends_map.keys(), key=lambda k: trends_map[k], reverse=True)[:10],
        "categories": {
            "mobile": [],
            "pc": [],
            "ai": [],
            "network": [],
            "security": [],
            "etc": [],
        }
    }
    
    # Sort by score descending
    all_content.sort(key=lambda x: x['trend_score'], reverse=True)
    
    for item in all_content:
        cat = categorize_item(item, trends_map)
        final_report["categories"][cat].append(item)
    
    # 6. Save Report
    output_filename = f"daily_brief_{start_dt.strftime('%Y%m%d')}.json"
    output_dir = base_dir # pipeline folder
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / output_filename
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_report, f, ensure_ascii=False, indent=2)
        
    print("\n" + "="*60)
    print(f"✅ Daily Brief Generated: {output_path}")
    print(f"   - Trends: {len(trends_map)}")
    for cat, items in final_report['categories'].items():
        print(f"   - {cat}: {len(items)}")
    print("="*60)

if __name__ == "__main__":
    main()
