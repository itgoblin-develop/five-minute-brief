export interface NewsItem {
  id: string;
  category: "트렌딩" | "경제" | "재테크" | "사회";
  title: string;
  summary: string[];
  content: string;
  source: string;
  date: string;
  imageUrl: string;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  hashtags: string[];
}

export const MOCK_NEWS: NewsItem[] = [
  // --- 트렌딩 ---
  {
    id: "t1",
    category: "트렌딩",
    title: "생성형 AI, 이제 '감정'까지 읽는다... 인간과 깊은 교감 가능해져",
    summary: [
      "최신 AI 모델, 텍스트 넘어 뉘앙스와 감정 분석",
      "심리 상담, 고객 서비스 분야 혁신 예고",
      "윤리적 문제와 프라이버시 침해 우려도 제기"
    ],
    content: `최근 발표된 차세대 생성형 AI 모델이 단순히 정보를 처리하는 것을 넘어, 사용자의 목소리 톤과 미세한 표정 변화를 통해 감정까지 읽어내는 수준에 도달했습니다.\n\n기술 전문가들은 이러한 '감성 AI'가 우울증 환자를 위한 심리 상담이나, 고객의 불만을 즉각적으로 감지해야 하는 서비스 산업에 큰 변화를 가져올 것으로 예측합니다. AI가 마치 사람처럼 공감하고 위로하는 시대가 열린 것입니다.\n\n하지만 일각에서는 AI가 개인의 내밀한 감정 영역까지 데이터화하는 것에 대해 깊은 우려를 표하고 있습니다. 감정 데이터의 오남용을 막기 위한 강력한 법적 규제가 필요하다는 목소리가 높아지고 있습니다.`,
    source: "테크웨이브",
    date: "2026.01.30", // 오늘
    imageUrl: "https://images.unsplash.com/photo-1737644467636-6b0053476bb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwZnV0dXJlJTIwcm9ib3R8ZW58MXx8fHwxNzY5NDMzMzEwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 1240,
    bookmarkCount: 342,
    commentCount: 89,
    hashtags: ["인공지능", "감성AI", "미래기술"]
  },
  {
    id: "t2",
    category: "트렌딩",
    title: "메타버스 오피스 출근 1년, 무엇이 달라졌나?",
    summary: [
      "물리적 사무실 비용 80% 절감 효과",
      "아바타 회의로 수평적 소통 문화 정착",
      "가상 공간 피로도 호소하는 직원 증가"
    ],
    content: `국내 대기업 A사가 전면 재택근무와 메타버스 오피스를 도입한 지 1년이 지났습니다. 결과는 놀라웠습니다. 강남 한복판에 있던 사무실을 축소하면서 고정 비용이 80% 가까이 줄어든 것입니다.\n\n임직원들은 아바타를 통해 직급에 얽매이지 않고 자유롭게 의견을 나누는 문화가 정착되었다고 평가합니다. 해외 지사와의 협업도 물리적 거리감 없이 실시간으로 이루어지고 있습니다.\n\n그러나 하루 종일 VR 기기를 착용하거나 모니터 속 가상 공간에 머무는 것에 대한 피로도를 호소하는 목소리도 적지 않습니다. 디지털 디톡스와 오프라인 모임의 필요성이 새로운 과제로 떠오르고 있습니다.`,
    source: "비즈니스포스트",
    date: "2026.01.29", // 1일전
    imageUrl: "https://images.unsplash.com/photo-1758630737900-a28682c5aa69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2UlMjBidXNpbmVzc3xlbnwxfHx8fDE3Njk0MzI1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 856,
    bookmarkCount: 120,
    commentCount: 45,
    hashtags: ["메타버스", "재택근무", "오피스혁신"]
  },
  {
    id: "t3",
    category: "트렌딩",
    title: "'입는 스마트폰' 시대 개막, 화면이 사라진다",
    summary: [
      "손바닥, 옷깃 등에 화면 투사하는 핀 기술 등장",
      "AI 음성 비서가 앱 실행 대체",
      "디바이스 프리(Device-free) 라이프스타일 확산"
    ],
    content: `무거운 스마트폰을 들고 다니던 시대가 저물고 있습니다. 옷깃에 꽂는 작은 핀 형태의 웨어러블 기기가 등장해, 필요할 때마다 손바닥이나 벽면에 화면을 투사해 정보를 보여줍니다.\n\n이 기기의 핵심은 초고도화된 AI 음성 비서입니다. 복잡한 터치 조작 없이 말 한마디면 택시를 부르고, 메시지를 보내고, 뉴스를 요약해 들려줍니다. 기술은 점점 더 눈에 보이지 않는 형태로 우리 일상에 스며들고 있습니다.\n\n패션 업계도 발 빠르게 움직이고 있습니다. 스마트 핀을 부착할 수 있는 전용 의류 라인을 런칭하는 등 기술과 패션의 경계가 허물어지는 '테크웨어' 트렌드가 가속화될 전망입니다.`,
    source: "퓨처인사이트",
    date: "2026.01.28", // 2일전
    imageUrl: "https://images.unsplash.com/photo-1652212976547-16d7e2841b8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0JTIwYmx1ZXxlbnwxfHx8fDE3Njk0MzI1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 2341,
    bookmarkCount: 890,
    commentCount: 156,
    hashtags: ["웨어러블", "AI핀", "테크웨어"]
  },
  {
    id: "t4",
    category: "트렌딩",
    title: "숏폼의 진화, 이제는 '숏드라마'가 대세",
    summary: [
      "1분 내외 짧은 에피소드로 구성된 드라마 인기",
      "이동 시간에 간편하게 즐기는 스낵 컬처의 정점",
      "기존 방송사들도 숏폼 콘텐츠 제작에 뛰어들어"
    ],
    content: `15초 댄스 챌린지를 넘어, 이제는 1분짜리 드라마가 전 세계를 강타하고 있습니다. 기승전결이 빠른 전개와 자극적인 소재로 무장한 '숏드라마'는 바쁜 현대인들의 도파민을 자극하며 폭발적인 조회수를 기록하고 있습니다.\n\n출퇴근길 지하철이나 버스에서 잠깐씩 끊어 보기에 최적화된 이 형식은 넷플릭스 같은 롱폼 콘텐츠의 자리를 위협하고 있습니다. 제작비는 적게 들지만 파급력은 엄청나기 때문입니다.\n\n위기감을 느낀 기존 방송사들과 OTT 플랫폼들도 앞다퉈 숏폼 드라마 제작 스튜디오를 설립하고 있습니다. 콘텐츠 시장의 무게 중심이 '긴 호흡'에서 '짧은 호흡'으로 완전히 이동하고 있습니다.`,
    source: "컬처트렌드",
    date: "2026.01.27", // 3일전
    imageUrl: "https://images.unsplash.com/photo-1751945965597-71171ec7a458?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwaW50ZXJpb3IlMjBkZXNpZ24lMjBzbWFydHxlbnwxfHx8fDE3Njk0MzI1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 5670,
    bookmarkCount: 1200,
    commentCount: 342,
    hashtags: ["숏폼", "스낵컬처", "도파민"]
  },

  // --- 경제 ---
  {
    id: "e1",
    category: "경제",
    title: "글로벌 공급망 재편, '메이드 인 아세안' 뜬다",
    summary: [
      "중국 대체할 새로운 생산 기지로 동남아 부상",
      "베트남, 인도네시아 등지 대규모 공장 설립 러시",
      "물류 비용 절감 및 지정학적 리스크 분산 효과"
    ],
    content: `세계의 공장이라 불리던 중국의 인건비 상승과 미중 갈등으로 인해 글로벌 기업들이 동남아시아로 눈을 돌리고 있습니다. 특히 베트남과 인도네시아는 젊은 노동력과 정부의 적극적인 투자 유치 정책에 힘입어 새로운 제조업 허브로 급부상하고 있습니다.\n\n삼성, 애플 등 글로벌 테크 기업들은 이미 생산 라인의 상당 부분을 이들 국가로 이전했습니다. 이는 단순한 비용 절감을 넘어, 특정 국가에 대한 의존도를 낮추고 지정학적 리스크를 분산하려는 전략적 선택입니다.\n\n전문가들은 향후 10년간 아세안 국가들의 경제 성장률이 세계 평균을 크게 상회할 것으로 전망하며, 한국 기업들도 이 지역과의 파트너십을 강화해야 한다고 조언합니다.`,
    source: "글로벌경제",
    date: "2026.01.30",
    imageUrl: "https://images.unsplash.com/photo-1634474588578-7f0565a1cea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnbG9iYWwlMjBlY29ub215JTIwdHJhZGUlMjBmaW5hbmNlfGVufDF8fHx8MTc2OTQzMzMxMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 432,
    bookmarkCount: 150,
    commentCount: 23,
    hashtags: ["공급망", "아세안", "제조업"]
  },
  {
    id: "e2",
    category: "경제",
    title: "기준금리 2% 시대 도래하나... 한은 총재 발언 분석",
    summary: [
      "물가 안정세 뚜렷, 경기 부양 필요성 대두",
      "부동산 시장 과열 우려가 금리 인하 변수",
      "대출 이자 부담 완화로 내수 활성화 기대"
    ],
    content: `한국은행 총재가 최근 기자회견에서 "물가가 목표 수준에 안착하고 있다"며 금리 인하 가능성을 강력하게 시사했습니다. 시장에서는 연내 기준금리가 2% 초반까지 내려갈 수 있다는 기대감이 퍼지고 있습니다.\n\n고금리 기조가 장기화되면서 위축되었던 소비 심리와 기업 투자를 되살리기 위해서는 금리 인하가 필수적이라는 것이 경제계의 중론입니다. 특히 이자 부담에 허덕이던 영세 자영업자와 가계에는 단비 같은 소식이 될 것입니다.\n\n다만, 금리 인하가 다시금 부동산 투기 심리를 자극하고 가계 부채를 폭증시킬 수 있다는 우려도 만만치 않습니다. 한은의 통화 정책 셈법이 복잡해지는 이유입니다.`,
    source: "머니투데이",
    date: "2026.01.29",
    imageUrl: "https://images.unsplash.com/photo-1638481826540-7710b13f7d53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9jayUyMG1hcmtldCUyMGZpbmFuY2UlMjBncmFwaHxlbnwxfHx8fDE3Njk0MzI1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 2100,
    bookmarkCount: 980,
    commentCount: 210,
    hashtags: ["금리인하", "한국은행", "부동산"]
  },
  {
    id: "e3",
    category: "경제",
    title: "탄소국경세 본격 시행, 수출 기업 '발등에 불'",
    summary: [
      "EU 시작으로 미국 등 선진국 탄소 규제 강화",
      "철강, 석유화학 등 탄소 다배출 업종 타격 불가피",
      "친환경 공정 전환 및 ESG 경영 가속화 시급"
    ],
    content: `유럽연합(EU)의 탄소국경조정제도(CBAM)가 시범 기간을 거쳐 본격적으로 시행됨에 따라, 국내 수출 기업들에 비상이 걸렸습니다. 제품 생산 과정에서 배출된 탄소량에 따라 사실상의 관세를 부과하는 이 제도는 수출 의존도가 높은 한국 경제에 큰 위협이 되고 있습니다.\n\n특히 철강, 알루미늄, 비료 등 탄소 배출이 많은 업종은 가격 경쟁력을 잃을 위기에 처했습니다. 기업들은 부랴부랴 재생 에너지 사용 비율을 높이고 저탄소 공정을 도입하는 등 대응책 마련에 나섰습니다.\n\n정부는 기업들의 친환경 전환을 돕기 위해 금융 지원과 R&D 투자를 약속했지만, 글로벌 환경 규제의 파고를 넘기 위해서는 개별 기업 차원의 뼈를 깎는 혁신이 필요해 보입니다.`,
    source: "그린이코노미",
    date: "2026.01.28",
    imageUrl: "https://images.unsplash.com/photo-1769321725341-766f1aa5c3b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY28lMjBmcmllbmRseSUyMHN1c3RhaW5hYmxlJTIwY2l0eXxlbnwxfHx8fDE3Njk0MzMzMTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 320,
    bookmarkCount: 88,
    commentCount: 15,
    hashtags: ["ESG", "탄소세", "수출위기"]
  },
  {
    id: "e4",
    category: "경제",
    title: "K-푸드 수출 100억 달러 달성, 라면 넘어 '김밥'까지",
    summary: [
      "냉동 김밥, 미국 마트서 품절 대란 일으켜",
      "한류 콘텐츠 인기에 힘입어 한국 식문화 전파",
      "현지화 전략과 프리미엄 이미지 구축 성공"
    ],
    content: `한국 식품 수출액이 사상 처음으로 100억 달러를 돌파했습니다. 과거 라면과 김치에 국한되었던 수출 품목이 냉동 김밥, 떡볶이, 유자차 등으로 다양화되면서 K-푸드의 위상이 높아지고 있습니다.\n\n특히 미국의 대형 마트에서는 한국산 냉동 김밥을 사기 위해 줄을 서는 진풍경이 벌어지기도 했습니다. SNS를 통해 K-푸드 먹방이 유행하면서, 한국 음식은 단순한 먹거리를 넘어 하나의 트렌디한 문화 상품으로 자리 잡았습니다.\n\n식품 기업들은 비건 제품을 출시하고 현지인 입맛에 맞춘 소스를 개발하는 등 철저한 현지화 전략을 펼치고 있습니다. '가장 한국적인 것이 가장 세계적인 것'이라는 말이 증명되고 있습니다.`,
    source: "푸드비즈",
    date: "2026.01.27",
    imageUrl: "https://images.unsplash.com/photo-1635798963115-1499886b2cc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc3RyZWV0JTIwY3Jvd2QlMjBzb2NpZXR5fGVufDF8fHx8MTc2OTQzMjUzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 3400,
    bookmarkCount: 990,
    commentCount: 450,
    hashtags: ["K푸드", "수출대박", "한류"]
  },

  // --- 재테크 ---
  {
    id: "f1",
    category: "재테크",
    title: "비트코인 반감기 이후, 슈퍼 사이클 다시 올까?",
    summary: [
      "공급량 줄어드는 반감기 도래로 가격 상승 기대",
      "기관 투자자 유입과 현물 ETF 승인이 호재",
      "변동성 여전히 커... '묻지마 투자'는 금물"
    ],
    content: `가상자산 대장주 비트코인의 채굴 보상이 절반으로 줄어드는 '반감기'가 지났습니다. 역사적으로 반감기 이후에는 비트코인 가격이 급등하는 '슈퍼 사이클'이 찾아왔기에 투자자들의 기대가 그 어느 때보다 뜨겁습니다.\n\n이번 상승장은 과거와 달리 글로벌 자산 운용사들의 현물 ETF 승인으로 인해 막대한 기관 자금이 유입되고 있다는 점이 특징입니다. 비트코인이 금과 같은 '디지털 안전 자산'으로 인정받기 시작했다는 평가입니다.\n\n하지만 전문가들은 여전히 가상자산 시장의 변동성이 주식 시장보다 훨씬 크다는 점을 경고합니다. 맹목적인 추격 매수보다는 포트폴리오의 일부로서 분산 투자하는 신중한 접근이 필요합니다.`,
    source: "코인라이브",
    date: "2026.01.30",
    imageUrl: "https://images.unsplash.com/photo-1590286162167-70fb467846ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaXRjb2luJTIwaW50ZXJpb3IlMjBkZXNpZ24lMjBzbWFydHxlbnwxfHx8fDE3Njk0MzMzMTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 5600,
    bookmarkCount: 2300,
    commentCount: 890,
    hashtags: ["비트코인", "가상자산", "투자전략"]
  },
  {
    id: "f2",
    category: "재테크",
    title: "강남 아파트 대신 '꼬마 빌딩'? 자산가들의 포트폴리오 변화",
    summary: [
      "주택 규제 강화로 상업용 부동산으로 눈 돌려",
      "월세 수익과 시세 차익 동시에 노리는 전략",
      "금리 인상기에는 이자 부담 꼼꼼히 따져야"
    ],
    content: `다주택자에 대한 세금 규제가 강화되면서, 자산가들이 아파트를 팔고 '꼬마 빌딩'으로 갈아타는 현상이 두드러지고 있습니다. 꼬마 빌딩은 50억 원 미만의 중소형 상가 건물을 말하는데, 주택 수에 포함되지 않아 세금 부담이 상대적으로 적습니다.\n\n매달 안정적인 월세 수익을 올릴 수 있을 뿐만 아니라, 향후 리모델링이나 신축을 통해 건물 가치를 높여 시세 차익까지 기대할 수 있다는 점이 매력적입니다. 성수동, 연남동 등 핫플레이스 골목 상권의 꼬마 빌딩은 매물이 나오기가 무섭게 팔려나갑니다.\n\n하지만 금리가 오르면 대출 이자 부담이 급격히 늘어날 수 있고, 공실 리스크 또한 무시할 수 없습니다. 입지 분석과 수익률 계산을 철저히 하지 않으면 낭패를 볼 수 있습니다.`,
    source: "부동산인사이트",
    date: "2026.01.29",
    imageUrl: "https://images.unsplash.com/photo-1763621550224-6ff277b8c754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWFsJTIwZXN0YXRlJTIwaW52ZXN0bWVudCUyMGJ1aWxkaW5nfGVufDF8fHx8MTc2OTM4MzIyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 890,
    bookmarkCount: 450,
    commentCount: 67,
    hashtags: ["부동산", "꼬마빌딩", "건물주"]
  },
  {
    id: "f3",
    category: "재테크",
    title: "잠자는 연금 깨워라... '연금 개미' 수익률 1위 비결은?",
    summary: [
      "방치된 퇴직연금, 디폴트옵션 도입으로 운용 활기",
      "TDF(타깃데이트펀드) 등 생애주기 맞춤형 상품 인기",
      "적극적인 ETF 투자로 연 10% 수익 달성 사례 증가"
    ],
    content: `원금 보장형 상품에 묶여 쥐꼬리만 한 이자를 받던 퇴직연금이 깨어나고 있습니다. 정부가 도입한 디폴트옵션(사전지정운용제도) 덕분에 가입자가 별도의 지시를 하지 않아도 전문 기관이 알아서 굴려주는 길이 열렸기 때문입니다.\n\n특히 은퇴 시점에 맞춰 주식과 채권 비중을 자동으로 조절해주는 TDF(타깃데이트펀드)에 자금이 몰리고 있습니다. 안정성과 수익성을 동시에 추구할 수 있어 직장인들의 필수 재테크 수단으로 자리 잡았습니다.\n\n일부 '연금 개미'들은 연금 계좌를 통해 미국 나스닥 ETF나 배당주 ETF를 적극적으로 매수하여 연 10% 이상의 고수익을 올리기도 합니다. 연금은 더 이상 노후 자금이 아니라, 당장의 자산을 불리는 핵심 투자처입니다.`,
    source: "스마트머니",
    date: "2026.01.28",
    imageUrl: "https://images.unsplash.com/photo-1638481826540-7710b13f7d53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9jayUyMG1hcmtldCUyMGZpbmFuY2UlMjBncmFwaHxlbnwxfHx8fDE3Njk0MzI1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 1500,
    bookmarkCount: 880,
    commentCount: 110,
    hashtags: ["연금", "ETF", "노후준비"]
  },
  {
    id: "f4",
    category: "재테크",
    title: "금값 사상 최고치 경신, 지금이라도 사야 할까?",
    summary: [
      "글로벌 경기 침체 우려에 안전 자산 선호 심리 강화",
      "중국 등 각국 중앙은행의 금 사재기 지속",
      "장기적 관점에서 포트폴리오 헤지 수단으로 유효"
    ],
    content: `국제 금값이 트로이온스당 2,500달러를 돌파하며 사상 최고치를 갈아치웠습니다. 글로벌 경기 침체 우려와 지정학적 긴장이 고조되면서, 전통적인 안전 자산인 금으로 돈이 몰리고 있는 것입니다.\n\n특히 중국 인민은행을 비롯한 신흥국 중앙은행들이 달러 의존도를 줄이기 위해 금을 대거 사들이고 있는 것이 가격 상승의 주된 원인입니다. 금은 이자를 주지 않지만, 화폐 가치 하락을 방어하는 최고의 수단입니다.\n\n투자 전문가들은 단기적인 급등에 따른 조정 가능성을 염두에 두어야 한다면서도, 장기적으로는 상승 추세가 유효하다고 봅니다. 자산의 10~20% 정도를 금에 배분하여 위기에 대비하는 '보험'으로 활용할 것을 권합니다.`,
    source: "골드뉴스",
    date: "2026.01.27",
    imageUrl: "https://images.unsplash.com/photo-1652212976547-16d7e2841b8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0JTIwYmx1ZXxlbnwxfHx8fDE3Njk0MzI1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 670,
    bookmarkCount: 320,
    commentCount: 56,
    hashtags: ["금투자", "안전자산", "재테크"]
  },

  // --- 사회 ---
  {
    id: "s1",
    category: "사회",
    title: "저출산 쇼크, '소멸 예정' 지방 도시들의 생존 몸부림",
    summary: [
      "인구 절벽 현실화, 빈집 늘고 학교 폐교 속출",
      "청년 유입 위해 파격적인 주거 지원 및 일자리 제공",
      "지자체 간 통합 논의 활발... '메가시티'가 해법 될까"
    ],
    content: `합계 출산율 0.6명대. 대한민국이 전 세계 유례없는 저출산 쇼크에 빠졌습니다. 지방 도시들은 이미 '소멸' 단계에 접어들었습니다. 아이 울음소리가 끊긴 마을에는 빈집만 늘어가고, 100년 역사를 자랑하던 초등학교들이 줄줄이 문을 닫고 있습니다.\n\n지자체들은 생존을 위해 안간힘을 쓰고 있습니다. 청년들이 들어와 살면 집을 공짜로 주거나 수천만 원의 정착금을 지원하는 곳도 생겨났습니다. 은퇴자들을 위한 실버 타운을 조성해 인구를 늘리려는 시도도 이어집니다.\n\n근본적인 해결책으로 인근 도시들을 묶어 경쟁력을 키우는 '메가시티' 전략이 논의되고 있습니다. 행정 구역의 경계를 허물고 교통망을 연결해, 수도권에 대항할 수 있는 거점을 만들겠다는 구상입니다.`,
    source: "시사저널",
    date: "2026.01.30",
    imageUrl: "https://images.unsplash.com/photo-1635798963115-1499886b2cc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc3RyZWV0JTIwY3Jvd2QlMjBzb2NpZXR5fGVufDF8fHx8MTc2OTQzMjUzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 880,
    bookmarkCount: 300,
    commentCount: 150,
    hashtags: ["저출산", "지방소멸", "인구절벽"]
  },
  {
    id: "s2",
    category: "사회",
    title: "의대 정원 확대 2년, 지역 의료 공백 메워졌나?",
    summary: [
      "필수 의료 분야 전공의 여전히 부족 현상 심화",
      "지방 병원들, 고액 연봉 제시해도 의사 구하기 별따기",
      "의료 수가 현실화 및 정주 여건 개선 선행돼야"
    ],
    content: `정부가 의대 입학 정원을 대폭 늘린 지 2년이 지났지만, 기대했던 '낙수 효과'는 아직 나타나지 않고 있습니다. 늘어난 의대생들조차 성형외과나 피부과 등 인기 학과로 쏠리면서, 흉부외과나 산부인과 같은 필수 의료 분야의 인력난은 오히려 심화되었습니다.\n\n지방의 상황은 더 심각합니다. 지방 의료원들은 연봉 4~5억 원을 제시해도 의사를 구하지 못해 응급실 문을 닫는 날이 허다합니다. 의사들이 지방 근무를 기피하는 이유는 돈뿐만이 아닙니다. 자녀 교육 문제나 문화 생활 등 정주 여건이 열악하기 때문입니다.\n\n전문가들은 단순히 의사 수만 늘리는 것은 미봉책에 불과하다고 지적합니다. 필수 의료 분야의 수가를 획기적으로 올리고, 지방 거점 병원을 육성하는 등 의료 시스템 전반의 대수술이 필요합니다.`,
    source: "메디컬뉴스",
    date: "2026.01.29",
    imageUrl: "https://images.unsplash.com/photo-1627260119158-13f1fca542a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwaG9zcGl0YWwlMjBkb2N0b3J8ZW58MXx8fHwxNzY5NDMzMzExfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 1100,
    bookmarkCount: 450,
    commentCount: 220,
    hashtags: ["의료개혁", "지방의료", "필수의료"]
  },
  {
    id: "s3",
    category: "사회",
    title: "MZ세대 휩쓰는 '갓생' 열풍, 피로 사회의 단면인가?",
    summary: [
      "새벽 기상, 운동, 독서 등 자기계발에 몰두하는 청년들",
      "불안한 미래에 대한 통제감 얻으려는 심리 기제",
      "과도한 강박보다는 '나만의 속도' 찾는 것이 중요"
    ],
    content: `새벽 5시에 일어나 미라클 모닝을 실천하고, 퇴근 후에는 헬스장으로 달려가고, 주말에는 자격증 공부에 매진하는 삶. 요즘 MZ세대 사이에서 유행하는 '갓생(God+生)' 살기입니다. 하루하루를 계획적으로 치열하게 살며 성취감을 느끼는 것이 이들의 목표입니다.\n\n이러한 현상의 이면에는 깊은 불안이 자리 잡고 있습니다. 평생 직장이 사라지고 자산 격차가 벌어지는 현실 속에서, 스스로를 끊임없이 채찍질하지 않으면 뒤처질 수 있다는 공포가 청년들을 갓생으로 내몰고 있는지도 모릅니다.\n\n심리학자들은 건강한 성취감은 삶의 활력이 되지만, 보여주기식 갓생이나 강박적인 자기계발은 번아웃을 초래할 수 있다고 경고합니다. 남들과 비교하지 않고 나만의 속도로 삶을 꾸려가는 지혜가 필요한 시점입니다.`,
    source: "청년공감",
    date: "2026.01.28",
    imageUrl: "https://images.unsplash.com/photo-1758270705067-0d7edee57af0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZHVjYXRpb24lMjBjbGFzc3Jvb20lMjBzdHVkZW50fGVufDF8fHx8MTc2OTQzMzMxMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 3400,
    bookmarkCount: 1500,
    commentCount: 560,
    hashtags: ["갓생", "미라클모닝", "자기계발"]
  },
  {
    id: "s4",
    category: "사회",
    title: "미술관 문턱 낮추는 '도슨트 AI', 예술의 대중화 이끈다",
    summary: [
      "스마트폰만 있으면 누구나 수준 높은 해설 청취 가능",
      "관람객 취향 분석해 맞춤형 전시 코스 추천",
      "예술 향유의 격차 해소하고 문화 시민 양성 기여"
    ],
    content: `엄숙하고 어렵게만 느껴졌던 미술관이 친근해지고 있습니다. 스마트폰 앱을 켜고 작품 앞에 서면, AI 도슨트가 나만의 눈높이에 맞춰 작품 해설을 들려줍니다. 작가의 생애부터 작품에 숨겨진 뒷이야기까지, 마치 친구가 이야기해주듯 재미있게 풀어냅니다.\n\n이 기술은 단순히 정보를 전달하는 데 그치지 않습니다. 사용자의 관람 패턴과 취향을 학습하여, 넓은 미술관에서 꼭 봐야 할 작품들을 콕 집어 코스로 추천해 주기도 합니다. 덕분에 미술에 문외한인 사람들도 부담 없이 전시를 즐길 수 있게 되었습니다.\n\n문화 예술계는 AI 기술이 예술 향유의 진입 장벽을 낮추고, 더 많은 대중을 전시장으로 이끄는 촉매제가 될 것으로 기대하고 있습니다. 기술이 예술을 만나 더욱 풍요로운 삶을 만들고 있습니다.`,
    source: "아트라이프",
    date: "2026.01.27",
    imageUrl: "https://images.unsplash.com/photo-1576525207864-5be498e226fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdWx0dXJlJTIwYXJ0JTIwbXVzZXVtfGVufDF8fHx8MTc2OTQzMzMxMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    likeCount: 540,
    bookmarkCount: 230,
    commentCount: 45,
    hashtags: ["예술", "도슨트AI", "미술관"]
  }
];
