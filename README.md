# 오늘5분 - 아침 트렌드 뉴스 서비스

## 📋 프로젝트 개요

출근길 5분 만에 트렌드를 파악하는 고효율 AI 뉴스 요약 서비스

## 📚 핵심 문서

### 1. `TREND_POLICY.md`
- 아침 트렌드 뉴스 수집 정책
- 하이브리드 전략 (데이터랩 API + 뉴스 검색 API)
- 전체 프로세스 플로우 및 상세 정책

### 2. `IMPLEMENTATION_SCENARIO.md`
- 구현 완료 후 예시 시나리오
- 단계별 실행 프로세스
- 최종 결과 및 사용자 경험

## 🚀 다음 개발 시작 시

1. `TREND_POLICY.md`와 `IMPLEMENTATION_SCENARIO.md` 문서 참고
2. 정책에 따라 새로운 코드 작성
3. 데이터랩 API + 뉴스 검색 API 하이브리드 방식으로 구현

## 📁 현재 프로젝트 구조

```
five-minute-brief/
├── TREND_POLICY.md              # 핵심 정책 문서
├── IMPLEMENTATION_SCENARIO.md    # 구현 시나리오
├── requirements.txt              # Python 라이브러리 (다음 개발 시 사용)
├── .env                         # API 인증 정보 (Git에 포함 안 됨)
├── .gitignore                   # Git 제외 파일
└── README.md                    # 이 파일
```

## 🔑 API 인증 정보

- 네이버 Client ID: `aSMcA0xnw7ZwzMEXIz4K`
- 네이버 Client Secret: `L2Y0JNL38w`
- `.env` 파일에 저장되어 있음

## 💡 핵심 정책 요약

1. **데이터랩 API로 트렌드 키워드 먼저 파악**
2. **선정된 키워드로 뉴스 검색**
3. **카테고리별 균형 유지**
4. **스마트 필터링 (명사 중심, 출처 다양성 고려)**

---

**다음 개발 시작 시 `TREND_POLICY.md`와 `IMPLEMENTATION_SCENARIO.md`를 참고하여 구현하세요.**
