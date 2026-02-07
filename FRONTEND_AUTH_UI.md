## 오늘5분 - 인증 프론트엔드 협업 메모

### 1. 회원가입 페이지 (Signup)

- **파일 위치**: `frontend/src/pages/Signup.tsx`
- **역할**: 새 사용자를 회원가입시키고, 성공 시 자동 로그인 상태(JWT 쿠키)까지 만드는 화면
- **주요 필드**:
  - 아이디: 이메일 형식 (`email`)
  - 비밀번호: 8~16자리, **영문 + 숫자 혼합** (`password`)
  - 비밀번호 재확인 (`passwordConfirm`)
  - 이름: 닉네임으로 사용 (`name` → 백엔드의 `nickname`으로 전달)
  - 체크박스 3개: 만 14세 이상, 서비스 이용약관, 개인정보수집방침 동의
- **유효성 검사(프론트)**:
  - 모든 필드 필수 입력
  - 비밀번호 규칙: `8~16자, 영문과 숫자를 모두 포함`
  - 비밀번호 재확인: 비밀번호와 일치 여부 검사
  - 필수 체크박스 3개 모두 체크 필요
  - 에러는 각 필드 아래 **빨간 문구**로 즉시 표시 (blur 시 + 제출 시)
- **백엔드 연동**:
  - `authAPI.signup(email, name, password)` 호출 → `POST /api/auth/signup`
  - 성공 시: 백엔드에서 `users` 테이블에 저장 + JWT 토큰 발급 + httpOnly 쿠키(`token`) 저장
  - 프론트 메시지: `✅ 회원가입이 완료되었습니다. 자동 로그인 상태가 됩니다.`

---

### 2. 비밀번호 규칙 (백엔드 + 프론트 공통)

- **규칙**: `8~16자, 영문과 숫자를 모두 포함`
- **백엔드 검증** (`backend/routes/auth.js`):
  - 정규식: `^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$`
  - 실패 시 응답:
    ```json
    { "success": false, "error": "비밀번호는 8~16자, 영문과 숫자를 모두 포함해야 합니다" }
    ```
- **프론트 검증** (`SignupPage`):
  - 같은 정규식으로 즉시 검사
  - 에러 문구: `비밀번호는 8~16자, 영문과 숫자를 모두 포함해야 합니다.`

---

### 3. 로그인 페이지 (Login) - 디자인 기준

- **디자인 요소 (Figma 기준)**:
  - 상단 로고 `5늘5분`
  - 아이디(이메일) 입력칸
  - 비밀번호 입력칸 (8~16자리 영문+숫자 안내, 눈 아이콘은 추후 아이콘 라이브러리로 처리)
  - 파란색 **로그인 버튼** (가장 강조)
  - 검은색 **회원가입 버튼** (두 번째 버튼)
  - 하단 `비회원으로 이용하기` 텍스트
- **역할**:
  - 기존 사용자가 이메일/비밀번호로 로그인
  - 성공 시 JWT 토큰을 httpOnly 쿠키에 저장 (이미 백엔드 구현 완료)

---

### 4. 라우팅 / 화면 이동 설계 (간단 버전)

> 아직 React Router는 쓰지 않고, **앱 내부 상태로만 페이지를 전환**하는 구조 (URL은 바뀌지 않음).  
> 나중에 라우터를 도입하면 `/login`, `/signup` 경로로 자연스럽게 확장 가능.

- **진입점**: `frontend/src/App.tsx`
  - 내부 상태로 현재 페이지를 관리 (예: `'login' | 'signup'`)
  - 예시:
    ```tsx
    const [page, setPage] = useState<'login' | 'signup'>('login');

    return page === 'signup'
      ? <SignupPage onGoLogin={() => setPage('login')} />
      : <LoginPage onGoSignup={() => setPage('signup')} />;
    ```
- **회원가입 → 로그인 이동**:
  - `SignupPage`의 하단 "로그인" 버튼에서 `onGoLogin` 콜백 호출
  - App에서 `setPage('login')` 실행 → 로그인 화면으로 전환
- **로그인 → 회원가입 이동**:
  - `LoginPage`의 "회원가입" 버튼에서 `onGoSignup` 콜백 호출
  - App에서 `setPage('signup')` 실행 → 회원가입 화면으로 전환

※ 이 구조 덕분에 **URL을 건드리지 않고도** 두 화면을 쉽게 오가며 개발/테스트 가능.  
나중에 React Router를 도입하면, `App`에서 라우터로 바꾸고 각 페이지를 라우트에 연결하면 됨.

---

### 5. 협업 시 참고 포인트

- **백엔드 담당자**:
  - 이미 `/api/auth/signup`, `/api/auth/login` 구현 완료
  - JWT + httpOnly 쿠키 + 인증 미들웨어(`/api/user/profile`, `/api/user/me`)까지 구현됨
- **프론트 담당자 (다른 팀원)**:
  - 로그인 후 보여줄 메인 피드/서비스 페이지를 구현
  - 토큰이 있을 때/없을 때 라우팅 분기 (`/login`, `/signup`, `/feed` 등)를 React Router 기준으로 설계
  - 현재 회원가입/로그인 폼은 API와 연동된 상태이므로, 성공 시 원하는 페이지로 `navigate`만 추가하면 됨.

---

### 6. 앞으로 할 일 (프론트 기준)

1. 로그인 페이지 UI 구현 (`LoginPage`)
2. `SignupPage`의 "로그인" 버튼 → `LoginPage`로 전환
3. `LoginPage`의 "회원가입" 버튼 → `SignupPage`로 전환
4. 추후 React Router 도입 시:
   - `/login` → 로그인 페이지
   - `/signup` → 회원가입 페이지
   - `/` 또는 `/feed` → 서비스 메인 피드

{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}