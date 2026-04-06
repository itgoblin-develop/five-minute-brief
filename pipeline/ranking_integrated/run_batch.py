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
    # 영문 동의어 추가 (MacRumors, TechCrunch, The Verge 등 영문 기사 부스트)
    'artificial intelligence', 'machine learning', 'deep learning',
    'cybersecurity', 'data breach', 'vulnerability', 'exploit', 'ransomware',
    'smartphone', 'chip', 'processor', 'semiconductor',
    'iphone', 'apple', 'google', 'microsoft', 'samsung',
    'foundation model', 'privacy', 'cve', 'zero-day', 'patch',
    'open source', 'developer', 'api', 'cloud computing',
]

# 보안·임팩트 기사 추가 부스트 (score × 1.3) — 개인 생활에 직접 영향
SECURITY_IMPACT_KEYWORDS = [
    'cve', 'exploit', '제로데이', 'zero-day', 'ransomware', '랜섬웨어',
    'data breach', '개인정보 유출', '취약점 악용', 'kisa 경보', '긴급 패치',
    'critical vulnerability', 'remote code execution', 'rce',
    '악성코드', 'malware', 'phishing', '피싱', '스미싱',
]

# 사이트 권위 가중치 (기본: 1.0, 높을수록 신뢰도/중요도 높음)
SITE_AUTHORITY = {
    # 정부·공공기관 (가장 신뢰도 높음) — sites.yaml site_key 기준
    'kisa_security': 3.0, 'kisa_report': 2.5, 'kisa_notice': 2.5,
    'kmcc_press': 2.5, 'msit_press': 2.5, 'pipc_press': 2.5,
    # 주요 글로벌 IT 미디어
    'techcrunch': 2.5, 'the_verge': 2.5, 'ars_technica': 2.5, 'wired': 2.0,
    'cnet_global': 2.0, 'macrumors': 1.8, 'nine_to_five_mac': 1.8, 'gizmodo': 1.5,
    # 국내 IT 미디어
    'zdnet_korea': 2.0, 'itworld_korea': 1.8, 'cnet_korea': 1.8, 'bizwatch_news': 1.5,
    # 공식 빅테크 뉴스룸
    'apple_kr_newsroom': 2.5, 'apple_dev_newsroom': 2.0,
    'samsung_newsroom': 2.0, 'google_korea_blog': 2.0, 'google_blog': 2.0,
    'meta_newsroom': 1.8, 'lg_newsroom': 1.8,
    # 개발자 블로그
    'android_dev_blog': 1.8, 'ms_research_blog': 1.8, 'naver_search_tech': 1.5,
    # 뉴스 IT 섹션
    'weekly_donga': 1.3, 'enewstoday': 1.3, 'newsis_it': 1.3,
    # 커뮤니티
    'clien_news': 1.2,
}

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
    네이버 뉴스, 외부 사이트(RSS/HTML) 등 다양한 날짜 형식을 파싱
    예: '2024.02.02. 오전 10:30', '1시간 전', '5분 전',
        '2026-03-03', '2026-03-03T10:30:00Z', '2026년 3월 3일'
    """
    now = datetime.now()
    date_str = date_str.strip()

    # 0. ISO 8601 datetime (RSS 표준: Z, +09:00 등 포함)
    # "2026-03-03T10:30:00", "2026-03-03T10:30:00Z", "2026-03-03T10:30:00+09:00"
    if 'T' in date_str:
        try:
            # Z → +00:00 변환 후 fromisoformat 사용, tzinfo 제거하여 naive datetime 반환
            cleaned = date_str.replace('Z', '+00:00')
            from datetime import timezone as _tz
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is not None:
                # UTC → 로컬 naive (UTC 기준 유지)
                dt = dt.replace(tzinfo=None)
            return dt
        except (ValueError, AttributeError):
            pass

    # 0b. "YYYY-MM-DD" (날짜만, 시간 없음) — 애플 뉴스룸, 대부분 외부 사이트
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        pass

    # 0c. "YYYY.MM.DD" (점 포맷, 시간 없음)
    try:
        return datetime.strptime(date_str.rstrip('.'), "%Y.%m.%d")
    except ValueError:
        pass

    # 0d. "YYYY년 MM월 DD일" (한국어 날짜)
    try:
        return datetime.strptime(date_str, "%Y년 %m월 %d일")
    except ValueError:
        pass

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

def categorize_item(item: Dict, trends: Dict[str, float]) -> str | None:
    """
    아이템을 6개 IT 카테고리로 분류
    1차: 블랙리스트 필터 (비IT 콘텐츠 차단)
    2차: source_category (sites.yaml에서 온 경우)
    3차: 키워드 매칭
    블랙리스트 매칭 시 None 반환 → 호출부에서 제외
    """
    # 0차: 비IT 블랙리스트 필터
    BLACKLIST_KEYWORDS = [
        # 게임
        '게임', '라그나로크', '붉은사막', '리니지', '배틀그라운드', 'e스포츠',
        '엔씨소프트', '넥슨', '크래프톤', '스팀', 'steam', '플레이스테이션',
        # 의학/건강
        '의료', '의학', '병원', '진료', '수술', '질환', '질병', '약물',
        # 엔터테인먼트
        '웹툰', '만화', '애니메이션', '디즈니',
        # 스포츠
        'f1', '포뮬러', '올림픽',
    ]
    text = (item.get('title', '') + ' ' + item.get('content', '') + ' ' + item.get('description', '')).lower()
    if any(kw in text for kw in BLACKLIST_KEYWORDS):
        return None

    # 1차: source_category 기반 (멀티사이트 크롤러 데이터)
    # 빅테크_글로벌(애플, 구글 등)은 한국어로 작성되므로 키워드 매칭으로 정확한 분류 위임
    source_cat = item.get('source_category', '')
    SOURCE_MAP = {
        '통신': 'network',
        '빅테크_국내': 'ai',
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
    
    def _calc_score(item: Dict, text: str, multiplier: float = 1.0) -> tuple:
        """트렌드 키워드 매칭 + IT 부스트 기반 기사 점수 계산"""
        score = 0
        matched = []
        for kw, weight in trends_map.items():
            if kw.lower() in text:
                score += weight * multiplier
                matched.append(kw)
        # IT 키워드 직접 부스트 (트렌드에 없어도 IT 핵심 단어면 가중치)
        it_hits = sum(1 for kw in IT_BOOST_KEYWORDS if kw in text)
        score += it_hits * 0.5
        return score, matched

    # News Scoring
    for item in filtered_news:
        text = (item.get('title', '') + " " + item.get('content', '')).lower()
        score, matched = _calc_score(item, text)
        item['trend_score'] = score
        item['matched_keywords'] = matched
        item['type'] = 'news'
        all_content.append(item)

    # External Sites Scoring (멀티사이트 크롤러 데이터)
    for item in filtered_sites:
        text = (item.get('title', '') + " " + item.get('content', '')).lower()
        score, matched = _calc_score(item, text)
        # 사이트 권위 가중치 적용
        authority = SITE_AUTHORITY.get(item.get('source_site', ''), 1.0)
        score *= authority
        item['trend_score'] = score
        item['matched_keywords'] = matched
        item['type'] = 'news'
        all_content.append(item)

    # Youtube Scoring
    for item in filtered_youtube:
        text = (item.get('title', '') + " " + item.get('description', '') + " " + item.get('search_keyword', '')).lower()
        if item.get('transcript'):
            text += " " + item['transcript'].get('full_text', '')[:1000]
        score, matched = _calc_score(item, text, multiplier=1.5)
        item['trend_score'] = score
        item['matched_keywords'] = matched
        item['type'] = 'youtube'
        all_content.append(item)

    # 보안·임팩트 추가 부스트 (CVE, 개인정보유출, 긴급패치 등)
    for item in all_content:
        text = (item.get('title', '') + ' ' + item.get('content', '')).lower()
        if any(kw in text for kw in SECURITY_IMPACT_KEYWORDS):
            item['trend_score'] *= 1.3

    # 신선도 보너스 (최근 6시간 ×1.3, 24시간 ×1.1)
    for item in all_content:
        ts = item.get('timestamp_obj')
        if ts:
            try:
                age = datetime.now() - datetime.fromisoformat(ts)
                if age.total_seconds() < 6 * 3600:
                    item['trend_score'] *= 1.3
                elif age.total_seconds() < 24 * 3600:
                    item['trend_score'] *= 1.1
            except (ValueError, TypeError):
                pass
    
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
    
    blacklisted_count = 0
    for item in all_content:
        cat = categorize_item(item, trends_map)
        if cat is None:
            blacklisted_count += 1
            continue
        final_report["categories"][cat].append(item)

    if blacklisted_count > 0:
        print(f"   🚫 Blacklisted (non-IT): {blacklisted_count} items")

    # 카테고리별 최대 기사 수 제한 (네이버 독점 방지, 이미 trend_score 내림차순 정렬됨)
    MAX_PER_CATEGORY = 20
    for cat in final_report["categories"]:
        articles = final_report["categories"][cat]
        if len(articles) > MAX_PER_CATEGORY:
            final_report["categories"][cat] = articles[:MAX_PER_CATEGORY]

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
