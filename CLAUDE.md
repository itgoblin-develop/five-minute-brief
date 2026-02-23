# Five Minute Brief - IT 뉴스 브리핑 서비스

## 프로젝트 개요
- 서비스: IT 뉴스를 수집, 분석, 요약하여 5분 브리핑으로 제공
- 아키텍처: 모노레포 (app/backend + app/frontend + pipeline)
- 배포: Docker Compose (PostgreSQL + Express + Nginx)

## 기술 스택
- **Backend**: Express 5.2 + CommonJS (`app/backend/`)
  - PostgreSQL (pg), JWT (jsonwebtoken), bcrypt, Winston 로깅, Sentry
  - 엔트리: `app/backend/server.js`
- **Frontend**: React 19 + TypeScript + Vite 7 (`app/frontend/`)
  - Tailwind CSS 4.1, Radix UI 컴포넌트 26개
  - 엔트리: `app/frontend/src/main.tsx`
- **Pipeline**: Python 크롤링/분석 (`pipeline/`)
  - 네이버 뉴스, YouTube 크롤러, 키워드 랭킹

## 디렉토리 구조
```
app/backend/
├── server.js          — Express 서버 (보안 헤더, 레이트 리밋, Sentry)
├── config/            — db.js, logger.js, sentry.js
├── routes/            — auth.js(22KB), user.js, news.js, interaction.js, push.js, stats.js
├── middleware/         — 요청 핸들러
├── scheduler/         — 백그라운드 작업
├── setup_database.sql — DB 스키마 (8 테이블)

app/frontend/src/
├── App.tsx (20KB)     — 메인 컨테이너
├── components/        — 18개 컴포넌트 (AdminDashboard, LoginModal, NewsDetail 등)
├── components/ui/     — 24개 Radix UI 래퍼
├── lib/               — api.ts, auth-context.tsx, push.ts
├── pages/             — Login, Signup

pipeline/
├── crawling_naver_news/ — 네이버 뉴스 크롤러
├── crawling_youtube/    — YouTube 크롤러
├── ranking_*/           — 키워드 랭킹 (네이버, 구글, 블랙키위)
├── reconstruction/      — 콘텐츠 재구성
├── run_daily.py         — 일일 파이프라인
```

## 팀 구성 시 권장 역할 분배
- **backend-dev**: `app/backend/` + `pipeline/` 담당
- **frontend-dev**: `app/frontend/` 담당
- backend와 frontend는 독립적으로 병렬 작업 가능
- Docker 관련 변경은 team-lead가 직접 처리
- DB 스키마 변경 시 `setup_database.sql` 반영 필수

## 환경 변수
- `.env` 참조 (JWT_SECRET, DB 접속 정보, VAPID 키, Sentry DSN 등)
