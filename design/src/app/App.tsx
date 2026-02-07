import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Bookmark, LayoutTemplate, List, Heart, MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Header, ViewState } from '@/app/components/Header';
import { SwipeDeck } from '@/app/components/SwipeDeck';
import { NewsList } from '@/app/components/NewsList';
import { NewsDetail } from '@/app/components/NewsDetail';
import { Settings } from '@/app/components/Settings';
import { NotificationsPage, MOCK_NOTIFICATIONS, NotificationItem } from '@/app/components/NotificationsPage';
import { LoginModal } from '@/app/components/LoginModal';
import { BottomNav, Tab } from '@/app/components/BottomNav';
import { TermsPage, TermsType } from '@/app/components/TermsPage';
import { MyPage, MyPageNavigationTarget } from '@/app/components/MyPage';
import { EditProfile } from '@/app/components/EditProfile';
import Swal from 'sweetalert2';
import { MOCK_NEWS, NewsItem } from '@/app/data/mockNews';

// ViewState is fully defined in Header.tsx now
type AppView = ViewState;

interface HistoryItem {
  view: ViewState;
  tab: Tab;
}

export default function App() {
  const [view, setView] = useState<AppView>('main');
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(true); // Show login modal initially
  const [isInitialLogin, setIsInitialLogin] = useState(true); // Track if it's the initial login modal
  const [termsType, setTermsType] = useState<TermsType | null>(null);
  
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  
  // News Data State
  const [newsItems, setNewsItems] = useState<NewsItem[]>(() => {
    return [...MOCK_NEWS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const handleReadNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  // Fake commented items for demo purposes
  const [commentedIds, setCommentedIds] = useState<Set<string>>(new Set(MOCK_NEWS.slice(0, 3).map(n => n.id)));

  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [scrollToComments, setScrollToComments] = useState(false);

  // Navigation History
  const [history, setHistory] = useState<HistoryItem[]>([{ view: 'main', tab: 'home' }]);

  const navigateTo = (newView: ViewState, newTab?: Tab) => {
    const tabToUse = newTab ?? currentTab;
    
    // Don't push if same as current
    const current = history[history.length - 1];
    if (current && current.view === newView && current.tab === tabToUse) return;

    setHistory(prev => [...prev, { view: newView, tab: tabToUse }]);
    setView(newView);
    if (newTab) setCurrentTab(newTab);
  };

  const goBack = () => {
    if (history.length <= 1) return; // Can't go back further than initial
    
    const newHistory = history.slice(0, -1);
    const previous = newHistory[newHistory.length - 1];
    
    setHistory(newHistory);
    
    // Cleanup if leaving detail
    if (view === 'detail' && previous.view !== 'detail') {
        setSelectedItem(null);
        setScrollToComments(false);
    }

    setView(previous.view);
    setCurrentTab(previous.tab);
  };

  // Category Tabs
  const categories = ["전체", "트렌딩", "경제", "재테크", "사회"];
  const [activeCategory, setActiveCategory] = useState("전체");

  // Track the current card index in the SwipeDeck to persist position
  const [cardIndex, setCardIndex] = useState(0);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCardIndex(0); // Reset stack when category changes
  };

  const handleCardClick = (item: NewsItem) => {
    if (isLoggedIn || readCount < 3) {
      setSelectedItem(item);
      setScrollToComments(false); // Reset scroll
      navigateTo('detail');
      
      if (!isLoggedIn) {
        setReadCount(prev => prev + 1);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleCommentClick = (item: NewsItem) => {
    if (isLoggedIn || readCount < 3) {
      setSelectedItem(item);
      setScrollToComments(true); // Set scroll to comments
      navigateTo('detail');
      
      if (!isLoggedIn) {
        setReadCount(prev => prev + 1);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    setIsInitialLogin(false);
    toast.success('로그인되었습니다!', {
      description: '이제 모든 뉴스를 무제한으로 즐기세요.'
    });
  };

  const handleToggleLike = (id: string) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        toast('관심사가 반영됩니다!', {
          description: "AI가 회원님의 취향을 학습해 딱 맞는 뉴스를 추천해요.",
          duration: 2000,
          icon: '❤️'
        });
      }
      return next;
    });
  };

  const handleToggleBookmark = (id: string) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        toast('기사가 저장되었습니다.', {
          icon: '🔖'
        });
      }
      return next;
    });
  };

  const handleBack = () => {
    goBack();
  };
  
  const handleNavigateFromMyPage = (target: MyPageNavigationTarget) => {
    if (target === 'bookmark') {
      navigateTo('main', 'bookmark');
    } else if (target === 'likes') {
      navigateTo('main', 'likes');
    } else if (target === 'comments') {
      navigateTo('comments');
    } else if (target === 'notifications') {
      navigateTo('settings'); // MyPage "PUSH Notifications" menu goes to Settings
    }
  };

  const handleLoadMore = () => {
    // Simulate loading more data
    const moreItems = MOCK_NEWS.slice(0, 10).map(item => ({
      ...item,
      id: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    setNewsItems(prev => [...prev, ...moreItems]);
    // Optional: Toast message removed to avoid spamming user
  };

  // Filter items based on active category
  const filteredItems = activeCategory === "전체" 
    ? newsItems 
    : newsItems.filter(item => item.category === activeCategory);

  // Get bookmarked items
  const bookmarkedItems = newsItems.filter(item => bookmarkedIds.has(item.id));
  
  // Get liked items
  const likedItems = newsItems.filter(item => likedIds.has(item.id));

  // Get commented items
  const commentedItems = newsItems.filter(item => commentedIds.has(item.id));

  const SuccessIcon = () => (
    <div className="w-5 h-5 bg-[#00D185] rounded-full flex items-center justify-center shrink-0">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.25 4L3.75 6.5L8.75 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 selection:bg-blue-100 flex flex-col relative overflow-hidden">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <Header
        currentView={view as ViewState}
        currentTab={currentTab}
        onBack={handleBack} 
        onSettingsClick={() => navigateTo('notifications')} // Bell icon -> Notifications List
        onNotificationSettingsClick={() => navigateTo('settings')} // "Turn off notifications" -> Settings
      />

      {/* Main Content Area */}
      <main className={`pt-14 flex flex-col ${view === 'main' ? 'pb-16 h-[calc(100vh-64px)]' : 'flex-1'}`}>
        
        {/* Main Feed */}
        {view === 'main' && currentTab === 'home' && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col z-10 bg-gray-100/90 backdrop-blur-sm sticky top-0">
              <div className="w-full overflow-x-auto no-scrollbar px-4 pt-4 pb-2">
                <div className="flex gap-2 min-w-max">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                        activeCategory === cat
                          ? "bg-black text-white shadow-md shadow-gray-200"
                          : "bg-white text-gray-400 border border-gray-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end px-4 pb-2">
                <div className="bg-white rounded-lg p-1 flex shadow-sm border border-gray-100 h-[38px] items-center">
                  <button 
                    onClick={() => setViewMode('card')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'card' 
                        ? 'bg-blue-50 text-[#3D61F1]' 
                        : 'text-gray-300 hover:text-gray-500'
                    }`}
                    aria-label="Card View"
                  >
                    <LayoutTemplate 
                      size={18} 
                      className={viewMode === 'card' ? "fill-current" : ""} 
                    />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'list' 
                        ? 'bg-blue-50 text-[#3D61F1]' 
                        : 'text-gray-300 hover:text-gray-500'
                    }`}
                    aria-label="List View"
                  >
                    <List 
                      size={18} 
                      className={viewMode === 'list' ? "fill-current" : ""} 
                      strokeWidth={2.5}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {viewMode === 'card' ? (
                <SwipeDeck
                  key={activeCategory} 
                  items={filteredItems}
                  likedIds={likedIds}
                  bookmarkedIds={bookmarkedIds}
                  onToggleLike={handleToggleLike}
                  onToggleBookmark={handleToggleBookmark}
                  onCardClick={handleCardClick}
                  onCommentClick={handleCommentClick}
                  startIndex={cardIndex}
                  onIndexChange={setCardIndex}
                  onLoadMore={handleLoadMore}
                />
              ) : (
                <NewsList
                  items={filteredItems}
                  likedIds={likedIds}
                  bookmarkedIds={bookmarkedIds}
                  onToggleLike={handleToggleLike}
                  onToggleBookmark={handleToggleBookmark}
                  onCardClick={handleCardClick}
                  onCommentClick={handleCommentClick}
                  onLoadMore={handleLoadMore}
                />
              )}
            </div>
          </div>
        )}

        {/* Likes Tab */}
        {view === 'main' && currentTab === 'likes' && (
           <div className="h-full flex flex-col">
              <div className="px-4 py-4">
                 <h2 className="text-xl font-bold">좋아요한 뉴스</h2>
              </div>
              {!isLoggedIn ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 px-8">
                     <Heart size={48} className="mb-4 opacity-20 fill-current" />
                     <p className="font-bold text-gray-600 mb-6">좋아요한 뉴스를 확인하려면 로그인해주세요</p>
                     <button 
                         onClick={() => setShowLoginModal(true)}
                         className="w-full max-w-[280px] bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                     >
                         로그인하기
                     </button>
                 </div>
              ) : likedItems.length > 0 ? (
                 <NewsList
                   items={likedItems}
                   likedIds={likedIds}
                   bookmarkedIds={bookmarkedIds}
                   onToggleLike={handleToggleLike}
                   onToggleBookmark={handleToggleBookmark}
                   onCardClick={handleCardClick}
                   onCommentClick={handleCommentClick}
                 />
              ) : (
               <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                 <Heart size={48} className="mb-4 opacity-20 fill-current" />
                 <p>좋아요한 기사가 없습니다.</p>
               </div>
              )}
           </div>
        )}

        {/* Bookmark Tab */}
        {view === 'main' && currentTab === 'bookmark' && (
          <div className="h-full flex flex-col">
             <div className="px-4 py-4">
                <h2 className="text-xl font-bold">북마크한 뉴스</h2>
             </div>
             {!isLoggedIn ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400 px-8">
                    <Bookmark size={48} className="mb-4 opacity-20 fill-current" />
                    <p className="font-bold text-gray-600 mb-6">북마크한 뉴스를 확인하려면 로그인해주세요</p>
                    <button 
                        onClick={() => setShowLoginModal(true)}
                        className="w-full max-w-[280px] bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        로그인하기
                    </button>
                </div>
             ) : bookmarkedItems.length > 0 ? (
                <NewsList
                  items={bookmarkedItems}
                  likedIds={likedIds}
                  bookmarkedIds={bookmarkedIds}
                  onToggleLike={handleToggleLike}
                  onToggleBookmark={handleToggleBookmark}
                  onCardClick={handleCardClick}
                  onCommentClick={handleCommentClick}
                />
             ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                <Bookmark size={48} className="mb-4 opacity-20 fill-current" />
                <p>저장된 기사가 없습니다.</p>
              </div>
             )}
          </div>
        )}

        {/* My Page Tab */}
        {view === 'main' && currentTab === 'mypage' && (
          <MyPage 
            isLoggedIn={isLoggedIn}
            onLoginClick={() => setShowLoginModal(true)}
            onLogout={() => {
              setIsLoggedIn(false);
              setReadCount(0);
              // Logout -> Clear history and go Home
              setHistory([{ view: 'main', tab: 'home' }]);
              setView('main');
              setCurrentTab('home');
              toast.info('로그아웃되었습니다.');
            }}
            onOpenTerms={setTermsType}
            onNavigate={handleNavigateFromMyPage}
            onEditProfile={() => navigateTo('edit-profile')}
          />
        )}

        {/* Comments Page */}
        {view === 'comments' && (
           <div className="flex-1 flex flex-col">
             {commentedItems.length > 0 ? (
                <NewsList
                  items={commentedItems}
                  likedIds={likedIds}
                  bookmarkedIds={bookmarkedIds}
                  onToggleLike={handleToggleLike}
                  onToggleBookmark={handleToggleBookmark}
                  onCardClick={handleCardClick}
                  onCommentClick={handleCommentClick}
                  onEditComment={handleCommentClick}
                  isCommentMode={true} // Enable comment mode (More button)
                />
             ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                <MessageCircle size={48} className="mb-4 opacity-20 fill-current" />
                <p>댓글 단 기사가 없습니다.</p>
              </div>
             )}
           </div>
        )}

        {/* Notifications Page */}
        {view === 'notifications' && (
          <NotificationsPage 
            notifications={notifications}
            onRead={handleReadNotification}
            onNotificationClick={(id) => {
              toast('알림을 확인했습니다.', { description: '상세 내용은 준비 중입니다.' });
            }}
          />
        )}

        {/* Detail View */}
        {view === 'detail' && selectedItem && (
          <NewsDetail 
            item={selectedItem} 
            isLoggedIn={isLoggedIn}
            onLoginRequired={() => setShowLoginModal(true)}
            initialScrollToComments={scrollToComments}
            likedIds={likedIds}
            bookmarkedIds={bookmarkedIds}
            onToggleLike={handleToggleLike}
            onToggleBookmark={handleToggleBookmark}
          />
        )}

        {/* Edit Profile View */}
        {view === 'edit-profile' && (
          <EditProfile 
            onUpdate={() => {
               toast.success('회원정보가 수정되었습니다.');
               goBack();
            }}
            onWithdraw={() => {
               setIsLoggedIn(false);
               setReadCount(0);
               setHistory([{ view: 'main', tab: 'home' }]);
               setView('main');
               setCurrentTab('home');
               Swal.fire({
                 title: '탈퇴 완료',
                 text: '회원탈퇴가 처리되었습니다.',
                 icon: 'success',
                 confirmButtonColor: '#3D61F1'
               });
            }}
          />
        )}

        {/* Settings View */}
        {view === 'settings' && (
          <Settings onLogout={() => {
            // Unused
          }} />
        )}
      </main>

      {/* Bottom Navigation - Only show on main view */}
      {view === 'main' && (
        <BottomNav 
          currentTab={currentTab} 
          onTabChange={(tab) => {
             // Auth Guard
             if (!isLoggedIn && (tab === 'likes' || tab === 'bookmark' || tab === 'mypage')) {
                setShowLoginModal(true);
                return;
             }
             navigateTo('main', tab);
          }} 
        />
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setIsInitialLogin(false);
        }}
        onLogin={handleLogin}
        onOpenTerms={setTermsType}
        canClose={!isInitialLogin}
      />

      <AnimatePresence>
        {termsType && (
          <TermsPage 
            type={termsType} 
            onBack={() => setTermsType(null)} 
          />
        )}
      </AnimatePresence>
      
      <Toaster 
        position="top-center" 
        icons={{
          success: <SuccessIcon />,
        }}
        toastOptions={{
          style: {
            background: 'rgba(55, 65, 81, 0.95)', // Dark gray (slate-700 ish) with opacity
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            padding: '12px 24px', // Reduced height
            fontSize: '16px',
            fontWeight: '700',
            marginTop: '4rem', // Keep original position logic
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start', // Align content to left
            textAlign: 'left', // Text left aligned
            gap: '20px', // 20px gap between icon and text
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            maxWidth: '90vw'
          },
          className: 'mt-12',
          descriptionClassName: 'hidden'
        }}
      />
    </div>
  );
}
