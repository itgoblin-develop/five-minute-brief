# 5늘 5분 (five-minute-brief)

매일 5분, 뉴스를 요약해서 보여주는 **5늘 5분** 앱입니다.

- **저장소**: [itgoblin-develop/five-minute-brief](https://github.com/itgoblin-develop/five-minute-brief)
- **기본 브랜치**: `jung`

---

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 **http://localhost:5173/** 로 접속하세요.

---

## 기술 스택

- **TypeScript** + **React 18** + **Vite 5**
- 인라인 스타일 + CSS (Pretendard)

---

## 주요 기능

- **홈**: 카드 스와이프 / 리스트 뷰, 카테고리 필터 (전체, 트렌딩, 경제, 재테크, 사회)
- **뉴스 상세**: AI 3줄 요약, 좋아요/북마크, 댓글, 공유
- **좋아요 / 북마크**: 하단 네비로 모아보기
- **마이페이지**: 프로필, PUSH 알림(요일/시간 설정), 이용약관/개인정보처리방침

---

## 프로젝트 구조

| 경로 | 설명 |
|------|------|
| `src/App.tsx` | 메인 앱 (전체 화면·상태·라우팅) |
| `src/main.tsx` | React 진입점 |
| `src/types/news.ts` | 뉴스/댓글 타입 정의 |
| `index.html` | HTML 진입, `#root` 마운트 |

---

## 개발 요약

지금까지의 개발 내용과 구조는 **[DEVELOPMENT.md](./DEVELOPMENT.md)** 에 정리해 두었습니다.

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (Vite) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | TypeScript 타입 검사 |
