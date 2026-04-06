import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NewsCard } from './NewsCard';
import type { NewsItem } from '@/data/mockNews';

interface SwipeDeckProps {
  items: NewsItem[];
  likedIds: Set<string>;
  bookmarkedIds: Set<string>;
  onToggleLike: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onCardClick: (item: NewsItem) => void;
  onCommentClick: (item: NewsItem) => void;
  startIndex?: number;
  onIndexChange?: (index: number) => void;
  onLoadMore?: () => void;
}

export function SwipeDeck({ 
  items, 
  likedIds, 
  bookmarkedIds, 
  onToggleLike, 
  onToggleBookmark,
  onCardClick,
  onCommentClick,
  startIndex = 0,
  onIndexChange,
  onLoadMore,
}: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // Sync internal state if startIndex changes (e.g. category switch parent reset)
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  const updateIndex = (newIndex: number) => {
    setCurrentIndex(newIndex);
    if (onIndexChange) {
      onIndexChange(newIndex);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      // Next card (Swipe current card to left)
      if (currentIndex < items.length) {
        // 마지막 카드에서 스와이프 시 토스트 알림 (블러 CTA 화면으로 전환은 계속 진행)
        if (currentIndex === items.length - 1 && onReachEnd) {
          onReachEnd();
        }
        updateIndex(currentIndex + 1);

        // Load more when reaching near the end
        if (currentIndex >= items.length - 2 && onLoadMore) {
          onLoadMore();
        }
      }
    } else {
      // Previous card (Swipe current card to right)
      if (currentIndex > 0) {
        updateIndex(currentIndex - 1);
      }
    }
  };

  if (currentIndex >= items.length && items.length > 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-4">
        <p>오늘 소식은 여기까지! 다 읽었어 대단해 👏</p>
        <button
          onClick={() => updateIndex(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          처음부터 다시 볼래?
        </button>
      </div>
    );
  }

  // Render range: Previous 1 card + Current card + Next 2 cards
  const PREV_CARDS = 1;
  const NEXT_CARDS = 2;
  
  const startIndexRender = Math.max(0, currentIndex - PREV_CARDS);
  const endIndexRender = Math.min(items.length, currentIndex + NEXT_CARDS + 1);
  
  const activeItems = items.slice(startIndexRender, endIndexRender);
  
  return (
    <div className="relative w-full h-full flex justify-center items-center overflow-visible perspective-1000 pl-4 md:pl-0 md:max-w-2xl md:mx-auto">
      {/* 데스크탑 화살표 버튼 */}
      <button
        onClick={() => currentIndex > 0 && updateIndex(currentIndex - 1)}
        className="hidden md:flex absolute left-0 z-50 w-10 h-10 items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
        disabled={currentIndex <= 0}
        aria-label="이전 카드"
      >
        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={() => currentIndex < items.length - 1 && updateIndex(currentIndex + 1)}
        className="hidden md:flex absolute right-0 z-50 w-10 h-10 items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
        disabled={currentIndex >= items.length - 1}
        aria-label="다음 카드"
      >
        <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
      </button>

      {activeItems.map((item) => {
        const realIndex = items.findIndex(i => i.id === item.id);
        const offset = realIndex - currentIndex;

        return (
          <CardItem
            key={item.id}
            item={item}
            offset={offset}
            isFront={offset === 0}
            isLiked={likedIds.has(item.id)}
            isBookmarked={bookmarkedIds.has(item.id)}
            onToggleLike={() => onToggleLike(item.id)}
            onToggleBookmark={() => onToggleBookmark(item.id)}
            onCardClick={() => onCardClick(item)}
            onCommentClick={() => onCommentClick(item)}
            onSwipe={handleSwipe}
            isFirst={currentIndex === 0}
          />
        );
      })}
    </div>
  );
}

interface CardItemProps {
  item: NewsItem;
  offset: number; // -1, 0, 1, 2
  isFront: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onCardClick: () => void;
  onCommentClick: () => void;
  onSwipe: (direction: 'left' | 'right') => void;
  isFirst: boolean;
}

function CardItem({ 
  item, 
  offset, 
  isFront,
  isLiked, 
  isBookmarked, 
  onToggleLike, 
  onToggleBookmark, 
  onCardClick, 
  onCommentClick,
  onSwipe,
  isFirst
}: CardItemProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  // Rotate based on X drag distance
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  
  // Style Calculation based on offset
  const absOffset = Math.abs(offset);
  const initialScale = 1 - absOffset * 0.04; 
  
  // Offset positions for stack effect
  const initialX = offset * 35; 
  const initialRotate = offset * 5; 
  
  const zIndex = 100 - absOffset;

  useEffect(() => {
    // Animate to position whenever offset changes (stack movement)
    controls.start({
      x: isFront ? 0 : initialX,
      rotate: isFront ? 0 : initialRotate,
      scale: isFront ? 1 : initialScale,
      zIndex: zIndex,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    });
  }, [offset, isFront, initialX, initialRotate, initialScale, zIndex, controls]);

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const threshold = 60; // Lower threshold for responsive feel
    const velocityThreshold = 400;
    const { offset: { x: offsetX }, velocity: { x: velocityX } } = info;

    // Swipe Left (Next)
    if (offsetX < -threshold || velocityX < -velocityThreshold) {
      onSwipe('left');
    } 
    // Swipe Right (Previous)
    else if ((offsetX > threshold || velocityX > velocityThreshold) && !isFirst) {
      onSwipe('right');
    } 
    // Reset if threshold not met or trying to swipe right on first card
    else {
      controls.start({ 
        x: 0, 
        rotate: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 } 
      });
    }
  };

  return (
    <motion.div
      style={{
        width: '100%',
        maxWidth: window.innerWidth >= 768 ? '420px' : '350px',
        height: 'calc(100% - 40px)',
        maxHeight: window.innerWidth >= 768 ? '560px' : '620px',
        position: 'absolute',
        zIndex,
        x: isFront ? x : initialX, 
        rotate: isFront ? rotate : initialRotate,
        scale: isFront ? 1 : initialScale, // Bind scale directly for smoother initial render
      }}
      animate={controls}
      drag={isFront ? "x" : false} 
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      // Add elastic drag effect
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={isFront ? { cursor: "grabbing", scale: 1.02 } : {}}
      className={`touch-none ${isFront ? 'cursor-grab' : ''}`}
    >
      <div
        className="bg-white dark:bg-gray-900"
        style={{
           width: '100%',
           height: '100%',
           boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
           borderRadius: '24px',
           overflow: 'hidden' // Ensure content doesn't bleed during rounded corner usage
        }}
      >
        <NewsCard
          item={item}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          onToggleLike={(e) => {
            if (isFront && x.get() === 0) onToggleLike();
          }}
          onToggleBookmark={(e) => {
            if (isFront && x.get() === 0) onToggleBookmark();
          }}
          onCommentClick={(e) => {
             if (isFront && Math.abs(x.get()) < 5) onCommentClick();
          }}
          onClick={() => {
            if (isFront && Math.abs(x.get()) < 5) onCardClick();
          }}
          className="w-full h-full"
        />
        
        {/* Darken overlay for cards behind */}
        {!isFront && (
          <div className="absolute inset-0 bg-black/5 pointer-events-none transition-opacity duration-300" />
        )}
      </div>
    </motion.div>
  );
}
