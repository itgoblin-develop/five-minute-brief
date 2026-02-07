"""
개발 구현 목표
---------------
- 네이버 **뉴스 검색 API**와 **데이터랩 API**가 현재 발급된 키로 정상 호출되는지
  아주 간단하게 한 번씩만 확인하는 스크립트.

무엇을 했는지
---------------
- `.env`에 저장된 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 읽어서:
  1) 뉴스 검색 API에 `query=경제`로 3개만 요청
  2) 데이터랩 통합검색어트렌드 API에 '경제/주식' 키워드 그룹으로 어제~오늘 데이터 1번 요청
- 각 요청의 **HTTP 상태 코드**와 **간단한 결과 요약**을 출력.

어떻게 했는지
---------------
- Python 표준 라이브러리 + `requests`, `python-dotenv`만 사용.
- 뉴스 검색:
  - `GET https://openapi.naver.com/v1/search/news.json`
  - 파라미터: `query=경제`, `display=3`, `sort=date`
- 데이터랩:
  - `POST https://openapi.naver.com/v1/datalab/search`
  - 바디: 어제~오늘, `timeUnit=date`, 키워드 그룹 1개만 포함

테스트 방법
---------------
1. 프로젝트 폴더로 이동:
   - `cd /Users/nahyojin/Documents/GitHub/five-minute-brief`
2. (처음 한 번만) 라이브러리 설치:
   - `pip3 install -r requirements.txt`
3. 스크립트 실행:
   - `python3 check_naver_apis.py`
4. 출력에서 아래를 확인:
   - 뉴스 검색 API: `status: 200`, `returned items: 3` 이상
   - 데이터랩 API: `status: 200`, `results groups: 1` 이상
"""

import os
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv


def main() -> None:
    # 1) 환경 변수 로드
    load_dotenv()
    client_id = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("❌ NAVER_CLIENT_ID 혹은 NAVER_CLIENT_SECRET 이 설정되지 않았습니다 (.env 확인).")
        return

    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    }

    # 2) 뉴스 검색 API 체크
    print("=== 1) 네이버 뉴스 검색 API 체크 ===")
    news_url = "https://openapi.naver.com/v1/search/news.json"
    news_params = {
        "query": "경제",
        "display": 3,
        "sort": "date",
    }

    try:
        news_resp = requests.get(news_url, headers=headers, params=news_params, timeout=10)
    except Exception as e:  # 네트워크/기타 오류
        print("❌ 뉴스 검색 요청 중 예외 발생:", repr(e))
        return

    print("status:", news_resp.status_code)
    if news_resp.ok:
        data = news_resp.json()
        items = data.get("items", [])
        print("✅ 뉴스 검색 API 호출 성공")
        print("   반환된 뉴스 개수:", len(items))
        if items:
            first_title = items[0].get("title", "").replace("<b>", "").replace("</b>", "")
            print("   예시 제목:", first_title)
    else:
        print("❌ 뉴스 검색 API 오류 응답")
        print("   body:", news_resp.text[:200])

    print("\n=== 2) 네이버 데이터랩 통합검색어트렌드 API 체크 ===")

    datalab_url = "https://openapi.naver.com/v1/datalab/search"
    end = datetime.now().date()
    start = end - timedelta(days=1)

    datalab_body = {
        "startDate": start.strftime("%Y-%m-%d"),
        "endDate": end.strftime("%Y-%m-%d"),
        "timeUnit": "date",
        "keywordGroups": [
            {
                "groupName": "경제",
                "keywords": ["경제", "주식"],
            }
        ],
    }

    datalab_headers = {
        **headers,
        "Content-Type": "application/json",
    }

    try:
        datalab_resp = requests.post(
            datalab_url,
            headers=datalab_headers,
            json=datalab_body,
            timeout=10,
        )
    except Exception as e:
        print("❌ 데이터랩 요청 중 예외 발생:", repr(e))
        return

    print("status:", datalab_resp.status_code)
    if datalab_resp.ok:
        data2 = datalab_resp.json()
        results = data2.get("results", [])
        print("✅ 데이터랩 API 호출 성공")
        print("   결과 그룹 수:", len(results))
        if results:
            first_group = results[0]
            print("   그룹명:", first_group.get("title"))
            print("   데이터 포인트 수:", len(first_group.get("data", [])))
    else:
        print("❌ 데이터랩 API 오류 응답")
        print("   body:", datalab_resp.text[:200])


if __name__ == "__main__":
    main()

