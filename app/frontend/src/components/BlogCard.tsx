import React from 'react';
import { Heart, Bookmark, MessageCircle, Eye, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { getRelativeTime, formatCount } from '@/utils/helpers';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  status: string;
  authorName: string;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  metaDescription: string;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  // 상세 전용
  content?: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

// 블로그 카테고리 색상
export function getBlogCategoryColor(category: string): string {
  switch (category) {
    case '인사이트': return 'bg-indigo-500';
    case '테크 리뷰': return 'bg-emerald-500';
    case '튜토리얼': return 'bg-amber-500';
    case '업계 이야기': return 'bg-rose-500';
    case '기타': return 'bg-gray-500';
    default: return 'bg-gray-800';
  }
}

interface BlogCardProps {
  post: BlogPost;
  onClick: () => void;
  className?: string;
}

export function BlogCard({ post, onClick, className }: BlogCardProps) {
  return (
    <article
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-gray-900 rounded-2xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-800',
        'shadow-sm hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      {/* 커버 이미지 */}
      {post.coverImageUrl && (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5">
        {/* 카테고리 + 날짜 */}
        <div className="flex items-center gap-2 mb-3">
          <span className={clsx('px-2.5 py-0.5 text-white text-[11px] font-bold rounded-full', getBlogCategoryColor(post.category))}>
            {post.category}
          </span>
          {post.status === 'draft' && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[11px] font-bold rounded-full">
              임시저장
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {getRelativeTime(post.publishedAt || post.createdAt)}
          </span>
        </div>

        {/* 제목 */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2 line-clamp-2">
          {post.title}
        </h3>

        {/* 발췌 */}
        {post.excerpt && (
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* 태그 */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 하단 메타 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {post.authorName}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {formatCount(post.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {formatCount(post.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> {formatCount(post.commentCount)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
