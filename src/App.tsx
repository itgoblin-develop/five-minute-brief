import { useState, useRef } from "react";
import type { NewsItem } from "./types/news";

// ─── DATA ───────────────────────────────────────────────────────
const NEWS_DATA: NewsItem[] = [
  {
    id: 1, category: "트렌딩", title: "생성형 AI, 이제 '감정'까지 읽는다... 인간과 깊은 교감 가능해져",
    summary: "최근 발표된 최신 멀티모달 AI 모델들은 인간의 언어 뒤에 숨겨진 비언어적 데이터에 주목하고 있습니다. 기존 AI가 '무엇을 말하는가'에 집중했다면, 이제는 '어떤 감정으로 말하는가'를 분석하기 시작한 것입니다.",
    tags: ["#생성AI", "#감정분석", "#멀티모달"], date: "2026.01.30", likes: 1200, bookmarks: 343, comments: 89,
    body: "최근 발표된 차세대 생성형 AI 모델이 단순히 정보를 처리하는 것을 넘어, 사용자의 목소리 톤, 텍스트의 뉘앙스, 심지어 대화 맥락에서의 감정 변화까지 감지할 수 있는 수준으로 진화했습니다.\n\n기술 전문가들은 이러한 '감성 AI'가 우울증 환자를 위한 심리 상담이나, 고객의 불만을 즉각적으로 감지해야 하는 서비스 산업에 큰 변화를 가져올 것으로 예측합니다. AI가 마치 사람처럼 공감하고 위로하는 시대가 열린 것입니다.\n\n하지만 일각에서는 AI가 개인의 내밀한 감정 영역까지 데이터화하는 것에 대해 깊은 우려를 표하고 있습니다. 감정 데이터의 오남용을 막기 위한 강력한 법적 규제가 필요하다는 목소리가 높아지고 있습니다.",
    aiSummary: ["최신 AI 모델, 텍스트 넘어 뉘앙스와 감정 분석", "심리 상담, 고객 서비스 분야 혁신 예고", "윤리적 문제와 프라이버시 침해 우려도 제기"],
    commentsData: [
      { user: "뉴스러버", time: "방금 전", text: "정말 유익한 기사네요! 잘 읽었습니다.", isMine: false },
      { user: "나", time: "5분 전", text: "이 뉴스 정말 흥미롭네요! 앞으로도 좋은 기사 부탁드려요.", isMine: true },
      { user: "트렌드세터", time: "10분 전", text: "요즘 이런 이슈가 중요하죠.", isMine: false },
    ],
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    img: "🤖"
  },
  {
    id: 2, category: "경제", title: "글로벌 공급망 재편, '메이드 인 아세안' 뜬다",
    summary: "미중 갈등이 장기화되면서 글로벌 기업들의 공급망 다변화가 가속화되고 있습니다. 특히 베트남, 인도네시아, 태국 등 아세안 국가들이 새로운 생산 거점으로 급부상하고 있습니다.",
    tags: ["#공급망", "#아세안", "#글로벌경제"], date: "2026.01.30", likes: 433, bookmarks: 150, comments: 23,
    body: "미중 무역 갈등이 장기화되면서 글로벌 기업들이 중국 의존도를 낮추기 위한 공급망 다변화에 본격적으로 나서고 있습니다.\n\n특히 베트남, 인도네시아, 태국 등 아세안 국가들이 낮은 인건비와 풍부한 노동력을 바탕으로 새로운 세계의 공장으로 부상하고 있습니다. 삼성전자, 애플 등 주요 글로벌 기업들이 이미 아세안 지역에 대규모 투자를 진행 중입니다.",
    aiSummary: ["미중 갈등 장기화로 공급망 다변화 가속", "아세안 국가들, 새로운 글로벌 생산 거점으로 부상", "한국 기업들의 아세안 투자 전략 분석"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    img: "🌏"
  },
  {
    id: 3, category: "재테크", title: "비트코인 반감기 이후, 슈퍼 사이클 다시 올까?",
    summary: "비트코인 4차 반감기가 완료된 가운데, 암호화폐 시장에 대한 기대와 우려가 공존하고 있습니다. 과거 반감기 이후의 패턴을 분석하며 전문가들의 전망을 정리했습니다.",
    tags: ["#비트코인", "#가상자산", "#투자전략"], date: "2026.01.30", likes: 5600, bookmarks: 2300, comments: 890,
    body: "비트코인의 4차 반감기가 성공적으로 완료되었습니다. 반감기란 약 4년마다 비트코인 채굴 보상이 절반으로 줄어드는 이벤트로, 역사적으로 가격 상승의 촉매제 역할을 해왔습니다.\n\n과거 3차례의 반감기 이후 비트코인은 각각 9,200%, 2,900%, 700%의 상승률을 기록했습니다. 이번에도 유사한 패턴이 반복될 것이라는 낙관론이 우세하지만, 규제 리스크와 거시경제 불확실성을 고려해야 한다는 신중론도 만만치 않습니다.",
    aiSummary: ["비트코인 4차 반감기 완료, 시장 기대감 고조", "과거 패턴 분석: 매 반감기 후 큰 폭 상승", "규제 리스크와 거시경제 변수 주의 필요"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    img: "₿"
  },
  {
    id: 4, category: "사회", title: "저출산 쇼크, '소멸 예정' 지방 도시들의 생존 몸부림",
    summary: "출생률이 역대 최저를 기록한 가운데, 전국 228개 시군구 중 절반 이상이 '소멸위험지역'으로 분류되었습니다. 각 지자체의 특색 있는 인구 유입 정책을 살펴봅니다.",
    tags: ["#저출산", "#지방소멸", "#인구절벽"], date: "2026.01.30", likes: 880, bookmarks: 300, comments: 150,
    body: "한국의 합계출산율이 0.65명으로 역대 최저를 경신했습니다. 이는 OECD 국가 중 압도적 꼴찌로, '인구 소멸'이라는 표현이 과장이 아닌 현실이 되고 있습니다.\n\n특히 지방 중소도시의 위기가 심각합니다. 전국 228개 시군구 중 절반 이상이 소멸위험지역으로 분류되었으며, 일부 지역은 20년 내 소멸이 예측되고 있습니다.",
    aiSummary: ["합계출산율 0.65명, 역대 최저 경신", "228개 시군구 중 절반 이상 소멸위험지역", "각 지자체별 특색 있는 인구 유입 정책 추진"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    img: "🏘️"
  },
  {
    id: 5, category: "경제", title: "기준금리 2% 시대 도래하나... 한은 총재 발언 분석",
    summary: "한국은행 총재의 최근 발언이 시장에 파장을 일으키고 있습니다. 기준금리 인하 시그널로 해석되는 발언의 배경과 향후 전망을 분석합니다.",
    tags: ["#금리인하", "#한국은행", "#부동산"], date: "2026.01.29", likes: 2100, bookmarks: 980, comments: 210,
    body: "한국은행 총재가 최근 기자간담회에서 '경기 하방 리스크가 상방 리스크보다 크다'고 발언하며 시장에 금리 인하 시그널을 보냈습니다.\n\n전문가들은 이번 발언이 올해 중 기준금리를 현재 2.75%에서 2.0%대까지 인하할 수 있다는 가능성을 시사한 것으로 분석하고 있습니다.",
    aiSummary: ["한은 총재, 경기 하방 리스크 언급으로 금리 인하 시그널", "연내 기준금리 2.0%대 인하 가능성 제기", "부동산·주식 시장에 미칠 영향 분석"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    img: "📊"
  },
  {
    id: 6, category: "트렌딩", title: "메타버스 오피스 출근 1년, 무엇이 달라졌나?",
    summary: "주요 IT 기업들이 메타버스 오피스를 도입한 지 1년이 지났습니다. 실제 현장의 생산성과 만족도 변화를 데이터로 분석합니다.",
    tags: ["#메타버스", "#재택근무", "#오피스혁신"], date: "2026.01.29", likes: 856, bookmarks: 120, comments: 45,
    body: "네이버, 카카오 등 주요 IT 기업들이 메타버스 오피스 시스템을 본격 도입한 지 1년이 지났습니다. 가상 공간에서의 업무가 현실이 된 지금, 그 성과와 한계를 짚어봅니다.",
    aiSummary: ["주요 IT 기업 메타버스 오피스 1년차 평가", "생산성 12% 향상, 만족도는 엇갈려", "하이브리드 근무 모델로의 진화 전망"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    img: "🥽"
  },
  {
    id: 7, category: "재테크", title: "강남 아파트 대신 '꼬마 빌딩'? 자산가들의 포트폴리오 변화",
    summary: "초고가 아파트 시장이 조정을 받는 가운데, 자산가들 사이에서 소형 상업용 건물 투자가 새로운 트렌드로 떠오르고 있습니다.",
    tags: ["#부동산", "#꼬마빌딩", "#자산관리"], date: "2026.01.29", likes: 890, bookmarks: 450, comments: 67,
    body: "강남 3구 아파트 가격이 고점 대비 15% 이상 조정을 받으면서 자산가들의 투자 방향이 변화하고 있습니다. 최근 주목받는 것은 50억~100억 원대의 소형 상업용 건물, 이른바 '꼬마 빌딩'입니다.",
    aiSummary: ["강남 아파트 15% 조정, 투자 방향 전환", "'꼬마 빌딩' 투자 수요 급증", "월세 수익률과 시세차익 동시 추구 전략"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    img: "🏢"
  },
  {
    id: 8, category: "사회", title: "의대 정원 확대 2년, 지역 의료 공백 메워졌나?",
    summary: "의대 정원 확대 정책 시행 2년차, 지역 의료 현장의 변화를 점검합니다. 기대와 현실의 간극을 데이터로 분석합니다.",
    tags: ["#의대정원", "#지역의료", "#의료개혁"], date: "2026.01.29", likes: 1100, bookmarks: 450, comments: 220,
    body: "의대 정원 확대 정책이 시행된 지 2년이 지났습니다. 정부는 지역 의료 인력 부족 문제를 해결하기 위해 이 정책을 추진했지만, 현장에서는 여전히 의사 부족을 호소하고 있습니다.",
    aiSummary: ["의대 정원 확대 2년차 성과 점검", "지역 의료 인력 부족 여전히 심각", "실효성 있는 지역 의료 정책 대안 모색"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)",
    img: "🏥"
  },
  {
    id: 9, category: "트렌딩", title: "'입는 스마트폰' 시대 개막, 화면이 사라진다",
    summary: "웨어러블 AI 디바이스가 스마트폰을 대체할 것이라는 전망이 나오고 있습니다. 손목, 안경, 귀걸이 형태의 차세대 디바이스를 분석합니다.",
    tags: ["#웨어러블", "#AI디바이스", "#기술혁신"], date: "2026.01.28", likes: 2300, bookmarks: 890, comments: 156,
    body: "애플, 구글, 메타 등 빅테크 기업들이 앞다투어 웨어러블 AI 디바이스를 출시하며 '포스트 스마트폰' 시대를 예고하고 있습니다.",
    aiSummary: ["빅테크 기업들의 웨어러블 AI 디바이스 경쟁 본격화", "AR 안경, AI 이어버드 등 다양한 폼팩터 등장", "2028년까지 스마트폰 사용 시간 30% 감소 전망"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #f5576c 0%, #ff9a9e 100%)",
    img: "⌚"
  },
  {
    id: 10, category: "경제", title: "K-푸드 수출 100억 달러 달성, 라면 넘어 '김밥'까지",
    summary: "한국 식품 수출이 사상 최초로 100억 달러를 돌파했습니다. 라면과 김치를 넘어 김밥, 떡볶이 등 간편식이 새로운 수출 효자로 떠올랐습니다.",
    tags: ["#K푸드", "#수출", "#한류"], date: "2026.01.27", likes: 3400, bookmarks: 990, comments: 450,
    body: "한국 식품 수출이 사상 최초로 연간 100억 달러를 돌파하며 새로운 이정표를 세웠습니다. K-푸드의 글로벌 인기가 단순한 유행을 넘어 하나의 문화 현상으로 자리잡고 있습니다.",
    aiSummary: ["K-푸드 수출 100억 달러 사상 최초 돌파", "김밥·떡볶이 등 간편식이 새로운 수출 효자", "한류 콘텐츠와의 시너지로 글로벌 확산 가속"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    img: "🍙"
  },
  {
    id: 11, category: "사회", title: "MZ세대 휩쓰는 '갓생' 열풍, 피로 사회의 단면인가?",
    summary: "새벽 5시 기상, 운동, 독서, 자기계발... MZ세대 사이에서 '갓생 살기' 열풍이 불고 있습니다. 이 현상의 이면을 분석합니다.",
    tags: ["#갓생", "#MZ세대", "#자기계발"], date: "2026.01.28", likes: 3400, bookmarks: 1500, comments: 560,
    body: "소셜미디어에서 '#갓생 살기' 해시태그가 누적 조회수 50억 회를 돌파했습니다. 새벽 기상부터 운동, 독서, 자기계발까지 하루를 알차게 보내는 것을 목표로 하는 이 트렌드는 MZ세대의 새로운 라이프스타일로 자리잡았습니다.",
    aiSummary: ["'갓생 살기' 해시태그 50억 회 조회 돌파", "성취 욕구와 불안감이 공존하는 MZ세대 심리", "지나친 자기 최적화가 번아웃으로 이어질 우려"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    img: "💪"
  },
  {
    id: 12, category: "트렌딩", title: "숏폼의 진화, 이제는 '숏드라마'가 대세",
    summary: "1분 이내의 숏폼 콘텐츠를 넘어, 5~10분 분량의 숏드라마가 새로운 콘텐츠 트렌드로 부상하고 있습니다.",
    tags: ["#숏드라마", "#콘텐츠", "#OTT"], date: "2026.01.27", likes: 5700, bookmarks: 1200, comments: 342,
    body: "틱톡, 유튜브 쇼츠 등 숏폼 플랫폼에서 5~10분 분량의 드라마 형식 콘텐츠가 폭발적인 인기를 끌고 있습니다.",
    aiSummary: ["숏드라마 시장 규모 전년 대비 300% 성장", "중국발 숏드라마 플랫폼의 글로벌 확장", "기존 OTT 플랫폼도 숏드라마 제작에 뛰어들어"],
    commentsData: [],
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    img: "🎬"
  },
];

const formatCount = (n: number): string =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

const CATEGORIES: readonly string[] = ["전체", "트렌딩", "경제", "재테크", "사회"];

// ─── ICONS (SVG components) ─────────────────────────────────────
const HeartIcon = ({ filled, size = 20 }: { filled?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#EF4444" : "none"} stroke={filled ? "#EF4444" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const BookmarkIcon = ({ filled, size = 20 }: { filled?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#3B82F6" : "none"} stroke={filled ? "#3B82F6" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

const CommentIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#3B82F6" : "none"} stroke={active ? "#3B82F6" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const HeartNavIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#3B82F6" : "none"} stroke={active ? "#3B82F6" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const BookmarkNavIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#3B82F6" : "none"} stroke={active ? "#3B82F6" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

const UserIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "#3B82F6" : "none"} stroke={active ? "#3B82F6" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const GridIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#3B82F6" : "#C0C0C0"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const ListIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#3B82F6" : "#C0C0C0"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#9CA3AF">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);

// ─── STYLES ─────────────────────────────────────────────────────
const S = {
  app: { width: "100%", maxWidth: 393, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column", background: "#FAFBFC", fontFamily: "'Pretendard', -apple-system, sans-serif", position: "relative", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", height: 56, flexShrink: 0, background: "#FAFBFC", zIndex: 10 },
  logo: { fontSize: 24, fontWeight: 800, fontStyle: "italic", color: "#111827", letterSpacing: "-0.03em" },
  logoBlue: { color: "#3B82F6" },
  content: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  bottomNav: { display: "flex", justifyContent: "space-around", alignItems: "center", height: 64, borderTop: "1px solid #F0F0F0", background: "#fff", flexShrink: 0 },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "8px 0", minWidth: 64 },
  navLabel: { fontSize: 11, fontWeight: 500 },
  catRow: { display: "flex", gap: 8, padding: "12px 16px", flexShrink: 0, overflowX: "auto" },
  catBtn: (active: boolean) => ({ padding: "8px 16px", borderRadius: 20, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: active ? "#111827" : "#fff", color: active ? "#fff" : "#6B7280", boxShadow: active ? "none" : "0 1px 3px rgba(0,0,0,0.08)", transition: "all 0.2s" }),
  viewToggle: { display: "flex", gap: 4, padding: "4px 16px 8px", justifyContent: "flex-end", flexShrink: 0 },
  toggleBtn: { width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 20, background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden", flexShrink: 0, position: "absolute", width: "calc(100% - 60px)", left: 30, transition: "transform 0.3s ease, opacity 0.3s ease" },
  cardImg: { width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, position: "relative" },
  cardBody: { padding: "16px 20px 20px" },
  badge: { display: "inline-block", padding: "4px 12px", borderRadius: 12, background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "#fff", fontSize: 12, fontWeight: 600, marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 700, lineHeight: 1.4, color: "#111827", marginBottom: 8, letterSpacing: "-0.02em" },
  cardSummary: { fontSize: 13, lineHeight: 1.6, color: "#6B7280", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" },
  tagRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  tag: { padding: "4px 10px", borderRadius: 12, background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 500 },
  metaRow: { display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #F3F4F6", paddingTop: 12 },
  metaDate: { fontSize: 13, color: "#9CA3AF" },
  metaActions: { display: "flex", gap: 12, alignItems: "center" },
  metaBtn: { display: "flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none", padding: 0 },
  metaCount: { fontSize: 12, color: "#9CA3AF" },
  // List view
  listItem: { display: "flex", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 16, margin: "0 16px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  listImg: { width: 120, height: 125, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 },
  listContent: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 },
  listBadge: { display: "inline-block", padding: "2px 8px", borderRadius: 8, background: "#EFF6FF", color: "#3B82F6", fontSize: 11, fontWeight: 600, marginBottom: 4, alignSelf: "flex-start" },
  listTitle: { fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#111827", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  listMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  listDate: { fontSize: 12, color: "#9CA3AF" },
  listActions: { display: "flex", gap: 8, alignItems: "center" },
  listMetaBtn: { display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer" },
  listMetaCount: { fontSize: 11, color: "#9CA3AF" },
  // Detail
  detailWrap: { flex: 1, overflow: "auto", padding: "0 20px 20px" },
  detailTitle: { fontSize: 22, fontWeight: 800, lineHeight: 1.4, color: "#111827", marginBottom: 12, letterSpacing: "-0.02em" },
  aiBox: { background: "#F8FAFF", borderRadius: 16, padding: 20, marginBottom: 24, border: "1px solid #E8F0FE" },
  aiDot: { width: 6, height: 6, borderRadius: 3, background: "#3B82F6", flexShrink: 0, marginTop: 7 },
  aiTitle: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  aiItem: { display: "flex", gap: 10, marginBottom: 8, fontSize: 14, color: "#374151", lineHeight: 1.5 },
  shareRow: { display: "flex", gap: 12, marginBottom: 32 },
  shareBtn: (primary: boolean) => ({ flex: 1, padding: "14px 0", borderRadius: 12, border: primary ? "none" : "1px solid #E5E7EB", background: primary ? "#FEE500" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: primary ? "#3B1C1C" : "#374151" }),
  commentSection: { borderTop: "1px solid #F3F4F6", paddingTop: 20 },
  commentInput: { display: "flex", gap: 8, padding: "8px 16px", background: "#F3F4F6", borderRadius: 24, alignItems: "center", marginBottom: 20 },
  commentInputField: { flex: 1, border: "none", background: "none", outline: "none", fontSize: 14, color: "#374151" },
  commentSendBtn: { width: 32, height: 32, borderRadius: 16, background: "#3B82F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  commentItem: { display: "flex", gap: 12, marginBottom: 20 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarIcon: { fontSize: 14, color: "#9CA3AF" },
  commentBody: { flex: 1 },
  commentUser: { fontSize: 14, fontWeight: 600, color: "#111827" },
  commentTime: { fontSize: 12, color: "#9CA3AF", marginLeft: 8 },
  commentText: { fontSize: 14, color: "#374151", marginTop: 4, lineHeight: 1.5 },
  // MyPage
  profileSection: { display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0 20px" },
  avatar: { width: 96, height: 96, borderRadius: 48, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  profileName: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 },
  profileEdit: { fontSize: 14, color: "#3B82F6", cursor: "pointer", fontWeight: 500 },
  menuSection: { padding: "0 16px", marginBottom: 16 },
  menuTitle: { fontSize: 17, fontWeight: 700, color: "#111827", padding: "8px 8px 12px" },
  menuItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", borderRadius: 14, marginBottom: 2, cursor: "pointer" },
  menuItemLeft: { display: "flex", alignItems: "center", gap: 14 },
  menuIcon: { width: 32, height: 32, borderRadius: 16, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontWeight: 500, color: "#374151" },
  // Settings
  settingCard: { background: "#fff", borderRadius: 16, padding: "16px 20px", margin: "0 0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  switchTrack: (on: boolean) => ({ width: 48, height: 28, borderRadius: 14, background: on ? "#3B82F6" : "#D1D5DB", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }),
  switchThumb: (on: boolean) => ({ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 4, left: on ? 24 : 4, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }),
  dayRow: { display: "flex", gap: 8, marginTop: 12 },
  dayBtn: (active: boolean) => ({ width: 40, height: 40, borderRadius: 20, border: "none", background: active ? "#3B82F6" : "#F3F4F6", color: active ? "#fff" : "#9CA3AF", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }),
  timeBox: { background: "#fff", borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer" },
  timeValue: { fontSize: 20, fontWeight: 700, color: "#111827" },
  timeChange: { fontSize: 14, color: "#3B82F6", fontWeight: 600 },
  // Time picker
  pickerOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" },
  pickerSheet: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 0 0" },
  pickerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 16px" },
  pickerTitle: { fontSize: 18, fontWeight: 700, color: "#111827" },
  pickerConfirm: { fontSize: 16, fontWeight: 700, color: "#3B82F6", background: "none", border: "none", cursor: "pointer" },
  pickerBody: { display: "flex", height: 200, overflow: "hidden", borderTop: "1px solid #F3F4F6" },
  pickerCol: { flex: 1, overflow: "auto", scrollSnapType: "y mandatory", position: "relative" },
  pickerItem: (active: boolean) => ({ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: active ? 20 : 16, fontWeight: active ? 700 : 400, color: active ? "#111827" : "#C0C0C0", scrollSnapAlign: "center", cursor: "pointer", transition: "all 0.2s" }),
  pickerHighlight: { position: "absolute", top: "50%", left: 16, right: 16, height: 40, transform: "translateY(-50%)", background: "#F3F4F6", borderRadius: 10, pointerEvents: "none" },
  // Terms
  termsContent: { padding: "0 20px 20px", flex: 1, overflow: "auto", fontSize: 14, lineHeight: 1.8, color: "#374151" },
};

// ─── SWIPE DECK (카드가 회전하며 굴러가는 스와이프) ─────────────
function SwipeDeck({ items, onTap, likedIds, bookmarkedIds, onLike, onBookmark }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState(0); // -1: 왼쪽으로 퇴장, 1: 오른쪽, 0: 없음
  const [isAnimating, setIsAnimating] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  const SWIPE_THRESHOLD = 50;
  const CARD_WIDTH = 333; // 대략적 카드 너비

  const handleStart = (clientX: number, clientY: number) => {
    if (isAnimating) return;
    startXRef.current = clientX;
    startYRef.current = clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isAnimating) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;
    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }
    if (isHorizontalRef.current) {
      setDragX(dx);
    }
  };

  const handleEnd = () => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    if (Math.abs(dragX) < 10 && isHorizontalRef.current === null) {
      setDragX(0);
      isHorizontalRef.current = null;
      return;
    }

    // 왼쪽 스와이프 → 다음 카드
    if (dragX < -SWIPE_THRESHOLD && currentIndex < items.length - 1) {
      setExitDir(-1);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setDragX(0);
        setExitDir(0);
        setIsAnimating(false);
      }, 350);
    }
    // 오른쪽 스와이프 → 이전 카드
    else if (dragX > SWIPE_THRESHOLD && currentIndex > 0) {
      setExitDir(1);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(i => i - 1);
        setDragX(0);
        setExitDir(0);
        setIsAnimating(false);
      }, 350);
    }
    else {
      setDragX(0);
    }
    isHorizontalRef.current = null;
  };

  // 현재 카드의 드래그 기반 회전/이동 계산
  const getActiveCardStyle = () => {
    if (exitDir !== 0) {
      // 퇴장 애니메이션: 화면 밖으로 날아가며 회전
      const flyX = exitDir * (CARD_WIDTH + 100);
      const flyRotate = exitDir * 25;
      return {
        transform: `translateX(${flyX}px) rotate(${flyRotate}deg)`,
        opacity: 0,
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease",
      };
    }
    // 드래그 중: 손가락 따라 이동 + 회전
    const rotate = (dragX / CARD_WIDTH) * 12; // 최대 ±12도
    const liftY = -Math.abs(dragX) * 0.05; // 약간 위로 뜨는 효과
    return {
      transform: `translateX(${dragX}px) rotate(${rotate}deg) translateY(${liftY}px)`,
      transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  };

  // 다음 카드 스타일 (뒤에서 올라오는 효과)
  const getNextCardStyle = () => {
    const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
    const exitProgress = exitDir !== 0 ? 1 : 0;
    const p = Math.max(progress, exitProgress);
    const scale = 0.92 + 0.08 * p;
    const translateY = 14 - 14 * p;
    const opacity = 0.6 + 0.4 * p;
    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      opacity,
      transition: exitDir !== 0
        ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease"
        : isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
    };
  };

  // 그 다음 카드 (3번째)
  const getThirdCardStyle = () => {
    const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
    const exitProgress = exitDir !== 0 ? 1 : 0;
    const p = Math.max(progress, exitProgress);
    const scale = 0.85 + 0.07 * p;
    const translateY = 24 - 10 * p;
    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      opacity: 0.3 + 0.3 * p,
      transition: exitDir !== 0
        ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease"
        : isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
    };
  };

  // 스와이프 방향 인디케이터 opacity
  const swipeIndicatorOpacity = Math.min(Math.abs(dragX) / 100, 0.8);

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}
      onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => isDragging && handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => isDragging && handleEnd()}
    >
      {/* 스와이프 방향 힌트 */}
      {isDragging && Math.abs(dragX) > 20 && (
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          [dragX < 0 ? "right" : "left"]: 8,
          fontSize: 28, opacity: swipeIndicatorOpacity, zIndex: 20,
          pointerEvents: "none", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}>
          {dragX < 0 ? "›" : "‹"}
        </div>
      )}

      {/* 카드 렌더링 (뒤→앞 순서) */}
      {items.map((item, i) => {
        const offset = i - currentIndex;
        if (offset < -1 || offset > 2) return null;

        let cardStyle = {};
        let zIndex = 1;
        let pointerEvents = "none";

        if (offset === 0) {
          // 현재 카드 (맨 앞)
          cardStyle = getActiveCardStyle();
          zIndex = 10;
          pointerEvents = isAnimating ? "none" : "auto";
        } else if (offset === 1) {
          // 다음 카드
          cardStyle = getNextCardStyle();
          zIndex = 5;
        } else if (offset === 2) {
          // 그 다음 카드
          cardStyle = getThirdCardStyle();
          zIndex = 3;
        } else if (offset === -1) {
          // 이전 카드 (숨김)
          cardStyle = { opacity: 0, transform: "translateX(-100px) rotate(-15deg)" };
          zIndex = 1;
        }

        return (
          <div key={item.id} style={{
            ...S.card,
            top: 10,
            ...cardStyle,
            zIndex,
            pointerEvents,
            userSelect: "none",
            transformOrigin: "center bottom",
          }}>
            <div style={{ ...S.cardImg, background: item.gradient }} onClick={() => !isAnimating && onTap(item)}>
              <span style={{ fontSize: 64, opacity: 0.8 }}>{item.img}</span>
            </div>
            <div style={S.cardBody}>
              <span style={S.badge}>{item.category}</span>
              <div style={S.cardTitle} onClick={() => !isAnimating && onTap(item)}>{item.title}</div>
              <div style={S.cardSummary}>{item.summary}</div>
              <div style={S.tagRow}>
                {item.tags.map(t => <span key={t} style={S.tag}>{t}</span>)}
              </div>
              <div style={S.metaRow}>
                <span style={S.metaDate}>{item.date}</span>
                <div style={S.metaActions}>
                  <button style={S.metaBtn} onClick={(e) => { e.stopPropagation(); onLike(item.id); }}>
                    <HeartIcon filled={likedIds.has(item.id)} size={18} />
                    <span style={{ ...S.metaCount, color: likedIds.has(item.id) ? "#EF4444" : "#9CA3AF" }}>{formatCount(item.likes + (likedIds.has(item.id) ? 1 : 0))}</span>
                  </button>
                  <button style={S.metaBtn} onClick={(e) => { e.stopPropagation(); onBookmark(item.id); }}>
                    <BookmarkIcon filled={bookmarkedIds.has(item.id)} size={18} />
                    <span style={{ ...S.metaCount, color: bookmarkedIds.has(item.id) ? "#3B82F6" : "#9CA3AF" }}>{formatCount(item.bookmarks + (bookmarkedIds.has(item.id) ? 1 : 0))}</span>
                  </button>
                  <button style={S.metaBtn}>
                    <CommentIcon size={18} />
                    <span style={S.metaCount}>{formatCount(item.comments)}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 페이지 인디케이터 */}
      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 5, zIndex: 15, pointerEvents: "none",
      }}>
        {items.slice(0, Math.min(items.length, 8)).map((_, i) => (
          <div key={i} style={{
            width: currentIndex === i ? 18 : 6, height: 6, borderRadius: 3,
            background: currentIndex === i ? "#3B82F6" : "rgba(0,0,0,0.15)",
            transition: "all 0.3s ease",
          }} />
        ))}
        {items.length > 8 && (
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.1)" }} />
        )}
      </div>
    </div>
  );
}

// ─── LIST VIEW ──────────────────────────────────────────────────
function ListView({ items, onTap, likedIds, bookmarkedIds, onLike, onBookmark }) {
  return (
    <div style={{ flex: 1, overflow: "auto", paddingTop: 4, paddingBottom: 8 }}>
      {items.map(item => (
        <div key={item.id} style={S.listItem} onClick={() => onTap(item)}>
          <div style={{ ...S.listImg, background: item.gradient }}>
            <span>{item.img}</span>
          </div>
          <div style={S.listContent}>
            <span style={S.listBadge}>{item.category}</span>
            <div style={S.listTitle}>{item.title}</div>
            <div style={S.listMeta}>
              <span style={S.listDate}>{item.date}</span>
              <div style={S.listActions}>
                <button style={S.listMetaBtn} onClick={e => { e.stopPropagation(); onLike(item.id); }}>
                  <HeartIcon filled={likedIds.has(item.id)} size={14} />
                  <span style={{ ...S.listMetaCount, color: likedIds.has(item.id) ? "#EF4444" : "#9CA3AF" }}>{formatCount(item.likes)}</span>
                </button>
                <button style={S.listMetaBtn} onClick={e => { e.stopPropagation(); onBookmark(item.id); }}>
                  <BookmarkIcon filled={bookmarkedIds.has(item.id)} size={14} />
                  <span style={{ ...S.listMetaCount, color: bookmarkedIds.has(item.id) ? "#3B82F6" : "#9CA3AF" }}>{formatCount(item.bookmarks)}</span>
                </button>
                <button style={S.listMetaBtn}>
                  <CommentIcon size={14} />
                  <span style={S.listMetaCount}>{formatCount(item.comments)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── NEWS DETAIL ────────────────────────────────────────────────
function NewsDetail({ article, onBack, liked, bookmarked, onLike, onBookmark }) {
  const [commentText, setCommentText] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ ...S.header, justifyContent: "space-between" }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}><BackIcon /></button>
        <div style={{ width: 32 }} />
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ShareIcon /></button>
      </div>
      <div style={S.detailWrap}>
        <div style={S.detailTitle}>{article.title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: "#9CA3AF" }}>{article.date}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.metaBtn} onClick={() => onLike(article.id)}>
              <HeartIcon filled={liked} size={18} />
              <span style={{ ...S.metaCount, color: liked ? "#EF4444" : "#9CA3AF" }}>{formatCount(article.likes)}</span>
            </button>
            <button style={S.metaBtn} onClick={() => onBookmark(article.id)}>
              <BookmarkIcon filled={bookmarked} size={18} />
              <span style={{ ...S.metaCount, color: bookmarked ? "#3B82F6" : "#9CA3AF" }}>{formatCount(article.bookmarks)}</span>
            </button>
          </div>
        </div>

        {/* AI Summary Box */}
        <div style={S.aiBox}>
          <div style={S.aiTitle}>
            <span style={{ fontSize: 14, color: "#3B82F6" }}>●</span>
            AI 3줄 요약
          </div>
          {article.aiSummary.map((s, i) => (
            <div key={i} style={S.aiItem}>
              <span>•</span>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ fontSize: 15, lineHeight: 1.8, color: "#374151", marginBottom: 24, whiteSpace: "pre-line" }}>
          {article.body}
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginBottom: 32 }}>
          AI가 재구성한 뉴스입니다.
        </div>

        {/* Share buttons */}
        <div style={S.shareRow}>
          <button style={S.shareBtn(true)}>
            <span style={{ fontSize: 18 }}>💬</span>
            카카오 공유
          </button>
          <button style={S.shareBtn(false)}>
            <LinkIcon />
            링크 복사
          </button>
        </div>

        {/* Comments */}
        <div style={S.commentSection}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>댓글</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 16 }}>{article.commentsData?.length || 0}</div>

          <div style={S.commentInput}>
            <input style={S.commentInputField} placeholder="새 댓글 입력" value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button style={S.commentSendBtn}><SendIcon /></button>
          </div>

          {(article.commentsData || []).map((c, i) => (
            <div key={i} style={S.commentItem}>
              <div style={S.commentAvatar}>
                <span style={S.commentAvatarIcon}>👤</span>
              </div>
              <div style={S.commentBody}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={S.commentUser}>{c.user}</span>
                    <span style={S.commentTime}>{c.time}</span>
                  </div>
                  {c.isMine && <button style={{ background: "none", border: "none", cursor: "pointer" }}><MoreIcon /></button>}
                </div>
                <div style={S.commentText}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LIKES / BOOKMARKS PAGE ─────────────────────────────────────
function CollectionPage({ title, items, onBack, onTap, likedIds, bookmarkedIds, onLike, onBookmark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ ...S.header, justifyContent: "center", position: "relative" }}>
        <button style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}><BackIcon /></button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 0 8px" }}>
        <div style={{ padding: "16px 16px 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
          {title === "좋아요" ? "좋아요한 뉴스" : "북마크한 뉴스"}
        </div>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF", fontSize: 15 }}>
            {title === "좋아요" ? "좋아요한 뉴스가 없습니다" : "북마크한 뉴스가 없습니다"}
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} style={S.listItem} onClick={() => onTap(item)}>
              <div style={{ ...S.listImg, background: item.gradient }}>
                <span>{item.img}</span>
              </div>
              <div style={S.listContent}>
                <span style={S.listBadge}>{item.category}</span>
                <div style={S.listTitle}>{item.title}</div>
                <div style={S.listMeta}>
                  <span style={S.listDate}>{item.date}</span>
                  <div style={S.listActions}>
                    <button style={S.listMetaBtn} onClick={e => { e.stopPropagation(); onLike(item.id); }}>
                      <HeartIcon filled={likedIds.has(item.id)} size={14} />
                      <span style={{ ...S.listMetaCount, color: likedIds.has(item.id) ? "#EF4444" : "#9CA3AF" }}>{formatCount(item.likes)}</span>
                    </button>
                    <button style={S.listMetaBtn} onClick={e => { e.stopPropagation(); onBookmark(item.id); }}>
                      <BookmarkIcon filled={bookmarkedIds.has(item.id)} size={14} />
                      <span style={{ ...S.listMetaCount, color: bookmarkedIds.has(item.id) ? "#3B82F6" : "#9CA3AF" }}>{formatCount(item.bookmarks)}</span>
                    </button>
                    <button style={S.listMetaBtn}>
                      <CommentIcon size={14} />
                      <span style={S.listMetaCount}>{formatCount(item.comments)}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── MY PAGE ────────────────────────────────────────────────────
function MyPage({ onBack, onNavigate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ ...S.header, justifyContent: "center", position: "relative" }}>
        <button style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}><BackIcon /></button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>마이페이지</span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={S.profileSection}>
          <div style={S.avatar}>
            <UserIcon active={false} />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div style={S.profileName}>OOO님</div>
          <div style={S.profileEdit} onClick={() => {}}>내 정보 수정</div>
        </div>

        {/* 알림 */}
        <div style={S.menuSection}>
          <div style={S.menuTitle}>알림</div>
          <div style={S.menuItem} onClick={() => onNavigate("pushSettings")}>
            <div style={S.menuItemLeft}>
              <div style={S.menuIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6" stroke="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <span style={S.menuLabel}>PUSH 알림</span>
            </div>
            <ChevronRight />
          </div>
        </div>

        {/* 나의 활동 */}
        <div style={S.menuSection}>
          <div style={S.menuTitle}>나의 활동</div>
          {[
            { icon: <BookmarkIcon filled size={16} />, label: "나의 북마크", page: "bookmarks" },
            { icon: <HeartIcon filled size={16} />, label: "나의 좋아요", page: "likes" },
            { icon: <CommentIcon size={16} />, label: "나의 댓글", page: null },
          ].map((m, i) => (
            <div key={i} style={S.menuItem} onClick={() => m.page && onNavigate(m.page)}>
              <div style={S.menuItemLeft}>
                <div style={S.menuIcon}>{m.icon}</div>
                <span style={S.menuLabel}>{m.label}</span>
              </div>
              <ChevronRight />
            </div>
          ))}
        </div>

        {/* 고객지원 */}
        <div style={S.menuSection}>
          <div style={S.menuTitle}>고객지원</div>
          {[
            { label: "서비스 이용약관", page: "terms" },
            { label: "개인정보 처리방침", page: "privacy" },
          ].map((m, i) => (
            <div key={i} style={S.menuItem} onClick={() => onNavigate(m.page)}>
              <div style={S.menuItemLeft}>
                <div style={S.menuIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <span style={S.menuLabel}>{m.label}</span>
              </div>
              <ChevronRight />
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "20px 0 40px" }}>
          <span style={{ fontSize: 14, color: "#9CA3AF", cursor: "pointer" }}>로그아웃</span>
        </div>
      </div>
    </div>
  );
}

// ─── PUSH SETTINGS ──────────────────────────────────────────────
function PushSettings({ onBack }) {
  const [pushOn, setPushOn] = useState(false);
  const [days, setDays] = useState(new Set(["월", "화", "수", "목", "금"]));
  const [showPicker, setShowPicker] = useState(false);
  const [ampm, setAmpm] = useState("오전");
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(10);
  const [saved, setSaved] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const toggleDay = (d: string) => {
    const next = new Set(days);
    next.has(d) ? next.delete(d) : next.add(d);
    setDays(next);
    setSaved(false);
  };

  // 토글 ON/OFF 처리
  const handleToggle = () => {
    const newState = !pushOn;
    setPushOn(newState);
    setSaved(false);

    if (newState) {
      // TODO: 실제 FCM 연동 시 여기서 브라우저 알림 권한 요청
      // requestNotificationPermission();
    }
  };

  // 24시간 형식으로 변환
  const getScheduleTime24 = () => {
    let h24 = hour;
    if (ampm === "오후" && hour !== 12) h24 = hour + 12;
    if (ampm === "오전" && hour === 12) h24 = 0;
    return { hour: h24, minute };
  };

  // 설정 저장 핸들러
  const handleSave = () => {
    if (days.size === 0) {
      alert("최소 1개 요일을 선택해주세요.");
      return;
    }

    const schedule = {
      enabled: pushOn,
      days: Array.from(days),
      time: getScheduleTime24(),
      displayTime: `${ampm} ${hour}:${String(minute).padStart(2, '0')}`,
    };

    // TODO: 백엔드 API 호출 — PUT /user/settings
    // await fetch('/api/user/settings', {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify({ pushNotification: schedule }),
    // });

    // TODO: FCM 토큰 등록 — POST /push/register
    // const fcmToken = await getFirebaseToken();
    // await fetch('/api/push/register', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify({ token: fcmToken, schedule }),
    // });

    console.log("📌 Push 설정 저장:", schedule);
    setSaved(true);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const timeDisplay = `${ampm} ${hour}:${String(minute).padStart(2, '0')}`;
  const daysDisplay = ["월", "화", "수", "목", "금", "토", "일"].filter(d => days.has(d)).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ ...S.header, justifyContent: "center", position: "relative" }}>
        <button style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}><BackIcon /></button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>PUSH 알림</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 20px 40px" }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>알림 설정</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 24 }}>중요한 뉴스를 놓치지 않게 알림을 받아보세요.</div>
        </div>

        {/* 토글 카드 */}
        <div style={S.settingCard}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>PUSH 알림</div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>매일 아침 뉴스를 배달해드려요</div>
          </div>
          <div style={S.switchTrack(pushOn)} onClick={handleToggle}>
            <div style={S.switchThumb(pushOn)} />
          </div>
        </div>

        {/* 토글 ON일 때만 요일/시간 설정 표시 */}
        <div style={{
          maxHeight: pushOn ? 500 : 0,
          overflow: "hidden",
          opacity: pushOn ? 1 : 0,
          transition: "max-height 0.4s ease, opacity 0.3s ease",
        }}>
          {/* 요일 선택 */}
          <div style={{ marginBottom: 24, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>요일 선택</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: "auto" }}>
                {days.size === 7 ? "매일" : days.size === 0 ? "선택 없음" : `${daysDisplay}`}
              </span>
            </div>
            <div style={S.dayRow}>
              {["월", "화", "수", "목", "금", "토", "일"].map(d => (
                <button key={d} style={S.dayBtn(days.has(d))} onClick={() => toggleDay(d)}>{d}</button>
              ))}
            </div>
            {/* 빠른 선택 */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[
                { label: "평일", set: new Set(["월", "화", "수", "목", "금"]) },
                { label: "주말", set: new Set(["토", "일"]) },
                { label: "매일", set: new Set(["월", "화", "수", "목", "금", "토", "일"]) },
              ].map(preset => (
                <button key={preset.label} onClick={() => { setDays(preset.set); setSaved(false); }}
                  style={{
                    padding: "6px 14px", borderRadius: 16, border: "1px solid #E5E7EB",
                    background: JSON.stringify([...days].sort()) === JSON.stringify([...preset.set].sort()) ? "#EFF6FF" : "#fff",
                    color: JSON.stringify([...days].sort()) === JSON.stringify([...preset.set].sort()) ? "#3B82F6" : "#6B7280",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  }}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 설정 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" stroke="#fff" strokeWidth="2" fill="none"/></svg>
              <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>시간 설정</span>
            </div>
            <div style={S.timeBox} onClick={() => setShowPicker(true)}>
              <span style={S.timeValue}>{timeDisplay}</span>
              <span style={S.timeChange}>변경</span>
            </div>
          </div>

          {/* 설정 요약 + 저장 버튼 */}
          <div style={{
            background: "#F0F9FF", borderRadius: 16, padding: 16, marginBottom: 20,
            border: "1px solid #BAE6FD",
          }}>
            <div style={{ fontSize: 13, color: "#0369A1", fontWeight: 600, marginBottom: 8 }}>📋 알림 예약 요약</div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
              <div>⏰ 시간: <strong>{timeDisplay}</strong></div>
              <div>📅 요일: <strong>{days.size === 7 ? "매일" : days.size === 0 ? "선택 없음" : daysDisplay}</strong></div>
            </div>
          </div>

          <button onClick={handleSave} style={{
            width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
            background: saved ? "#10B981" : "#3B82F6",
            color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
            transition: "background 0.3s ease",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
          }}>
            {saved ? "✅ 저장 완료" : "💾 알림 설정 저장"}
          </button>
        </div>

        {/* 토글 OFF 안내 */}
        {!pushOn && (
          <div style={{
            textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 14, lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
            PUSH 알림을 켜면<br/>요일과 시간을 설정할 수 있어요
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "auto", paddingTop: 40 }}>
          <span style={{ fontSize: 13, color: "#C0C0C0" }}>버전 1.0.1</span>
        </div>
      </div>

      {/* 저장 토스트 */}
      <div style={{
        position: "absolute", bottom: 100, left: 20, right: 20,
        background: "#111827", color: "#fff", padding: "14px 18px",
        borderRadius: 14, fontSize: 13, lineHeight: 1.5, zIndex: 200,
        transform: saveToast ? "translateY(0)" : "translateY(20px)",
        opacity: saveToast ? 1 : 0, transition: "all 0.3s ease", pointerEvents: "none",
        textAlign: "center",
      }}>
        ✅ 알림 설정이 저장되었습니다 — {daysDisplay} {timeDisplay}
      </div>

      {/* 타임 피커 */}
      {showPicker && (
        <div style={S.pickerOverlay} onClick={() => setShowPicker(false)}>
          <div style={S.pickerSheet} onClick={e => e.stopPropagation()}>
            <div style={S.pickerHeader}>
              <span style={S.pickerTitle}>시간 선택</span>
              <button style={S.pickerConfirm} onClick={() => { setShowPicker(false); setSaved(false); }}>확인</button>
            </div>
            <div style={S.pickerBody}>
              {/* AM/PM */}
              <div style={{ ...S.pickerCol, position: "relative" }}>
                <div style={S.pickerHighlight} />
                {["오전", "오후"].map(v => (
                  <div key={v} style={S.pickerItem(ampm === v)} onClick={() => setAmpm(v)}>{v}</div>
                ))}
              </div>
              {/* Hour */}
              <div style={{ ...S.pickerCol, position: "relative" }}>
                <div style={S.pickerHighlight} />
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <div key={h} style={S.pickerItem(hour === h)} onClick={() => setHour(h)}>{h}</div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, color: "#111827", padding: "0 4px" }}>:</div>
              {/* Minute */}
              <div style={{ ...S.pickerCol, position: "relative" }}>
                <div style={S.pickerHighlight} />
                {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                  <div key={m} style={S.pickerItem(minute === m)} onClick={() => setMinute(m)}>{String(m).padStart(2, '0')}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TERMS PAGE ─────────────────────────────────────────────────
function TermsPage({ onBack, type }) {
  const isTerms = type === "terms";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ ...S.header, justifyContent: "center", position: "relative" }}>
        <button style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}><BackIcon /></button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>약관</span>
      </div>
      <div style={S.termsContent}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: "#111827" }}>
          {isTerms ? "서비스 이용약관" : "개인정보 처리방침"}
        </h2>
        {isTerms ? (
          <div>
            <p><strong>제1조 (목적)</strong><br/>본 약관은 오늘5분(이하 "회사")이 제공하는 뉴스 요약 서비스(이하 "서비스")의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p><br/>
            <p><strong>제2조 (용어의 정의)</strong><br/>① "서비스"란 회사가 제공하는 AI 기반 뉴스 요약 및 큐레이션 서비스를 의미합니다.<br/>② "이용자"란 본 약관에 따라 서비스를 이용하는 자를 의미합니다.<br/>③ "콘텐츠"란 서비스에서 제공하는 뉴스 요약, 분석, 코멘트 등을 의미합니다.</p><br/>
            <p><strong>제3조 (약관의 효력 및 변경)</strong><br/>① 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.<br/>② 회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있습니다.</p><br/>
            <p><strong>제4조 (서비스의 제공)</strong><br/>① 회사는 다음과 같은 서비스를 제공합니다:<br/>- AI 기반 뉴스 요약 서비스<br/>- 개인화된 뉴스 추천 서비스<br/>- 뉴스 북마크 및 공유 기능<br/>② 서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다.</p><br/>
            <p><strong>제5조 (이용자의 의무)</strong><br/>이용자는 서비스 이용 시 관련 법령 및 본 약관의 규정을 준수하여야 합니다.</p>
          </div>
        ) : (
          <div>
            <p><strong>1. 개인정보의 수집 및 이용 목적</strong><br/>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않습니다.<br/>- 서비스 제공 및 운영<br/>- 개인화된 콘텐츠 추천<br/>- 서비스 개선 및 통계 분석</p><br/>
            <p><strong>2. 수집하는 개인정보 항목</strong><br/>- 필수항목: 이메일 주소, 닉네임<br/>- 선택항목: 관심 카테고리, 알림 설정 정보<br/>- 자동 수집: 서비스 이용 기록, 접속 로그</p><br/>
            <p><strong>3. 개인정보의 보유 및 이용기간</strong><br/>회사는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의한 정보보유 사유가 있는 경우 해당 기간 동안 보관합니다.</p><br/>
            <p><strong>4. 개인정보의 파기절차 및 방법</strong><br/>① 파기절차: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 파기됩니다.<br/>② 파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</p><br/>
            <p><strong>5. 이용자의 권리</strong><br/>이용자는 언제든지 개인정보의 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <div style={{
      position: "absolute", bottom: 80, left: 20, right: 20, background: "#111827", color: "#fff",
      padding: "14px 18px", borderRadius: 14, fontSize: 13, lineHeight: 1.5, zIndex: 200,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      opacity: visible ? 1 : 0, transition: "all 0.3s ease", pointerEvents: "none",
    }}>
      {message}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [tab, setTab] = useState(0); // bottom nav: 0=home, 1=likes, 2=bookmarks, 3=mypage
  const [category, setCategory] = useState("전체");
  const [viewMode, setViewMode] = useState("grid"); // grid = swipe, list = list
  const [detailArticle, setDetailArticle] = useState<NewsItem | null>(null);
  const [subPage, setSubPage] = useState<string | null>(null); // pushSettings, terms, privacy
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [firstLike, setFirstLike] = useState(true);

  const showToast = (msg: string) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: "" }), 3000);
  };

  const toggleLike = (id: number) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else {
        next.add(id);
        if (firstLike) {
          showToast("💙 하트를 누르면 '오늘5분' AI가 당신의 관심사를 학습해 딱 맞는 뉴스를 찾아줍니다.");
          setFirstLike(false);
        }
      }
      return next;
    });
  };

  const toggleBookmark = (id: number) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredNews = category === "전체" ? NEWS_DATA : NEWS_DATA.filter(n => n.category === category);
  const likedNews = NEWS_DATA.filter(n => likedIds.has(n.id));
  const bookmarkedNews = NEWS_DATA.filter(n => bookmarkedIds.has(n.id));

  const openDetail = (article: NewsItem) => {
    setDetailArticle(article);
    setPage("detail");
  };

  const goBack = () => {
    if (subPage) { setSubPage(null); return; }
    if (page === "detail") { setPage("home"); setDetailArticle(null); return; }
    setPage("home");
    setTab(0);
  };

  const handleNav = (idx) => {
    setSubPage(null);
    setDetailArticle(null);
    setTab(idx);
    if (idx === 0) setPage("home");
    else if (idx === 1) setPage("likes");
    else if (idx === 2) setPage("bookmarks");
    else if (idx === 3) setPage("mypage");
  };

  const handleMyPageNavigate = (target: string) => {
    if (target === "pushSettings" || target === "terms" || target === "privacy") {
      setSubPage(target);
    } else if (target === "likes") {
      handleNav(1);
    } else if (target === "bookmarks") {
      handleNav(2);
    }
  };

  // Determine what to render
  const renderContent = () => {
    // Sub-pages (from mypage)
    if (subPage === "pushSettings") return <PushSettings onBack={() => setSubPage(null)} />;
    if (subPage === "terms") return <TermsPage onBack={() => setSubPage(null)} type="terms" />;
    if (subPage === "privacy") return <TermsPage onBack={() => setSubPage(null)} type="privacy" />;

    // Detail page
    if (page === "detail" && detailArticle) {
      return <NewsDetail article={detailArticle} onBack={goBack}
        liked={likedIds.has(detailArticle.id)} bookmarked={bookmarkedIds.has(detailArticle.id)}
        onLike={toggleLike} onBookmark={toggleBookmark} />;
    }

    // Likes
    if (page === "likes") {
      return <CollectionPage title="좋아요" items={likedNews} onBack={() => handleNav(0)}
        onTap={openDetail} likedIds={likedIds} bookmarkedIds={bookmarkedIds}
        onLike={toggleLike} onBookmark={toggleBookmark} />;
    }

    // Bookmarks
    if (page === "bookmarks") {
      return <CollectionPage title="북마크" items={bookmarkedNews} onBack={() => handleNav(0)}
        onTap={openDetail} likedIds={likedIds} bookmarkedIds={bookmarkedIds}
        onLike={toggleLike} onBookmark={toggleBookmark} />;
    }

    // MyPage
    if (page === "mypage") {
      return <MyPage onBack={() => handleNav(0)} onNavigate={handleMyPageNavigate} />;
    }

    // Home (default)
    return (
      <>
        <div style={S.header}>
          <div style={S.logo}><span style={S.logoBlue}>5</span>늘<span style={S.logoBlue}>5</span>분</div>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><BellIcon /></button>
        </div>
        <div style={{ ...S.content }}>
          <div style={{ ...S.catRow, scrollbarWidth: "none" }}>
            {CATEGORIES.map(c => (
              <button key={c} style={S.catBtn(category === c)} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <div style={S.viewToggle}>
            <button style={S.toggleBtn} onClick={() => setViewMode("grid")}><GridIcon active={viewMode === "grid"} /></button>
            <button style={S.toggleBtn} onClick={() => setViewMode("list")}><ListIcon active={viewMode === "list"} /></button>
          </div>
          {viewMode === "grid" ? (
            <SwipeDeck items={filteredNews} onTap={openDetail}
              likedIds={likedIds} bookmarkedIds={bookmarkedIds}
              onLike={toggleLike} onBookmark={toggleBookmark} />
          ) : (
            <ListView items={filteredNews} onTap={openDetail}
              likedIds={likedIds} bookmarkedIds={bookmarkedIds}
              onLike={toggleLike} onBookmark={toggleBookmark} />
          )}
        </div>
      </>
    );
  };

  const showBottomNav = !subPage && page !== "detail";

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #E8E8E8; display: flex; justify-content: center; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {renderContent()}
      </div>

      {showBottomNav && (
        <div style={S.bottomNav}>
          {[
            { icon: HomeIcon, label: "홈", idx: 0 },
            { icon: HeartNavIcon, label: "좋아요", idx: 1 },
            { icon: BookmarkNavIcon, label: "북마크", idx: 2 },
            { icon: UserIcon, label: "마이페이지", idx: 3 },
          ].map(({ icon: Icon, label, idx }) => (
            <div key={idx} style={S.navItem} onClick={() => handleNav(idx)}>
              <Icon active={tab === idx} />
              <span style={{ ...S.navLabel, color: tab === idx ? "#3B82F6" : "#9CA3AF" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
