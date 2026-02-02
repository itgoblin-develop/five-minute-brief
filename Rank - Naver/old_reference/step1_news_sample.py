"""
개발 구현 목표
---------------
- **1단계(뉴스 검색만 사용하는 버전)**를 아주 간단하게 구현해서,
  - 최근 N시간(기본 1시간) 동안
  - 소수의 키워드(기본 5개: 경제/주식/IT/부동산/사회)로
  - 얼마나 의미 있는 뉴스와 키워드가 나오는지 \"샘플\"로 검증할 수 있게 하는 것.

무엇을 했는지
---------------
- 뉴스 검색 API만 사용해서:
  1) 키워드 리스트로 최신 뉴스(각 키워드당 최대 10개)를 가져오고
  2) 지정한 시간 범위(예: 최근 1시간) 안에 들어오는 뉴스만 필터링하고
  3) 제목/요약에서 간단한 규칙으로 키워드를 추출해
  4) **키워드 TOP 10 + 대표 뉴스 몇 개**를 콘솔에 출력.

어떻게 했는지
---------------
- `.env`에서 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 읽어서 인증 헤더 구성.
- 뉴스 검색 API:
  - `GET https://openapi.naver.com/v1/search/news.json`
  - 파라미터:
    - `query`: 키워드 (예: \"경제\")
    - `display`: 최대 10 (테스트용, 너무 많이 안 가져오도록)
    - `sort`: `date` (최신순)
- 시간 필터링:
  - `pubDate`를 파싱해서 `now - hours` ~ `now` 범위에 들어가는 뉴스만 사용.
- 키워드 추출:
  - HTML 태그 제거 후 띄어쓰기 기준으로 나누고
  - 한글 2글자 이상 & 불용어에 없는 단어만 카운트
  - (정교한 NLP가 아니라, 오늘 테스트용으로 가볍게 확인하는 수준)

테스트 방법
---------------
1. 프로젝트 폴더로 이동
   - `cd /Users/nahyojin/Documents/GitHub/five-minute-brief`

2. (처음 한 번만) 라이브러리 설치
   - `pip3 install -r requirements.txt`

3. 기본 설정으로 테스트 (최근 1시간, 기본 키워드 5개)
   - `python3 step1_news_sample.py`

4. 다른 시간/키워드로 테스트하고 싶을 때
   - 파일 맨 아래의 `if __name__ == "__main__":` 부분에서:
     - `hours=3` 으로 바꾸면 최근 3시간
     - `test_keywords = [...]` 리스트를 수정해서 직접 키워드 넣기

5. 출력에서 확인할 것
   - \"총 수집 뉴스 개수\"가 어느 정도 나오는지 (예: 30~100개 정도)
   - \"TOP 키워드\" 목록에 의미 있는 단어들이 나오는지
   - 대표 뉴스 제목을 훑어보면서 \"아침에 보여주면 좋겠다\" 싶은지 감으로 확인
"""

import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import requests
from dotenv import load_dotenv


def load_credentials() -> Tuple[str, str]:
    """환경 변수에서 네이버 API 인증 정보를 읽어온다."""
    load_dotenv()
    client_id = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 이 설정되지 않았습니다 (.env 확인).")
    return client_id, client_secret


def search_news(
    client_id: str,
    client_secret: str,
    keyword: str,
    display: int = 10,
) -> List[Dict]:
    """뉴스 검색 API로 특정 키워드의 최신 뉴스를 가져온다."""
    url = "https://openapi.naver.com/v1/search/news.json"
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    }
    params = {
        "query": keyword,
        "display": min(display, 10),
        "sort": "date",
    }
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    if not resp.ok:
        raise RuntimeError(f"뉴스 검색 API 오류 (status={resp.status_code}): {resp.text[:200]}")
    data = resp.json()
    return data.get("items", [])


def filter_news_by_time(
    news_items: List[Dict],
    start_time: datetime,
    end_time: datetime,
) -> List[Dict]:
    """뉴스 리스트를 pubDate 기준으로 시간 범위 안에 있는 것만 남긴다."""
    filtered: List[Dict] = []
    for item in news_items:
        try:
            pub_date_str = item.get("pubDate", "")
            # 예: "Mon, 26 Jan 2026 05:30:00 +0900"
            base = pub_date_str.split(" +")[0]
            pub_date = datetime.strptime(base, "%a, %d %b %Y %H:%M:%S")
        except Exception:
            continue
        if start_time <= pub_date <= end_time:
            filtered.append(item)
    return filtered


def extract_keywords_from_text(text: str) -> List[str]:
    """아주 간단한 규칙으로 텍스트에서 키워드를 추출한다."""
    # HTML 태그 제거
    text = re.sub(r"<[^>]+>", "", text)

    # 불용어 (테스트용, 너무 일반적인 단어들)
    stopwords = {
        "오늘",
        "내일",
        "어제",
        "의",
        "이",
        "가",
        "을",
        "를",
        "은",
        "는",
        "에",
        "에서",
        "로",
        "으로",
        "와",
        "과",
        "도",
        "만",
        "까지",
        "부터",
        "보다",
        "같이",
        "그리고",
        "하지만",
        "최근",
        "현재",
        "있다",
        "없다",
        "대한",
        "관련",
        "통해",
        "국내",
        "개최",
    }

    words = text.split()
    keywords: List[str] = []

    for w in words:
        # 한글 2글자 이상 + 불용어 제외
        if re.match(r"^[가-힣]{2,}$", w) and w not in stopwords:
            keywords.append(w)
        # 영문 대문자 3글자 이상 (예: ETF, GDP 등)
        elif re.match(r"^[A-Z]{3,}$", w):
            keywords.append(w)

    return keywords


def analyze_keywords(news_list: List[Dict]) -> List[Dict]:
    """뉴스 리스트에서 키워드 빈도 분석 후 상위 키워드와 대표 뉴스를 반환한다."""
    freq: Counter = Counter()
    mapping: defaultdict = defaultdict(list)

    for item in news_list:
        title = item.get("title", "")
        desc = item.get("description", "")

        title_kws = extract_keywords_from_text(title)
        desc_kws = extract_keywords_from_text(desc)

        # 제목은 가중치 3
        for k in title_kws:
            freq[k] += 3
            if item not in mapping[k]:
                mapping[k].append(item)

        # 요약은 가중치 1
        for k in desc_kws:
            freq[k] += 1
            if item not in mapping[k]:
                mapping[k].append(item)

    # 상위 20개 정도만 보기
    top_raw = freq.most_common(20)

    results: List[Dict] = []
    for keyword, count in top_raw:
        related = mapping[keyword]
        # 너무 약한 키워드는 거르기 (빈도 5 미만 & 관련 뉴스 1개 이런 경우)
        if count < 5 or len(related) < 2:
            continue

        # 최신 뉴스 순으로 정렬해서 상위 3개만
        sorted_news = sorted(
            related,
            key=lambda x: x.get("pubDate", ""),
            reverse=True,
        )[:3]

        results.append(
            {
                "keyword": keyword,
                "frequency": count,
                "news_count": len(related),
                "top_news": sorted_news,
            }
        )

    return results


def run_sample(hours: int = 1, test_keywords: List[str] | None = None) -> None:
    """1단계 샘플 실행 함수."""
    if test_keywords is None:
        test_keywords = ["경제", "주식", "IT", "부동산", "사회"]

    client_id, client_secret = load_credentials()

    now = datetime.now()
    start_time = now - timedelta(hours=hours)

    print("=" * 60)
    print("🧪 1단계 샘플 테스트 (뉴스 검색 API만 사용)")
    print("=" * 60)
    print(f"시간 범위: {start_time.strftime('%Y-%m-%d %H:%M')} ~ {now.strftime('%Y-%m-%d %H:%M')}")
    print(f"테스트 키워드: {', '.join(test_keywords)}")
    print(f"각 키워드당 최대 10개 뉴스, 총 API 호출 예상: {len(test_keywords)}회")
    print("-" * 60)

    all_news: List[Dict] = []
    seen_links: set[str] = set()

    for kw in test_keywords:
        print(f"검색 중: '{kw}'...", end=" ")
        try:
            items = search_news(client_id, client_secret, kw, display=10)
        except Exception as e:
            print(f"❌ 오류: {e}")
            continue

        filtered = filter_news_by_time(items, start_time, now)
        for n in filtered:
            link = n.get("link", "")
            if link and link not in seen_links:
                seen_links.add(link)
                all_news.append(n)

        print(f"✅ {len(filtered)}개 (전체: {len(all_news)}개)")

    print("\n" + "=" * 60)
    print(f"✅ 총 {len(all_news)}개의 뉴스 수집 완료")
    print("=" * 60)

    if not all_news:
        print("⚠️  수집된 뉴스가 없습니다. 시간 범위를 늘리거나 키워드를 바꿔보세요.")
        return

    # 키워드 분석
    print("\n🔍 키워드 분석 중...")
    trending = analyze_keywords(all_news)

    print("\n" + "=" * 60)
    print("🔥 1단계 샘플 - 주요 키워드 TOP 10 (뉴스 검색 기반)")
    print("=" * 60)

    if not trending:
        print("⚠️  의미 있는 키워드를 찾지 못했습니다.")
        print("💡 키워드를 더 좁히거나, 시간 범위를 늘려보세요.")
        return

    for i, item in enumerate(trending[:10], 1):
        print(f"\n{i}. 키워드: {item['keyword']}")
        print(f"   빈도수: {item['frequency']}")
        print(f"   관련 뉴스: {item['news_count']}개")
        print("   대표 뉴스:")
        for j, n in enumerate(item["top_news"], 1):
            title = n.get("title", "").replace("<b>", "").replace("</b>", "")
            pub_date = n.get("pubDate", "")
            print(f"     {j}. {title}")
            print(f"        발행: {pub_date}")


if __name__ == "__main__":
    # 기본: 최근 1시간, 기본 키워드 5개
    run_sample(hours=1)

