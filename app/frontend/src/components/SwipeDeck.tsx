import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, type PanInfo } from 'motion/react';
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
  onReachEnd?: () => void;
  onLoginClick?: () => void;
  restrictedItems?: NewsItem[];
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
  onReachEnd,
  onLoginClick,
  restrictedItems = []
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
    if (onReachEnd && restrictedItems.length > 0) {
      // 블러된 카드 + 로그인 CTA 오버레이
      return (
        <div className="relative w-full h-full flex justify-center items-center overflow-visible perspective-1000 pl-4">
          {restrictedItems.slice(0, 5).map((rItem, i) => (
            <div
              key={rItem.id}
              className="absolute pointer-events-none"
              style={{
                width: '100%', maxWidth: '350px',
                height: 'calc(100% - 40px)', maxHeight: '620px',
                transform: `translateX(${i * 35}px) rotate(${i * 5}deg) scale(${1 - i * 0.04})`,
                zIndex: 90 - i,
              }}
            >
              <div className="w-full h-full rounded-[24px] overflow-hidden bg-white dark:bg-gray-900" style={{ boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)' }}>
                <NewsCard item={rItem} isLiked={false} onToggleLike={() => {}} onCommentClick={() => {}} onClick={() => {}} className="w-full h-full blur-[8px]" />
              </div>
            </div>
          ))}
          <div className="absolute inset-0 z-[100] flex items-center justify-center">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl mx-8 max-w-sm">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D61F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <p className="text-gray-800 dark:text-gray-100 font-bold text-lg mb-1">더 많은 뉴스가 있어요!</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">로그인하면 모든 뉴스를<br/>무제한으로 볼 수 있습니다.</p>
              <button onClick={onLoginClick} className="w-full py-3.5 bg-[#3D61F1] text-white rounded-2xl text-base font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
                로그인하기
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (onReachEnd) {
      return (
        <div className="w-full h-full flex items-center justify-center flex-col gap-4 px-8 text-center">
          <p className="text-gray-700 dark:text-gray-300 font-bold text-lg">더 많은 뉴스가 있어요!</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">로그인하면 모든 뉴스를 무제한으로 볼 수 있습니다.</p>
          <button onClick={onLoginClick} className="mt-2 px-8 py-3 bg-[#3D61F1] text-white rounded-full text-base font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
            로그인하기
          </button>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-4">
        <p>모든 뉴스를 확인했습니다.</p>
        <button
          onClick={() => updateIndex(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          처음부터 다시 보기
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
    <div className="relative w-full h-full flex justify-center items-center overflow-visible perspective-1000 pl-4">
      {/* 블러된 restricted 카드 (스택 뒤에 미리보기) */}
      {onReachEnd && restrictedItems.length > 0 && (() => {
        const remainingSlots = (currentIndex + NEXT_CARDS + 1) - items.length;
        if (remainingSlots <= 0) return null;
        return restrictedItems.slice(0, remainingSlots).map((rItem, i) => {
          const offset = items.length - currentIndex + i;
          return (
            <div
              key={`blur-${rItem.id}`}
              className="absolute pointer-events-none"
              style={{
                width: '100%', maxWidth: '350px',
                height: 'calc(100% - 40px)', maxHeight: '620px',
                transform: `translateX(${offset * 35}px) rotate(${offset * 5}deg) scale(${1 - offset * 0.04})`,
                zIndex: 100 - offset,
              }}
            >
              <div className="w-full h-full rounded-[24px] overflow-hidden bg-white dark:bg-gray-900" style={{ boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)' }}>
                <NewsCard item={rItem} isLiked={false} onToggleLike={() => {}} onCommentClick={() => {}} onClick={() => {}} className="w-full h-full blur-[6px]" />
                <div className="absolute inset-0 bg-black/5 rounded-[24px]" />
              </div>
            </div>
          );
        });
      })()}

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
        maxWidth: '350px', 
        height: 'calc(100% - 40px)',
        maxHeight: '620px',
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
