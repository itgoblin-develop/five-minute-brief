# 5늘 5분 — 개발 요약

## 프로젝트 개요

- **저장소**: [itgoblin-develop/five-minute-brief](https://github.com/itgoblin-develop/five-minute-brief)
- **브랜치**: `jung`
- **앱 이름**: 5늘 5분 (오늘 5분) — 매일 5분 뉴스 요약/큐레이션 앱

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | TypeScript |
| UI | React 18 |
| 빌드/개발서버 | Vite 5 |
| 스타일 | 인라인 스타일 + CSS (Pretendard 폰트) |

---

## 구현된 기능

### 1. 홈 (뉴스 피드)
- **카드 스와이프 뷰**: 좌우 스와이프로 카드 전환, 드래그 시 회전/이동 애니메이션
- **리스트 뷰**: 그리드/리스트 토글
- **카테고리 필터**: 전체, 트렌딩, 경제, 재테크, 사회
- **카드 정보**: 카테고리, 제목, 요약, 태그, 날짜, 좋아요/북마크/댓글 수

### 2. 뉴스 상세
- 제목, 날짜, 본문
- **AI 3줄 요약** 박스
- 좋아요/북마크
- 카카오 공유, 링크 복사
- **댓글**: 목록 표시, 새 댓글 입력 UI

### 3. 좋아요 / 북마크
- 하단 네비: 홈, 좋아요, 북마크, 마이페이지
- 좋아요/북마크한 뉴스만 모아서 리스트로 표시

### 4. 마이페이지
- 프로필 영역 (OOO님, 내 정보 수정)
- **PUSH 알림**: 온/오프, 요일 선택(평일/주말/매일), 시간 설정, 타임 피커
- 나의 활동: 나의 북마크, 나의 좋아요, 나의 댓글
- 고객지원: 서비스 이용약관, 개인정보 처리방침
- 로그아웃

### 5. 기타
- **토스트**: 첫 좋아요 시 안내 메시지
- **데이터**: 12개 뉴스 목업 (NEWS_DATA), 댓글 목업 포함

---

## 프로젝트 구조

```
5nil-5min/
├── index.html          # 진입점 (React 마운트)
├── package.json
├── vite.config.ts      # Vite + React 플러그인
├── tsconfig.json
├── src/
│   ├── main.tsx        # React 진입, <App /> 마운트
│   ├── App.tsx         # 메인 앱 (전체 화면/라우팅/상태)
│   ├── index.css       # 전역 스타일, Pretendard
│   ├── vite-env.d.ts
│   └── types/
│       └── news.ts     # NewsItem, CommentItem 타입
├── public/
│   ├── style.css
│   └── main.js
├── README.md
└── DEVELOPMENT.md      # 본 문서 (개발 요약)
```

---

## 개발 이력 요약

1. **프로젝트 생성**: 5nil-5min 폴더, Vite 기반
2. **원격 연결**: `git@github.com:itgoblin-develop/five-minute-brief.git` (SSH)
3. **오늘5분 전체앱 반영**: `오늘5분_전체앱 (1).jsx` → TypeScript(TSX) 변환
4. **타입 정의**: `NewsItem`, `CommentItem` (src/types/news.ts)
5. **React + TypeScript 설정**: React 18, @vitejs/plugin-react, tsconfig
6. **jung 브랜치**: 최초 커밋을 `jung` 브랜치에 생성 후 푸시

---

## 로컬 실행

```bash
cd 5nil-5min
npm install
npm run dev
```

브라우저: **http://localhost:5173/**

---

## 빌드

```bash
npm run build
```

산출물: `dist/` (배포용 정적 파일)
