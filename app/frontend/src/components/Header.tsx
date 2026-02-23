import React from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import Component5Neul5BunLogo from '@/imports/5Neul5BunLogo';

import type { Tab } from './BottomNav';

// Updated ViewState to include new views
export type ViewState = 'main' | 'detail' | 'settings' | 'login' | 'likes' | 'comments' | 'notifications' | 'edit-profile' | 'admin';

interface HeaderProps {
  currentView: ViewState;
  currentTab?: Tab;
  onBack: () => void;
  onSettingsClick: () => void; // This is the Bell icon click (goes to Notifications List)
  onNotificationSettingsClick?: () => void; // This is the "Turn off notifications" button click
  unreadCount?: number;
}

export function Header({ currentView, currentTab, onBack, onSettingsClick, onNotificationSettingsClick, unreadCount = 0 }: HeaderProps) {
  // Determine title based on view
  const getTitle = () => {
    if (currentView === 'main') {
      if (currentTab === 'bookmark') return '북마크';
      if (currentTab === 'likes') return '좋아요';
      if (currentTab === 'mypage') return '마이페이지';
      return ''; // Home has no title
    }

    switch (currentView) {
      case 'settings': return 'PUSH 알림';
      case 'likes': return '나의 좋아요';
      case 'comments': return '나의 댓글';
      case 'notifications': return '알림';
      case 'edit-profile': return '내 정보 수정';
      case 'admin': return '관리자 대시보드';
      default: return '';
    }
  };

  const title = getTitle();
  const isHome = currentView === 'main' && (!currentTab || currentTab === 'home');

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 z-50 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center min-w-[40px] h-full">
        {isHome ? (
          <div className="h-8 w-24 flex items-center text-[#3D61F1]">
             <Component5Neul5BunLogo />
          </div>
        ) : (
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-700 dark:text-gray-300"
            aria-label="Go back"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Center Section (Title) */}
      <div className="flex-1 flex justify-center">
        {title && (
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</span>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center justify-end min-w-[40px]">
        {/* Only show Bell on main (home tab) and detail views. 
            User didn't explicitly say to remove bell from other views, but standard pattern suggests:
            - Home: Logo (L), Bell (R)
            - Others: Back (L), Title (C), Maybe Action (R) or Empty
            
            Let's keep Bell on Home and Detail as before, but maybe not on Bookmark/MyPage?
            The previous code was: (currentView === 'main' || currentView === 'detail')
            
            If I follow "Except for Home... page name in center, back icon on left", 
            it implies Home is special.
            
            Let's keep the Bell logic as is for now, but ensure the "isHome" logic drives the Left section.
        */}
        {(isHome || currentView === 'detail') && (
          <button
            onClick={onSettingsClick}
            className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-700 dark:text-gray-300 relative"
            aria-label="Notifications"
          >
            <Bell size={24} className="fill-gray-700 text-gray-700 dark:fill-gray-300 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
        
        {/* Show "Turn off notifications" (advertisement off) on Notifications Page */}
        {currentView === 'notifications' && (
           <button 
             onClick={onNotificationSettingsClick}
             className="text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
           >
             알림 끄기
           </button>
        )}
      </div>
    </header>
  );
}
