import { Calendar, Hash, ChevronRight } from 'lucide-react';

export interface MonthlyBrief {
  id: number;
  title: string;
  period: string;
  monthLabel: string;
  topKeywords: { keyword: string; description: string }[];
  deepArticles: { title: string; content: string; hashtags?: string[] }[];
  monthlyEditorial: string;
  stats: {
    total_articles?: number;
    avg_daily?: number;
    max_daily?: number;
    category_counts?: Record<string, number>;
  };
  isFallback: boolean;
  generatedAt: string;
}

interface MonthlyBriefCardProps {
  brief: MonthlyBrief;
  onClick?: (brief: MonthlyBrief) => void;
}

export function MonthlyBriefCard({ brief, onClick }: MonthlyBriefCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(brief)}
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-5 py-4">
        <div className="flex items-center gap-2 text-purple-100 text-sm mb-1">
          <Calendar size={14} />
          <span>{brief.period}</span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">
          {brief.title || `월간 IT 심층 리포트 (${brief.monthLabel})`}
        </h3>
      </div>

      {/* 월간 에디토리얼 */}
      {brief.monthlyEditorial && (
        <div className="px-5 pt-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-4">
              🧙 {brief.monthlyEditorial}
            </p>
          </div>
        </div>
      )}

      {/* 주요 키워드 */}
      {brief.topKeywords && brief.topKeywords.length > 0 && (
        <div className="px-5 pt-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
            <Hash size={14} className="text-purple-500" />
            <span>월간 키워드 TOP 5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {brief.topKeywords.slice(0, 5).map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 더보기 */}
      <div className="px-5 py-4 flex items-center justify-end">
        <div className="flex items-center gap-1 text-sm text-purple-500 font-medium">
          <span>자세히</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
