# 유튜브 크롤러 (YouTube Crawler)

네이버 뉴스와 함께 "오늘 5분" 서비스에서 사용할 유튜브 콘텐츠를 수집하는 모듈입니다.

## 📁 파일 구조

```
Crawling - Youtube/
├── README.md              # 본 문서
├── config.yaml            # 채널 및 키워드 설정
├── youtube_crawler.py     # 메인 크롤러 스크립트
└── youtube_data.json      # 크롤링 결과 (자동 생성)
```

## 🚀 사용 방법

### 1. 의존성 설치

```bash
pip install youtube-transcript-api pyyaml selenium webdriver-manager
```

### 2. 크롤러 실행

```bash
python youtube_crawler.py
```

### 3. 결과 확인

`youtube_data.json` 파일에 수집된 영상 정보가 저장됩니다.

## ⚙️ 설정 (config.yaml)

`config.yaml` 파일에서 다음을 설정할 수 있습니다:

- **카테고리별 채널 목록**: 트렌드, 경제, 사회, 재테크
- **검색 키워드**: 우선순위별 키워드 리스트
- **필터링 조건**: 영상 길이, 조회수, 게시 기간 등
- **블랙리스트 키워드**: 제외할 키워드 목록

## 📊 출력 데이터 스키마

```json
{
  "crawled_at": "2026-01-30T22:00:00",
  "total_videos": 6,
  "total_with_transcript": 3,
  "categories": [
    {
      "category_key": "economy",
      "category_name": "경제",
      "videos": [
        {
          "video_id": "xxx",
          "title": "영상 제목",
          "link": "https://www.youtube.com/watch?v=xxx",
          "view_count": 150000,
          "channel_name": "슈카월드",
          "category": "economy",
          "quality_score": 85.0,
          "has_captions": true,
          "transcript": {
            "language": "ko",
            "full_text": "자막 전체 텍스트...",
            "word_count": 1520
          }
        }
      ]
    }
  ]
}
```

## ⚠️ 주의사항

1. **자막 가용성**: 모든 유튜브 영상에 자막이 있는 것은 아닙니다. 자막이 없는 영상은 `has_captions: false`로 표시됩니다.
2. **크롤링 속도**: 과도한 요청을 방지하기 위해 각 채널 간 1초 대기 시간이 있습니다.
3. **채널 구조 변경**: 유튜브 UI가 변경되면 크롤러가 영상을 제대로 감지하지 못할 수 있습니다.

## 🔗 관련 문서

- [유튜브 크롤링 기획서](/Document/유튜브_크롤링_기획서.md)
- [PRD v1.0](/Document/PRD.md)
