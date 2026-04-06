"""
유튜브 크롤러
- config.yaml 설정 기반으로 채널별/키워드별 영상 수집
- 자막(Transcript) 추출
- JSON 형태로 저장
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import yaml

# YouTube Transcript API (무료, API 키 불필요)
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable
    )
    TRANSCRIPT_AVAILABLE = True
except ImportError:
    TRANSCRIPT_AVAILABLE = False
    print("⚠️ youtube-transcript-api가 설치되지 않았습니다.")
    print("   pip install youtube-transcript-api 로 설치해주세요.")

# Selenium for scraping (YouTube Data API 없이 작동)
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️ selenium이 설치되지 않았습니다.")


def load_config(config_path: str) -> dict:
    """config.yaml 파일 로드"""
    with open(config_path, 'r', encoding='utf-8') as f:
        # YAML 형식이지만 마크다운 헤더 제거
        content = f.read()
        # 마크다운 헤더와 주석 라인 건너뛰기
        lines = content.split('\n')
        yaml_lines = []
        in_yaml = False
        for line in lines:
            if line.strip().startswith('categories:'):
                in_yaml = True
            if in_yaml:
                yaml_lines.append(line)
        
        yaml_content = '\n'.join(yaml_lines)
        return yaml.safe_load(yaml_content)


def setup_driver() -> webdriver.Chrome:
    """Selenium Chrome 드라이버 설정"""
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    # 시스템 chromedriver 우선, 없으면 webdriver_manager 폴백
    import shutil
    chromedriver_path = shutil.which('chromedriver')
    if chromedriver_path:
        service = Service(chromedriver_path)
    else:
        service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver


def get_channel_videos(driver: webdriver.Chrome, channel_id: str, max_videos: int = 10) -> list[dict]:
    """채널의 최신 영상 목록 가져오기"""
    videos = []
    channel_url = f"https://www.youtube.com/channel/{channel_id}/videos"
    
    try:
        driver.get(channel_url)
        import time
        time.sleep(3)  # 페이지 로딩 대기
        
        # 영상 요소 찾기
        video_elements = driver.find_elements(By.CSS_SELECTOR, 'ytd-rich-item-renderer')[:max_videos]
        
        for elem in video_elements:
            try:
                # 제목과 링크
                title_elem = elem.find_element(By.CSS_SELECTOR, '#video-title-link')
                title = title_elem.get_attribute('title') or title_elem.text
                link = title_elem.get_attribute('href')
                
                if not link or 'watch?v=' not in link:
                    continue
                
                video_id = link.split('watch?v=')[1].split('&')[0]
                
                # 조회수 (텍스트에서 추출)
                try:
                    metadata = elem.find_element(By.CSS_SELECTOR, '#metadata-line')
                    meta_text = metadata.text
                    view_count = parse_view_count(meta_text)
                except:
                    view_count = 0
                
                videos.append({
                    'video_id': video_id,
                    'title': title,
                    'link': f"https://www.youtube.com/watch?v={video_id}",
                    'view_count': view_count,
                    'channel_id': channel_id
                })
                
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"채널 크롤링 오류 ({channel_id}): {e}")
    
    return videos


def search_youtube_by_keyword(driver: webdriver.Chrome, keyword: str, max_videos: int = 10) -> list[dict]:
    """키워드로 유튜브 검색하여 영상 목록 가져오기"""
    import time
    from urllib.parse import quote
    
    videos = []
    # 최근 업로드 필터 적용 (sp=EgIIAQ==)
    search_url = f"https://www.youtube.com/results?search_query={quote(keyword)}&sp=EgIIAQ%3D%3D"
    
    try:
        driver.get(search_url)
        time.sleep(3)  # 페이지 로딩 대기
        
        # 검색 결과 영상 요소 찾기
        video_elements = driver.find_elements(By.CSS_SELECTOR, 'ytd-video-renderer')[:max_videos]
        
        for elem in video_elements:
            try:
                # 제목과 링크
                title_elem = elem.find_element(By.CSS_SELECTOR, '#video-title')
                title = title_elem.get_attribute('title') or title_elem.text
                link = title_elem.get_attribute('href')
                
                if not link or 'watch?v=' not in link:
                    continue
                
                video_id = link.split('watch?v=')[1].split('&')[0]
                
                # 채널명
                try:
                    channel_elem = elem.find_element(By.CSS_SELECTOR, '#channel-name a, .ytd-channel-name a')
                    channel_name = channel_elem.text
                except:
                    channel_name = "Unknown"
                
                # 조회수
                try:
                    metadata = elem.find_element(By.CSS_SELECTOR, '#metadata-line')
                    meta_text = metadata.text
                    view_count = parse_view_count(meta_text)
                except:
                    view_count = 0
                
                # 영상 길이 (가능하면)
                try:
                    duration_elem = elem.find_element(By.CSS_SELECTOR, 'ytd-thumbnail-overlay-time-status-renderer span')
                    duration_text = duration_elem.text.strip()
                except:
                    duration_text = ""
                
                videos.append({
                    'video_id': video_id,
                    'title': title,
                    'link': f"https://www.youtube.com/watch?v={video_id}",
                    'view_count': view_count,
                    'channel_name': channel_name,
                    'duration_text': duration_text,
                    'search_keyword': keyword
                })
                
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"키워드 검색 오류 ({keyword}): {e}")
    
    return videos


def parse_view_count(text: str) -> int:
    """조회수 텍스트 파싱 (예: '조회수 15만회' -> 150000)"""
    try:
        # 한글 단위 처리
        if '만' in text:
            match = re.search(r'(\d+(?:\.\d+)?)\s*만', text)
            if match:
                return int(float(match.group(1)) * 10000)
        elif '천' in text:
            match = re.search(r'(\d+(?:\.\d+)?)\s*천', text)
            if match:
                return int(float(match.group(1)) * 1000)
        else:
            match = re.search(r'(\d+(?:,\d+)*)', text)
            if match:
                return int(match.group(1).replace(',', ''))
    except:
        pass
    return 0


def get_video_transcript(video_id: str, language: str = 'ko') -> Optional[dict]:
    """영상의 자막 데이터 추출 (최신 youtube-transcript-api 사용)"""
    if not TRANSCRIPT_AVAILABLE:
        return None
    
    try:
        # 최신 API: 인스턴스 생성 후 fetch 호출
        api = YouTubeTranscriptApi()
        transcript_data = api.fetch(video_id)
        
        # FetchedTranscriptSnippet 객체를 딕셔너리로 변환
        transcript_list = []
        for snippet in transcript_data:
            transcript_list.append({
                'text': snippet.text,
                'start': snippet.start,
                'duration': snippet.duration
            })
        
        # 전체 텍스트 조합
        full_text = ' '.join([entry['text'] for entry in transcript_list])
        
        return {
            'language': language,
            'transcript': transcript_list,
            'full_text': full_text,
            'word_count': len(full_text.split())
        }
        
    except TranscriptsDisabled:
        print(f"      ⚠️ 자막 비활성화")
    except NoTranscriptFound:
        print(f"      ⚠️ 자막 없음")
    except VideoUnavailable:
        print(f"      ⚠️ 영상 접근 불가")
    except Exception as e:
        print(f"      ⚠️ 자막 추출 오류: {e}")
    
    return None


def calculate_quality_score(video: dict, is_whitelist_channel: bool = True) -> float:
    """품질 점수 산정"""
    score = 0.0
    
    # A: 조회수 점수 (30%)
    view_count = video.get('view_count', 0)
    if view_count >= 100000:
        view_score = 100
    elif view_count >= 50000:
        view_score = 80
    elif view_count >= 10000:
        view_score = 60
    else:
        view_score = 40
    score += view_score * 0.3
    
    # C: 채널 신뢰도 (20%)
    channel_score = 100 if is_whitelist_channel else 50
    score += channel_score * 0.2
    
    # D: 최신성 (20%) - 현재는 기본값 사용
    score += 60 * 0.2
    
    # B: 좋아요 비율 (30%) - API 없이는 측정 어려움, 기본값
    score += 50 * 0.3
    
    return round(score, 1)


def filter_videos(videos: list[dict], config: dict) -> list[dict]:
    """설정 기반 영상 필터링"""
    filtered = []
    
    blacklist_title = config.get('blacklist', {}).get('title', [])
    
    for video in videos:
        title = video.get('title', '')
        
        # 블랙리스트 키워드 확인
        is_blacklisted = any(kw.lower() in title.lower() for kw in blacklist_title)
        if is_blacklisted:
            continue
        
        # 최소 조회수 확인
        min_views = config.get('filters', {}).get('min_view_count', 0)
        if video.get('view_count', 0) < min_views:
            # 화이트리스트 채널은 조회수 낮아도 허용
            pass  # 일단 통과
        
        filtered.append(video)
    
    return filtered


def crawl_youtube(
    config_path: str,
    output_path: str,
    videos_per_keyword: int = 5,
    categories: list[str] = None,
    use_keyword_search: bool = True,
    use_channel_crawl: bool = False
) -> dict:
    """
    메인 크롤링 함수
    
    Args:
        config_path: 설정 파일 경로
        output_path: 결과 저장 경로
        videos_per_keyword: 키워드당 최대 영상 수
        categories: 수집할 카테고리 목록 (None이면 전체)
        use_keyword_search: 키워드 검색 사용 여부 (기본: True)
        use_channel_crawl: 채널 크롤링 사용 여부 (기본: False)
    """
    import time
    
    print("=" * 60)
    print("유튜브 크롤러 시작")
    print("=" * 60)
    
    # 설정 로드
    config = load_config(config_path)
    if not config:
        print("❌ 설정 파일을 로드할 수 없습니다.")
        return {}
    
    # 드라이버 설정
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium이 필요합니다.")
        return {}
    
    driver = setup_driver()
    
    result = {
        'crawled_at': datetime.now().isoformat(),
        'total_videos': 0,
        'total_with_transcript': 0,
        'categories': []
    }
    
    # 이미 수집한 video_id 추적 (중복 방지)
    collected_ids = set()
    
    try:
        categories_config = config.get('categories', {})
        target_categories = categories or list(categories_config.keys())
        
        for cat_key in target_categories:
            if cat_key not in categories_config:
                continue
            
            cat_config = categories_config[cat_key]
            cat_name = cat_config.get('name', cat_key)
            
            print(f"\n📁 카테고리: {cat_name}")
            print("-" * 40)
            
            category_data = {
                'category_key': cat_key,
                'category_name': cat_name,
                'videos': []
            }
            
            # ========== 키워드 검색 방식 ==========
            if use_keyword_search:
                keywords_config = cat_config.get('keywords', {})
                exclude_keywords = cat_config.get('exclude_keywords', [])
                
                # 우선순위별 키워드 수집
                all_keywords = []
                for priority in ['priority_1', 'priority_2', 'priority_3']:
                    all_keywords.extend(keywords_config.get(priority, []))
                
                for keyword in all_keywords[:3]:  # 카테고리당 상위 3개 키워드만 사용
                    print(f"\n🔍 키워드 검색: '{keyword}'")
                    
                    videos = search_youtube_by_keyword(driver, keyword, max_videos=videos_per_keyword)
                    print(f"   → {len(videos)}개 영상 발견")
                    
                    # 제외 키워드 필터링
                    for video in videos:
                        title = video.get('title', '')
                        
                        # 중복 체크
                        if video['video_id'] in collected_ids:
                            continue
                        
                        # 제외 키워드 체크
                        is_excluded = any(ex.lower() in title.lower() for ex in exclude_keywords)
                        if is_excluded:
                            print(f"      ⛔ 제외됨: {title[:30]}...")
                            continue
                        
                        collected_ids.add(video['video_id'])
                        video['category'] = cat_key
                        video['quality_score'] = calculate_quality_score(video, is_whitelist_channel=False)
                        
                        # 자막 추출
                        print(f"   📝 자막 추출: {video['title'][:30]}...")
                        transcript_data = get_video_transcript(video['video_id'])
                        
                        if transcript_data:
                            video['has_captions'] = True
                            video['transcript'] = transcript_data
                            result['total_with_transcript'] += 1
                            print(f"      ✅ 자막 {transcript_data['word_count']}단어")
                        else:
                            video['has_captions'] = False
                            video['transcript'] = None
                        
                        video['fetched_at'] = datetime.now().isoformat()
                        category_data['videos'].append(video)
                        result['total_videos'] += 1
                    
                    time.sleep(1)  # 속도 제한
            
            # ========== 채널 기반 크롤링 (선택) ==========
            if use_channel_crawl:
                channels = cat_config.get('channels', [])
                for channel in channels:
                    channel_id = channel.get('id')
                    channel_name = channel.get('name')
                    
                    print(f"\n📺 채널: {channel_name}")
                    
                    videos = get_channel_videos(driver, channel_id, max_videos=videos_per_keyword)
                    print(f"   → {len(videos)}개 영상 발견")
                    
                    for video in videos:
                        if video['video_id'] in collected_ids:
                            continue
                        
                        collected_ids.add(video['video_id'])
                        video['channel_name'] = channel_name
                        video['category'] = cat_key
                        video['quality_score'] = calculate_quality_score(video)
                        
                        print(f"   📝 자막 추출: {video['title'][:30]}...")
                        transcript_data = get_video_transcript(video['video_id'])
                        
                        if transcript_data:
                            video['has_captions'] = True
                            video['transcript'] = transcript_data
                            result['total_with_transcript'] += 1
                            print(f"      ✅ 자막 {transcript_data['word_count']}단어")
                        else:
                            video['has_captions'] = False
                            video['transcript'] = None
                        
                        video['fetched_at'] = datetime.now().isoformat()
                        category_data['videos'].append(video)
                        result['total_videos'] += 1
                    
                    time.sleep(1)
            
            result['categories'].append(category_data)
    
    finally:
        driver.quit()
    
    # JSON 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"크롤링 완료!")
    print(f"  - 총 영상: {result['total_videos']}개")
    print(f"  - 자막 있는 영상: {result['total_with_transcript']}개")
    print(f"  - 저장 위치: {output_path}")
    print("=" * 60)
    
    return result


if __name__ == '__main__':
    # 경로 설정
    base_dir = Path(__file__).parent
    config_path = base_dir / 'config.yaml'
    output_path = base_dir / 'youtube_data.json'
    
    # 크롤링 실행 (키워드 검색 방식)
    crawl_youtube(
        config_path=str(config_path),
        output_path=str(output_path),
        videos_per_keyword=3,
        categories=['startup_tech', 'trend'],  # 테스트: 스타트업/테크비즈, 트렌드
        use_keyword_search=True,          # 키워드 검색 사용
        use_channel_crawl=False           # 채널 크롤링은 비활성화
    )
