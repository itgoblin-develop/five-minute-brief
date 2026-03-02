import { Newspaper, TrendingUp, ChevronRight } from 'lucide-react';

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
  return (
    <div
      className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(brief)}
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4">
        <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
          <Newspaper size={14} />
          <span>{brief.dateLabel}</span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">
          {brief.title || `오늘의 IT 브리핑 (${brief.dateLabel})`}
        </h3>
      </div>

      {/* IT 도깨비 비형 도입 멘트 */}
      {brief.introComment && (
        <div className="px-5 pt-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-3">
              🧙 {brief.introComment}
            </p>
          </div>
        </div>
      )}

      {/* 주요 키워드 */}
      {brief.topKeywords && brief.topKeywords.length > 0 && (
        <div className="px-5 pt-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <span>오늘의 키워드</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {brief.topKeywords.slice(0, 5).map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 더보기 */}
      <div className="px-5 py-4 flex items-center justify-end">
        <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium">
          <span>자세히</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
