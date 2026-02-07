import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

export type TermsType = 'service' | 'privacy';

interface TermsPageProps {
  type: TermsType;
  onBack: () => void;
}

export function TermsPage({ type, onBack }: TermsPageProps) {
  const title = type === 'service' ? '서비스 이용약관' : '개인정보 처리방침';
  
  const content = type === 'service' 
    ? `제1조 (목적)
본 약관은 오늘5분(이하 "회사")이 제공하는 뉴스 요약 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
1. "서비스"라 함은 구현되는 단말기와 상관없이 회원이 이용할 수 있는 오늘5분 관련 제반 서비스를 의미합니다.
2. "회원"이라 함은 회사의 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.

제3조 (약관의 게시와 개정)
1. 회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
2. 회사는 "약관의 규제에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.

제4조 (서비스의 제공)
회사는 회원에게 다음과 같은 서비스를 제공합니다.
1. 뉴스 큐레이션 및 요약 서비스
2. 관심사 기반 콘텐츠 추천 서비스
3. 기타 회사가 추가 개발하거나 다른 회사와의 제휴 계약 등을 통해 회원에게 제공하는 일체의 서비스

제5조 (서비스의 중단)
회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.

(이하 생략)`
    : `1. 개인정보의 수집 및 이용 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

- 회원 가입 및 관리
- 서비스 제공 및 개선
- 신규 서비스 개발 및 마케팅 활용

2. 수집하는 개인정보의 항목
회사는 회원가입, 서비스 신청, 고객상담 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.

- 필수항목: 아이디(이메일), 비밀번호, 이름
- 선택항목: 관심사, 성별, 생년월일

3. 개인정보의 보유 및 이용 기간
회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.

- 회원 탈퇴 시까지
- 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지

4. 개인정보의 파기절차 및 방법
회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.

(이하 생략)`;

  return (
    <motion.div 
        initial={{ opacity: 0, x: "100%" }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-gray-100 z-[110] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-gray-100 bg-white">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-bold text-lg text-gray-900">
          약관
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <h1 className="text-[26px] font-bold text-gray-900 leading-snug mb-6">
          {title}
        </h1>
        <div className="text-[14px] text-gray-600 leading-loose whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </motion.div>
  );
}
