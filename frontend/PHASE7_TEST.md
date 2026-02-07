# Phase 7: 프론트엔드 기본 설정 테스트 가이드

## 🎯 개발 목표

- React 프로젝트 생성 완료
- Axios 설정 완료
- API 연동 테스트

---

## ✅ 구현 완료 사항

### 1. React 프로젝트 생성
- ✅ Vite + React + TypeScript 프로젝트 생성
- ✅ 필요한 패키지 설치 (axios)

### 2. Axios 설정
- ✅ `src/lib/axios.ts`: Axios 인스턴스 설정
- ✅ `withCredentials: true`: httpOnly cookie 전송
- ✅ 요청/응답 인터셉터 설정

### 3. API 함수
- ✅ `src/lib/api.ts`: API 호출 함수들
  - `authAPI.signup`: 회원가입
  - `authAPI.login`: 로그인
  - `userAPI.getProfile`: 프로필 조회
  - `userAPI.getMe`: 내 정보 조회

### 4. 테스트 페이지
- ✅ `App.tsx`: API 테스트 버튼 포함

---

## 🧪 테스트 방법

### 방법 1: 웹 브라우저 테스트

1. **프론트엔드 서버 실행**
   ```bash
   cd frontend
   npm run dev
   ```

2. **브라우저에서 접속**
   ```
   http://localhost:5173
   ```

3. **백엔드 서버 확인**
   - 백엔드 서버가 실행 중이어야 합니다 (`http://localhost:3000`)

4. **테스트 시나리오**

   **시나리오 1: 회원가입 테스트**
   - "회원가입 테스트" 버튼 클릭
   - 예상 결과: ✅ 회원가입 성공 메시지

   **시나리오 2: 로그인 테스트**
   - "로그인 테스트" 버튼 클릭
   - 예상 결과: ✅ 로그인 성공 메시지 (토큰 저장됨)

   **시나리오 3: 프로필 조회 테스트**
   - 먼저 로그인 후
   - "프로필 조회 (DB)" 버튼 클릭
   - 예상 결과: ✅ 사용자 정보 반환

   **시나리오 4: 내 정보 조회 테스트**
   - 로그인 후
   - "내 정보 조회 (토큰)" 버튼 클릭
   - 예상 결과: ✅ 토큰에서 사용자 정보 반환

---

### 방법 2: 터미널에서 확인

```bash
# 프론트엔드 서버 실행 확인
curl http://localhost:5173

# 백엔드 서버 실행 확인
curl http://localhost:3000
```

---

## 🔍 검증 체크리스트

### 기본 기능
- [ ] 프론트엔드 서버가 정상 실행됨 (`http://localhost:5173`)
- [ ] 백엔드 서버가 정상 실행됨 (`http://localhost:3000`)
- [ ] 회원가입 API 호출 성공
- [ ] 로그인 API 호출 성공
- [ ] 프로필 조회 API 호출 성공 (로그인 후)
- [ ] 내 정보 조회 API 호출 성공 (로그인 후)

### CORS 설정
- [ ] API 호출 시 CORS 에러가 발생하지 않음
- [ ] httpOnly cookie가 정상적으로 전송됨

### 에러 처리
- [ ] 로그인하지 않은 상태에서 프로필 조회 시 401 에러
- [ ] 에러 메시지가 화면에 표시됨

---

## 🎯 완료 기준

**✅ Phase 7 완료 조건:**
1. ✅ React 프로젝트 생성 및 실행
2. ✅ Axios 설정 완료
3. ✅ API 호출 함수 생성
4. ✅ API 테스트 페이지에서 모든 API 호출 성공
5. ✅ CORS 에러 없이 정상 작동

---

## 📝 다음 단계

Phase 7이 완료되면:
- **Phase 8**: 회원가입 폼 개발 (디자인 반영)
- **Phase 9**: 로그인 폼 개발 (디자인 반영)

---

## 🐛 문제 해결

### CORS 에러 발생 시

백엔드 `server.js`에서 CORS 설정 확인:
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

### 서버 연결 오류

1. 백엔드 서버 실행 확인: `cd backend && npm start`
2. 프론트엔드 서버 실행 확인: `cd frontend && npm run dev`
3. 포트 확인: 백엔드(3000), 프론트엔드(5173)

---

**테스트해보시고 결과를 알려주세요!** 🎉
