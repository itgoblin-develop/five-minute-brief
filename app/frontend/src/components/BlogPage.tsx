import { useState, useEffect, useCallback } from 'react';
import { PenLine, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { blogAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { BlogCard } from '@/components/BlogCard';
import type { BlogPost } from '@/components/BlogCard';

interface BlogPageProps {
  onPostClick: (slug: string) => void;
  onWriteClick: () => void;
}

const CATEGORIES = ['전체', '인사이트', '테크 리뷰', '튜토리얼', '업계 이야기', '기타'];

export function BlogPage({ onPostClick, onWriteClick }: BlogPageProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('전체');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: { category?: string; page: number; limit: number } = { page, limit: 12 };
      if (category !== '전체') params.category = category;

      const data = await blogAPI.getList(params);
      if (data.success) {
        setPosts(data.posts);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('블로그 글을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      fetchPosts();
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const data = await blogAPI.search({ q: searchQuery.trim(), page: 1, limit: 20 });
      if (data.success) {
        setPosts(data.posts);
        setTotalPages(data.pagination.totalPages);
        setPage(1);
      }
    } catch {
      toast.error('검색 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearching) fetchPosts();
  }, [fetchPosts, isSearching]);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* 헤더 영역 */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">블로그</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">현결이 직접 쓰는 IT 인사이트</p>
          </div>
          {user?.isAdmin && (
            <button
              onClick={onWriteClick}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <PenLine className="w-4 h-4" />
              새 글 작성
            </button>
          )}
        </div>

        {/* 검색 */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="블로그 글 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {isSearching && (
            <button
              onClick={() => { setSearchQuery(''); setIsSearching(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-600 dark:text-indigo-400"
            >
              초기화
            </button>
          )}
        </div>

        {/* 카테고리 필터 */}
        {!isSearching && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 글 목록 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <PenLine className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">
            {isSearching ? '검색 결과가 없습니다' : '아직 작성된 글이 없습니다'}
          </p>
          <p className="text-sm">
            {isSearching ? '다른 키워드로 검색해보세요' : '첫 번째 블로그 글을 기대해주세요!'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                onClick={() => onPostClick(post.slug)}
              />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
