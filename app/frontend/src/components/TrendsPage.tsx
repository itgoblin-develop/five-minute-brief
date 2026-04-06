import { useState, useEffect } from 'react';
import { TrendingUp, Search, Loader2, RefreshCw } from 'lucide-react';
import { trendsAPI } from '@/lib/api';

interface TrendKeyword {
  keyword: string;
  description: string;
  rank: number;
}

interface HistoryKeyword {
  keyword: string;
  appearances: number;
  dates: string[];
  latestDescription: string;
}

interface TrendsPageProps {
  onKeywordClick?: (keyword: string) => void;
}

export function TrendsPage({ onKeywordClick }: TrendsPageProps) {
  const [dailyKeywords, setDailyKeywords] = useState<TrendKeyword[]>([]);
  const [historyKeywords, setHistoryKeywords] = useState<HistoryKeyword[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [period, setPeriod] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [isLoadingDaily, setIsLoadingDaily] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError(null);
    setIsLoadingDaily(true);
    setIsLoadingHistory(true);

    try {
      const [dailyRes, historyRes] = await Promise.all([
        trendsAPI.getDaily(),
        trendsAPI.getHistory(7),
      ]);

      if (dailyRes.success) {
        setDailyKeywords(dailyRes.keywords);
        setDate(dailyRes.date);
      }
      if (historyRes.success) {
        setHistoryKeywords(historyRes.keywords.slice(0, 15));
        setPeriod(historyRes.period);
      }
    } catch {
      setError('트렌드 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoadingDaily(false);
      setIsLoadingHistory(false);
    }
  };

  const maxAppearances = Math.max(...historyKeywords.map(k => k.appearances), 1);

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'bg-blue-500 text-white';
    if (rank <= 6) return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw size={16} />
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 max-w-2xl mx-auto">
      {/* 오늘의 트렌드 키워드 */}
      <section className="mt-4 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">오늘의 트렌드 키워드</h2>
          {date && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{date}</span>
          )}
        </div>

        {isLoadingDaily ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        ) : dailyKeywords.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">키워드 데이터가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {dailyKeywords.map((kw) => (
              <button
                key={kw.rank}
                onClick={() => onKeywordClick?.(kw.keyword)}
                className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankColor(kw.rank)}`}>
                    {kw.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{kw.keyword}</span>
                      <Search size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    </div>
                    {kw.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{kw.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 이번 주 키워드 추이 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-green-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">이번 주 키워드 추이</h2>
          {period.from && period.to && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {period.from} ~ {period.to}
            </span>
          )}
        </div>

        {isLoadingHistory ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            ))}
          </div>
        ) : historyKeywords.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">히스토리 데이터가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {historyKeywords.map((kw, idx) => (
              <button
                key={kw.keyword}
                onClick={() => onKeywordClick?.(kw.keyword)}
                className="w-full text-left group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-right flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 truncate flex-shrink-0 group-hover:text-blue-500 transition-colors">
                    {kw.keyword}
                  </span>
                  <div className="flex-1 h-6 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${Math.max((kw.appearances / maxAppearances) * 100, 15)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{kw.appearances}회</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
