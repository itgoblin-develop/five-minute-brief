import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Bookmark, MessageCircle, MoreHorizontal } from 'lucide-react';
import { NewsItem } from '@/app/data/mockNews';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getCategoryColor, getRelativeTime, formatCount } from '@/app/utils/helpers';
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
  isCommentMode?: boolean; // New prop to enable "My Comments" specific UI
  onLoadMore?: () => void;
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
  onLoadMore
}: NewsListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) { // 100px threshold
      onLoadMore?.();
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div 
      className="w-full h-full overflow-y-auto px-4 pb-20 space-y-2 pt-2 no-scrollbar"
      onScroll={handleScroll}
    >
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
            <div className="relative w-[120px] shrink-0 bg-gray-50">
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
      
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p>표시할 뉴스가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
