# 개선 제안서 (Improvement Proposal)

**프로젝트**: 오늘 5분 (Five Minute Brief)
**작성일**: 2026-02-09
**기반**: 가상 라운드 테이블 회의 결과 (01_team_roundtable_minutes.md)
**목표**: 프로덕션 배포 전 품질 확보 및 중장기 개선 로드맵 수립

---

## 범례

- **우선순위**: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
- **예상 소요**: 1명 기준 순수 개발 시간
- **카테고리**: BUG(버그), SEC(보안), ARCH(아키텍처), UX(사용자경험), OPS(운영), PERF(성능), QA(품질), BIZ(비즈니스)

---

## Phase 0: 즉시 수정 (Hotfix) — 1~2일

### P0-1. 댓글 삭제/수정 기능 버그 수정
| 항목 | 내용 |
|------|------|
| **우선순위** | 🔴 Critical |
| **카테고리** | BUG |
| **예상 소요** | 2시간 |
| **현상** | `NewsList.tsx` 댓글 삭제 버튼 클릭 시 `toast.success()`만 호출, 실제 `interactionAPI.deleteComment()` 미호출. 수정 버튼도 `toast.info("수정 기능 준비 중")` 상태 |
| **영향** | 사용자가 삭제 성공으로 오인 → 신뢰 하락 |
| **해결방안** | (1) 삭제: `interactionAPI.deleteComment(id)` 호출 후 UI 반영. (2) 수정: `interactionAPI.updateComment(id, content)` 연결 및 인라인 에디터 구현 |
| **관련 파일** | `app/frontend/src/components/NewsList.tsx`, `app/frontend/src/components/NewsDetail.tsx` |

### P0-2. express.json Body Size Limit 추가
| 항목 | 내용 |
|------|------|
| **우선순위** | 🔴 Critical |
| **카테고리** | SEC |
| **예상 소요** | 15분 |
| **현상** | `express.json()` 호출 시 size limit 미설정. 악의적 대용량 JSON으로 서버 메모리 소진 가능 |
| **해결방안** | `express.json({ limit: '1mb' })` 설정 |
| **관련 파일** | `app/backend/server.js` |

### P0-3. 미사용 코드 제거
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | ARCH |
| **예상 소요** | 30분 |
| **현상** | `Login.tsx`, `Signup.tsx` 등 LoginModal로 대체된 독립 페이지가 남아있음 |
| **해결방안** | 미사용 파일 삭제, import 정리 |
| **관련 파일** | `app/frontend/src/pages/Login.tsx`, `app/frontend/src/pages/Signup.tsx` |

---

## Phase 1: 배포 전 필수 작업 — 1~2주

### P1-1. React Router 도입 및 딥링크 지원
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟠 High |
| **카테고리** | ARCH / UX |
| **예상 소요** | 16~20시간 (2~3일) |
| **현상** | 자체 history 배열로 네비게이션 구현. 브라우저 뒤로가기 시 앱 이탈, URL 공유/딥링크 불가 |
| **영향** | (1) 바이럴 공유 불가, (2) SEO 불가, (3) 브라우저 히스토리 비정상 |
| **해결방안** | |
| | 1. `react-router-dom` v7 설치 |
| | 2. 라우트 구조 설계: `/` (홈), `/news/:id` (상세), `/mypage`, `/settings`, `/notifications`, `/login` |
| | 3. `App.tsx`의 view/history 상태를 Router로 대체 |
| | 4. `BottomNav` 탭을 `NavLink`로 변경 |
| | 5. 딥링크 메타태그 추가 (og:title, og:description, og:image) |
| **관련 파일** | `App.tsx`, `Header.tsx`, `BottomNav.tsx`, `main.tsx` 전반 |

### P1-2. App.tsx 상태관리 리팩토링 (Zustand 도입)
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟠 High |
| **카테고리** | ARCH |
| **예상 소요** | 12~16시간 (2일) |
| **현상** | App.tsx에 20개+ useState, 5단계+ prop drilling |
| **해결방안** | |
| | 1. `zustand` 설치 (번들 1KB) |
| | 2. Store 분리: `useNewsStore` (뉴스 목록, 카테고리, 페이지네이션), `useInteractionStore` (좋아요, 북마크), `useUIStore` (뷰모드, 네비게이션) |
| | 3. App.tsx에서 store 호출로 대체 |
| | 4. Prop drilling 제거, 각 컴포넌트에서 직접 store 접근 |
| **관련 파일** | `App.tsx` 및 모든 하위 컴포넌트 |
| **의존성** | P1-1(React Router)과 동시 진행 권장 |

### P1-3. 인증 코드 저장소 Redis 이전
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟠 High |
| **카테고리** | SEC / ARCH |
| **예상 소요** | 8시간 (1일) |
| **현상** | 이메일 인증 코드가 `Map()` 인메모리 저장. 서버 재시작 시 소실, 멀티 인스턴스 미지원, 만료 코드 미정리(메모리 누수) |
| **해결방안** | |
| | 1. Redis 인스턴스 구성 (Docker 또는 AWS ElastiCache) |
| | 2. `ioredis` 패키지 설치 |
| | 3. 인증 코드 `SET key value EX 300` (5분 TTL) |
| | 4. 검증 후 `DEL key` |
| | 5. 기존 `Map` 로직 제거 |
| **관련 파일** | `app/backend/routes/auth.js`, 새파일 `app/backend/config/redis.js` |

### P1-4. JWT Access/Refresh Token 이중 구조
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟠 High |
| **카테고리** | SEC |
| **예상 소요** | 8~10시간 (1일) |
| **현상** | JWT 단일 토큰 90일 만료. 토큰 탈취 시 장기간 악용 가능 |
| **해결방안** | |
| | 1. Access Token: 1시간 만료, httpOnly cookie |
| | 2. Refresh Token: 14일 만료, httpOnly cookie (별도 path: `/api/auth/refresh`) |
| | 3. `/api/auth/refresh` 에서 Refresh Token 검증 후 새 Access Token 발급 |
| | 4. 프론트엔드 Axios 인터셉터는 이미 401 → refresh 로직 보유 (수정 최소화) |
| **관련 파일** | `app/backend/routes/auth.js`, `app/backend/middleware/auth.js`, `app/frontend/src/lib/api.ts` |

### P1-5. Graceful Shutdown 구현
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟠 High |
| **카테고리** | OPS |
| **예상 소요** | 2시간 |
| **현상** | SIGTERM/SIGINT 시그널 핸들링 없음. 진행 중 요청 강제 종료, DB 커넥션 누수 가능 |
| **해결방안** | |
| | 1. `process.on('SIGTERM', gracefulShutdown)` 등록 |
| | 2. `server.close()` → 새 요청 거부, 기존 요청 처리 완료 대기 |
| | 3. `pool.end()` → DB 커넥션 풀 정리 |
| | 4. 강제 종료 타이머 (30초) |
| **관련 파일** | `app/backend/server.js` |

### P1-6. 프로덕션 배포 환경 구성
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟠 High |
| **카테고리** | OPS |
| **예상 소요** | 16~20시간 (2~3일) |
| **현상** | 배포 인프라 미구성 (EC2, Docker, Nginx, SSL 등) |
| **해결방안** | |
| | 1. Dockerfile 작성 (frontend: Nginx static serve, backend: Node.js) |
| | 2. docker-compose.yml (backend + postgres + redis + nginx) |
| | 3. Nginx reverse proxy 설정 (API 프록시, 정적 파일 서빙, gzip) |
| | 4. Let's Encrypt SSL 인증서 (certbot) |
| | 5. EC2 인스턴스 프로비저닝 및 배포 스크립트 |
| | 6. 환경별 `.env` 관리 (.env.production) |
| **관련 파일** | 새파일: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `deploy.sh` |

---

## Phase 2: 배포 직후 개선 (v3.1) — 2~3주

### P2-1. 입력 검증 라이브러리 도입 (Zod)
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | ARCH / SEC |
| **예상 소요** | 10~12시간 (1.5일) |
| **현상** | 이메일 regex 4곳, 비밀번호 regex 3곳 중복. 수작업 검증으로 에러 발생 가능성 높음 |
| **해결방안** | |
| | 1. `zod` 설치 |
| | 2. 스키마 정의: `signupSchema`, `loginSchema`, `commentSchema`, `settingsSchema` 등 |
| | 3. 미들웨어 `validateBody(schema)` 작성 |
| | 4. 각 라우트에서 스키마 검증 미들웨어 적용 |
| | 5. 중복 regex 제거 |
| **관련 파일** | `app/backend/routes/*.js`, 새파일 `app/backend/middleware/validate.js`, `app/backend/schemas/` |

### P2-2. 온보딩 플로우 추가
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | UX / BIZ |
| **예상 소요** | 12~16시간 (2일) |
| **현상** | 첫 방문 사용자에게 서비스 가치 전달 없이 피드 직접 노출 |
| **해결방안** | |
| | 1. 3~4단계 온보딩 화면 (서비스 소개, 관심 카테고리 선택, 알림 시간 설정) |
| | 2. `localStorage`에 온보딩 완료 플래그 저장 |
| | 3. 관심 카테고리 → 기본 필터 적용 |
| | 4. 스킵 가능 |
| **관련 파일** | 새 컴포넌트: `Onboarding.tsx`, `App.tsx` |

### P2-3. GA/분석 도구 연동
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | BIZ |
| **예상 소요** | 4~6시간 |
| **현상** | 사용자 행동 데이터 수집 불가. 데이터 기반 의사결정 불가 |
| **해결방안** | |
| | 1. Google Analytics 4 (GA4) 연동 |
| | 2. 주요 이벤트 트래킹: 페이지뷰, 기사 클릭, 카테고리 변경, 좋아요/북마크, 회원가입, 로그인 |
| | 3. 커스텀 이벤트: 스와이프 방향, 뷰모드 전환, 읽은 기사 수 |
| | 4. Conversion 설정: 회원가입 완료, 첫 좋아요, 첫 댓글 |
| **관련 파일** | `index.html`, 새파일 `app/frontend/src/lib/analytics.ts` |

### P2-4. API 및 프론트엔드 테스트 코드 작성
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | QA |
| **예상 소요** | 20~25시간 (3~4일, 점진적) |
| **현상** | 프론트엔드/백엔드 모두 테스트 코드 0건 |
| **해결방안** | |
| | **백엔드 (Jest + Supertest)**: |
| | - 인증 플로우 (signup → login → refresh → logout) |
| | - 뉴스 CRUD + 페이지네이션 |
| | - 좋아요/북마크 토글 |
| | - 댓글 CRUD + 권한 검증 |
| | **프론트엔드 (Vitest + Testing Library)**: |
| | - 유틸리티 함수 (getRelativeTime, formatCount, getCategoryColor) |
| | - API 레이어 모킹 테스트 |
| | - LoginModal 플로우 |
| **관련 파일** | 새폴더: `app/backend/__tests__/`, `app/frontend/src/__tests__/` |

### P2-5. Rate Limiting 전역 확대
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | SEC |
| **예상 소요** | 3시간 |
| **현상** | Rate limiting이 `/api/auth/*`에만 적용. 댓글 스팸, 좋아요 어뷰징 방어 없음 |
| **해결방안** | |
| | 1. 전역 rate limiter: 100 req/분 |
| | 2. 쓰기 작업(POST/PUT/DELETE): 30 req/분 |
| | 3. 인증 라우트: 기존 10 req/15분 유지 |
| **관련 파일** | `app/backend/server.js` |

### P2-6. 비로그인 유도 UX 개선
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | UX / BIZ |
| **예상 소요** | 6~8시간 (1일) |
| **현상** | 3개 기사 소진 후 단순 로그인 모달만 표시. 가치 전달 부재 |
| **해결방안** | |
| | 1. "무료 회원 가입하고 모든 뉴스 읽기" 유도 배너 |
| | 2. 잠긴 기사 미리보기 (제목 + 요약 2줄 + 블러 처리) |
| | 3. 회원가입 유도 CTA 카드 (피드 중간 삽입) |
| | 4. 남은 무료 기사 수 표시 ("무료 기사 1/3") |
| **관련 파일** | `App.tsx`, `SwipeDeck.tsx`, `NewsList.tsx`, 새 컴포넌트: `SignupCTA.tsx` |

---

## Phase 3: 중장기 개선 (v4.0+) — 1~2개월

### P3-1. DB 마이그레이션 도구 도입
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | OPS / ARCH |
| **예상 소요** | 8~10시간 |
| **해결방안** | `node-pg-migrate` 또는 `knex` migrate 기능 도입. 기존 `setup_database.sql`을 초기 마이그레이션으로 변환 |

### P3-2. 뉴스 목록 Redis 캐싱
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟡 Medium |
| **카테고리** | PERF |
| **예상 소요** | 8~10시간 |
| **해결방안** | 카테고리별 뉴스 목록 Redis 캐시 (TTL 24시간). 파이프라인 DB 적재 시 캐시 무효화 트리거 |

### P3-3. 파이프라인 Slack 알림 연동
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | OPS |
| **예상 소요** | 4시간 |
| **해결방안** | 파이프라인 완료/실패 시 Slack Webhook 발송. 일별 요약 리포트 (생성 기사 수, 품질 메트릭) |

### P3-4. SEO 최적화
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | BIZ |
| **예상 소요** | 20~30시간 |
| **해결방안** | (1) Next.js 전환 또는 Vite SSR 도입, (2) 뉴스 상세 페이지 OG 메타태그 동적 생성, (3) sitemap.xml 자동 생성, (4) 구조화된 데이터(JSON-LD) 추가 |

### P3-5. 다크 모드 지원
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | UX |
| **예상 소요** | 16~20시간 |
| **해결방안** | Tailwind CSS dark: 프리픽스 활용. 테마 컨텍스트 구현, 시스템 설정 연동 |

### P3-6. 계정 열거 방지
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | SEC |
| **예상 소요** | 2시간 |
| **해결방안** | 로그인 실패 시 "이메일 또는 비밀번호가 올바르지 않습니다"로 통합. 회원가입 시 이메일 중복도 동일 응답 |

### P3-7. Cursor-based Pagination 전환
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | PERF |
| **예상 소요** | 6~8시간 |
| **해결방안** | `news_id` 기반 cursor pagination. `WHERE news_id < :cursor ORDER BY news_id DESC LIMIT :limit` |

### P3-8. Selenium → API 기반 크롤링 전환
| 항목 | 내용 |
|------|------|
| **우선순위** | 🟢 Low |
| **카테고리** | OPS / PERF |
| **예상 소요** | 12~16시간 |
| **해결방안** | 네이버 뉴스: RSS 또는 네이버 검색 API 활용. YouTube: 기존 API v3 크롤러를 메인으로 전환. CI/CD 환경 경량화 |

---

## 종합 소요 시간 추정

| Phase | 작업 항목 수 | 예상 총 소요 (인시) | 비고 |
|-------|-------------|---------------------|------|
| Phase 0 (즉시 수정) | 3건 | ~3시간 | 이번 주 내 |
| Phase 1 (배포 전) | 6건 | ~62-76시간 | 1~2주 (Sprint 1) |
| Phase 2 (배포 후 v3.1) | 6건 | ~55-70시간 | 2~3주 (Sprint 2-3) |
| Phase 3 (중장기 v4.0) | 8건 | ~76-100시간 | 1~2개월 |
| **합계** | **23건** | **~196-249시간** | |

---

## 팀원별 추천 업무 리스트

> 각 팀원의 핵심 역할과 주간 작업량을 기반으로 현실적 배분

### 📋 서산화 (기획 PM) — 주 30시간

**Phase 0 (즉시)**
- P0-1 댓글 버그 QA 검증 (0.5h)

**Phase 1 (배포 전)**
- P1-1 React Router 라우트 구조 기획 및 딥링크 URL 체계 정의 (3h)
- P1-6 배포 체크리스트 작성 및 일정 관리 (4h)
- 전체 Phase 1 작업 QA 검증 (6h)

**Phase 2 (v3.1)**
- P2-2 온보딩 플로우 시나리오 기획 (4h)
- P2-3 GA 이벤트 트래킹 항목 정의 (3h)
- P2-6 비로그인 유도 UX 시나리오 기획 (3h)
- Phase 2 QA 검증 (4h)

**주간 예상 부하**: 기획 10h + QA 5h = 15h/주 (여유 있음)

---

### 💻 전인호 (백엔드/DevOps) — 주 35시간

**Phase 0 (즉시)**
- P0-2 express.json body size limit 추가 (0.5h)

**Phase 1 (배포 전) — 핵심 담당**
- P1-3 Redis 도입 + 인증 코드 이전 (8h)
- P1-4 JWT Access/Refresh Token 이중 구조 (10h)
- P1-5 Graceful Shutdown 구현 (2h)
- P1-6 프로덕션 배포 환경 구성 (Docker, Nginx, SSL, EC2) (20h)

**Phase 2 (v3.1)**
- P2-1 Zod 입력 검증 도입 (10h)
- P2-4 백엔드 API 테스트 코드 작성 (12h)
- P2-5 Rate Limiting 전역 확대 (3h)

**주간 예상 부하**: 약 30~35h/주 (풀 가동, Phase 1이 가장 과중)

---

### 🎨 나효진 (기획/프론트엔드: 메인피드/로그인) — 주 35시간

**Phase 0 (즉시)**
- P0-1 댓글 삭제/수정 버그 수정 (2h) — 본인 담당 컴포넌트

**Phase 1 (배포 전) — 핵심 담당**
- P1-1 React Router 도입 (메인 담당: App.tsx, Header, BottomNav) (12h)
- P1-2 Zustand 상태관리 리팩토링 — useNewsStore, useInteractionStore (10h)

**Phase 2 (v3.1)**
- P2-2 온보딩 플로우 UI 구현 (기획: 서산화) (10h)
- P2-6 비로그인 유도 UX UI 구현 (기획: 서산화) (6h)
- P2-3 GA 프론트엔드 연동 (4h)

**주간 예상 부하**: 기획 8h + 개발 22h = 30h/주 (Phase 1 집중)

---

### 💻 정태연 (기획/프론트엔드: 카테고리/설정) — 주 35시간

**Phase 0 (즉시)**
- P0-3 미사용 코드 제거 (Login.tsx, Signup.tsx) (0.5h)

**Phase 1 (배포 전)**
- P1-1 React Router 도입 (서브 담당: Settings, MyPage, EditProfile, Notifications 라우트) (8h)
- P1-2 Zustand 리팩토링 — useUIStore, 카테고리 관련 상태 (6h)

**Phase 2 (v3.1)**
- P2-4 프론트엔드 테스트 코드 작성 (Vitest + Testing Library) (12h)
- P2-2 온보딩 — 카테고리 선택/설정 화면 구현 (6h)

**주간 예상 부하**: 기획 8h + 개발 20h = 28h/주 (여유 있음)

---

### 🎨 김혜선 (디자인) — 주 30시간

**Phase 1 (배포 전)**
- P1-1 라우트 전환 시 트랜지션 애니메이션 디자인 (4h)
- P1-6 배포용 OG 이미지, 파비콘, 로딩 화면 디자인 (6h)

**Phase 2 (v3.1)**
- P2-2 온보딩 플로우 UI/UX 디자인 (12h)
- P2-6 비로그인 유도 배너/CTA 카드 디자인 (6h)

**Phase 3 (v4.0)**
- P3-5 다크 모드 디자인 시스템 (16h)

**주간 예상 부하**: 약 15~20h/주 (Phase 2에서 집중)

---

## 주차별 로드맵 요약

```
Week 1 (Sprint 1 전반):
  전인호: P0-2, P1-3(Redis), P1-5(Graceful Shutdown)
  나효진: P0-1(댓글 버그), P1-1(React Router 메인)
  정태연: P0-3(코드 정리), P1-1(React Router 서브)
  서산화: P1-1 URL 기획, QA
  김혜선: P1-6 배포 에셋

Week 2 (Sprint 1 후반):
  전인호: P1-4(JWT 이중구조), P1-6(Docker/Nginx)
  나효진: P1-2(Zustand 리팩토링)
  정태연: P1-2(Zustand 서브)
  서산화: Phase 1 통합 QA
  김혜선: P1-1 트랜지션 디자인

Week 3 (배포):
  전인호: P1-6(EC2 배포, SSL)
  전원: 배포 QA 및 핫픽스

Week 4-5 (Sprint 2: v3.1):
  전인호: P2-1(Zod), P2-5(Rate Limit)
  나효진: P2-2(온보딩), P2-3(GA)
  정태연: P2-4(테스트), P2-2(카테고리 선택)
  서산화: 기획 + QA
  김혜선: P2-2(온보딩 디자인), P2-6(CTA 디자인)

Week 6+ (Sprint 3: v3.1 마무리):
  전인호: P2-4(백엔드 테스트)
  나효진: P2-6(비로그인 UX)
  정태연: P2-4(프론트엔드 테스트 마무리)
  서산화: v3.1 릴리즈 관리
```

---

## 리스크 및 대응 방안

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| React Router 마이그레이션 중 기존 기능 회귀 | 중 | 높 | 마이그레이션 전 주요 플로우 수동 QA 체크리스트 작성 |
| Redis 인프라 비용 증가 | 낮 | 중 | AWS ElastiCache t3.micro (무료 티어) 활용 |
| 배포 후 서버 장애 | 중 | 높 | Health check + PM2 자동 재시작 + Sentry 알림 |
| 파이프라인 크롤링 실패 빈도 증가 | 중 | 중 | 전날 데이터 폴백 로직 + Slack 즉시 알림 |
| Phase 1 일정 지연 | 중 | 중 | Phase 1 핵심(#1-5)과 부가(#6) 분리, 최소 배포 가능 상태 정의 |

---

**문서 작성**: 가상 개발팀 시뮬레이터
**최종 검토**: 2026-02-09
