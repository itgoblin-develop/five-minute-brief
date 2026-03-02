# IT 도깨비 - Pipeline Docker Image
# 일간/주간/월간 브리핑 생성 자동화

FROM python:3.11-slim

WORKDIR /pipeline

# 시스템 패키지 (Selenium용 Chromium 등)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Selenium 환경 설정
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 비특권 사용자로 실행
RUN addgroup --system pipeline && adduser --system --ingroup pipeline pipeline
RUN chown -R pipeline:pipeline /pipeline
USER pipeline

# 기본 명령: 일간 파이프라인
CMD ["python", "run_daily.py"]
