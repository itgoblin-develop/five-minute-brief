# 오늘5분 - 시스템 아키텍처

## 프로젝트 구조

```
five-minute-brief/
├── app/
│   ├── backend/          # Express.js REST API
│   └── frontend/         # React SPA
├── pipeline/             # Python 뉴스 수집/가공 파이프라인
│   ├── crawling_youtube/
│   ├── crawling_naver_news/
│   ├── ranking_blackkiwi/
│   ├── ranking_google_trends/
│   ├── ranking_integrated/
│   ├── ranking_naver/
│   └── reconstruction/   # AI 뉴스 재구성
└── docs/                 # 문서
```

## 기술 스택

### Frontend (`app/frontend/`)
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4.1
- Radix UI (shadcn/ui 패턴)
- Axios, Motion, Sonner

### Backend (`app/backend/`)
- Express 5.2 + Node.js
- PostgreSQL (pg)
- JWT 인증 + bcrypt
- Helmet, CORS, Rate Limiting
- Resend (이메일 인증)

### Pipeline (`pipeline/`)
- Python 3.10+
- Selenium (크롤링)
- scikit-learn (TF-IDF, 클러스터링)
- Google Gemini / OpenAI (AI 재구성)
- psycopg2 (PostgreSQL 적재)

## 데이터 흐름

```
[크롤링] → [트렌드 수집] → [뉴스 매칭/랭킹] → [AI 재구성] → [DB 적재] → [API] → [프론트엔드]
```

1. **크롤링**: Naver News, YouTube에서 뉴스/영상 수집
2. **트렌드 수집**: Google Trends, Naver DataLab, BlackKiwi에서 키워드 수집
3. **랭킹**: 트렌드 키워드와 뉴스 매칭, 점수 기반 정렬
4. **AI 재구성**: 클러스터링 → LLM 기반 요약/재작성 → 품질 검증
5. **DB 적재**: PostgreSQL `news` 테이블에 INSERT
6. **API**: Express REST API로 프론트엔드에 제공
7. **프론트엔드**: React SPA에서 뉴스 카드/목록 표시

## DB 테이블

| 테이블 | 용도 |
|--------|------|
| users | 사용자 계정 |
| news | 뉴스 기사 |
| likes | 좋아요 |
| bookmarks | 북마크 |
| comments | 댓글 |
| user_settings | 알림 설정 |
| device_tokens | FCM 토큰 |
| user_view_logs | 조회 기록 |

## API 엔드포인트

- `POST /api/auth/signup`, `login`, `logout`, `send-code`, `verify-code`
- `GET/PUT/DELETE /api/user/profile`, `account`
- `GET /api/news`, `GET /api/news/:id`, `GET /api/news/categories`
- `POST /api/news/:id/like`, `bookmark`
- `GET/POST /api/news/:id/comments`

## 디자인 시스템 참고

아카이브된 `design/` 디렉토리(git history)에 다음 추가 UI 컴포넌트가 있음 (필요 시 shadcn/ui로 설치 가능):

accordion, alert, aspect-ratio, breadcrumb, calendar, carousel, chart, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, radio-group, resizable, sheet, sidebar, slider, table
