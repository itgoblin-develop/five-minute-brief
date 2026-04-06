import { Loader2 } from 'lucide-react';
import { getCategoryColor, getRelativeTime } from '@/utils/helpers';

interface SearchNewsItem {
  id: string;
  category: string;
  title: string;
  summary: string[];
  source: string;
  date: string;
  imageUrl: string;
  highlight: string;
  relevanceScore: number;
}

interface SearchResultsProps {
  results: SearchNewsItem[];
  query: string;
  isLoading: boolean;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
  onItemClick: (item: SearchNewsItem) => void;
}

export function SearchResults({ results, query, isLoading, hasMore, total, onLoadMore, onItemClick }: SearchResultsProps) {
  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
        <p className="text-sm text-gray-400 dark:text-gray-500">검색 중...</p>
      </div>
    );
  }

  if (!isLoading && results.length === 0 && query) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          <span className="font-semibold">"{query}"</span>에 대한 검색 결과가 없습니다
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">다른 키워드로 검색해 보세요</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-gray-400 dark:text-gray-500">검색어를 입력해주세요</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-20">
      <p className="text-xs text-gray-400 dark:text-gray-500 py-3">
        총 {total}건의 검색 결과
      </p>
      <div className="space-y-3">
        {results.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors active:scale-[0.99]"
          >
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {getRelativeTime(item.date)}
                  </span>
                </div>
                <h3
                  className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800 [&_mark]:text-gray-900 dark:[&_mark]:text-yellow-200 [&_mark]:rounded-sm [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: item.highlight || item.title }}
                />
                {item.summary?.[0] && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                    {item.summary[0]}
                  </p>
                )}
              </div>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="w-full mt-4 py-3 text-sm text-blue-500 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin mx-auto" />
          ) : (
            '더 보기'
          )}
        </button>
      )}
    </div>
  );
}
