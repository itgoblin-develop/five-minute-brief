# 출근길 모바일 뉴스레터 서비스 '오늘 5분' - PRD v3.0

---

## 문서 정보

| 항목              | 내용                                     |
| ----------------- | ---------------------------------------- |
| **프로젝트명**    | 출근길 모바일 뉴스레터 서비스 (오늘 5분) |
| **버전**          | v3.0                                     |
| **작성일**        | 2026.02.09                               |
| **최초 작성**     | 서산화 (PM)                              |
| **v2.0 갱신**     | 전인호                                   |
| **v3.0 갱신**     | 전인호                                   |
| **프로젝트 기간** | 4주 (2026.01.23 ~ 2026.02.23)            |
| **서비스 유형**   | 모바일 웹페이지                          |

### 문서 변경 이력

| 버전 | 날짜       | 작성자 | 변경 내용                                                                                                |
| ---- | ---------- | ------ | -------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026.01.26 | 서산화 | 초안 작성                                                                                                |
| v1.1 | 2026.02.07 | 전인호 | 기획서 불일치 해소, DB 테이블 추가(likes, bookmarks, comments), API 명세 확장, 프론트엔드 라우팅 추가    |
| v2.0 | 2026.02.07 | 전인호 | 기획팀/디자인팀/개발팀 문서 통합, 디자인 변경사항 반영, na/pick news 구현 현황 반영, Feature List 현행화 |
| v3.0 | 2026.02.09 | 전인호 | 전체 구현 현황 현행화, AI 재구성/썸네일/CI/CD 파이프라인 반영, 백엔드 API 완성도 업데이트 |

---

## 1. Executive Summary

본 문서는 **출근길 모바일 뉴스레터 서비스 '오늘 5분'**의 MVP 개발을 위한 통합 제품 요구사항을 정의합니다. v3.0에서는 v2.0 이후 구현된 AI 뉴스 재구성, AI 썸네일 생성, 뉴스 CRUD API, 소셜 인터랙션 API, CI/CD 파이프라인 자동화 등의 구현 현황을 반영하였습니다.

### 핵심 가치 제안

바쁜 직장인들이 **출근 시간 5분 이내에 오늘의 주요 뉴스를 카드 형태로 빠르게 소비**할 수 있도록 설계된 모바일 우선 웹 서비스입니다.

### 주요 특징

- 선택의 피로 없이 큐레이션된 핵심 뉴스만 제공
- 카드 뉴스 형태의 직관적인 스와이프 UI + 리스트 뷰 전환
- 카테고리별 필터링 (전체, 트렌딩, 경제, 재테크, 사회)
- AI 재구성 뉴스 콘텐츠 + AI 생성 썸네일로 가독성 높은 뉴스 소비 경험
- 좋아요/북마크/댓글 소셜 인터랙션 기능
- 비로그인 사용자는 3개 레터 확인 가능, 나머지는 썸네일로만 노출
- 매일 07:00 KST 자동 뉴스 수집 파이프라인 (GitHub Actions)

---

## 2. 기능 요구사항 (Functional Requirements)

### 우선순위 표기

- 🔴 **Must**: 반드시 구현해야 하는 기능
- 🟠 **Should**: 가능하면 구현하는 기능
- 🟢 **Could**: 시간이 남으면 구현하는 기능

### 2.1 뉴스 데이터 수집 및 처리

| ID    | 요구사항                     | 상세 설명                                     | 우선순위 | 구현 상태                                     |
| ----- | ---------------------------- | --------------------------------------------- | -------- | --------------------------------------------- |
| FR-01 | 뉴스 API 연동                | 네이버 뉴스 크롤링 (Selenium)                 | 🔴       | ✅ 구현 (`news_crawler.py`)                   |
| FR-02 | 카테고리별 뉴스 수집         | 8개 섹션 자동 수집                            | 🔴       | ✅ 구현 (경제, 사회, IT/과학, 생활/문화 등)   |
| FR-02-1 | 유튜브 수집                | YouTube 영상 크롤링 + 자막 추출              | 🟠       | ✅ 구현 (Selenium + API v3)                   |
| FR-03 | 뉴스 선별                    | 멀티소스 트렌드 기반 뉴스 선별               | 🔴       | ✅ 구현 (Google Trends + Naver DataLab + BlackKiwi) |
| FR-04 | 뉴스 콘텐츠 AI 재구성        | 원문을 읽기 쉽게 재구성 (Gemini + OpenAI)    | 🔴       | ✅ 구현 (`ai_rewriter.py`, 이중화 LLM)       |
| FR-05 | 콘텐츠 기반 이미지 AI 재구성 | 뉴스 대표 이미지 AI 생성                     | 🟠       | ✅ 구현 (`image_generator.py`, Gemini 2.5 Flash Image) |
| FR-06 | 뉴스 업데이트 주기           | 매일 07:00 KST 자동 수집                     | 🟠       | ✅ 구현 (`run_daily.py` + GitHub Actions)     |

### 2.2 사용자 인증 및 관리

| ID    | 요구사항             | 상세 설명                                          | 우선순위 | 구현 상태                              |
| ----- | -------------------- | -------------------------------------------------- | -------- | -------------------------------------- |
| FR-10 | 회원가입             | 이메일, 비밀번호, 닉네임 + 유효성 검증            | 🔴       | ✅ 백엔드 + 프론트 완료               |
| FR-11 | 로그인               | JWT 90일, httpOnly 쿠키, sameSite strict           | 🔴       | ✅ 백엔드 + 프론트 완료               |
| FR-12 | 로그아웃             | 쿠키 클리어 방식                                   | 🔴       | ✅ 구현 (`POST /api/auth/logout`)     |
| FR-13 | 비밀번호 찾기        | 이메일 인증 후 재설정                              | 🟠       | ⬜ 미구현                              |
| FR-14 | 비로그인 제한        | 3개 레터 전체 확인, 4번째부터 썸네일만             | 🔴       | ✅ 백엔드 + 프론트 완료 (`FREE_LIMIT=3`) |
| FR-15 | 이메일 인증 코드     | 회원가입 시 6자리 인증 코드 (Resend API, 5분 만료) | 🔴       | ✅ 백엔드 + 프론트 완료               |
| FR-16 | 약관 동의            | 만14세 이상, 서비스 이용약관, 개인정보처리방침     | 🔴       | ✅ 프론트 완료 (TermsPage)            |

### 2.3 메인 피드 및 카테고리

| ID    | 요구사항         | 상세 설명                                      | 우선순위 | 구현 상태                  |
| ----- | ---------------- | ---------------------------------------------- | -------- | -------------------------- |
| FR-20 | 메인 피드 화면   | 카드 뉴스 스와이프 UI (SwipeDeck)              | 🔴       | ✅ 프론트 완료             |
| FR-21 | 카테고리 탭      | 5개 탭 (전체, 트렌딩, 경제, 재테크, 사회)      | 🔴       | ✅ 프론트 + 백엔드 완료    |
| FR-22 | 카드 뉴스 표시   | 제목, 요약, AI 이미지, 해시태그, 인터랙션 수   | 🔴       | ✅ 프론트 완료             |
| FR-23 | 무한 스크롤      | 리스트 뷰 하단 도달 시 추가 로드               | 🟠       | ✅ 프론트 완료             |
| FR-24 | 새로고침         | Pull to refresh 기능                           | 🟠       | ⬜ 미구현                  |
| FR-25 | 뷰 모드 전환     | 카드 뷰 ↔ 리스트 뷰 토글                       | 🟠       | ✅ 프론트 완료             |

### 2.4 상세 뉴스 화면

| ID    | 요구사항              | 상세 설명                                    | 우선순위 | 구현 상태                  |
| ----- | --------------------- | -------------------------------------------- | -------- | -------------------------- |
| FR-30 | 상세 화면 이동        | 카드 클릭 시 재구성된 뉴스 페이지 이동       | 🔴       | ✅ 프론트 완료             |
| FR-31 | 목록 돌아가기         | 상단 뒤로가기 버튼                           | 🔴       | ✅ 프론트 완료             |
| FR-32 | 댓글                  | 댓글 작성/수정/삭제 (500자 제한)             | 🔴       | ✅ 프론트 + 백엔드 완료    |
| FR-33 | 좋아요/북마크         | 상세 페이지 내 토글                          | 🔴       | ✅ 프론트 + 백엔드 완료    |
| FR-34 | 공유 기능             | 카카오톡 공유, URL 복사                      | 🟢       | ✅ 프론트 완료             |
| FR-35 | 스크롤 프로그레스     | 읽기 진행도 표시 (상단 프로그레스 바)        | 🟢       | ✅ 프론트 완료             |

### 2.5 푸시 알림

| ID    | 요구사항              | 상세 설명                            | 우선순위 | 구현 상태                  |
| ----- | --------------------- | ------------------------------------ | -------- | -------------------------- |
| FR-40 | 사용자 패턴 분석      | 뉴스 열람 시간대 데이터 수집 및 분석 | 🟠       | ⬜ 미구현                  |
| FR-41 | 스마트 알림 시간      | 최적 알림 시간 자동 설정             | 🟢       | ⬜ 미구현                  |
| FR-42 | 수동 알림 설정        | 사용자가 직접 시간/요일 설정         | 🔴       | ⚠️ 프론트 UI만 완료 (백엔드 API 없음) |
| FR-43 | 푸시 on/off           | 알림 허용 여부 토글                  | 🔴       | ⚠️ 프론트 UI만 완료 (백엔드 API 없음) |
| FR-44 | 알림 메시지           | "오늘의 뉴스가 도착했습니다" + 제목  | 🔴       | ⬜ 미구현                  |
| FR-45 | 알림 클릭 시 이동     | 앱/웹 메인 피드 이동                 | 🔴       | ⬜ 미구현                  |
| FR-46 | 디바이스 토큰 관리    | FCM 토큰 저장 및 갱신                | 🟢       | ⬜ 미구현 (DB 테이블만 존재) |
| FR-47 | 요일별 알림 선택      | 월~일 개별 요일 선택 UI              | 🟠       | ⚠️ 프론트 UI만 완료 (백엔드 API 없음) |

### 2.6 설정 화면

| ID    | 요구사항         | 상세 설명                        | 우선순위 | 구현 상태                           |
| ----- | ---------------- | -------------------------------- | -------- | ----------------------------------- |
| FR-50 | 알림 시간 설정   | 시간 선택 UI (바텀시트 타임피커) | 🔴       | ⚠️ 프론트 UI만 완료 (백엔드 API 없음) |
| FR-51 | 푸시 알림 토글   | 알림 on/off 스위치               | 🔴       | ⚠️ 프론트 UI만 완료 (백엔드 API 없음) |
| FR-52 | 프로필 정보 수정 | 이름, 비밀번호 변경              | 🟠       | ✅ 프론트 + 백엔드 완료             |
| FR-53 | 회원 탈퇴        | 계정 삭제 기능 (확인 다이얼로그) | 🟢       | ✅ 프론트 + 백엔드 완료             |

### 2.7 좋아요/북마크/댓글 API

| ID    | 요구사항         | 상세 설명                   | 우선순위 | 구현 상태       |
| ----- | ---------------- | --------------------------- | -------- | --------------- |
| FR-70 | 좋아요 토글      | POST /api/news/:id/like     | 🔴       | ✅ 구현 완료    |
| FR-71 | 좋아요 목록 조회 | GET /api/user/likes         | 🔴       | ✅ 구현 완료    |
| FR-72 | 북마크 토글      | POST /api/news/:id/bookmark | 🔴       | ✅ 구현 완료    |
| FR-73 | 북마크 목록 조회 | GET /api/user/bookmarks     | 🔴       | ✅ 구현 완료    |
| FR-74 | 댓글 작성        | POST /api/news/:id/comments | 🔴       | ✅ 구현 완료    |
| FR-75 | 댓글 목록 조회   | GET /api/news/:id/comments  | 🔴       | ✅ 구현 완료    |
| FR-76 | 댓글 수정        | PUT /api/comments/:id       | 🟠       | ✅ 구현 완료    |
| FR-77 | 댓글 삭제        | DELETE /api/comments/:id    | 🟠       | ✅ 구현 완료    |

### 2.8 운영/관리 (관리자)

| ID    | 요구사항          | 상세 설명                     | 우선순위 | 구현 상태 |
| ----- | ----------------- | ----------------------------- | -------- | --------- |
| FR-60 | 에러 로그 수집    | 서버/클라이언트 에러 로깅     | 🔴       | ⬜ 미구현 |
| FR-61 | 모니터링 대시보드 | 서비스 헬스체크, API 응답시간 | 🟠       | ⬜ 미구현 |
| FR-62 | 사용자 통계       | DAU, 세션 시간, 뉴스 조회수   | 🟠       | ⬜ 미구현 |

---

## 3. API 명세 (API Specifications)

### 3.1 인증 API

| Method | Endpoint              | 설명                 | 구현 상태 |
| ------ | --------------------- | -------------------- | --------- |
| POST   | /api/auth/signup      | 회원가입             | ✅ 완료   |
| POST   | /api/auth/login       | 로그인 (JWT 90일)    | ✅ 완료   |
| POST   | /api/auth/logout      | 로그아웃 (쿠키 클리어) | ✅ 완료   |
| POST   | /api/auth/send-code   | 이메일 인증 코드 발송 | ✅ 완료   |
| POST   | /api/auth/verify-code | 인증 코드 확인       | ✅ 완료   |
| POST   | /api/auth/refresh     | 토큰 갱신            | ⬜ 미구현 |

### 3.2 뉴스 API

| Method | Endpoint             | 설명                                     | 구현 상태 |
| ------ | -------------------- | ---------------------------------------- | --------- |
| GET    | /api/news            | 뉴스 목록 (?category=&page=&limit=)      | ✅ 완료   |
| GET    | /api/news/:id        | 뉴스 상세 (열람 로그 기록)               | ✅ 완료   |
| GET    | /api/news/categories | 카테고리 목록                            | ✅ 완료   |

### 3.3 사용자 API

| Method | Endpoint           | 설명             | 구현 상태 |
| ------ | ------------------ | ---------------- | --------- |
| GET    | /api/user/profile  | 프로필 조회      | ✅ 완료   |
| GET    | /api/user/me       | 현재 사용자 정보 | ✅ 완료   |
| PUT    | /api/user/profile  | 프로필 수정      | ✅ 완료   |
| DELETE | /api/user/account  | 회원 탈퇴        | ✅ 완료   |
| GET    | /api/user/settings | 설정 조회        | ⬜ 미구현 |
| PUT    | /api/user/settings | 설정 변경        | ⬜ 미구현 |

### 3.4 좋아요/북마크/댓글 API

| Method | Endpoint               | 설명                     | 구현 상태 |
| ------ | ---------------------- | ------------------------ | --------- |
| POST   | /api/news/:id/like     | 좋아요 토글              | ✅ 완료   |
| GET    | /api/user/likes        | 좋아요 목록              | ✅ 완료   |
| POST   | /api/news/:id/bookmark | 북마크 토글              | ✅ 완료   |
| GET    | /api/user/bookmarks    | 북마크 목록              | ✅ 완료   |
| POST   | /api/news/:id/comments | 댓글 작성 (500자 제한)   | ✅ 완료   |
| GET    | /api/news/:id/comments | 댓글 목록 (isMine 필드)  | ✅ 완료   |
| PUT    | /api/comments/:id      | 댓글 수정 (본인만)       | ✅ 완료   |
| DELETE | /api/comments/:id      | 댓글 삭제 (본인만)       | ✅ 완료   |

### 3.5 푸시 알림 API

| Method | Endpoint           | 설명               | 구현 상태 |
| ------ | ------------------ | ------------------ | --------- |
| POST   | /api/push/register | 디바이스 토큰 등록 | ⬜ 미구현 |
| POST   | /api/push/send     | 푸시 발송 (관리자) | ⬜ 미구현 |

### 3.6 시스템 API

| Method | Endpoint    | 설명                     | 구현 상태                     |
| ------ | ----------- | ------------------------ | ----------------------------- |
| GET    | /           | 서버 상태 확인           | ✅ 완료 (timestamp 포함)      |
| GET    | /api/health | 표준 health check        | ⬜ 미구현                     |

---

## 4. 데이터베이스 설계

### 4.1 테이블 구조 (8개 테이블)

```
users (1) ─── (1) user_settings
users (1) ─── (N) device_tokens
users (1) ─── (N) user_view_logs
users (1) ─── (N) likes
users (1) ─── (N) bookmarks
users (1) ─── (N) comments
news  (1) ─── (N) user_view_logs
news  (1) ─── (N) likes
news  (1) ─── (N) bookmarks
news  (1) ─── (N) comments
```

### 4.2 테이블 상세

**1. users (사용자 계정)** ✅ 구현 완료

| 컬럼          | 타입         | 제약조건         | 구현 상태 |
| ------------- | ------------ | ---------------- | --------- |
| id            | SERIAL       | PRIMARY KEY      | ✅        |
| email         | VARCHAR(255) | UNIQUE, NOT NULL | ✅        |
| nickname      | VARCHAR(50)  | UNIQUE, NOT NULL | ✅        |
| password_hash | VARCHAR(255) | NOT NULL         | ✅        |
| created_at    | TIMESTAMP    | DEFAULT NOW()    | ✅        |
| updated_at    | TIMESTAMP    | -                | ✅        |
| last_login_at | TIMESTAMP    | -                | ✅        |
| is_active     | BOOLEAN      | DEFAULT TRUE     | ✅        |

**2. news (AI 재구성 뉴스)** ✅ 구현 완료

| 컬럼           | 타입         | 제약조건      | 구현 상태 |
| -------------- | ------------ | ------------- | --------- |
| news_id        | SERIAL       | PRIMARY KEY   | ✅        |
| title          | VARCHAR(200) | NOT NULL      | ✅        |
| summary        | TEXT         | NOT NULL      | ✅        |
| bullet_summary | JSONB        | -             | ✅        |
| content        | TEXT         | NOT NULL      | ✅        |
| category       | VARCHAR(50)  | NOT NULL      | ✅        |
| hashtags       | JSONB        | -             | ✅        |
| image_url      | VARCHAR(500) | -             | ✅        |
| source_url     | VARCHAR(500) | -             | ✅        |
| source_name    | VARCHAR(100) | -             | ✅        |
| source_count   | INTEGER      | DEFAULT 1     | ✅        |
| published_at   | TIMESTAMP    | NOT NULL      | ✅        |
| created_at     | TIMESTAMP    | DEFAULT NOW() | ✅        |

**3. user_settings** ✅ 테이블 존재 / ⬜ API 미구현

| 컬럼               | 타입    | 제약조건      | 구현 상태 |
| ------------------ | ------- | ------------- | --------- |
| setting_id         | SERIAL  | PRIMARY KEY   | ✅        |
| user_id            | INT     | FK, UNIQUE    | ✅        |
| push_enabled       | BOOLEAN | DEFAULT FALSE | ✅        |
| notification_time  | TIME    | -             | ✅        |
| notification_days  | JSONB   | -             | ✅        |
| smart_notification | BOOLEAN | DEFAULT TRUE  | ✅        |
| created_at         | TIMESTAMP | DEFAULT NOW() | ✅      |
| updated_at         | TIMESTAMP | -           | ✅        |

**4. device_tokens** ✅ 테이블 존재 / ⬜ API 미구현

| 컬럼        | 타입         | 제약조건         | 구현 상태 |
| ----------- | ------------ | ---------------- | --------- |
| token_id    | SERIAL       | PRIMARY KEY      | ✅        |
| user_id     | INT          | FK               | ✅        |
| fcm_token   | VARCHAR(255) | UNIQUE, NOT NULL | ✅        |
| device_type | VARCHAR(20)  | -                | ✅        |
| is_active   | BOOLEAN      | DEFAULT TRUE     | ✅        |
| created_at  | TIMESTAMP    | DEFAULT NOW()    | ✅        |

**5~8. user_view_logs, likes, bookmarks, comments** ✅ 모두 구현 완료

---

## 5. 기술 스택

### 프론트엔드

| 항목       | 구현                                    |
| ---------- | --------------------------------------- |
| Framework  | React 19.2 + TypeScript 5.9            |
| Build Tool | Vite 7.2                               |
| Styling    | Tailwind CSS 4.1                       |
| UI Library | Radix UI + shadcn/ui 패턴              |
| Animation  | motion (Framer Motion) 12.x            |
| Icons      | Lucide React                           |
| HTTP       | Axios 1.13                             |
| Forms      | react-hook-form 7.x                    |
| Toast      | sonner 2.0                             |
| Alert      | sweetalert2 11.x                       |

### 백엔드

| 항목       | 구현                                    |
| ---------- | --------------------------------------- |
| Runtime    | Node.js (CommonJS)                     |
| Framework  | Express 5.2                            |
| Auth       | jsonwebtoken 9.x + bcrypt 6.x         |
| Security   | helmet 8.x + express-rate-limit 8.x   |
| DB Driver  | pg 8.18 (node-postgres)               |
| Email      | Resend 6.9                             |
| Cookie     | cookie-parser 1.4                      |

### 데이터 처리 파이프라인 (Python)

| 항목            | 구현                                               |
| --------------- | -------------------------------------------------- |
| 크롤링          | Selenium WebDriver, BeautifulSoup                  |
| YouTube         | google-api-python-client, youtube-transcript-api   |
| Naver 트렌드    | requests (DataLab API)                             |
| AI 재구성       | Gemini (primary) + OpenAI (fallback) 이중화        |
| AI 썸네일       | Gemini 2.5 Flash Image                             |
| 클러스터링      | scikit-learn (TF-IDF + Agglomerative)              |
| 배치 실행       | run_daily.py + GitHub Actions                      |
| 설정            | PyYAML, python-dotenv                              |

### 데이터베이스

| 항목    | 구현                           |
| ------- | ------------------------------ |
| Primary | PostgreSQL (five_minute_brief) |
| Cache   | ⬜ Redis 미구현                |

### 인프라

| 항목       | 구현                                              |
| ---------- | ------------------------------------------------- |
| CI/CD      | ✅ GitHub Actions (`daily-pipeline.yml`)           |
| Frontend   | ⬜ 미배포 (EC2 인스턴스 준비됨)                    |
| Backend    | ⬜ 미배포 (EC2 인스턴스 준비됨)                    |
| Monitoring | ⬜ Sentry, Google Analytics 미구현                 |
| Push       | ⬜ Firebase Cloud Messaging 미연동                 |

---

## 6. AI 재구성 파이프라인 (v3.0 신규 섹션)

### 6.1 파이프라인 아키텍처

```
GitHub Actions (매일 22:00 UTC = 07:00 KST) 또는 수동 실행
    ↓
run_daily.py (통합 오케스트레이터)
    ├─ Step 1: 크롤링 + 랭킹 + 트렌드 매칭 (timeout: 600초)
    │   ├─ news_crawler.py (Selenium) → 네이버 뉴스 수집
    │   ├─ youtube_crawler.py (Selenium + API v3) → YouTube 수집
    │   ├─ generate_briefing.py (멀티소스 트렌드 분석)
    │   │   ├─ Google Trends RSS (1.5x 가중치)
    │   │   ├─ Naver DataLab API (1.2x 가중치)
    │   │   └─ BlackKiwi 트렌드 (1.8x 가중치)
    │   └─ 출력: daily_brief_YYYYMMDD.json
    │
    └─ Step 2: AI 재구성 + 썸네일 + DB 적재 (timeout: 900초)
        ├─ Phase 1: 전처리 (Preprocessor)
        ├─ Phase 2: 주제 클러스터링 (TF-IDF + Agglomerative)
        ├─ Phase 3: AI 재구성 (Gemini primary / OpenAI fallback)
        ├─ Phase 3.5: AI 썸네일 생성 (Gemini 2.5 Flash Image)
        ├─ Phase 4: 품질 검증 (길이, 원문 유사도 등)
        └─ Phase 5: PostgreSQL INSERT
```

### 6.2 카테고리별 클러스터 목표

| 카테고리 | 최소 | 최대 | 설명                       |
| -------- | ---- | ---- | -------------------------- |
| Economy  | 5    | 7    | 경제 뉴스                  |
| Money    | 3    | 5    | 재테크 뉴스                |
| Society  | 2    | 4    | 사회 뉴스                  |
| Trend    | 4    | 6    | 트렌딩 (IT/테크 포함)      |

### 6.3 품질 검증 기준

| 항목               | 기준                    |
| ------------------ | ----------------------- |
| 제목 길이          | 5~30자                  |
| 요약 길이          | 50~200자                |
| 3줄 요약           | 정확히 3개, 각 10~50자  |
| 본문 길이          | 300~700자               |
| 본문 단락          | 2~5개                   |
| 해시태그           | 3~5개, 각 2~8자         |
| 원문 유사도 임계값 | 0.8 이하                |

### 6.4 GitHub Actions 워크플로우

- **스케줄**: `cron: '0 22 * * *'` (22:00 UTC = 07:00 KST)
- **수동 트리거**: `workflow_dispatch` (skip_crawl, dry_run, date 입력)
- **환경**: ubuntu-latest, Python 3.11, Chrome/chromedriver
- **Secrets**: GEMINI_API_KEY, OPENAI_API_KEY, NAVER_CLIENT_ID/SECRET, DB_*
- **DB Secrets 미설정 시**: 자동 `--dry-run` 모드 전환
- **실패 시**: GitHub Issue 자동 생성
- **아티팩트**: daily_brief_*.json, reconstructed_*.json 업로드

---

## 7. 보안 구현 현황

| 항목                | 구현                                           | 상태    |
| ------------------- | ---------------------------------------------- | ------- |
| HTTPS               | 프로덕션 배포 시 적용 예정                     | ⬜      |
| JWT 토큰            | httpOnly, secure(prod), sameSite strict, 90일  | ✅      |
| 비밀번호 해싱       | bcrypt (saltRounds: 10)                        | ✅      |
| 비밀번호 정책       | 8~16자, 영문+숫자+특수문자 필수               | ✅      |
| Rate Limiting       | 인증 API: 15분당 10회                          | ✅      |
| Security Headers    | helmet 적용                                    | ✅      |
| CORS                | 허용 origin 지정                               | ✅      |
| 입력 검증           | 이메일/닉네임/비밀번호 정규식 검증             | ✅      |
| 정적 파일 캐시      | 썸네일 7일, immutable                          | ✅      |

---

## 8. 구현 진행률 요약 (v3.0 현행화)

| 영역                        | 전체 항목 | 완료 | 진행률   |
| --------------------------- | --------- | ---- | -------- |
| 인증 시스템 (백엔드)        | 5         | 5    | **100%** |
| 이메일 인증                 | 2         | 2    | **100%** |
| 프론트엔드 UI               | 13 화면   | 13   | **100%** |
| 백엔드 인프라               | 4         | 4    | **100%** |
| 뉴스 CRUD API               | 3         | 3    | **100%** |
| 좋아요/북마크/댓글 API      | 8         | 8    | **100%** |
| 사용자 프로필 API           | 4         | 4    | **100%** |
| 데이터 수집 (크롤링)        | 8         | 8    | **100%** |
| 트렌드 분석 (랭킹)          | 7         | 7    | **100%** |
| AI 뉴스 재구성              | 5         | 5    | **100%** |
| AI 썸네일 생성              | 1         | 1    | **100%** |
| CI/CD 파이프라인            | 2         | 2    | **100%** |
| 디자인 시스템               | 13 화면   | 13   | **100%** |
| **설정/알림 API**           | 2         | 0    | **0%**   |
| **푸시 알림 시스템 (FCM)**  | 6         | 0    | **0%**   |
| **배포/인프라**             | 4         | 1    | **25%**  |
| **모니터링/로깅**           | 3         | 0    | **0%**   |

### 전체 진행률: **약 85%**

---

## 9. 미구현 작업 목록 (우선순위별)

### 9.1 우선순위 높음 (Must) - MVP 출시 전 필수

| #  | ID         | 작업                                        | 상세                                                  | 예상 난이도 |
| -- | ---------- | ------------------------------------------- | ----------------------------------------------------- | ----------- |
| 1  | FR-42/43   | **설정 API 구현**                           | GET/PUT /api/user/settings, DB 테이블+프론트 UI 이미 있음 | 낮음        |
| 2  | NFR-14     | **/health 엔드포인트**                      | DB 연결 상태 + 서버 uptime 반환                        | 낮음        |
| 3  | FR-14      | **비로그인 제한 로직 검증**                 | FREE_LIMIT=3 동작 확인 및 보완                         | 낮음        |
| 4  | FR-60      | **에러 로깅 시스템**                        | Winston 구조화 로깅, 파일+콘솔 출력                    | 중간        |

### 9.2 우선순위 중간 (Should)

| #  | ID         | 작업                                        | 상세                                                  | 예상 난이도 |
| -- | ---------- | ------------------------------------------- | ----------------------------------------------------- | ----------- |
| 5  | FR-13      | **비밀번호 찾기**                           | Resend 인프라 활용, 이메일 인증 후 재설정              | 중간        |
| 6  | FR-24      | **Pull to refresh**                         | 프론트엔드 터치 제스처 구현                             | 낮음        |
| 7  | -          | **프로덕션 배포**                           | EC2 세팅 (Frontend build + Backend + PostgreSQL)       | 높음        |
| 8  | FR-61      | **모니터링**                                | Sentry 에러 추적 연동                                  | 중간        |

### 9.3 우선순위 낮음 (Could) - MVP 이후

| #  | ID         | 작업                                        | 상세                                                  | 예상 난이도 |
| -- | ---------- | ------------------------------------------- | ----------------------------------------------------- | ----------- |
| 9  | FR-40~46   | **푸시 알림 전체 시스템**                   | FCM 연동, 토큰 관리, 스케줄링, 발송                    | 높음        |
| 10 | -          | **토큰 갱신 API**                           | POST /api/auth/refresh (현재 90일 JWT만)               | 중간        |
| 11 | -          | **Redis 캐시**                              | 뉴스 API 캐싱, 세션 관리                               | 중간        |
| 12 | FR-62      | **사용자 통계**                             | DAU, 세션 시간, 뉴스 조회수                            | 중간        |
| 13 | FR-41      | **스마트 알림**                             | 열람 패턴 분석 기반 최적 알림 시간                      | 높음        |

---

## 10. v2.0 → v3.0 주요 변경사항 요약

1. **AI 뉴스 재구성 구현 완료**: Gemini(primary) + OpenAI(fallback) 이중화 LLM (`ai_rewriter.py`)
2. **AI 썸네일 생성 구현 완료**: Gemini 2.5 Flash Image (`image_generator.py`)
3. **뉴스 CRUD API 전체 구현**: GET /api/news, /api/news/:id, /api/news/categories
4. **좋아요/북마크/댓글 API 8개 전체 구현**: `interaction.js`
5. **로그아웃 API 구현**: POST /api/auth/logout
6. **이메일 인증 코드 백엔드 구현**: Resend API 연동 (`auth/send-code`, `auth/verify-code`)
7. **사용자 프로필 관리 구현**: PUT /api/user/profile, DELETE /api/user/account
8. **비로그인 3개 제한 백엔드 구현**: FREE_LIMIT=3 (news.js)
9. **파이프라인 자동화**: `run_daily.py` + GitHub Actions 워크플로우
10. **프론트-백엔드 통합 완료**: 설정 API를 제외한 전체 기능 통합
11. **열람 로그 기록**: user_view_logs 테이블에 뉴스 조회 기록

---

## 11. 프로젝트 일정

### 전체 일정: 4주 (2026.01.27 ~ 2026.02.23)

| 주차    | 단계        | 주요 작업                                                      | 진행 상태  |
| ------- | ----------- | -------------------------------------------------------------- | ---------- |
| 1주차   | 기획/설계   | 요구사항 확정, 화면 정의서, DB 설계, API 명세                  | ✅ 완료    |
| 1~2주차 | 디자인      | 와이어프레임, UI/UX 디자인, 디자인 시스템                      | ✅ 완료    |
| 2~3주차 | 개발        | 백엔드 API, 프론트엔드, AI 파이프라인, 프론트-백엔드 통합      | ✅ 완료    |
| 3~4주차 | 테스트/QA   | 기능 테스트, 파이프라인 테스트, 버그 수정                      | 🔄 진행 중 |
| 4주차   | 배포/문서화 | 프로덕션 배포, 설정 API 마무리, 사용자 가이드                  | ⬜ 예정    |

---

**문서 종료**
