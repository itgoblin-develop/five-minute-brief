import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Bookmark, MessageCircle, MoreHorizontal, RefreshCw } from 'lucide-react';
import type { NewsItem } from '@/data/mockNews';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { getCategoryColor, getRelativeTime, formatCount } from '@/utils/helpers';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface NewsListProps {
  items: NewsItem[];
  likedIds: Set<string>;
  bookmarkedIds: Set<string>;
  onToggleLike: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onCardClick: (item: NewsItem) => void;
  onCommentClick: (item: NewsItem) => void;
  onEditComment?: (item: NewsItem) => void;
  isCommentMode?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => Promise<void>;
  showLoginBanner?: boolean;
  onLoginClick?: () => void;
  restrictedItems?: NewsItem[];
}

export function NewsList({
  items,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
  onCardClick,
  onCommentClick,
  onEditComment,
  isCommentMode = false,
  onLoadMore,
  onRefresh,
  showLoginBanner = false,
  onLoginClick,
  restrictedItems = []
}: NewsListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const PULL_MAX = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onRefresh || isRefreshing) return;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [onRefresh, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || !onRefresh || isRefreshing) return;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY * 0.5, PULL_MAX));
    }
  }, [onRefresh, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || !onRefresh || isRefreshing) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh, isRefreshing]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      onLoadMore?.();
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto px-4 pb-20 space-y-2 pt-2 no-scrollbar"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center -mt-2 mb-2"
          style={{ height: pullDistance, transition: isPulling.current ? 'none' : 'height 0.3s ease' }}
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: pullProgress * 360 }}
            transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
          >
            <RefreshCw size={20} className={pullProgress >= 1 || isRefreshing ? 'text-[#3D61F1]' : 'text-gray-400'} />
          </motion.div>
          {pullDistance >= PULL_THRESHOLD && !isRefreshing && (
            <span className="ml-2 text-xs text-[#3D61F1] font-medium">놓으면 새로고침</span>
          )}
          {isRefreshing && (
            <span className="ml-2 text-xs text-[#3D61F1] font-medium">새로고침 중...</span>
          )}
        </div>
      )}
      {items.map((item, index) => {
        const isLiked = likedIds.has(item.id);
        const isBookmarked = bookmarkedIds.has(item.id);

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-gray-100 flex relative"
            onClick={() => onCardClick(item)}
          >
            {/* Left: Image (Full Height) */}
            <div className="relative w-[100px] sm:w-[120px] md:w-[160px] shrink-0 bg-gray-50">
              <ImageWithFallback
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover absolute inset-0"
              />
            </div>

            {/* Right: Content */}
            <div className="flex-1 flex flex-col justify-between min-w-0 p-4">
              
              {/* Top: Category & Title */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={`inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold tracking-wide ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  
                  {isCommentMode && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                       <button
                         onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                         className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                       >
                         {/* Filled More Icon (Circle with dots) */}
                         <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                           <MoreHorizontal size={14} className="fill-current" strokeWidth={3} />
                         </div>
                       </button>

                       <AnimatePresence>
                         {activeMenuId === item.id && (
                           <motion.div
                             initial={{ opacity: 0, scale: 0.95, y: -5 }}
                             animate={{ opacity: 1, scale: 1, y: 0 }}
                             exit={{ opacity: 0, scale: 0.95, y: -5 }}
                             transition={{ duration: 0.1 }}
                             className="absolute top-8 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 w-24 z-20 flex flex-col overflow-hidden"
                           >
                             <button 
                               onClick={() => {
                                 if (onEditComment) {
                                   onEditComment(item);
                                 } else {
                                   toast.info("수정 기능 준비 중입니다.");
                                 }
                                 setActiveMenuId(null);
                               }}
                               className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 w-full text-left"
                             >
                               수정
                             </button>
                             <button 
                               onClick={() => {
                                 toast.success("댓글이 삭제되었습니다.");
                                 setActiveMenuId(null);
                               }}
                               className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 w-full text-left"
                             >
                               삭제
                             </button>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  )}
                </div>

                <h3 className="text-[16px] font-bold text-gray-900 leading-snug line-clamp-2">
                  {item.title}
                </h3>
              </div>

              {/* Bottom: Date & Actions */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400 font-medium">
                  {getRelativeTime(item.date)}
                </span>

                <div className="flex items-center gap-1">
                  {/* Like */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleLike(item.id); }}
                    className="flex items-center gap-1 p-1.5 -m-1.5 hover:bg-gray-50 rounded-lg transition-colors group active:scale-95"
                  >
                    <Heart 
                      size={16} 
                      className={clsx(isLiked ? "fill-[#FF4B4B] text-[#FF4B4B]" : "text-gray-400 group-hover:text-gray-600")} 
                    />
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-600">
                      {formatCount(item.likeCount + (isLiked ? 1 : 0))}
                    </span>
                  </button>

                  <div className="w-2" />

                  {/* Bookmark */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBookmark(item.id); }}
                    className="flex items-center gap-1 p-1.5 -m-1.5 hover:bg-gray-50 rounded-lg transition-colors group active:scale-95"
                  >
                    <Bookmark 
                      size={16} 
                      className={clsx(isBookmarked ? "fill-[#3D61F1] text-[#3D61F1]" : "text-gray-400 group-hover:text-gray-600")} 
                    />
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-600">
                      {formatCount(item.bookmarkCount + (isBookmarked ? 1 : 0))}
                    </span>
                  </button>

                  <div className="w-2" />

                  {/* Comment */}
                  <button 
                    className="flex items-center gap-1 p-1.5 -m-1.5 hover:bg-gray-50 rounded-lg transition-colors group active:scale-95"
                    onClick={(e) => {
                       e.stopPropagation();
                       onCommentClick(item);
                    }}
                  >
                    <MessageCircle size={16} className="text-gray-400 group-hover:text-gray-600" />
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-600">
                      {formatCount(item.commentCount)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
      
      {/* 비로그인 사용자: 블러 미리보기 + 로그인 유도 */}
      {showLoginBanner && items.length > 0 && (
        <div className="relative">
          {/* 블러된 뉴스 아이템 미리보기 */}
          <div className="space-y-2 pointer-events-none select-none">
            {(restrictedItems.length > 0 ? restrictedItems : items).slice(0, 10).map((item) => (
              <div key={`blur-${item.id}`} className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-gray-100 flex blur-[6px]">
                <div className="relative w-[100px] sm:w-[120px] md:w-[160px] shrink-0 bg-gray-50">
                  <ImageWithFallback src={item.imageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
                </div>
                <div className="flex-1 min-w-0 p-4">
                  <div className="mb-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold ${getCategoryColor(item.category)}`}>{item.category}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-900 leading-snug line-clamp-2">{item.title}</h3>
                  <div className="flex items-center pt-2">
                    <span className="text-xs text-gray-400">{getRelativeTime(item.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 그라데이션 + CTA 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-100/70 to-gray-100 flex items-end justify-center pb-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 text-center shadow-xl mx-4 w-full max-w-sm border border-gray-100">
              <p className="text-gray-800 font-bold mb-1">더 많은 뉴스가 있어요!</p>
              <p className="text-gray-400 text-xs mb-3">로그인하면 모든 뉴스를 무제한으로 볼 수 있습니다.</p>
              <button
                onClick={(e) => { e.stopPropagation(); onLoginClick?.(); }}
                className="w-full py-3 bg-[#3D61F1] text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p>표시할 뉴스가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
