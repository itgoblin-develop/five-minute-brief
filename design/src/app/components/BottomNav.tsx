import React from 'react';
import { Bookmark } from 'lucide-react';
import { clsx } from 'clsx';

export type Tab = 'home' | 'likes' | 'bookmark' | 'mypage';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const HomeIcon = ({ isActive, className }: { isActive: boolean; className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 20.8 22.2308" 
    fill="none"
  >
    <path 
      d="M17.5553 22.2308H3.24545C1.45327 22.2308 0.000391006 20.778 0.000391006 18.9858V9.60029C0.000391006 8.67287 0.397151 7.78991 1.09031 7.17397L8.24525 0.819053C9.47453 -0.272947 11.326 -0.272947 12.5553 0.819053L19.7102 7.17423C20.4036 7.79017 20.8004 8.67313 20.8004 9.60055V18.986C20.8004 20.7782 19.3475 22.2308 17.5553 22.2308Z" 
      fill={isActive ? "#3667FB" : "#9CA3AF"} // Active: Blue, Inactive: Gray-400
    />
    <path 
      d="M9.09389 11.6585H11.7069C13.2048 11.6585 14.421 12.8745 14.421 14.3726V22.2308H6.38001V14.3726C6.38001 12.8747 7.59603 11.6585 9.09415 11.6585H9.09389Z" 
      fill={isActive ? "#D5E2FF" : "#F3F4F6"} // Active: Light Blue, Inactive: Gray-100
    />
  </svg>
);

const MyPageIcon = ({ isActive, className }: { isActive: boolean; className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 20.8 20.8" 
    fill="none"
  >
    <path 
      d="M18.2633 2.47955e-05H2.53747C1.13628 2.47955e-05 0.000391006 1.13591 0.000391006 2.5371V18.2629C0.000391006 19.6641 1.13628 20.8 2.53747 20.8H18.2633C19.6645 20.8 20.8004 19.6641 20.8004 18.2629V2.5371C20.8004 1.13591 19.6645 2.47955e-05 18.2633 2.47955e-05Z" 
      fill={isActive ? "#3667FB" : "#9CA3AF"} 
    />
    <path 
      d="M10.4009 11.3165C12.4406 11.3165 14.0942 9.66291 14.0942 7.62316C14.0942 5.5834 12.4406 3.92986 10.4009 3.92986C8.36112 3.92986 6.70758 5.5834 6.70758 7.62316C6.70758 9.66291 8.36112 11.3165 10.4009 11.3165Z" 
      fill={isActive ? "#D5E2FF" : "#F3F4F6"} 
    />
    <g>
      <path 
        d="M6.09449 15.6207C6.63009 13.7481 8.35467 12.3774 10.3993 12.3774C12.4283 12.3774 14.142 13.7273 14.6916 15.578L6.09449 15.6207Z" 
        fill={isActive ? "#D5E2FF" : "#F3F4F6"} 
      />
      <path 
        d="M6.09565 16.9207C5.68901 16.9207 5.30551 16.7301 5.05955 16.4061C4.81229 16.0798 4.73325 15.6566 4.84583 15.2632C5.55095 12.7986 7.83505 11.0774 10.4005 11.0774C12.9394 11.0774 15.2172 12.776 15.939 15.2081C16.0555 15.6004 15.9803 16.0245 15.7367 16.3528C15.4928 16.6815 15.1085 16.876 14.6993 16.878L6.10241 16.9207H6.09565ZM10.4005 13.6777C9.70133 13.6777 9.04041 13.9101 8.50403 14.309L12.2693 14.2903C11.7374 13.9029 11.0861 13.6777 10.4005 13.6777Z" 
        fill={isActive ? "#D5E2FF" : "#F3F4F6"} 
      />
    </g>
  </svg>
);

const BookmarkIcon = ({ isActive, className }: { isActive: boolean; className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 26 26" 
    fill="none"
  >
    <path 
      d="M13.3043 21.3975L7.44792 23.6653C6.51834 24.0222 5.63524 23.954 4.79862 23.4605C3.962 22.9671 3.54368 22.2689 3.54368 21.366V5.01967C3.54368 4.32676 3.81675 3.73359 4.36288 3.24015C4.909 2.74672 5.56552 2.5 6.33242 2.5H20.2761C21.043 2.5 21.6995 2.74672 22.2457 3.24015C22.7918 3.73359 23.0648 4.32676 23.0648 5.01967V21.366C23.0648 22.2689 22.6465 22.9671 21.8099 23.4605C20.9733 23.954 20.0902 24.0222 19.1606 23.6653L13.3043 21.3975Z" 
      fill={isActive ? "#3667FB" : "#9CA3AF"} 
    />
  </svg>
);

const LikesIcon = ({ isActive, className }: { isActive: boolean; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"
      fill={isActive ? "#3667FB" : "#9CA3AF"} 
    />
  </svg>
);

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const activeColor = "text-[#3D61F1]";
  const inactiveColor = "text-gray-400"; 

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-50 px-2 pb-1">
      <button
        onClick={() => onTabChange('home')}
        className="flex flex-col items-center justify-center p-2 min-w-[64px]"
        aria-label="Home"
      >
        <HomeIcon 
          isActive={currentTab === 'home'} 
          className="w-6 h-6 mb-1" 
        />
        <span className={clsx("text-[10px] font-medium", currentTab === 'home' ? activeColor : inactiveColor)}>
          홈
        </span>
      </button>

      <button
        onClick={() => onTabChange('likes')}
        className="flex flex-col items-center justify-center p-2 min-w-[64px]"
        aria-label="Likes"
      >
        <LikesIcon 
          isActive={currentTab === 'likes'} 
          className="w-6 h-6 mb-1" 
        />
        <span className={clsx("text-[10px] font-medium", currentTab === 'likes' ? activeColor : inactiveColor)}>
          좋아요
        </span>
      </button>

      <button
        onClick={() => onTabChange('bookmark')}
        className="flex flex-col items-center justify-center p-2 min-w-[64px]"
        aria-label="Bookmark"
      >
        <BookmarkIcon
          isActive={currentTab === 'bookmark'}
          className="w-6 h-6 mb-1"
        />
        <span className={clsx("text-[10px] font-medium", currentTab === 'bookmark' ? activeColor : inactiveColor)}>
          북마크
        </span>
      </button>
      
      <button
        onClick={() => onTabChange('mypage')}
        className="flex flex-col items-center justify-center p-2 min-w-[64px]"
        aria-label="My Page"
      >
        <MyPageIcon 
          isActive={currentTab === 'mypage'} 
          className="w-6 h-6 mb-1" 
        />
        <span className={clsx("text-[10px] font-medium", currentTab === 'mypage' ? activeColor : inactiveColor)}>
          마이페이지
        </span>
      </button>
    </div>
  );
}
