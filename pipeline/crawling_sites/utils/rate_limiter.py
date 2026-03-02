"""
도메인별 요청 간격 제어 모듈.
같은 도메인에 대한 과도한 요청을 방지한다.
"""
import time
import threading
from collections import defaultdict


class DomainRateLimiter:
    """
    도메인별로 요청 간격을 제어하는 레이트 리미터.

    사용 예:
        limiter = DomainRateLimiter(default_delay=2.0)
        limiter.wait("news.samsung.com")  # 첫 요청은 즉시
        limiter.wait("news.samsung.com")  # 2초 대기 후 진행
    """

    def __init__(self, default_delay: float = 2.0, domain_delays: dict = None):
        """
        Args:
            default_delay: 기본 요청 간격 (초)
            domain_delays: 도메인별 커스텀 간격 (예: {"boho.or.kr": 3.0})
        """
        self.default_delay = default_delay
        self.domain_delays = domain_delays or {}
        self._last_request_time = defaultdict(float)
        self._lock = threading.Lock()

    def wait(self, domain: str):
        """
        해당 도메인의 레이트 리밋에 따라 대기한다.
        스레드 안전하게 구현.
        """
        with self._lock:
            delay = self.domain_delays.get(domain, self.default_delay)
            now = time.time()
            elapsed = now - self._last_request_time[domain]

            if elapsed < delay:
                wait_time = delay - elapsed
                time.sleep(wait_time)

            self._last_request_time[domain] = time.time()

    def get_delay(self, domain: str) -> float:
        """해당 도메인의 설정된 딜레이 반환"""
        return self.domain_delays.get(domain, self.default_delay)
