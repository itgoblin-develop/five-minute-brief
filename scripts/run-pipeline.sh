#!/bin/bash
# IT 도깨비 - Pipeline Runner Script
# Docker Compose를 사용하여 파이프라인 실행
#
# Usage:
#   ./scripts/run-pipeline.sh daily     # 일간 브리핑
#   ./scripts/run-pipeline.sh weekly    # 주간 브리핑
#   ./scripts/run-pipeline.sh monthly   # 월간 브리핑
#
# Crontab 설정 (서버 시간 UTC 기준):
#   0 22 * * *   /path/to/run-pipeline.sh daily    # KST 07:00
#   0 23 * * 0   /path/to/run-pipeline.sh weekly   # KST 월요일 08:00
#   0 0  1 * *   /path/to/run-pipeline.sh monthly  # KST 매월 1일 09:00

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs/pipeline"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

MODE="${1:-daily}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/${MODE}_${TIMESTAMP}.log"

echo "=== IT 도깨비 Pipeline: ${MODE} ===" | tee -a "$LOG_FILE"
echo "시작 시간: $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$LOG_FILE"

# Docker Compose로 파이프라인 실행
cd "$PROJECT_DIR"
docker compose -f docker-compose.prod.yml \
    --profile pipeline \
    run --rm pipeline \
    python run_daily.py --mode "$MODE" \
    2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo "완료 시간: $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$LOG_FILE"
echo "종료 코드: $EXIT_CODE" | tee -a "$LOG_FILE"

# 로그 파일 30일 이상 된 것 정리
find "$LOG_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null || true

exit $EXIT_CODE
