"""
유튜브 크롤러 v2 (YouTube Data API 사용)
- 공식 API로 정확한 영상 검색 및 필터링
- 자막 추출은 youtube-transcript-api 사용
- 한국어 자막(CC) 유무 확인 가능
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import yaml

# 환경변수 로드 (프로젝트 루트의 .env 사용)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    print("⚠️ python-dotenv 설치 필요: pip install python-dotenv")

# YouTube Data API
try:
    from googleapiclient.discovery import build
    YOUTUBE_API_AVAILABLE = True
except ImportError:
    YOUTUBE_API_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요")

# YouTube Transcript API
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
    print("⚠️ youtube-transcript-api 설치 필요")


class YouTubeCrawler:
    """YouTube Data API 기반 크롤러"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('YOUTUBE_API_KEY')
        if not self.api_key or self.api_key == '여기에_API_키_입력':
            raise ValueError("YouTube API 키가 필요합니다. .env 파일에 YOUTUBE_API_KEY를 설정하세요.")
        
        self.youtube = build('youtube', 'v3', developerKey=self.api_key)
        self.transcript_api = YouTubeTranscriptApi() if TRANSCRIPT_AVAILABLE else None
    
    def search_videos(
        self,
        keyword: str,
        max_results: int = 10,
        published_after_hours: int = 48,
        video_duration: str = 'medium',  # short(<4min), medium(4-20min), long(>20min)
        caption: str = 'closedCaption',  # any, closedCaption, none
        region_code: str = 'KR',
        relevance_language: str = 'ko'
    ) -> list[dict]:
        """
        키워드로 영상 검색
        
        Args:
            keyword: 검색 키워드
            max_results: 최대 결과 수
            published_after_hours: 최근 N시간 이내 영상만
            video_duration: 영상 길이 (short/medium/long)
            caption: 자막 유무 (closedCaption = 자막 있는 영상만)
            region_code: 지역 코드 (KR = 한국)
            relevance_language: 관련 언어
        """
        # 시간 필터
        published_after = (datetime.utcnow() - timedelta(hours=published_after_hours)).isoformat() + 'Z'
        
        try:
            search_response = self.youtube.search().list(
                q=keyword,
                part='snippet',
                type='video',
                maxResults=max_results,
                order='relevance',
                publishedAfter=published_after,
                videoDuration=video_duration,
                videoCaption=caption,
                regionCode=region_code,
                relevanceLanguage=relevance_language
            ).execute()
            
            video_ids = [item['id']['videoId'] for item in search_response.get('items', [])]
            
            if not video_ids:
                return []
            
            # 상세 정보 가져오기
            videos_response = self.youtube.videos().list(
                part='snippet,contentDetails,statistics',
                id=','.join(video_ids)
            ).execute()
            
            videos = []
            for item in videos_response.get('items', []):
                video = {
                    'video_id': item['id'],
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'],  # 전체 설명 수집
                    'channel_name': item['snippet']['channelTitle'],
                    'channel_id': item['snippet']['channelId'],
                    'published_at': item['snippet']['publishedAt'],
                    'duration': item['contentDetails']['duration'],
                    'view_count': int(item['statistics'].get('viewCount', 0)),
                    'like_count': int(item['statistics'].get('likeCount', 0)),
                    'comment_count': int(item['statistics'].get('commentCount', 0)),
                    'link': f"https://www.youtube.com/watch?v={item['id']}",
                    'search_keyword': keyword
                }
                videos.append(video)
            
            return videos
            
        except Exception as e:
            print(f"❌ API 검색 오류: {e}")
            return []
    
    def get_transcript(self, video_id: str, korean_only: bool = True) -> Optional[dict]:
        """
        영상 자막 추출
        
        Args:
            video_id: 유튜브 영상 ID
            korean_only: True면 한국어 자막만 추출
        """
        if not self.transcript_api:
            return None
        
        try:
            # 자막 목록 조회
            transcript_list_obj = self.transcript_api.list(video_id)
            
            # 사용 가능한 자막 언어 확인
            available_transcripts = list(transcript_list_obj)
            
            # 한국어 자막 찾기
            korean_transcript = None
            for t in available_transcripts:
                lang_code = t.language_code.lower()
                if lang_code in ['ko', 'ko-kr']:
                    korean_transcript = t
                    break
            
            if korean_only and not korean_transcript:
                print(f"      ⚠️ 한국어 자막 없음")
                return None
            
            # 자막 선택 (한국어 우선, 없으면 첫 번째)
            selected = korean_transcript if korean_transcript else available_transcripts[0]
            transcript_data = selected.fetch()
            
            # 객체를 딕셔너리로 변환
            transcript_items = []
            for snippet in transcript_data:
                transcript_items.append({
                    'text': snippet.text,
                    'start': snippet.start,
                    'duration': snippet.duration
                })
            
            full_text = ' '.join([t['text'] for t in transcript_items])
            
            return {
                'language': selected.language_code,
                'transcript': transcript_items,
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
            print(f"      ⚠️ 자막 오류: {e}")
        
        return None
    
    def calculate_quality_score(self, video: dict) -> float:
        """품질 점수 계산"""
        score = 0.0
        
        # 조회수 (30%)
        views = video.get('view_count', 0)
        if views >= 100000:
            score += 30
        elif views >= 50000:
            score += 24
        elif views >= 10000:
            score += 18
        else:
            score += 12
        
        # 좋아요 비율 (30%)
        likes = video.get('like_count', 0)
        if views > 0:
            like_ratio = likes / views
            score += min(30, like_ratio * 1000)
        
        # 최신성 (20%)
        try:
            published = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
            hours_ago = (datetime.now(published.tzinfo) - published).total_seconds() / 3600
            if hours_ago <= 12:
                score += 20
            elif hours_ago <= 24:
                score += 16
            elif hours_ago <= 48:
                score += 12
        except:
            score += 10
        
        # 채널 (20%) - 기본 점수
        score += 15
        
        return round(score, 1)


def load_config(config_path: str) -> dict:
    """설정 파일 로드"""
    with open(config_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
        yaml_lines = []
        in_yaml = False
        for line in lines:
            if line.strip().startswith('categories:'):
                in_yaml = True
            if in_yaml:
                yaml_lines.append(line)
        return yaml.safe_load('\n'.join(yaml_lines))


def crawl_with_api(
    config_path: str,
    output_path: str,
    videos_per_keyword: int = 5,
    categories: list[str] = None
) -> dict:
    """API 기반 크롤링 실행"""
    
    print("=" * 60)
    print("🚀 YouTube API 크롤러 v2 시작")
    print("=" * 60)
    
    # 크롤러 초기화
    try:
        crawler = YouTubeCrawler()
    except ValueError as e:
        print(f"❌ {e}")
        return {}
    
    # 설정 로드
    config = load_config(config_path)
    if not config:
        print("❌ 설정 파일 로드 실패")
        return {}
    
    result = {
        'crawled_at': datetime.now().isoformat(),
        'api_version': 'YouTube Data API v3',
        'total_videos': 0,
        'total_with_transcript': 0,
        'categories': []
    }
    
    collected_ids = set()
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
        
        # 키워드 수집
        keywords_config = cat_config.get('keywords', {})
        exclude_keywords = cat_config.get('exclude_keywords', [])
        
        all_keywords = []
        for priority in ['priority_1', 'priority_2']:
            all_keywords.extend(keywords_config.get(priority, []))
        
        for keyword in all_keywords[:3]:
            print(f"\n🔍 키워드: '{keyword}' (자막 있는 영상만)")
            
            # API 검색 (자막 있는 영상만)
            videos = crawler.search_videos(
                keyword=keyword,
                max_results=videos_per_keyword,
                published_after_hours=72,  # 최근 3일
                video_duration='medium',   # 4~20분
                caption='closedCaption'    # 자막 있는 영상만!
            )
            
            print(f"   → {len(videos)}개 영상 발견")
            
            for video in videos:
                # 중복 체크
                if video['video_id'] in collected_ids:
                    continue
                
                # 제외 키워드 체크
                title = video.get('title', '')
                is_excluded = any(ex.lower() in title.lower() for ex in exclude_keywords)
                if is_excluded:
                    print(f"      ⛔ 제외: {title[:40]}...")
                    continue
                
                collected_ids.add(video['video_id'])
                video['category'] = cat_key
                video['quality_score'] = crawler.calculate_quality_score(video)
                
                # 자막 추출
                print(f"   📝 자막: {title[:40]}...")
                transcript_data = crawler.get_transcript(video['video_id'])
                
                if transcript_data:
                    video['has_captions'] = True
                    video['transcript'] = transcript_data
                    result['total_with_transcript'] += 1
                    print(f"      ✅ {transcript_data['word_count']}단어 추출")
                else:
                    video['has_captions'] = False
                    video['transcript'] = None
                
                video['fetched_at'] = datetime.now().isoformat()
                category_data['videos'].append(video)
                result['total_videos'] += 1
        
        result['categories'].append(category_data)
    
    # JSON 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"✅ 크롤링 완료!")
    print(f"   - 총 영상: {result['total_videos']}개")
    print(f"   - 자막 추출 성공: {result['total_with_transcript']}개")
    print(f"   - 저장: {output_path}")
    print("=" * 60)
    
    return result


if __name__ == '__main__':
    base_dir = Path(__file__).parent
    
    # .env 파일 로드
    env_path = base_dir / '.env'
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)
    
    crawl_with_api(
        config_path=str(base_dir / 'config.yaml'),
        output_path=str(base_dir / 'youtube_data.json'),
        videos_per_keyword=5,
        categories=['economy', 'trend']
    )
