"""
다중 포맷 날짜 파서.
한국어 날짜, ISO 8601, 상대 시간 등 다양한 형식을 표준 포맷으로 변환한다.
"""
import re
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# 표준 출력 포맷
STANDARD_FORMAT = "%Y-%m-%d %H:%M"


def parse_date(date_str: str, fallback_now: bool = True) -> str:
    """
    다양한 날짜 문자열을 표준 포맷(YYYY-MM-DD HH:MM)으로 변환한다.

    지원 포맷:
        - ISO 8601: "2026-03-02T09:00:00Z", "2026-03-02T09:00:00+09:00"
        - 한국어: "2026.03.02", "2026년 3월 2일", "2026.03.02. 오전 10:30"
        - 상대 시간: "5분 전", "3시간 전", "1일 전", "방금"
        - 영어: "Mar 2, 2026", "March 2, 2026", "2 hours ago"
        - 슬래시/하이픈: "2026/03/02", "2026-03-02"

    Args:
        date_str: 파싱할 날짜 문자열
        fallback_now: 파싱 실패 시 현재 시각 반환 여부

    Returns:
        표준 포맷 문자열 "YYYY-MM-DD HH:MM" 또는 원본 문자열
    """
    if not date_str or not isinstance(date_str, str):
        return datetime.now().strftime(STANDARD_FORMAT) if fallback_now else ""

    date_str = date_str.strip()

    # 1. 상대 시간 (한국어)
    result = _parse_korean_relative(date_str)
    if result:
        return result.strftime(STANDARD_FORMAT)

    # 2. 상대 시간 (영어)
    result = _parse_english_relative(date_str)
    if result:
        return result.strftime(STANDARD_FORMAT)

    # 3. ISO 8601
    result = _parse_iso(date_str)
    if result:
        return result.strftime(STANDARD_FORMAT)

    # 4. 한국어 날짜 포맷
    result = _parse_korean_date(date_str)
    if result:
        return result.strftime(STANDARD_FORMAT)

    # 5. 영어 날짜 포맷
    result = _parse_english_date(date_str)
    if result:
        return result.strftime(STANDARD_FORMAT)

    # 6. 숫자 기반 포맷 (2026.03.02, 2026/03/02, 2026-03-02)
    result = _parse_numeric_date(date_str)
    if result:
        return result.strftime(STANDARD_FORMAT)

    # 파싱 실패
    logger.debug(f"날짜 파싱 실패: '{date_str}'")
    if fallback_now:
        return datetime.now().strftime(STANDARD_FORMAT)
    return date_str


def _parse_korean_relative(text: str) -> Optional[datetime]:
    """한국어 상대 시간 파싱: '5분 전', '3시간 전', '1일 전', '방금'"""
    now = datetime.now()

    if text in ("방금", "방금 전", "just now"):
        return now

    patterns = [
        (r"(\d+)\s*초\s*전", "seconds"),
        (r"(\d+)\s*분\s*전", "minutes"),
        (r"(\d+)\s*시간\s*전", "hours"),
        (r"(\d+)\s*일\s*전", "days"),
        (r"(\d+)\s*주\s*전", "weeks"),
        (r"(\d+)\s*개월\s*전", "months"),
    ]

    for pattern, unit in patterns:
        match = re.match(pattern, text)
        if match:
            value = int(match.group(1))
            if unit == "months":
                return now - timedelta(days=value * 30)
            return now - timedelta(**{unit: value})

    return None


def _parse_english_relative(text: str) -> Optional[datetime]:
    """영어 상대 시간 파싱: '2 hours ago', '5 minutes ago'"""
    now = datetime.now()
    text_lower = text.lower().strip()

    patterns = [
        (r"(\d+)\s*seconds?\s*ago", "seconds"),
        (r"(\d+)\s*minutes?\s*ago", "minutes"),
        (r"(\d+)\s*hours?\s*ago", "hours"),
        (r"(\d+)\s*days?\s*ago", "days"),
        (r"(\d+)\s*weeks?\s*ago", "weeks"),
        (r"(\d+)\s*months?\s*ago", "months"),
    ]

    for pattern, unit in patterns:
        match = re.match(pattern, text_lower)
        if match:
            value = int(match.group(1))
            if unit == "months":
                return now - timedelta(days=value * 30)
            return now - timedelta(**{unit: value})

    return None


def _parse_iso(text: str) -> Optional[datetime]:
    """ISO 8601 파싱: '2026-03-02T09:00:00Z', '2026-03-02T09:00:00+09:00'"""
    # 타임존 제거 (단순화)
    cleaned = re.sub(r'[+-]\d{2}:\d{2}$', '', text)
    cleaned = cleaned.rstrip('Z')

    formats = [
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue

    return None


def _parse_korean_date(text: str) -> Optional[datetime]:
    """한국어 날짜 파싱: '2026년 3월 2일', '2026.03.02. 오전 10:30'"""
    # "2026년 3월 2일" 패턴
    match = re.match(r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일", text)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        # 시간 부분 찾기
        time_match = re.search(r"(\d{1,2}):(\d{2})", text)
        if time_match:
            h, mi = int(time_match.group(1)), int(time_match.group(2))
            return datetime(y, m, d, h, mi)
        return datetime(y, m, d)

    # "2026.03.02. 오전 10:30" 패턴
    match = re.match(r"(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\s*(오전|오후)?\s*(\d{1,2}):(\d{2})?", text)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        ampm = match.group(4)
        h = int(match.group(5)) if match.group(5) else 0
        mi = int(match.group(6)) if match.group(6) else 0
        if ampm == "오후" and h < 12:
            h += 12
        elif ampm == "오전" and h == 12:
            h = 0
        return datetime(y, m, d, h, mi)

    return None


def _parse_english_date(text: str) -> Optional[datetime]:
    """영어 날짜 파싱: 'Mar 2, 2026', 'March 2, 2026', 'Feb 28, 2026'"""
    formats = [
        "%b %d, %Y",       # Mar 2, 2026
        "%B %d, %Y",       # March 2, 2026
        "%b %d %Y",        # Mar 2 2026
        "%B %d %Y",        # March 2 2026
        "%d %b %Y",        # 2 Mar 2026
        "%d %B %Y",        # 2 March 2026
        "%b. %d, %Y",      # Mar. 2, 2026
    ]

    for fmt in formats:
        try:
            return datetime.strptime(text.strip(), fmt)
        except ValueError:
            continue

    # 시간 포함된 영어 날짜
    time_formats = [
        "%b %d, %Y %H:%M",
        "%B %d, %Y %H:%M",
        "%b %d, %Y %I:%M %p",
        "%B %d, %Y %I:%M %p",
    ]

    for fmt in time_formats:
        try:
            return datetime.strptime(text.strip(), fmt)
        except ValueError:
            continue

    return None


def _parse_numeric_date(text: str) -> Optional[datetime]:
    """숫자 기반 날짜 파싱: '2026.03.02', '2026/03/02', '2026-03-02', '20260302'"""
    # 구분자 있는 경우
    match = re.match(r"(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})", text)
    if match:
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            dt = datetime(y, m, d)
            # 시간 부분도 있는지 확인
            time_match = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", text[match.end():])
            if time_match:
                h = int(time_match.group(1))
                mi = int(time_match.group(2))
                return datetime(y, m, d, h, mi)
            return dt
        except ValueError:
            pass

    # YYYYMMDD 형식
    match = re.match(r"^(\d{4})(\d{2})(\d{2})$", text)
    if match:
        try:
            return datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass

    return None
