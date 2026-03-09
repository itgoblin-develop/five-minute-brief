# IT 도깨비 - Pipeline Docker Image
# 일간/주간/월간 브리핑 생성 자동화 (cron 스케줄)

FROM python:3.11-slim

WORKDIR /pipeline

# 시스템 패키지 (Selenium용 Chromium + cron 스케줄러)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    curl \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Selenium 환경 설정
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 로그 디렉토리 생성
RUN mkdir -p /var/log/pipeline

# crontab 설치
COPY crontab /etc/cron.d/pipeline-cron
RUN chmod 0644 /etc/cron.d/pipeline-cron && crontab /etc/cron.d/pipeline-cron

# 엔트리포인트: Docker 환경변수를 cron에 전달 후 cron 데몬 실행
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
