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
    아이템을 4가지 카테고리로 분류 (Economy, Society, Money, Trend)
    """
    title = item.get('title', '') + " " + item.get('content', '')
    
    # 1. 키워드 매칭 점수 확인
    # (이미 트렌드 키워드 매칭이 되어있다면 그 정보 활용 가능하지만, 여기선 독립적으로)
    
    # 간단한 규칙 기반 분류
    title_lower = title.lower()
    
    if any(k in title_lower for k in ['주식', '투자', '코인', '비트코인', '부동산', '청약', '삼성전자', '적금']):
        return 'Money' # 재테크
    
    if any(k in title_lower for k in ['경제', '금리', '수출', 'GDP', '환율', '기업']):
        return 'Economy' # 경제
        
    if any(k in title_lower for k in ['사회', '사건', '사고', '날씨', '교통', '정치']):
        return 'Society' # 사회
        
    # 그 외는 트렌드성이거나 기타
    return 'Trend'

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
    
    print(f"   Collected {len(trends_map)} trend keywords.")
    
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
            "Economy": [],
            "Money": [],
            "Society": [],
            "Trend": []
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
    print(f"   - Economy: {len(final_report['categories']['Economy'])}")
    print(f"   - Money: {len(final_report['categories']['Money'])}")
    print(f"   - Society: {len(final_report['categories']['Society'])}")
    print(f"   - Trend: {len(final_report['categories']['Trend'])}")
    print("="*60)

if __name__ == "__main__":
    main()
