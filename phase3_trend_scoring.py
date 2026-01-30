"""
개발 구현 목표
---------------
- **Phase 3 (트렌드 분석 및 랭킹)의 최소 실행 버전**을 만들어서,
  - 데이터랩 + 뉴스 검색으로 모은 경제 뉴스들을 대상으로
  - 간단한 규칙 기반으로 키워드를 추출하고
  - `TREND_POLICY.md` 3-2에 나온 스코어 공식을 참고해
  - \"어떤 키워드가 오늘 경제 분야에서 가장 센 이슈인지\"를 콘솔에서 확인할 수 있게 한다.

무엇을 했는지
---------------
1. (데모용) 경제 대표 키워드 5개 중에서 데이터랩을 이용해 상위 2개 키워드를 고른다.
2. 이 2개 키워드로 뉴스 검색 API를 호출해, 최근 24시간 뉴스들을 모은다.
3. 수집된 뉴스의 제목/요약에서 간단한 규칙으로 키워드를 추출한다.
4. 각 키워드에 대해
   - 빈도수
   - 관련 뉴스 수
   - 출처 다양성(다른 언론사 수)
   - 시간 신선도(최근 뉴스 비중)
   를 계산해, `TREND_POLICY.md`의 스코어 공식을 참고한 점수를 만든다.
5. 최종적으로 상위 10~15개 키워드와, 각 키워드에 해당하는 대표 뉴스들을 출력한다.

어떻게 했는지
---------------
- `step2_datalab_to_news.py`에서 사용한 **인증/데이터랩/뉴스 검색 함수들을 그대로 재사용**한다.
- 키워드 추출:
  - HTML 태그 제거 후, 띄어쓰기 기준 분리
  - 한글 2글자 이상 & 불용어(stopwords) 제외
  - 영문 대문자 3글자 이상(ETF, GDP 등)은 키워드로 인정
- 스코어링:
  - `키워드 스코어 = (빈도수 × 0.4) + (관련 뉴스 수 × 0.3) + (출처 다양성 × 0.2) + (시간 신선도 × 0.1)`
  - 시간 신선도는 \"최근 6시간 이내/12시간/24시간\"에 따라 가중치 부여 후 평균값 사용

테스트 방법
---------------
1. 터미널 열기
   - `Command + Space` → `Terminal` 검색 → 실행

2. 프로젝트 폴더로 이동
   - `cd /Users/nahyojin/Documents/GitHub/five-minute-brief`

3. (처음 한 번만) 라이브러리 설치
   - `pip3 install -r requirements.txt`

4. Phase 3 샘플 실행
   - `python3 phase3_trend_scoring.py`

5. 콘솔에서 확인할 것
   - \"[선정된 경제 트렌드 키워드 TOP 2]\"가 먼저 나오고
   - 이어서 \"🔥 Phase 3 - 경제 트렌드 키워드 랭킹\" 아래에 상위 키워드 목록이 출력되는지
   - 각 키워드별 대표 뉴스 제목들을 보고, \"오늘 경제 이슈를 잘 요약하고 있다\"는 느낌이 드는지
"""

import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import DefaultDict, Dict, List, Optional, Tuple
from difflib import SequenceMatcher

from step2_datalab_to_news import (
    fetch_datalab_economic_trends,
    load_credentials,
    search_news_for_keyword,
)


def extract_keywords_from_text(text: str) -> List[str]:
    """간단한 규칙으로 텍스트에서 키워드를 추출한다."""
    # HTML 태그 제거
    text = re.sub(r"<[^>]+>", "", text)

    # 자주 나오는 일반적인 단어들은 제외 (테스트용 불용어)
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
        "대한",
        "관련",
        "통해",
        "국내",
        "개최",
        "정부",
        "시장",
    }

    # 조사 제거 패턴 (한글 단어 뒤에 붙는 조사들)
    josa_pattern = re.compile(r"([가-힣]+)([이가을를은는에에서로으로와과도만까지부터보다같이]+)$")

    words = text.split()
    keywords: List[str] = []

    for w in words:
        # 조사 제거: "키워드가" -> "키워드", "한국을" -> "한국"
        match = josa_pattern.match(w)
        if match:
            w = match.group(1)  # 조사 제거한 순수 단어만 사용

        # 한글 2글자 이상 + 불용어 제외
        if re.match(r"^[가-힣]{2,}$", w) and w not in stopwords:
            keywords.append(w)
        # 영문 대문자 3글자 이상 (예: ETF, GDP, FOMC)
        elif re.match(r"^[A-Z]{3,}$", w):
            keywords.append(w)

    return keywords


def normalize_keywords(keyword_list: List[str]) -> List[str]:
    """
    의미적으로 중복되는 키워드들을 정규화한다.
    - 포함 관계: "관찰대상국"이 있으면 "관찰" 제거
    - 더 구체적인 키워드(긴 것)를 우선하고, 일반적인 키워드(짧은 것)는 제거
    """
    if not keyword_list:
        return []

    # 키워드를 길이 순으로 정렬 (긴 것 = 더 구체적인 것 우선)
    sorted_kw = sorted(set(keyword_list), key=len, reverse=True)

    normalized: List[str] = []

    for kw in sorted_kw:
        # 이미 추가된 키워드 중에 현재 키워드를 포함하는 더 구체적인 키워드가 있는지 확인
        is_contained = False
        for existing in normalized:
            # existing이 더 긴 키워드이고, kw가 그 안에 포함되면 제거
            if kw in existing and kw != existing:
                is_contained = True
                break

        # 현재 키워드가 이미 추가된 키워드들을 포함하는지 확인
        # (더 구체적인 키워드가 나왔으므로 기존 일반 키워드 제거)
        to_remove = []
        for existing in normalized:
            if existing in kw and kw != existing:
                to_remove.append(existing)

        for rm in to_remove:
            normalized.remove(rm)

        if not is_contained:
            normalized.append(kw)

    return normalized


def compute_time_freshness(pub_date: datetime, now: datetime) -> float:
    """뉴스 발행 시간이 얼마나 최근인지에 따라 0~1 사이의 신선도 점수를 계산한다."""
    diff = now - pub_date
    hours = diff.total_seconds() / 3600

    if hours <= 6:
        return 1.0
    if hours <= 12:
        return 0.7
    if hours <= 24:
        return 0.4
    return 0.1


def parse_pubdate(item: Dict) -> Optional[datetime]:
    """뉴스 아이템에서 pubDate를 datetime으로 변환한다."""
    try:
        pub_date_str = item.get("pubDate", "")
        base = pub_date_str.split(" +")[0]
        return datetime.strptime(base, "%a, %d %b %Y %H:%M:%S")
    except Exception:
        return None


def compute_title_similarity(title1: str, title2: str) -> float:
    """
    두 제목의 유사도를 0~1 사이 값으로 반환한다.
    SequenceMatcher를 사용하여 문자열 유사도를 계산한다.
    """
    # HTML 태그 제거 및 공백 정규화
    clean1 = re.sub(r'<[^>]+>', '', title1).strip()
    clean2 = re.sub(r'<[^>]+>', '', title2).strip()
    return SequenceMatcher(None, clean1, clean2).ratio()


def remove_duplicate_news(news_list: List[Dict]) -> List[Dict]:
    """
    TREND_POLICY.md 2-3에 따른 중복 제거 및 품질 필터링:
    1. 링크 기준 중복 제거
    2. 제목 유사도 80% 이상 중복 제거
    3. 출처 다양성 확보 (같은 언론사 뉴스만 몰리지 않도록)
    """
    if not news_list:
        return []

    # 1. 링크 기준 중복 제거
    seen_links: set[str] = set()
    deduped_by_link: List[Dict] = []
    for item in news_list:
        link = item.get("link", "") or item.get("originallink", "")
        if link and link not in seen_links:
            seen_links.add(link)
            deduped_by_link.append(item)

    # 2. 제목 유사도 80% 이상 중복 제거
    deduped_by_title: List[Dict] = []
    for item in deduped_by_link:
        title = item.get("title", "")
        is_duplicate = False
        for existing in deduped_by_title:
            existing_title = existing.get("title", "")
            similarity = compute_title_similarity(title, existing_title)
            if similarity >= 0.8:  # 80% 이상 유사하면 중복으로 간주
                is_duplicate = True
                break
        if not is_duplicate:
            deduped_by_title.append(item)

    # 3. 출처 다양성 확보: 같은 언론사가 너무 많으면 일부 제한
    # originallink에서 도메인 추출
    def extract_domain(link: str) -> str:
        """링크에서 도메인을 추출한다."""
        if not link:
            return ""
        # http:// 또는 https:// 제거 후 첫 번째 / 전까지가 도메인
        cleaned = link.replace("http://", "").replace("https://", "")
        domain = cleaned.split("/")[0]
        return domain

    source_count: DefaultDict[str, int] = defaultdict(int)
    final_news: List[Dict] = []
    # 같은 출처당 최대 3개까지만 허용 (출처 다양성 확보)
    MAX_NEWS_PER_SOURCE = 3

    for item in deduped_by_title:
        link = item.get("link", "") or item.get("originallink", "")
        domain = extract_domain(link)
        if source_count[domain] < MAX_NEWS_PER_SOURCE:
            source_count[domain] += 1
            final_news.append(item)

    return final_news


def analyze_trends(news_list: List[Dict]) -> List[Dict]:
    """
    수집된 뉴스 리스트를 기반으로 트렌드 키워드를 분석하고,
    각 키워드의 스코어와 대표 뉴스를 반환한다.
    """
    # TREND_POLICY.md 2-3: 중복 제거 및 품질 필터링 적용
    filtered_news = remove_duplicate_news(news_list)

    now = datetime.now()

    freq: Counter = Counter()
    news_mapping: DefaultDict[str, List[Dict]] = defaultdict(list)
    source_mapping: DefaultDict[str, set] = defaultdict(set)
    freshness_mapping: DefaultDict[str, List[float]] = defaultdict(list)

    for item in filtered_news:
        title = item.get("title", "")
        desc = item.get("description", "")
        link = item.get("link", "") or item.get("originallink", "")
        origin_link = item.get("originallink", "") or link

        title_kws = extract_keywords_from_text(title)
        desc_kws = extract_keywords_from_text(desc)

        pub_dt = parse_pubdate(item)
        freshness = compute_time_freshness(pub_dt, now) if pub_dt else 0.5

        # 제목 키워드는 가중치 3
        for kw in title_kws:
            freq[kw] += 3
            if item not in news_mapping[kw]:
                news_mapping[kw].append(item)
            source_mapping[kw].add(origin_link)
            freshness_mapping[kw].append(freshness)

        # 요약 키워드는 가중치 1
        for kw in desc_kws:
            freq[kw] += 1
            if item not in news_mapping[kw]:
                news_mapping[kw].append(item)
            source_mapping[kw].add(origin_link)
            freshness_mapping[kw].append(freshness)

    # 키워드 정규화: 일단 비활성화 (디버깅용)
    # 정규화 없이 원본 키워드 그대로 사용
    all_keywords = list(freq.keys())
    
    # 디버깅: 원본 키워드 개수 및 상위 키워드 확인
    print(f"   [디버깅] 추출된 원본 키워드 개수: {len(all_keywords)}")
    if len(all_keywords) > 0:
        # 빈도수 기준 상위 20개 키워드 출력
        top_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:20]
        print(f"   [디버깅] 원본 키워드 목록 (빈도수 상위 20개):")
        for kw, cnt in top_keywords:
            print(f"      - {kw}: {cnt}회")

    # 정규화 비활성화: 모든 키워드를 그대로 사용
    keyword_mapping: Dict[str, str] = {kw: kw for kw in all_keywords}

    # 정규화 없이 원본 키워드 그대로 사용
    merged_freq = freq.copy()
    merged_news_mapping = news_mapping.copy()
    merged_source_mapping = source_mapping.copy()
    merged_freshness_mapping = freshness_mapping.copy()

    results: List[Dict] = []

    # 필터링 전 상태 확인
    total_keywords_before_filter = len([kw for kw in merged_freq.keys() if merged_news_mapping.get(kw)])
    print(f"   [디버깅] 필터링 전 키워드 개수: {total_keywords_before_filter}")
    
    for kw, count in merged_freq.most_common():
        related_news = merged_news_mapping.get(kw, [])
        if not related_news:
            continue

        news_count = len(related_news)
        source_count = len(merged_source_mapping.get(kw, set()))
        freshness_list = merged_freshness_mapping.get(kw, [0.5])
        avg_freshness = sum(freshness_list) / len(freshness_list) if freshness_list else 0.5

        # 필터링 조건 완화: 뉴스 1개 이상, 빈도수 3 이상
        if news_count < 1 or count < 3:
            continue

        score = (
            count * 0.4
            + news_count * 0.3
            + source_count * 0.2
            + avg_freshness * 0.1
        )

        # 최신 뉴스 기준으로 정렬해서 상위 3개만 대표 뉴스로 사용
        sorted_news = sorted(
            related_news,
            key=lambda n: n.get("pubDate", ""),
            reverse=True,
        )[:3]

        results.append(
            {
                "keyword": kw,
                "score": score,
                "frequency": count,
                "news_count": news_count,
                "source_count": source_count,
                "avg_freshness": avg_freshness,
                "top_news": sorted_news,
            }
        )

    # 점수 기준으로 정렬
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # 필터링 후 상태 확인
    print(f"   [디버깅] 필터링 후 최종 키워드 개수: {len(results)}")
    if len(results) > 0:
        print(f"   [디버깅] 최종 키워드 목록 (상위 10개):")
        for i, r in enumerate(results[:10], 1):
            print(f"      {i}. {r['keyword']} (빈도={r['frequency']}, 뉴스={r['news_count']}, 점수={r['score']:.2f})")
    
    return results


def run_phase3_sample() -> None:
    """경제 카테고리 기준으로 Phase 3 트렌드 분석 샘플을 실행한다."""
    client_id, client_secret = load_credentials()

    print("=" * 60)
    print("🧪 Phase 3 샘플: 경제 트렌드 키워드 랭킹")
    print("=" * 60)

    # 1) 데이터랩으로 경제 대표 키워드 5개 중 상위 2개 선택
    print("\n[1] 데이터랩 - 경제 대표 키워드 5개 트렌드 조회")
    ratios = fetch_datalab_economic_trends(client_id, client_secret)
    if not ratios:
        print("⚠️ 데이터랩에서 가져온 데이터가 없습니다.")
        return

    print("   키워드별 ratio (어제 기준):")
    for kw, r in ratios:
        print(f"   - {kw}: {r}")

    top2 = sorted(ratios, key=lambda x: x[1], reverse=True)[:2]

    print("\n[선정된 경제 트렌드 키워드 TOP 2]")
    for kw, r in top2:
        print(f"   - {kw} (ratio={r})")

    # 2) 선정된 키워드들로 최근 24시간 뉴스 수집
    print("\n[2] 뉴스 수집 - TOP 2 키워드 기준 최근 24시간 뉴스 모으기 (키워드당 최대 20개)")
    all_news: List[Dict] = []
    seen_links: set[str] = set()

    for kw, _ in top2:
        print(f"\n   🔎 키워드: {kw}")
        news_list = search_news_for_keyword(
            client_id,
            client_secret,
            keyword=kw,
            hours=24,
            max_news=20,
        )
        print(f"      수집된 뉴스 개수: {len(news_list)}")

        for item in news_list:
            link = item.get("link", "") or item.get("originallink", "")
            if not link or link in seen_links:
                continue
            seen_links.add(link)
            all_news.append(item)

    print("\n[요약] 전체 수집 뉴스 개수:", len(all_news))
    if not all_news:
        print("⚠️ 분석할 뉴스가 없습니다.")
        return

    # 3) Phase 3 스코어링 수행 (중복 제거 포함)
    print("\n[3] Phase 3 스코어링 - 키워드 분석 및 랭킹 계산 중...")
    print("   (TREND_POLICY.md 2-3 적용: 링크 중복 제거, 제목 유사도 80% 이상 제거, 출처 다양성 확보)")
    trending = analyze_trends(all_news)

    print("\n" + "=" * 60)
    print("🔥 Phase 3 - 경제 트렌드 키워드 랭킹 (상위 10개)")
    print("=" * 60)

    if not trending:
        print("⚠️ 유의미한 키워드를 찾지 못했습니다.")
        return

    for idx, item in enumerate(trending[:10], start=1):
        print(f"\n{idx}. 키워드: {item['keyword']}")
        print(f"   점수: {item['score']:.2f}")
        print(f"   빈도수: {item['frequency']}, 관련 뉴스: {item['news_count']}개, 출처: {item['source_count']}개")
        print(f"   평균 시간 신선도: {item['avg_freshness']:.2f}")
        print("   대표 뉴스:")
        for i, n in enumerate(item["top_news"], start=1):
            title = n.get("title", "").replace("<b>", "").replace("</b>", "")
            pub_date = n.get("pubDate", "")
            link = n.get("link", "")
            print(f"      {i}. {title}")
            print(f"         발행: {pub_date}")
            print(f"         링크: {link}")


if __name__ == "__main__":
    run_phase3_sample()

