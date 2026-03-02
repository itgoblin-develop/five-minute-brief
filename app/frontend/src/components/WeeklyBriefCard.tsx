import { TrendingUp, Calendar, ChevronRight } from 'lucide-react';

export interface WeeklyBrief {
  id: number;
  title: string;
  period: string;
  weekLabel: string;
  topKeywords: { keyword: string; description: string }[];
  categoryHighlights: { category: string; content: string }[];
  weeklyComment: string;
  nextWeekPreview: string[];
  stats: {
    total_articles?: number;
    total_days?: number;
    category_counts?: Record<string, number>;
  };
  isFallback: boolean;
  generatedAt: string;
  coverImageUrl?: string | null;
}

interface WeeklyBriefCardProps {
  brief: WeeklyBrief;
  onClick?: (brief: WeeklyBrief) => void;
}

export function WeeklyBriefCard({ brief, onClick }: WeeklyBriefCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(brief)}
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-4">
        <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
          <Calendar size={14} />
          <span>{brief.period}</span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">
          {brief.title || `주간 IT 브리핑 (${brief.weekLabel})`}
        </h3>
      </div>

      {/* 주요 키워드 */}
      {brief.topKeywords && brief.topKeywords.length > 0 && (
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
            <TrendingUp size={14} className="text-blue-500" />
            <span>주간 트렌드</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {brief.topKeywords.slice(0, 5).map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* IT 도깨비 비형 코멘트 */}
      {brief.weeklyComment && (
        <div className="px-5 pt-3">
          <div className="bg-gray-50 dark:bg-gray-600/50 rounded-xl p-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
              🧙 {brief.weeklyComment}
            </p>
          </div>
        </div>
      )}

      {/* 더보기 */}
      <div className="px-5 py-4 flex items-center justify-end">
        <div className="flex items-center gap-1 text-sm text-blue-500 font-medium">
          <span>자세히</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
