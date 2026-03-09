import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { reviewAPI } from '@/lib/api';

// ===== 타입 정의 =====
interface ReviewApp {
  id: number;
  name: string;
  packageId: string;
  category: string | null;
  isActive: boolean;
}

interface Review {
  id: number;
  author: string | null;
  rating: number;
  content: string;
  reviewDate: string;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  categories: string[] | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ===== 헬퍼 =====

/** 별점을 ★☆ 문자열로 변환 */
function renderStars(rating: number): string {
  const filled = Math.round(rating);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

/** 감정 점수 기반 뱃지 색상 */
function getSentimentStyle(score: number | null): { bg: string; text: string; label: string } {
  if (score === null || score === undefined) return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500', label: '분석 대기' };
  if (score >= 0.3) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: '긍정' };
  if (score <= -0.3) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: '부정' };
  return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: '중립' };
}

/** 날짜 포맷 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ===== 메인 컴포넌트 =====
export function ReviewDetailPage() {
  // 앱 목록
  const [apps, setApps] = useState<ReviewApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [loadingApps, setLoadingApps] = useState(true);

  // 필터
  const [dateFilter, setDateFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  // 리뷰 목록
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);

  // 앱 목록 로드
  useEffect(() => {
    reviewAPI.getApps()
      .then(data => {
        if (data.success && data.apps) {
          setApps(data.apps);
          // 첫 번째 활성 앱 자동 선택
          const activeApps = data.apps.filter((a: ReviewApp) => a.isActive);
          if (activeApps.length > 0) {
            setSelectedAppId(activeApps[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, []);

  // 리뷰 로드
  const fetchReviews = (page = 1) => {
    if (!selectedAppId) return;
    setLoadingReviews(true);
    const params: { page: number; limit: number; date?: string; rating?: number } = { page, limit: 20 };
    if (dateFilter) params.date = dateFilter;
    if (ratingFilter) params.rating = ratingFilter;

    reviewAPI.getAppReviews(selectedAppId, params)
      .then(data => {
        if (data.success) {
          setReviews(data.reviews || []);
          setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        }
      })
      .catch(() => {
        setReviews([]);
      })
      .finally(() => setLoadingReviews(false));
  };

  // 앱 또는 필터 변경 시 리뷰 다시 로드
  useEffect(() => {
    if (selectedAppId) {
      fetchReviews(1);
    }
  }, [selectedAppId, dateFilter, ratingFilter]);

  // 평점 필터 토글
  const handleRatingFilter = (rating: number) => {
    setRatingFilter(prev => prev === rating ? null : rating);
  };

  const selectedApp = apps.find(a => a.id === selectedAppId);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800 pb-8">
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* 페이지 제목 */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">앱 리뷰 탐색</h1>

        {/* 앱 선택 드롭다운 */}
        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-600 mb-4">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">앱 선택</label>
          {loadingApps ? (
            <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse" />
          ) : apps.length === 0 ? (
            <p className="text-sm text-gray-400">등록된 앱이 없습니다</p>
          ) : (
            <select
              value={selectedAppId ?? ''}
              onChange={(e) => setSelectedAppId(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            >
              {apps.filter(a => a.isActive).map(app => (
                <option key={app.id} value={app.id}>
                  {app.name} {app.category ? `(${app.category})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 필터 영역 */}
        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-600 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">필터</span>
          </div>

          {/* 날짜 필터 */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1 block">날짜</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* 평점 필터 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">평점</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => handleRatingFilter(r)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    ratingFilter === r
                      ? 'bg-yellow-400 text-white'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500'
                  }`}
                >
                  <Star size={12} className={ratingFilter === r ? 'fill-white' : ''} />
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 결과 요약 */}
        {selectedApp && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {selectedApp.name} - 총 {pagination.total}개 리뷰
            {dateFilter && ` (${dateFilter})`}
            {ratingFilter && ` (${ratingFilter}점)`}
          </div>
        )}

        {/* 리뷰 카드 리스트 */}
        {loadingReviews ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-600 rounded mb-1" />
                <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-600 rounded" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p>{selectedAppId ? '조건에 맞는 리뷰가 없습니다' : '앱을 선택해주세요'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => {
              const sentiment = getSentimentStyle(review.sentimentScore);
              return (
                <div key={review.id} className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-600">
                  {/* 별점 + 작성자 + 날짜 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-sm tracking-tight">{renderStars(review.rating)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{review.author || '익명'}</span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(review.reviewDate)}</span>
                  </div>

                  {/* 리뷰 내용 */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{review.content}</p>

                  {/* AI 분석 뱃지 */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* 감정 뱃지 */}
                    <span className={`${sentiment.bg} ${sentiment.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}>
                      {sentiment.label}
                    </span>

                    {/* 카테고리 뱃지 */}
                    {review.categories?.map((cat, i) => (
                      <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[11px] px-2 py-0.5 rounded-full font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => fetchReviews(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchReviews(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
