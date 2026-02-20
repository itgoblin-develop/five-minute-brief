import React, { useState } from 'react';
import { ChevronRight, User, Bell, Clock, MessageCircle, Shield, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import type { TermsType } from './TermsPage';
import { useAuth } from '@/lib/auth-context';

export type MyPageNavigationTarget = 'bookmark' | 'likes' | 'comments' | 'notifications' | 'admin';

interface MyPageProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenTerms: (type: TermsType) => void;
  onNavigate: (target: MyPageNavigationTarget) => void;
  onEditProfile: () => void;
}

// Custom Terms Icon Component based on the provided design
const TermsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 17 18" 
    fill="none" 
    {...props}
  >
    <path d="M13.8844 -0.000124343H2.90624C1.30134 -0.000124343 0.000308495 1.3009 0.000308495 2.9058V14.6502C0.000308495 16.2551 1.30134 17.5561 2.90624 17.5561H13.8844C15.4893 17.5561 16.7903 16.2551 16.7903 14.6502V2.9058C16.7903 1.3009 15.4893 -0.000124343 13.8844 -0.000124343Z" fill="#3667FB" />
    <g>
      <path d="M6.80744 13.5451H3.63035C3.05089 13.5451 2.58098 13.0752 2.58098 12.4958C2.58098 11.9163 3.05089 11.4464 3.63035 11.4464H6.80744C7.3869 11.4464 7.85681 11.9163 7.85681 12.4958C7.85681 13.0752 7.3869 13.5451 6.80744 13.5451Z" fill="#D5E2FF" />
      <path d="M12.6863 9.82765H3.57713C2.99766 9.82765 2.52775 9.35774 2.52775 8.77828C2.52775 8.19881 2.99766 7.7289 3.57713 7.7289H12.6863C13.2658 7.7289 13.7357 8.19881 13.7357 8.77828C13.7357 9.35774 13.2658 9.82765 12.6863 9.82765Z" fill="#D5E2FF" />
      <path d="M12.6863 6.11018H3.57713C2.99766 6.11018 2.52775 5.64027 2.52775 5.0608C2.52775 4.48134 2.99766 4.01143 3.57713 4.01143H12.6863C13.2658 4.01143 13.7357 4.48134 13.7357 5.0608C13.7357 5.64027 13.2658 6.11018 12.6863 6.11018Z" fill="#D5E2FF" />
    </g>
  </svg>
);

// Custom Comments Icon Component based on the provided design
const CommentsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    {...props}
  >
    <g>
      <g>
        <path d="M11.3386 4.26453L15.8559 8.78184L8.03396 16.6037L4.60535 17.1379C3.6545 17.2859 2.83446 16.4659 2.98252 15.515L3.51666 12.0864L11.3386 4.26453Z" fill="#3667FB" />
        <path d="M15.8561 8.78482L11.3389 4.26755L12.4695 3.13688C13.0932 2.51326 14.1057 2.51326 14.7294 3.13688L16.9868 5.39431C17.6104 6.01793 17.6104 7.03053 16.9868 7.65415L15.8561 8.78482Z" fill="#3667FB" />
      </g>
      <path d="M20.0301 21.6369H3.91615C3.21141 21.6369 2.63984 21.0655 2.63984 20.3606C2.63984 19.6556 3.2112 19.0843 3.91615 19.0843H20.0301C20.7348 19.0843 21.3064 19.6558 21.3064 20.3606C21.3064 21.0653 20.735 21.6369 20.0301 21.6369Z" fill="#3667FB" />
    </g>
  </svg>
);

// Custom Notification Icon Component based on the provided design
const NotificationIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    {...props}
  >
     <g transform="translate(1.73, 1.42)">
      <path d="M14.3893 21.0057L4.93469 15.5067V5.65355L14.3893 0.154586C15.1407 -0.282633 16.0834 0.259593 16.0834 1.12901V20.031C16.0834 20.9004 15.141 21.4429 14.3893 21.0057Z" fill="#3667FB" />
      <path d="M2.16123 5.65479H4.93082V15.508H2.16123C0.968335 15.508 0 14.5396 0 13.3467V7.81602C0 6.62313 0.968335 5.65479 2.16123 5.65479Z" fill="#3667FB" />
    </g>
    <g transform="translate(18.49, 7.59)">
      <path d="M0 0C2.31998 0 4.20076 1.88078 4.20076 4.20076C4.20076 6.52073 2.31998 8.40151 0 8.40151V0Z" fill="#3667FB" />
    </g>
  </svg>
);

// Custom Bookmark Icon Component
const BookmarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    {...props}
  >
    <path d="M12.2475 18.75L7.599 20.55C6.86114 20.8333 6.16018 20.7792 5.49611 20.3875C4.83204 19.9958 4.5 19.4417 4.5 18.725V5.75C4.5 5.2 4.71675 4.72917 5.15024 4.3375C5.58373 3.94583 6.10484 3.75 6.71357 3.75H17.7814C18.3902 3.75 18.9113 3.94583 19.3448 4.3375C19.7783 4.72917 19.995 5.2 19.995 5.75V18.725C19.995 19.4417 19.663 19.9958 18.9989 20.3875C18.3348 20.7792 17.6339 20.8333 16.896 20.55L12.2475 18.75Z" fill="#3667FB" />
  </svg>
);

// Custom Like (Heart) Icon Component
const LikeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    {...props}
  >
    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="#3667FB" />
  </svg>
);

export function MyPage({ isLoggedIn, onLoginClick, onLogout, onOpenTerms, onNavigate, onEditProfile }: MyPageProps) {
  const { user } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-full text-gray-400 px-5 pt-8 bg-gray-100">
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
               <svg className="w-14 h-14 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
               </svg>
            </div>
          </div>
          <p className="font-bold text-gray-900 text-lg mb-1">로그인이 필요합니다</p>
          <p className="text-sm text-gray-500 mb-8">내 정보를 관리하고 다양한 기능을 이용해보세요.</p>
          <button 
            onClick={onLoginClick}
            className="w-full max-w-[280px] bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  const MenuSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-4">
      <h3 className="text-lg font-extrabold text-gray-900 mb-3 px-2">{title}</h3>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        {children}
      </div>
    </div>
  );

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick, 
    isLast 
  }: { 
    icon: React.ElementType, 
    label: string, 
    value?: string | React.ReactNode, 
    onClick?: () => void, 
    isLast?: boolean 
  }) => (
    <div 
      onClick={onClick}
      className={clsx(
        "flex items-center justify-between p-4 bg-white active:bg-gray-50 transition-colors cursor-pointer h-[56px]",
        !isLast && "border-b border-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
         {/* Icon Container - Using filled icons style */}
         <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon width={16} height={16} className="text-gray-400 fill-current" strokeWidth={0} />
         </div>
         <span className="text-[15px] font-medium text-gray-900 font-normal">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {value && <span className="text-[13px] text-gray-400">{value}</span>}
        <ChevronRight size={18} className="text-gray-300" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      {/* 1. Profile Section - Horizontal Layout */}
      <div className="flex flex-col items-center justify-center py-8 bg-gray-100 border-b border-gray-100 m-[0px] pt-[32px] pr-[0px] pb-[16px] pl-[0px]">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-3">
             <User size={40} className="text-gray-400 fill-current" />
        </div>
        
        {/* Info */}
        <h2 className="text-xl font-bold text-gray-900 mb-1">{user?.nickname ?? '사용자'}님</h2>
        
        {/* Edit Action */}
        <button 
           onClick={onEditProfile}
           className="text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors"
        >
          내 정보 수정
        </button>
      </div>

      <div className="px-4 py-4 pb-[48px] pt-[0px] pr-[16px] pl-[16px]">
        {/* 2. Notification Section */}
        <MenuSection title="알림">
          <MenuItem 
            icon={NotificationIcon} 
            label="PUSH 알림" 
            onClick={() => onNavigate('notifications')} 
            isLast
          />
        </MenuSection>

        {/* 3. My Activity Section */}
        <MenuSection title="나의 활동">
          <MenuItem icon={BookmarkIcon} label="나의 북마크" onClick={() => onNavigate('bookmark')} />
          <MenuItem icon={LikeIcon} label="나의 좋아요" onClick={() => onNavigate('likes')} />
          <MenuItem icon={CommentsIcon} label="나의 댓글" onClick={() => onNavigate('comments')} isLast />
        </MenuSection>

        {/* 4. Admin Section - 관리자만 표시 */}
        {user?.isAdmin && (
          <MenuSection title="관리자">
            <MenuItem
              icon={Settings}
              label="관리자 대시보드"
              onClick={() => onNavigate('admin')}
              isLast
            />
          </MenuSection>
        )}

        {/* 5. Support Section */}
        <MenuSection title="고객지원">
          <MenuItem icon={TermsIcon} label="서비스 이용약관" onClick={() => onOpenTerms('service')} />
          <MenuItem icon={TermsIcon} label="개인정보 처리방침" onClick={() => onOpenTerms('privacy')} isLast />
        </MenuSection>

        {/* Logout */}
        <div className="mt-4 mb-8 flex justify-center">
          <button 
            onClick={onLogout}
            className="text-red-500 text-sm font-medium underline underline-offset-4 hover:text-red-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
