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
    아이템을 IT 전용 5개 카테고리로 분류
    - Tech: 테크산업 (기업 동향, M&A, 시장, 스타트업)
    - AI: 인공지능 (AI, ML, LLM, 생성형AI, 로보틱스)
    - Dev: 개발 (프레임워크, 언어, 오픈소스, DevOps)
    - Product: 서비스 (신규 서비스, 앱, 플랫폼, UX)
    - Security: 보안 (사이버 보안, 클라우드, 인프라)
    """
    text = (item.get('title', '') + " " + item.get('content', '')).lower()

    # AI 관련 (가장 먼저 체크 - 다른 카테고리와 겹칠 수 있으므로)
    if any(k in text for k in ['인공지능', 'ai ', ' ai', 'llm', 'gpt', 'gemini', 'claude',
                                '머신러닝', '딥러닝', '생성형', '챗봇', 'openai', '언어모델',
                                'diffusion', 'transformer', '로보틱스', '자율주행',
                                '신경망', 'sora', 'copilot', '파인튜닝', 'rag']):
        return 'AI'

    # 보안/인프라
    if any(k in text for k in ['보안', '해킹', '취약점', '랜섬웨어', '개인정보',
                                '클라우드', 'aws', 'azure', 'gcp', '데이터센터',
                                '사이버', '피싱', 'ddos', '인프라', '서버',
                                'zero-day', '암호화', 'kubernetes', 'k8s']):
        return 'Security'

    # 개발
    if any(k in text for k in ['개발자', '프레임워크', '오픈소스', 'github', 'devops',
                                'python', 'javascript', 'typescript', 'rust', 'golang',
                                'react', 'next.js', 'docker', 'api', 'sdk',
                                '라이브러리', '프로그래밍', '코딩', '컨테이너',
                                'ci/cd', 'git', 'vscode', '개발 도구', '릴리스']):
        return 'Dev'

    # 서비스/프로덕트
    if any(k in text for k in ['출시', '업데이트', '서비스', '플랫폼', '사용자',
                                '구독', 'ux', 'ui', '앱스토어', '다운로드',
                                '베타', '런칭', '신규 기능', '가입자',
                                '카카오', '네이버', '토스', '당근', '배민']):
        return 'Product'

    # 테크산업 (기본 IT 카테고리)
    return 'Tech'


def is_it_content(item: Dict) -> bool:
    """IT/테크 관련 콘텐츠인지 필터링 (비IT 콘텐츠 제거용)"""
    text = (item.get('title', '') + " " + item.get('content', '')).lower()

    # 비IT 콘텐츠 키워드 (경제, 재테크, 사회 등)
    non_it_keywords = [
        # 경제/재테크
        '주식', '코스피', '코스닥', '환율', '금리', '부동산', '아파트', '청약',
        '적금', '펀드', '채권', 'etf', '배당', '증시', '코인', '비트코인',
        '투자', '재테크', '연금', '대출', '예금',
        # 사회/정치
        '사건', '사고', '날씨', '교통', '정치', '선거', '국회', '대통령',
        '재판', '검찰', '경찰', '범죄', '사망', '화재',
    ]

    # IT 관련 키워드
    it_keywords = [
        'it', '테크', '기술', '소프트웨어', '하드웨어', '반도체', '칩',
        'ai', '인공지능', '클라우드', '데이터', '서버', '개발',
        '앱', '플랫폼', '스타트업', '빅테크', '구글', '애플', '마이크로소프트',
        '메타', '아마존', '엔비디아', 'tsmc', '삼성전자', 'sk하이닉스',
        '네이버', '카카오', '라인', '쿠팡', '배달의민족', '토스',
        '보안', '해킹', '오픈소스', 'api', '로봇', '자율주행',
        '블록체인', '메타버스', 'vr', 'ar', 'xr', '웨어러블',
        '5g', '6g', '통신', '네트워크', '사물인터넷', 'iot',
        'saas', 'paas', '디지털', '트랜스포메이션',
    ]

    # IT 키워드 포함 여부 체크
    has_it = any(k in text for k in it_keywords)

    # 비IT만 포함하고 IT는 없는 경우 제외
    has_non_it_only = any(k in text for k in non_it_keywords) and not has_it

    return has_it or not has_non_it_only

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
    
    # 2. Load Data
    news_file = base_dir / "crawling_naver_news" / "news_data.json"
    youtube_file = base_dir / "crawling_youtube" / "youtube_data.json"
    
    news_items = load_json_data(news_file)
    youtube_items = load_json_data(youtube_file)
    
    print(f"\n📥 Loaded: {len(news_items)} news, {len(youtube_items)} videos")
    
    # 3. Filter by Date
    filtered_news = filter_by_date(news_items, start_dt, end_dt, 'news')
    filtered_youtube = filter_by_date(youtube_items, start_dt, end_dt, 'youtube')
    
    print(f"📉 Filtered (Date): {len(filtered_news)} news, {len(filtered_youtube)} videos")
    
    if not filtered_news and not filtered_youtube:
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
    
    # 4.5. IT 콘텐츠 필터링 (비IT 콘텐츠 제거)
    it_content = [item for item in all_content if is_it_content(item)]
    filtered_out = len(all_content) - len(it_content)
    if filtered_out > 0:
        print(f"🚫 비IT 콘텐츠 {filtered_out}건 제거됨")
    all_content = it_content

    # 5. Categorize & Sort (IT 전용 5개 카테고리)
    final_report = {
        "generated_at": datetime.now().isoformat(),
        "period": {"start": args.start, "end": args.end},
        "trends_summary": sorted(trends_map.keys(), key=lambda k: trends_map[k], reverse=True)[:10],
        "categories": {
            "Tech": [],
            "AI": [],
            "Dev": [],
            "Product": [],
            "Security": []
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
    print(f"   - Tech (테크산업): {len(final_report['categories']['Tech'])}")
    print(f"   - AI: {len(final_report['categories']['AI'])}")
    print(f"   - Dev (개발): {len(final_report['categories']['Dev'])}")
    print(f"   - Product (서비스): {len(final_report['categories']['Product'])}")
    print(f"   - Security (보안): {len(final_report['categories']['Security'])}")
    print("="*60)

if __name__ == "__main__":
    main()
