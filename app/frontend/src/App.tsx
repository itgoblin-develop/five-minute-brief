import { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Bookmark, LayoutTemplate, List, Heart, MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Header } from '@/components/Header';
import type { ViewState } from '@/components/Header';
import { SwipeDeck } from '@/components/SwipeDeck';
import { NewsList } from '@/components/NewsList';
import { NewsDetail } from '@/components/NewsDetail';
import { Settings } from '@/components/Settings';
import { NotificationsPage } from '@/components/NotificationsPage';
import type { NotificationItem } from '@/components/NotificationsPage';
import { LoginModal } from '@/components/LoginModal';
import { SocialSignupModal } from '@/components/SocialSignupModal';
import { BottomNav } from '@/components/BottomNav';
import type { Tab } from '@/components/BottomNav';
import { TermsPage } from '@/components/TermsPage';
import type { TermsType } from '@/components/TermsPage';
import { MyPage } from '@/components/MyPage';
import type { MyPageNavigationTarget } from '@/components/MyPage';
import { EditProfile } from '@/components/EditProfile';
import { AdminDashboard } from '@/components/AdminDashboard';
import { BriefingPage } from '@/components/BriefingPage';
import { BriefingDetail } from '@/components/BriefingDetail';
import { TrendsPage } from '@/components/TrendsPage';
import { EditorPicks } from '@/components/EditorPicks';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import type { DailyBrief } from '@/components/DailyBriefCard';
import type { WeeklyBrief } from '@/components/WeeklyBriefCard';
import type { MonthlyBrief } from '@/components/MonthlyBriefCard';
import Swal from 'sweetalert2';
import type { NewsItem } from '@/data/mockNews';
import { useAuth } from '@/lib/auth-context';
import { newsAPI, interactionAPI, pushAPI, userAPI, briefingAPI, trendsAPI } from '@/lib/api';
import { registerServiceWorker } from '@/lib/push';
import './index.css';

type AppView = ViewState;

interface HistoryItem {
  view: ViewState;
  tab: Tab;
}

export default function App() {
  const { isLoggedIn, user, logout: authLogout, pendingDeletion, clearPendingDeletion, socialSignupPending } = useAuth();

  const [view, setView] = useState<AppView>('main');
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const navigatingRef = useRef(false);
  const historyRef = useRef<HistoryItem[]>([{ view: 'main', tab: 'home' }]);
  const [isInitialLogin, setIsInitialLogin] = useState(false);
  const [termsType, setTermsType] = useState<TermsType | null>(null);

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [commentedIds, setCommentedIds] = useState<Set<string>>(new Set());
  const [commentedNewsItems, setCommentedNewsItems] = useState<NewsItem[]>([]);
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [viewMode, setViewMode] = useState<'card' | 'list'>(window.innerWidth >= 768 ? 'list' : 'card');
  const [scrollToComments, setScrollToComments] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<{ type: 'daily' | 'weekly' | 'monthly'; data: DailyBrief | WeeklyBrief | MonthlyBrief } | null>(null);

  // 검색 모드 상태
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  // 북마크 탭 내부 서브탭 (좋아요/북마크)
  const [bookmarkSubTab, setBookmarkSubTab] = useState<'likes' | 'bookmark'>('bookmark');

  const [history, setHistory] = useState<HistoryItem[]>([{ view: 'main', tab: 'home' }]);

  // document.title 동적 업데이트
  useEffect(() => {
    const titles: Record<string, string> = {
      'main:home': 'IT 도깨비 - AI 큐레이션 IT 뉴스',
      'main:trends': 'IT 트렌드 키워드 - IT 도깨비',
      'main:briefing': '브리핑 - IT 도깨비',
      'main:bookmark': '보관함 - IT 도깨비',
      'main:mypage': '마이페이지 - IT 도깨비',
      'briefing': '브리핑 - IT 도깨비',
      'settings': 'PUSH 알림 - IT 도깨비',
      'admin': '관리자 대시보드 - IT 도깨비',
      'notifications': '알림 - IT 도깨비',
      'comments': '나의 댓글 - IT 도깨비',
    };
    const key = view === 'main' ? `main:${currentTab}` : view;
    document.title = titles[key] || 'IT 도깨비';
  }, [view, currentTab]);

  useEffect(() => {
    if (isLoggedIn) {
      setShowLoginModal(false);
      setIsInitialLogin(false);

      // 서비스 워커 등록 (푸시 알림용)
      registerServiceWorker();

      // 로그인 시 사용자의 댓글 단 뉴스 목록 fetch
      interactionAPI.getMyComments().then(data => {
        if (data.success) {
          setCommentedIds(new Set(data.news.map((n: any) => n.id)));
          setCommentedNewsItems(data.news.map((n: any) => ({
            ...n,
            content: n.summary?.join?.(' ') || '',
            likeCount: n.likeCount ?? 0,
            bookmarkCount: n.bookmarkCount ?? 0,
            commentCount: n.commentCount ?? 0,
          })));
        }
      }).catch((err) => { console.error('댓글 목록 조회 실패:', err); });

      // 알림 이력 및 unread 수 fetch
      pushAPI.getNotifications({ page: 1, limit: 30 }).then(data => {
        if (data.success) {
          setNotifications(data.notifications.map((n: any) => ({
            id: n.id,
            category: n.category || '맞춤 뉴스 배달',
            title: n.title,
            body: n.body,
            date: n.date,
            isRead: n.isRead,
          })));
          setUnreadCount(data.unreadCount || 0);
        }
      }).catch((err) => { console.error('알림 이력 조회 실패:', err); });
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isLoggedIn]);

  const fetchNews = async (category?: string, page = 1, append = false) => {
    setIsLoadingNews(true);
    try {
      const params: { category?: string; page: number; limit: number } = { page, limit: 20 };
      if (category && category !== '전체') params.category = category;
      const data = await newsAPI.getList(params);
      if (data.success) {
        const items = (data.news as NewsItem[]).map(item => ({
          ...item,
          likeCount: item.likeCount ?? 0,
          bookmarkCount: item.bookmarkCount ?? 0,
          commentCount: item.commentCount ?? 0,
        }));
        if (append) {
          setNewsItems(prev => [...prev, ...items]);
        } else {
          setNewsItems(items);
        }
        setHasMore(page < data.pagination.totalPages);
        setCurrentPage(page);
      }
    } catch {
      if (!append) setNewsItems([]);
    } finally {
      setIsLoadingNews(false);
    }
  };

  const categories = ["전체", "모바일", "PC", "AI", "네트워크/통신", "보안", "기타"];
  const [activeCategory, setActiveCategory] = useState("전체");
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    fetchNews(activeCategory, 1, false);
  }, [activeCategory, isLoggedIn]);

  // 댓글 뷰 진입 시 최신 댓글 목록 갱신
  useEffect(() => {
    if (view === 'comments' && isLoggedIn) {
      interactionAPI.getMyComments().then(data => {
        if (data.success) {
          setCommentedIds(new Set(data.news.map((n: any) => n.id)));
          setCommentedNewsItems(data.news.map((n: any) => ({
            ...n,
            content: n.summary?.join?.(' ') || '',
            likeCount: n.likeCount ?? 0,
            bookmarkCount: n.bookmarkCount ?? 0,
            commentCount: n.commentCount ?? 0,
          })));
        }
      }).catch((err) => { console.error('댓글 뷰 갱신 실패:', err); });
    }
  }, [view, isLoggedIn]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCardIndex(0);
  };

  // 검색 실행
  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const data = await newsAPI.search({ q: query, page, limit: 20 });
      if (data.success) {
        if (page === 1) {
          setSearchResults(data.news);
        } else {
          setSearchResults(prev => [...prev, ...data.news]);
        }
        setSearchTotal(data.pagination.total);
        setSearchPage(page);
        setHasMoreSearch(page < data.pagination.totalPages);
      }
    } catch {
      // 에러 무시
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchFromTrends = (keyword: string) => {
    setSearchQuery(keyword);
    setIsSearchMode(true);
    performSearch(keyword, 1);
  };

  // URL 경로 생성 헬퍼
  const getUrlForView = (v: ViewState, tab?: Tab): string => {
    if (v === 'main') {
      if (tab === 'mypage') return '/mypage';
      if (tab === 'bookmark') return '/bookmark';
      if (tab === 'trends') return '/trends';
      return '/';
    }
    if (v === 'briefing') return '/briefing';
    if (v === 'settings') return '/settings';
    if (v === 'admin') return '/admin';
    if (v === 'notifications') return '/notifications';
    if (v === 'comments') return '/comments';
    if (v === 'edit-profile') return '/edit-profile';
    // detail, briefing-detail은 호출처에서 url 직접 전달
    return '/';
  };

  const navigateTo = (newView: ViewState, newTab?: Tab, url?: string) => {
    const tabToUse = newTab ?? currentTab;
    const current = history[history.length - 1];
    if (current && current.view === newView && current.tab === tabToUse) return;
    const newHistory = [...history, { view: newView, tab: tabToUse }];
    setHistory(newHistory);
    historyRef.current = newHistory;
    setView(newView);
    if (newTab) setCurrentTab(newTab);
    // URL 동기화
    const path = url ?? getUrlForView(newView, tabToUse);
    window.history.pushState({ view: newView, tab: tabToUse }, '', path);
  };

  const goBack = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    const previous = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    historyRef.current = newHistory;
    if (view === 'detail' && previous.view !== 'detail') {
      setSelectedItem(null);
      setScrollToComments(false);
    }
    if (view === 'briefing-detail') {
      setSelectedBriefing(null);
    }
    setView(previous.view);
    setCurrentTab(previous.tab);
    // 브라우저 히스토리 동기화
    navigatingRef.current = true;
    window.history.back();
  };

  // 초기 URL 해석 (직접 접속 또는 공유 링크)
  useEffect(() => {
    const resolveInitialUrl = async () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        window.history.replaceState({ view: 'main', tab: 'home' }, '', '/');
        return;
      }

      // /news/:id → 기사 상세
      const newsMatch = path.match(/^\/news\/(\d+)$/);
      if (newsMatch) {
        try {
          const data = await newsAPI.getDetail(newsMatch[1]);
          if (data.success && data.news) {
            const item = {
              ...data.news,
              content: data.news.summary?.join?.(' ') || '',
              likeCount: data.news.likeCount ?? 0,
              bookmarkCount: data.news.bookmarkCount ?? 0,
              commentCount: data.news.commentCount ?? 0,
            };
            setSelectedItem(item);
            setView('detail');
            const h = [{ view: 'main' as ViewState, tab: 'home' as Tab }, { view: 'detail' as ViewState, tab: 'home' as Tab }];
            setHistory(h);
            historyRef.current = h;
            window.history.replaceState({ view: 'main', tab: 'home' }, '', '/');
            window.history.pushState({ view: 'detail', tab: 'home' }, '', path);
          }
        } catch {
          window.history.replaceState({}, '', '/');
        }
        return;
      }

      // /briefing/(daily|weekly|monthly)/:id → 브리핑 상세
      const briefingMatch = path.match(/^\/briefing\/(daily|weekly|monthly)\/(\d+)$/);
      if (briefingMatch) {
        const [, type, id] = briefingMatch;
        try {
          const fetcher = type === 'daily' ? briefingAPI.getDailyDetail
            : type === 'weekly' ? briefingAPI.getWeeklyDetail
            : briefingAPI.getMonthlyDetail;
          const data = await fetcher(Number(id));
          if (data.success && data.brief) {
            setSelectedBriefing({ type: type as 'daily' | 'weekly' | 'monthly', data: data.brief });
            setView('briefing-detail');
            setCurrentTab('briefing');
            const h: HistoryItem[] = [
              { view: 'main', tab: 'home' },
              { view: 'briefing', tab: 'briefing' },
              { view: 'briefing-detail', tab: 'briefing' },
            ];
            setHistory(h);
            historyRef.current = h;
            window.history.replaceState({ view: 'main', tab: 'home' }, '', '/');
            window.history.pushState({ view: 'briefing', tab: 'briefing' }, '', '/briefing');
            window.history.pushState({ view: 'briefing-detail', tab: 'briefing' }, '', path);
          }
        } catch {
          window.history.replaceState({}, '', '/');
        }
        return;
      }

      // 단순 경로 매핑
      const simpleRoutes: Record<string, { view: ViewState; tab: Tab }> = {
        '/briefing': { view: 'briefing', tab: 'briefing' },
        '/mypage': { view: 'main', tab: 'mypage' },
        '/bookmark': { view: 'main', tab: 'bookmark' },
        '/likes': { view: 'main', tab: 'bookmark' },
        '/trends': { view: 'main', tab: 'trends' },
        '/settings': { view: 'settings', tab: 'home' },
        '/admin': { view: 'admin', tab: 'home' },
        '/notifications': { view: 'notifications', tab: 'home' },
        '/comments': { view: 'comments', tab: 'home' },
        '/edit-profile': { view: 'edit-profile', tab: 'home' },
      };

      const route = simpleRoutes[path];
      if (route) {
        setView(route.view);
        setCurrentTab(route.tab);
        const h: HistoryItem[] = [{ view: 'main', tab: 'home' }, { view: route.view, tab: route.tab }];
        setHistory(h);
        historyRef.current = h;
        window.history.replaceState({ view: 'main', tab: 'home' }, '', '/');
        window.history.pushState({ view: route.view, tab: route.tab }, '', path);
      } else {
        // 알 수 없는 경로 → 메인으로
        window.history.replaceState({ view: 'main', tab: 'home' }, '', '/');
      }
    };

    resolveInitialUrl();
  }, []);

  // 브라우저 뒤로/앞으로 버튼 핸들러
  useEffect(() => {
    const handlePopState = () => {
      if (navigatingRef.current) {
        navigatingRef.current = false;
        return;
      }
      // 브라우저 뒤로 버튼 → 내부 히스토리 동기화
      const h = historyRef.current;
      if (h.length <= 1) return;
      const newHistory = h.slice(0, -1);
      const previous = newHistory[newHistory.length - 1];
      const currentView = h[h.length - 1]?.view;
      setHistory(newHistory);
      historyRef.current = newHistory;
      if (currentView === 'detail') {
        setSelectedItem(null);
        setScrollToComments(false);
      }
      if (currentView === 'briefing-detail') {
        setSelectedBriefing(null);
      }
      setView(previous.view);
      setCurrentTab(previous.tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleCardClick = (item: NewsItem) => {
    setSelectedItem(item);
    setScrollToComments(false);
    navigateTo('detail', undefined, `/news/${item.id}`);
  };

  const handleCommentClick = (item: NewsItem) => {
    setSelectedItem(item);
    setScrollToComments(true);
    navigateTo('detail', undefined, `/news/${item.id}`);
  };

  const handleLogin = () => {
    setShowLoginModal(false);
    setIsInitialLogin(false);
    toast.success('어서 와, 김서방! 🪄', { description: '오늘의 IT 소식, 비형이 다 준비해뒀어.' });
  };

  const handleToggleLike = async (id: string) => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    try {
      const data = await interactionAPI.toggleLike(id);
      if (data.success) {
        setLikedIds(prev => {
          const next = new Set(prev);
          if (data.liked) {
            next.add(id);
            toast('취향 저장! 비형이 기억해둘게 🪄', { description: "다음엔 더 딱 맞는 소식 가져올게!", duration: 2000, icon: '❤️' });
          } else { next.delete(id); }
          return next;
        });
      }
    } catch {
      setLikedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }
  };

  const handleToggleBookmark = async (id: string) => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    try {
      const data = await interactionAPI.toggleBookmark(id);
      if (data.success) {
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          if (data.bookmarked) { next.add(id); toast('나중에 볼 거지? 저장해뒀어!', { icon: '🔖' }); }
          else { next.delete(id); }
          return next;
        });
      }
    } catch {
      setBookmarkedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingNews) fetchNews(activeCategory, currentPage + 1, true);
  };

  const handleRefresh = useCallback(async () => {
    await fetchNews(activeCategory, 1, false);
    setCardIndex(0);
  }, [activeCategory]);

  const handleReadNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleTabChange = (tab: Tab) => {
    // 검색 모드 해제
    if (isSearchMode) {
      setIsSearchMode(false);
      setSearchQuery('');
      setSearchResults([]);
    }
    if (!isLoggedIn && (tab === 'bookmark' || tab === 'mypage')) {
      setShowLoginModal(true);
      return;
    }
    if (tab === 'briefing') {
      setCurrentTab('briefing');
      navigateTo('briefing', 'briefing');
      return;
    }
    navigateTo('main', tab);
  };

  const handleNavigateFromMyPage = (target: MyPageNavigationTarget) => {
    if (target === 'bookmark') navigateTo('main', 'bookmark');
    else if (target === 'likes') { setBookmarkSubTab('likes'); navigateTo('main', 'bookmark'); }
    else if (target === 'comments') navigateTo('comments');
    else if (target === 'notifications') navigateTo('settings');
    else if (target === 'admin') navigateTo('admin');
  };

  const filteredItems = activeCategory === "전체" ? newsItems : newsItems.filter(item => item.category === activeCategory);
  const bookmarkedItems = newsItems.filter(item => bookmarkedIds.has(item.id));
  const likedItems = newsItems.filter(item => likedIds.has(item.id));
  const commentedItems = newsItems.filter(item => commentedIds.has(item.id));

  const handleRecoverAccount = async () => {
    try {
      const result = await userAPI.recoverAccount();
      if (result.success) {
        clearPendingDeletion();
        toast.success('계정이 복구되었습니다.');
      }
    } catch {
      toast.error('계정 복구에 실패했습니다.');
    }
  };

  const SuccessIcon = () => (
    <div className="w-5 h-5 bg-[#00D185] rounded-full flex items-center justify-center shrink-0">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.25 4L3.75 6.5L8.75 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 font-sans text-gray-900 dark:text-gray-100 selection:bg-blue-100 dark:selection:bg-blue-900 flex flex-col relative overflow-hidden">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {isSearchMode ? (
        <SearchBar
          initialQuery={searchQuery}
          onSearch={(q) => { setSearchQuery(q); performSearch(q, 1); }}
          onClose={() => { setIsSearchMode(false); setSearchQuery(''); setSearchResults([]); }}
        />
      ) : (
        <Header currentView={view as ViewState} currentTab={currentTab} onBack={goBack} onSettingsClick={() => navigateTo('notifications')} onNotificationSettingsClick={() => navigateTo('settings')} onTabChange={handleTabChange} unreadCount={unreadCount} onSearchClick={() => setIsSearchMode(true)} />
      )}

      {/* 탈퇴 유예 복구 배너 */}
      {pendingDeletion && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            회원 탈퇴가 예정되어 있습니다. {pendingDeletion.daysRemaining}일 후 계정이 영구 삭제됩니다.
          </p>
          <button
            onClick={handleRecoverAccount}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800 px-3 py-1 rounded-full whitespace-nowrap ml-2 hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
          >
            계정 복구하기
          </button>
        </div>
      )}

      <main className={`${pendingDeletion ? 'pt-24' : 'pt-14'} flex flex-col ${view === 'main' || view === 'briefing' ? 'pb-16 md:pb-0 h-[calc(100vh-64px)] md:h-[calc(100vh-56px)]' : 'flex-1'} md:mx-auto md:w-full md:px-8 lg:px-12`}>

        {isSearchMode && (
          <div className="h-full flex flex-col overflow-y-auto">
            <SearchResults
              results={searchResults}
              query={searchQuery}
              isLoading={isSearching}
              hasMore={hasMoreSearch}
              total={searchTotal}
              onLoadMore={() => performSearch(searchQuery, searchPage + 1)}
              onItemClick={(item) => {
                const newsItem = { ...item, likeCount: 0, bookmarkCount: 0, commentCount: 0 } as NewsItem;
                setSelectedItem(newsItem);
                setIsSearchMode(false);
                navigateTo('detail', undefined, `/news/${item.id}`);
              }}
            />
          </div>
        )}

        {!isSearchMode && view === 'main' && currentTab === 'home' && (
          <div className="h-full flex flex-col">
            <EditorPicks onItemClick={(item) => handleCardClick(item as any)} />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between z-10 bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-sm sticky top-0">
              <div className="w-full md:flex-1 overflow-x-auto no-scrollbar px-4 pt-4 pb-2 md:pb-4">
                <div className="flex gap-2 min-w-max md:flex-wrap">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => handleCategoryChange(cat)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? "bg-black text-white shadow-md shadow-gray-200 dark:shadow-gray-900" : "bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700"}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end px-4 pb-2 md:pb-4 md:pr-4 shrink-0">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-1 flex shadow-sm border border-gray-100 dark:border-gray-700 h-[38px] items-center">
                  <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-blue-50 dark:bg-blue-900/50 text-[#3D61F1]' : 'text-gray-300 hover:text-gray-500'}`} aria-label="Card View"><LayoutTemplate size={18} className={viewMode === 'card' ? "fill-current" : ""} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900/50 text-[#3D61F1]' : 'text-gray-300 hover:text-gray-500'}`} aria-label="List View"><List size={18} className={viewMode === 'list' ? "fill-current" : ""} strokeWidth={2.5} /></button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {isLoadingNews && newsItems.length === 0 ? (
                <div className="flex items-center justify-center h-full"><div className="text-gray-400 dark:text-gray-500">비형이 오늘의 소식 가져오는 중... 🪄</div></div>
              ) : viewMode === 'card' ? (
                <SwipeDeck key={activeCategory} items={filteredItems} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} onCardClick={handleCardClick} onCommentClick={handleCommentClick} startIndex={cardIndex} onIndexChange={setCardIndex} onLoadMore={handleLoadMore} />
              ) : (
                <NewsList items={filteredItems} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} onCardClick={handleCardClick} onCommentClick={handleCommentClick} onLoadMore={handleLoadMore} onRefresh={handleRefresh} />
              )}
            </div>
          </div>
        )}

        {view === 'main' && currentTab === 'trends' && (
          <div className="h-full flex flex-col overflow-y-auto">
            <TrendsPage onKeywordClick={handleSearchFromTrends} />
          </div>
        )}

        {view === 'main' && currentTab === 'bookmark' && (
          <div className="h-full flex flex-col">
            {!isLoggedIn ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 dark:text-gray-500 px-8">
                <Bookmark size={48} className="mb-4 opacity-20 fill-current" />
                <p className="font-bold text-gray-600 dark:text-gray-300 mb-6">저장해둔 기사들, 로그인하면 꺼내줄게!</p>
                <button onClick={() => setShowLoginModal(true)} className="w-full max-w-[280px] bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">로그인하기</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 px-4 pt-4 pb-2">
                  <button onClick={() => setBookmarkSubTab('bookmark')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${bookmarkSubTab === 'bookmark' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'}`}>
                    북마크
                  </button>
                  <button onClick={() => setBookmarkSubTab('likes')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${bookmarkSubTab === 'likes' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'}`}>
                    좋아요
                  </button>
                </div>
                {bookmarkSubTab === 'bookmark' ? (
                  bookmarkedItems.length > 0 ? (
                    <NewsList items={bookmarkedItems} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} onCardClick={handleCardClick} onCommentClick={handleCommentClick} />
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 dark:text-gray-500"><Bookmark size={48} className="mb-4 opacity-20 fill-current" /><p>아직 저장해둔 기사가 없어. 나중에 볼 거 발견하면 여기로!</p></div>
                  )
                ) : (
                  likedItems.length > 0 ? (
                    <NewsList items={likedItems} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} onCardClick={handleCardClick} onCommentClick={handleCommentClick} />
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 dark:text-gray-500"><Heart size={48} className="mb-4 opacity-20 fill-current" /><p>아직 하트 누른 기사가 없네? 마음에 드는 소식에 꾹!</p></div>
                  )
                )}
              </>
            )}
          </div>
        )}

        {view === 'main' && currentTab === 'mypage' && (
          <MyPage isLoggedIn={isLoggedIn} onLoginClick={() => setShowLoginModal(true)} onLogout={async () => { await authLogout(); const h: HistoryItem[] = [{view:'main',tab:'home'}]; setHistory(h); historyRef.current = h; setView('main'); setCurrentTab('home'); window.history.replaceState({ view: 'main', tab: 'home' }, '', '/'); toast.info('로그아웃되었습니다.'); }} onOpenTerms={setTermsType} onNavigate={handleNavigateFromMyPage} onEditProfile={() => navigateTo('edit-profile')} />
        )}

        {view === 'comments' && (
          <div className="flex-1 flex flex-col">
            {commentedNewsItems.length > 0 ? (
              <NewsList items={commentedNewsItems} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} onCardClick={handleCardClick} onCommentClick={handleCommentClick} onEditComment={handleCommentClick} isCommentMode={true} />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 dark:text-gray-500"><MessageCircle size={48} className="mb-4 opacity-20 fill-current" /><p>아직 댓글 단 기사가 없네. 한마디 남겨보는 건 어때?</p></div>
            )}
          </div>
        )}

        {view === 'notifications' && <NotificationsPage notifications={notifications} onRead={handleReadNotification} onMarkAllRead={handleMarkAllRead} onNotificationClick={() => {}} isLoggedIn={isLoggedIn} />}

        {view === 'detail' && selectedItem && <NewsDetail item={selectedItem} isLoggedIn={isLoggedIn} isAdmin={!!user?.isAdmin} onLoginRequired={() => setShowLoginModal(true)} initialScrollToComments={scrollToComments} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={handleToggleLike} onToggleBookmark={handleToggleBookmark} onNewsUpdated={(updated) => { setSelectedItem(updated); setNewsItems(prev => prev.map(n => n.id === updated.id ? updated : n)); }} onNewsDeleted={() => { goBack(); setNewsItems(prev => prev.filter(n => n.id !== selectedItem.id)); }} />}

        {view === 'edit-profile' && <EditProfile onUpdate={() => { toast.success('회원정보가 수정되었습니다.'); goBack(); }} onWithdraw={async () => { await authLogout(); const h: HistoryItem[] = [{view:'main',tab:'home'}]; setHistory(h); historyRef.current = h; setView('main'); setCurrentTab('home'); window.history.replaceState({ view: 'main', tab: 'home' }, '', '/'); Swal.fire({title:'탈퇴 완료',text:'회원탈퇴가 처리되었습니다.',icon:'success',confirmButtonColor:'#3D61F1'}); }} />}

        {view === 'settings' && <Settings onLogout={() => {}} />}

        {view === 'briefing' && <BriefingPage onBriefClick={(type, data) => { setSelectedBriefing({ type, data }); navigateTo('briefing-detail', undefined, `/briefing/${type}/${data.id}`); }} />}

        {view === 'briefing-detail' && selectedBriefing && <BriefingDetail type={selectedBriefing.type} data={selectedBriefing.data} isAdmin={!!user?.isAdmin} />}

        {view === 'admin' && <AdminDashboard />}
      </main>

      {(view === 'main' || view === 'briefing') && !isSearchMode && <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />}

      <LoginModal isOpen={showLoginModal} onClose={() => { setShowLoginModal(false); setIsInitialLogin(false); }} onLogin={handleLogin} onOpenTerms={setTermsType} canClose={!isInitialLogin} />

      {/* 소셜 가입 완료 모달 */}
      <AnimatePresence>
        {socialSignupPending && (
          <SocialSignupModal
            onComplete={() => {
              toast.success('어서 와, 김서방! 🪄', { description: '오늘의 IT 소식, 비형이 다 준비해뒀어.' });
            }}
            onOpenTerms={setTermsType}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{termsType && <TermsPage type={termsType} onBack={() => setTermsType(null)} />}</AnimatePresence>

      <Toaster position="top-center" icons={{ success: <SuccessIcon /> }} toastOptions={{ style: { background: 'rgba(55,65,81,0.95)', color: 'white', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '16px', fontWeight: '700', marginTop: '4rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', gap: '20px', whiteSpace: 'nowrap', maxWidth: '90vw' }, className: 'mt-12', descriptionClassName: 'hidden' }} />
    </div>
  );
}
