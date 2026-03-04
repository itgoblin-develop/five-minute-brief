import { TrendingUp, Calendar, ChevronRight, BarChart3 } from 'lucide-react';

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
  dialogue?: { speaker: '비형' | '현결'; text: string }[] | null;
  centralKeyword?: string | null;
  editorComment?: string | null;
  editorCommentAt?: string | null;
  editorCommentAuto?: boolean;
}

interface WeeklyBriefCardProps {
  brief: WeeklyBrief;
  onClick?: (brief: WeeklyBrief) => void;
}

export function WeeklyBriefCard({ brief, onClick }: WeeklyBriefCardProps) {
  const hasCover = !!brief.coverImageUrl;
  const totalArticles = brief.stats?.total_articles || 0;
  const totalDays = brief.stats?.total_days || 0;
  const keywordsToShow = brief.topKeywords?.slice(0, 3) || [];
  const extraKeywords = (brief.topKeywords?.length || 0) - 3;

  return (
    <div
      className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(brief)}
    >
      {/* 헤더 — 커버 이미지 or 그라데이션 */}
      <div
        className={`relative px-5 py-5 ${!hasCover ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : ''}`}
        style={hasCover ? {
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${brief.coverImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="flex items-center gap-2 text-blue-100 text-xs mb-2">
          <Calendar size={13} />
          <span>{brief.period}</span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">
          {brief.title || `주간 IT 브리핑 (${brief.weekLabel})`}
        </h3>
      </div>

      {/* 키워드 */}
      {keywordsToShow.length > 0 && (
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">
            <TrendingUp size={13} className="text-blue-500" />
            <span>주간 트렌드</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywordsToShow.map((kw, i) => (
              <span key={i} className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
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

      {/* 대화 프리뷰 (dialogue 있을 때) 또는 주간 코멘트 */}
      {brief.dialogue && brief.dialogue.length > 0 ? (
        <div className="px-5 pt-3">
          {brief.centralKeyword && (
            <span className="inline-block mb-2 px-2.5 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
              # {brief.centralKeyword}
            </span>
          )}
          <div className="bg-gray-50 dark:bg-gray-600/50 rounded-xl p-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
              🧙 {brief.dialogue[0].text}
            </p>
          </div>
        </div>
      ) : brief.weeklyComment ? (
        <div className="px-5 pt-3">
          <div className="bg-gray-50 dark:bg-gray-600/50 rounded-xl p-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
              🧙 {brief.weeklyComment}
            </p>
          </div>
        </div>
      ) : null}

      {/* 하단: 통계 + 더보기 */}
      <div className="px-5 py-4 flex items-center justify-between">
        {totalArticles > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <BarChart3 size={12} />
            <span>{totalArticles}건 분석</span>
            {totalDays > 0 && (
              <>
                <span className="mx-0.5">·</span>
                <span>{totalDays}일치</span>
              </>
            )}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1 text-sm text-blue-500 font-medium">
          <span>자세히</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
