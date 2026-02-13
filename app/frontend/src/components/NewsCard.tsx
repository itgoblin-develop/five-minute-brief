import React from 'react';
import { Heart, Bookmark, MessageCircle } from 'lucide-react';
import type { NewsItem } from '@/data/mockNews';
import { clsx } from 'clsx';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { getCategoryColor, getRelativeTime, formatCount } from '@/utils/helpers';

interface NewsCardProps {
  item: NewsItem;
  isLiked: boolean;
  isBookmarked?: boolean;
  onToggleLike: (e: React.MouseEvent) => void;
  onToggleBookmark?: (e: React.MouseEvent) => void;
  onCommentClick: (e: React.MouseEvent) => void;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function NewsCard({ 
  item, 
  isLiked, 
  isBookmarked = false,
  onToggleLike, 
  onToggleBookmark,
  onCommentClick,
  onClick, 
  style, 
  className 
}: NewsCardProps) {
  
  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative w-full h-[500px] sm:h-[560px] md:h-[620px] bg-white rounded-[24px] overflow-hidden cursor-pointer select-none flex flex-col border border-gray-100/50",
        "shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-shadow duration-300",
        className
      )}
      style={style}
    >
      {/* Image Section (Top ~40%) - shrink-0 prevents flex collapse */}
      <div className="relative shrink-0 h-[40%] sm:h-[45%] w-full overflow-hidden bg-gray-50">
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Content Section (Bottom ~60%) - min-w-0 prevents flex overflow */}
      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Category */}
          <div className="mb-3 flex items-center justify-between">
            <span className={`inline-block px-3 py-1 text-white text-[11px] font-bold rounded-full ${getCategoryColor(item.category)}`}>
              {item.category}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[20px] font-bold text-gray-900 leading-[1.35] mb-2 line-clamp-1">
            {item.title}
          </h2>
          
          {/* Summary/Content (line-clamp-5) */}
          <p 
            className="text-[14px] text-gray-500 leading-relaxed mb-auto overflow-hidden"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {item.content}
          </p>

          {/* Hashtags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {item.hashtags ? (
              item.hashtags.map(tag => (
                <span 
                  key={tag} 
                  className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-md tracking-tight"
                >
                  #{tag}
                </span>
              ))
            ) : (
              <>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-md tracking-tight">#뉴스</span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-md tracking-tight">#트렌드</span>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gray-100 my-3" />

        {/* Footer Actions */}
        <div className="flex items-center justify-between">
          {/* Date */}
          <span className="text-[12px] text-gray-400 font-medium pl-1">
            {getRelativeTime(item.date)}
          </span>

          {/* Icons with expanded touch area */}
          <div className="flex items-center gap-1">
            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(e);
              }}
              className="flex items-center gap-1.5 p-2 -m-2 hover:bg-gray-50 rounded-lg transition-colors group active:scale-95"
            >
              <Heart
                size={20}
                className={clsx(
                  "transition-all duration-300",
                  isLiked ? "fill-[#FF4B4B] text-[#FF4B4B]" : "fill-gray-300 text-gray-300 group-hover:text-gray-400 group-hover:fill-gray-400"
                )}
                strokeWidth={0} // Filled style
              />
              <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600">
                {formatCount(item.likeCount + (isLiked ? 1 : 0))}
              </span>
            </button>
            
            <div className="w-4" /> {/* Spacer */}

            {/* Bookmark */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark && onToggleBookmark(e);
              }}
              className="flex items-center gap-1.5 p-2 -m-2 hover:bg-gray-50 rounded-lg transition-colors group active:scale-95"
            >
              <Bookmark
                size={20}
                className={clsx(
                  "transition-all duration-300",
                  isBookmarked ? "fill-[#3D61F1] text-[#3D61F1]" : "fill-gray-300 text-gray-300 group-hover:text-gray-400 group-hover:fill-gray-400"
                )}
                strokeWidth={0} // Filled style
              />
              <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600">
                {formatCount(item.bookmarkCount + (isBookmarked ? 1 : 0))}
              </span>
            </button>

            <div className="w-4" /> {/* Spacer */}

            {/* Comment */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCommentClick(e);
              }}
              className="flex items-center gap-1.5 p-2 -m-2 hover:bg-gray-50 rounded-lg transition-colors group active:scale-95"
            >
              <MessageCircle
                size={20}
                className="fill-gray-300 text-gray-300 group-hover:text-gray-400 group-hover:fill-gray-400 transition-colors"
                strokeWidth={0} // Filled style
              />
              <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600">
                {formatCount(item.commentCount)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
