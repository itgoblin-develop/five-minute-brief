"""
개발 구현 목표
---------------
- **데이터랩 + 뉴스 검색 API 조합의 1차 버전**을 만들어서,
  - 데이터랩에서 경제 대표 키워드 5개 중에서 \"요즘 더 많이 검색되는 키워드\" 상위 2개를 고르고
  - 그 2개 키워드로 네이버 뉴스에서 최신 뉴스를 최대 10개씩 가져와서
  - 콘솔에서 한눈에 볼 수 있게 한다.

무엇을 했는지
---------------
1. 데이터랩 통합검색어트렌드 API에 경제 키워드 5개를 각각 그룹으로 보내서
   - \"어제~오늘(1일)\" 기준으로 각 키워드의 트렌드 점수(비율)를 가져온다.
   - 이 5개 키워드 중 **어제 날짜의 비율(ratio)이 높은 상위 2개**를 고른다.
2. 고른 2개 키워드로 뉴스 검색 API를 호출해서
   - 최근 1일(24시간) 기준으로
   - 각 키워드당 최대 10개 뉴스를 최신순으로 가져온다.
3. 콘솔에
   - \"선정된 트렌드 키워드 2개\"와
   - 각 키워드별 대표 뉴스 목록(제목/발행시간/링크)을 출력한다.

어떻게 했는지
---------------
- `.env`에서 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 읽어 인증 헤더 구성.
- **데이터랩 호출**
  - URL: `https://openapi.naver.com/v1/datalab/search`
  - `timeUnit="date"`, `startDate=어제`, `endDate=오늘`
  - `keywordGroups`:
    - `경제`, `주식`, `부동산`, `금리`, `환율` 5개 키워드를 각각 하나의 그룹으로 보냄
  - 응답의 `results` 리스트에서
    - 각 그룹의 `data` 마지막 항목(어제 날짜)의 `ratio` 값을 읽어와서
    - ratio가 높은 상위 2개 키워드를 선정.
- **뉴스 검색 호출**
  - URL: `https://openapi.naver.com/v1/search/news.json`
  - 파라미터:
    - `query`: 선정된 키워드(예: \"부동산\", \"금리\")
    - `display`: 최대 10
    - `sort`: `date` (최신순)
  - `pubDate` 기준으로 최근 24시간(오늘 기준) 안에 있는 뉴스만 남김.

테스트 방법
---------------
1. 터미널 열기
   - `Command + Space` → `Terminal` 검색 → 실행

2. 프로젝트 폴더로 이동
   - `cd /Users/nahyojin/Documents/GitHub/five-minute-brief`

3. (처음 한 번만) 라이브러리 설치
   - `pip3 install -r requirements.txt`

4. 스크립트 실행
   - `python3 step2_datalab_to_news.py`

5. 콘솔에서 확인할 것
   - \"[선정된 경제 트렌드 키워드 TOP 2]\" 아래에 키워드 2개가 출력되는지
   - 각 키워드별로 뉴스가 0~10개 정도 나오는지
   - 뉴스 제목들을 봤을 때 \"아침에 보여줄만한 경제 트렌드\" 느낌이 나는지
"""

import os
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


def fetch_datalab_economic_trends(client_id: str, client_secret: str) -> List[Tuple[str, float]]:
    """
    데이터랩에서 경제 대표 키워드 5개에 대한 1일치 트렌드 비율을 가져와
    (키워드, ratio) 리스트를 반환한다.
    """
    url = "https://openapi.naver.com/v1/datalab/search"
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
        "Content-Type": "application/json",
    }

    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=1)

    # 경제 대표 키워드 5개 (TREND_POLICY.md 62-71 기준)
    econ_keywords = ["경제", "주식", "부동산", "금리", "환율"]

    keyword_groups = [
        {"groupName": kw, "keywords": [kw]} for kw in econ_keywords
    ]

    body: Dict = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate": end_date.strftime("%Y-%m-%d"),
        "timeUnit": "date",
        "keywordGroups": keyword_groups,
    }

    resp = requests.post(url, headers=headers, json=body, timeout=10)
    if not resp.ok:
        raise RuntimeError(f"데이터랩 API 오류 (status={resp.status_code}): {resp.text[:200]}")

    data = resp.json()
    results = data.get("results", [])

    ratios: List[Tuple[str, float]] = []
    for group in results:
        title = group.get("title")  # groupName과 동일하게 들어옴
        datapoints = group.get("data", [])
        if not datapoints:
            continue
        # 마지막 데이터 포인트 (endDate에 해당하는 날)
        last_point = datapoints[-1]
        ratio = float(last_point.get("ratio", 0.0))
        ratios.append((title, ratio))

    return ratios


def search_news_for_keyword(
    client_id: str,
    client_secret: str,
    keyword: str,
    hours: int = 24,
    max_news: int = 10,
) -> List[Dict]:
    """
    뉴스 검색 API로 특정 키워드에 대한 최근 hours 시간 동안의 뉴스를 최대 max_news개까지 가져온다.
    """
    url = "https://openapi.naver.com/v1/search/news.json"
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    }
    params = {
        "query": keyword,
        "display": max_news,
        "sort": "sim",  # 정확도순 (관련도순)
    }

    resp = requests.get(url, headers=headers, params=params, timeout=10)
    if not resp.ok:
        raise RuntimeError(f"뉴스 검색 API 오류 (status={resp.status_code}): {resp.text[:200]}")

    data = resp.json()
    items: List[Dict] = data.get("items", [])

    # pubDate 기준으로 최근 hours 시간만 남기기
    now = datetime.now()
    start_time = now - timedelta(hours=hours)

    filtered: List[Dict] = []
    for item in items:
        try:
            pub_date_str = item.get("pubDate", "")
            base = pub_date_str.split(" +")[0]
            pub_date = datetime.strptime(base, "%a, %d %b %Y %H:%M:%S")
        except Exception:
            continue
        if start_time <= pub_date <= now:
            filtered.append(item)

    return filtered


def main() -> None:
    client_id, client_secret = load_credentials()

    print("=" * 60)
    print("🧪 2단계 샘플: 데이터랩(경제) → 뉴스 검색 연동")
    print("=" * 60)

    # 1) 데이터랩에서 경제 키워드 5개의 트렌드 비율 가져오기
    print("\n[1] 데이터랩 - 경제 대표 키워드 트렌드 조회 (최근 1일, timeUnit=date)")
    try:
        ratios = fetch_datalab_economic_trends(client_id, client_secret)
    except Exception as e:
        print("❌ 데이터랩 호출 중 오류:", e)
        return

    if not ratios:
        print("⚠️ 데이터랩에서 가져온 데이터가 없습니다.")
        return

    print("   키워드별 ratio (어제 기준):")
    for kw, r in ratios:
        print(f"   - {kw}: {r}")

    # ratio 기준 내림차순 정렬 후 상위 2개 선택
    top2 = sorted(ratios, key=lambda x: x[1], reverse=True)[:2]

    print("\n[선정된 경제 트렌드 키워드 TOP 2]")
    for kw, r in top2:
        print(f"   - {kw} (ratio={r})")

    # 2) 선정된 키워드로 뉴스 검색 (최근 24시간, 최대 10개)
    print("\n[2] 뉴스 검색 - 선정된 키워드로 최근 24시간 뉴스 조회 (키워드당 최대 10개)")

    for kw, r in top2:
        print("\n" + "-" * 60)
        print(f"🔎 키워드: {kw}")
        try:
            news_list = search_news_for_keyword(
                client_id,
                client_secret,
                keyword=kw,
                hours=24,
                max_news=10,
            )
        except Exception as e:
            print("❌ 뉴스 검색 중 오류:", e)
            continue

        print(f"   수집된 뉴스 개수: {len(news_list)}")
        if not news_list:
            print("   ⚠️ 최근 24시간 내 뉴스가 없습니다.")
            continue

        for i, item in enumerate(news_list, 1):
            title = item.get("title", "").replace("<b>", "").replace("</b>", "")
            pub_date = item.get("pubDate", "")
            link = item.get("link", "")
            print(f"   {i}. {title}")
            print(f"      발행: {pub_date}")
            print(f"      링크: {link}")


if __name__ == "__main__":
    main()

