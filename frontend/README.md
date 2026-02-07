# 오늘5분 - 프론트엔드

React + TypeScript + Vite로 구성된 프론트엔드 프로젝트입니다.

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드

```bash
npm run build
```

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── lib/
│   │   ├── axios.ts      # Axios 설정
│   │   └── api.ts        # API 호출 함수들
│   ├── App.tsx           # 메인 컴포넌트
│   └── main.tsx          # 진입점
└── package.json
```

## 🔌 API 연동

### Axios 설정

- `src/lib/axios.ts`: Axios 인스턴스 설정
- `withCredentials: true`: httpOnly cookie 전송

### API 함수

- `src/lib/api.ts`: API 호출 함수들
  - `authAPI`: 회원가입, 로그인
  - `userAPI`: 프로필 조회, 내 정보 조회

## 🧪 테스트

현재 `App.tsx`에 API 테스트 버튼이 포함되어 있습니다.

1. 회원가입 테스트
2. 로그인 테스트
3. 프로필 조회 테스트
4. 내 정보 조회 테스트

## 📝 다음 단계

- Phase 8: 회원가입 폼 개발
- Phase 9: 로그인 폼 개발
