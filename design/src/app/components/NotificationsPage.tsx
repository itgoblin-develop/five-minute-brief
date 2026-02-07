import React from 'react';
import { Bell } from 'lucide-react';
import { clsx } from 'clsx';

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  date: string;
  isRead: boolean;
}

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    category: '맞춤 뉴스 배달',
    title: '오늘의 맞춤 뉴스가 배달되었습니다.',
    date: '방금 전',
    isRead: false,
  },
  {
    id: '2',
    category: '맞춤 뉴스 배달',
    title: '오늘의 맞춤 뉴스가 배달되었습니다.',
    date: '1일 전',
    isRead: true,
  },
  {
    id: '3',
    category: '맞춤 뉴스 배달',
    title: '오늘의 맞춤 뉴스가 배달되었습니다.',
    date: '2일 전',
    isRead: true,
  },
  {
    id: '4',
    category: '맞춤 뉴스 배달',
    title: '오늘의 맞춤 뉴스가 배달되었습니다.',
    date: '3일 전',
    isRead: true,
  },
];

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onNotificationClick: (id: string) => void;
  onRead: (id: string) => void;
}

const NotificationIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    viewBox="0 0 19.2748 23.4"
  >
    <g clipPath="url(#clip0_notifications)">
      <g>
        <path d="M19.2748 2.19825C19.2748 0.989772 18.2858 0.000732422 17.0773 0.000732422H6.2803L0 6.28103V21.2032C0 22.4119 0.98904 23.401 2.19752 23.401H17.0773C18.2858 23.401 19.2748 22.4122 19.2748 21.2032V2.19825Z" fill="#5F6EF6" />
        <path d="M4.08252 6.28103C5.29126 6.28103 6.28004 5.29225 6.28004 4.08351V0.000732422L0 6.28103H4.08252Z" fill="#B6C0FF" />
      </g>
      <path d="M14.6268 18.6412H4.64771C4.07337 18.6412 3.60771 18.1756 3.60771 17.6012C3.60771 17.0269 4.07337 16.5612 4.64771 16.5612H14.627C15.2014 16.5612 15.667 17.0269 15.667 17.6012C15.667 18.1756 15.2011 18.6412 14.6268 18.6412Z" fill="#B6C0FF" />
      <path d="M14.6266 13.7797H4.6475C4.07316 13.7797 3.6075 13.3141 3.6075 12.7397C3.6075 12.1654 4.07316 11.6997 4.6475 11.6997H14.6268C15.2012 11.6997 15.6668 12.1654 15.6668 12.7397C15.6668 13.3141 15.2009 13.7797 14.6266 13.7797Z" fill="#B6C0FF" />
    </g>
    <defs>
      <clipPath id="clip0_notifications">
        <rect fill="white" height="23.4" width="19.2748" />
      </clipPath>
    </defs>
  </svg>
);

export function NotificationsPage({ notifications, onNotificationClick, onRead }: NotificationsPageProps) {
  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  const NotificationItemCard = ({ item }: { item: NotificationItem }) => (
    <div 
      onClick={() => {
        onRead(item.id);
        onNotificationClick(item.id);
      }}
      className={clsx(
        "p-5 flex gap-4 border-b border-gray-200 active:bg-gray-100 transition-colors cursor-pointer",
        item.isRead ? "bg-white" : "bg-[#F2F7FE]"
      )}
    >
      {/* Icon Container - Fixed size and centered content */}
      <div className="w-9 h-9 shrink-0 flex items-center justify-center">
        <NotificationIcon className="w-[20px] h-[24px]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 font-bold">{item.category}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{item.date}</span>
        </div>
        <p className="text-[15px] font-medium text-gray-900 leading-snug">
          {item.title}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Unread / Recent Section */}
      <div>
        {unreadNotifications.map((item) => (
          <NotificationItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Past Notifications Section */}
      {readNotifications.length > 0 && (
        <div className="mt-2">
          <div className="px-5 py-4 bg-white">
            <h3 className="text-sm font-bold text-gray-800">지난 알림</h3>
          </div>
          {readNotifications.map((item) => (
            <NotificationItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
      
      {notifications.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-gray-400 h-[60vh]">
            <Bell size={48} className="mb-4 opacity-20" />
            <p>새로운 알림이 없습니다.</p>
         </div>
      )}
    </div>
  );
}
