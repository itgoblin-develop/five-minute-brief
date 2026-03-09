#!/bin/bash
# Docker 환경변수를 cron이 읽을 수 있도록 /etc/environment에 기록
printenv | grep -v "no_proxy" >> /etc/environment

echo "$(date) - Pipeline cron 스케줄러 시작"
echo "  일간: UTC 22:00 (KST 07:00)"
echo "  주간: UTC 23:00 일요일 (KST 08:00 월요일)"
echo "  월간: UTC 00:00 1일 (KST 09:00 1일)"

# cron 포그라운드 실행
exec cron -f
