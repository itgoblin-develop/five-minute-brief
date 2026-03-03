import { Newspaper, TrendingUp, ChevronRight, BarChart3 } from 'lucide-react';
import { isToday } from '@/utils/helpers';

export interface DailyBrief {
  id: number;
  title: string;
  dateLabel: string;
  introComment: string;
  topKeywords: { keyword: string; description: string }[];
  categoryHighlights: { category: string; title: string; summary: string }[];
  dailyComment: string;
  stats: {
    total_articles?: number;
    category_counts?: Record<string, number>;
  };
  isFallback: boolean;
  generatedAt: string;
  coverImageUrl?: string | null;
}

interface DailyBriefCardProps {
  brief: DailyBrief;
  onClick?: (brief: DailyBrief) => void;
}

export function DailyBriefCard({ brief, onClick }: DailyBriefCardProps) {
  const hasCover = !!brief.coverImageUrl;
  const totalArticles = brief.stats?.total_articles || 0;
  const categoryCount = brief.stats?.category_counts
    ? Object.keys(brief.stats.category_counts).length
    : 0;
  const keywordsToShow = brief.topKeywords?.slice(0, 3) || [];
  const extraKeywords = (brief.topKeywords?.length || 0) - 3;

  return (
    <div
      className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(brief)}
    >
      {/* 헤더 — 커버 이미지 or 그라데이션 */}
      <div
        className={`relative px-5 py-5 ${!hasCover ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : ''}`}
        style={hasCover ? {
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${brief.coverImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="flex items-center gap-2 text-emerald-100 text-xs mb-2">
          <Newspaper size={13} />
          <span>{brief.dateLabel}</span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">
          {brief.title || `IT 브리핑 (${brief.dateLabel})`}
        </h3>
      </div>

      {/* 도입 멘트 */}
      {brief.introComment && (
        <div className="px-5 pt-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-2">
              🧙 {brief.introComment}
            </p>
          </div>
        </div>
      )}

      {/* 키워드 + 통계 */}
      <div className="px-5 pt-3 pb-1">
        {keywordsToShow.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">
              <TrendingUp size={13} className="text-emerald-500" />
              <span>{isToday(brief.dateLabel) ? '오늘의 키워드' : '주요 키워드'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywordsToShow.map((kw, i) => (
                <span key={i} className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                  {kw.keyword}
                </span>
              ))}
              {extraKeywords > 0 && (
                <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                  +{extraKeywords}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 하단: 통계 + 더보기 */}
      <div className="px-5 pb-4 flex items-center justify-between">
        {totalArticles > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <BarChart3 size={12} />
            <span>{totalArticles}건 분석</span>
            {categoryCount > 0 && (
              <>
                <span className="mx-0.5">·</span>
                <span>{categoryCount}개 카테고리</span>
              </>
            )}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium">
          <span>자세히</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
