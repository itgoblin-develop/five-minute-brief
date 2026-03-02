import { BookOpen, Calendar, BarChart3, ChevronRight, Hash } from 'lucide-react';

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
  isExpanded?: boolean;
}

export function MonthlyBriefCard({ brief, onClick, isExpanded = false }: MonthlyBriefCardProps) {
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

      {/* 심층 기사 목록 (확장 모드) */}
      {isExpanded && brief.deepArticles && brief.deepArticles.length > 0 && (
        <div className="px-5 pt-3 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
            <BookOpen size={14} className="text-purple-500" />
            <span>심층 분석</span>
          </div>
          {brief.deepArticles.map((article, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-600/50 rounded-xl p-4">
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">{article.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4">{article.content}</p>
              {article.hashtags && article.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {article.hashtags.slice(0, 3).map((tag, j) => (
                    <span key={j} className="text-xs text-purple-500">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 통계 + 더보기 */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart3 size={12} />
            {brief.stats.total_articles ?? 0}건 분석
          </span>
          {brief.stats.avg_daily && (
            <span>일 평균 {brief.stats.avg_daily}건</span>
          )}
        </div>
        {!isExpanded && (
          <div className="flex items-center gap-1 text-sm text-purple-500 font-medium">
            <span>자세히</span>
            <ChevronRight size={16} />
          </div>
        )}
      </div>
    </div>
  );
}
