"""
지수 백오프 재시도 데코레이터.
네트워크 오류, 타임아웃 등 일시적 오류에 대한 자동 재시도를 제공한다.
"""
import time
import logging
import functools
from typing import Tuple, Type

logger = logging.getLogger(__name__)


def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """
    지수 백오프 재시도 데코레이터.

    Args:
        max_attempts: 최대 시도 횟수
        base_delay: 첫 재시도 대기 시간 (초)
        backoff_factor: 대기 시간 증가 배율
        exceptions: 재시도할 예외 타입들

    사용 예:
        @retry_with_backoff(max_attempts=3, exceptions=(requests.RequestException,))
        def fetch_page(url):
            return requests.get(url)
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_attempts:
                        logger.error(
                            f"[{func.__name__}] {max_attempts}회 시도 후 최종 실패: {e}"
                        )
                        raise
                    delay = base_delay * (backoff_factor ** (attempt - 1))
                    logger.warning(
                        f"[{func.__name__}] {attempt}/{max_attempts} 실패, "
                        f"{delay:.1f}초 후 재시도: {e}"
                    )
                    time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator
