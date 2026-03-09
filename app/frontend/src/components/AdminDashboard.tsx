import { useState, useEffect } from 'react';
import { Users, Eye, Heart, Bookmark, MessageCircle, Newspaper, TrendingUp, Search, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { statsAPI, adminAPI, reviewAPI } from '@/lib/api';

// ===== Types =====
interface OverviewStats {
  users: { total: number; dau: number; wau: number };
  content: { totalNews: number; totalViews: number };
  engagement: { totalLikes: number; totalBookmarks: number; totalComments: number };
}

interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  isAdmin: boolean;
  provider: 'local' | 'kakao' | 'google' | 'naver';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PopularNewsItem {
  id: string;
  title: string;
  category: string;
  viewCount: number;
  likeCount: number;
}

interface DailyActiveItem {
  date: string;
  activeUsers: number;
}

interface CategoryStatsItem {
  category: string;
  newsCount: number;
  viewCount: number;
  likeCount: number;
}

type TabId = 'overview' | 'users' | 'popular' | 'trend' | 'category' | 'data' | 'reviews';

// ===== Helper =====
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '없음';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return formatDate(dateStr);
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString();
}

const PROVIDER_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  local:  { label: '이메일', bg: 'bg-gray-100', text: 'text-gray-600' },
  kakao:  { label: '카카오', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  google: { label: '구글',   bg: 'bg-blue-50',   text: 'text-blue-600' },
  naver:  { label: '네이버', bg: 'bg-green-50',  text: 'text-green-700' },
};

// ===== Sub-components =====

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? formatNumber(value) : value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-200" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-7 w-20 bg-gray-200 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}

// ===== Tab: Overview =====
function OverviewTab() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsAPI.getOverview().then(data => {
      if (data.success) setStats(data.stats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!stats) return <div className="text-center text-gray-400 py-12">통계를 불러올 수 없습니다</div>;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard icon={Users} label="전체 회원" value={stats.users.total} color="bg-blue-500" />
      <StatCard icon={TrendingUp} label="오늘 활성 (DAU)" value={stats.users.dau} color="bg-green-500" />
      <StatCard icon={TrendingUp} label="주간 활성 (WAU)" value={stats.users.wau} color="bg-emerald-500" />
      <StatCard icon={Newspaper} label="전체 뉴스" value={stats.content.totalNews} color="bg-purple-500" />
      <StatCard icon={Eye} label="총 열람수" value={stats.content.totalViews} color="bg-orange-500" />
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-500">
            <Heart size={16} className="text-white" />
          </div>
          <span className="text-xs font-medium text-gray-500">참여 현황</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 flex items-center gap-1"><Heart size={12} />좋아요</span>
            <span className="text-sm font-bold text-gray-900">{formatNumber(stats.engagement.totalLikes)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 flex items-center gap-1"><Bookmark size={12} />북마크</span>
            <span className="text-sm font-bold text-gray-900">{formatNumber(stats.engagement.totalBookmarks)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 flex items-center gap-1"><MessageCircle size={12} />댓글</span>
            <span className="text-sm font-bold text-gray-900">{formatNumber(stats.engagement.totalComments)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Tab: Users =====
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = (page: number, searchTerm: string) => {
    setLoading(true);
    adminAPI.getUsers({ page, limit: 20, search: searchTerm })
      .then(data => {
        if (data.success) {
          setUsers(data.users);
          setPagination(data.pagination);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers(1, '');
  }, []);

  const handleSearch = () => {
    setSearch(searchInput);
    fetchUsers(1, searchInput);
  };

  const handleDeleteUser = (user: AdminUser) => {
    Swal.fire({
      title: '사용자 삭제',
      html: `<strong>${user.nickname}</strong> (${user.email})<br/>이 사용자의 모든 데이터가 영구 삭제됩니다.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await adminAPI.deleteUser(user.id);
          Swal.fire('삭제 완료', '사용자가 삭제되었습니다.', 'success');
          fetchUsers(pagination.page, search);
        } catch (err: any) {
          const msg = err?.response?.data?.error || '삭제에 실패했습니다.';
          Swal.fire('오류', msg, 'error');
        }
      }
    });
  };

  return (
    <div>
      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="이메일 또는 닉네임 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-[#3D61F1] text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
        >
          검색
        </button>
      </div>

      {/* Total count */}
      <div className="text-xs text-gray-400 mb-3">
        총 {pagination.total}명{search && ` (\"${search}\" 검색 결과)`}
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          {search ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{user.id}</span>
                  <span className="text-sm font-bold text-gray-900">{user.nickname}</span>
                  {user.isAdmin && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">관리자</span>
                  )}
                  {(() => {
                    const badge = PROVIDER_BADGE[user.provider] || PROVIDER_BADGE.local;
                    return (
                      <span className={`text-[10px] ${badge.bg} ${badge.text} px-1.5 py-0.5 rounded-full font-medium`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                  {!user.isAdmin && (
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                      title="사용자 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-1">{user.email}</div>
              <div className="flex gap-4 text-[11px] text-gray-400">
                <span>가입: {formatDate(user.createdAt)}</span>
                <span>최근: {relativeTime(user.lastLoginAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => fetchUsers(pagination.page - 1, search)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-gray-600 font-medium">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchUsers(pagination.page + 1, search)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Tab: Popular News =====
function PopularTab() {
  const [news, setNews] = useState<PopularNewsItem[]>([]);
  const [period, setPeriod] = useState<'1d' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    statsAPI.getPopularNews({ period, limit: 10 })
      .then(data => {
        if (data.success) setNews(data.news);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const periods: { value: '1d' | '7d' | '30d'; label: string }[] = [
    { value: '1d', label: '1일' },
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
  ];

  return (
    <div>
      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-[#3D61F1] text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
              <div className="h-4 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center text-gray-400 py-12">해당 기간의 데이터가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {news.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm flex gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                idx < 3 ? 'bg-[#3D61F1] text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Eye size={11} />{item.viewCount}</span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Heart size={11} />{item.likeCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Tab: Trend =====
function TrendTab() {
  const [data, setData] = useState<DailyActiveItem[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    statsAPI.getDailyActive({ days })
      .then(res => {
        if (res.success) setData(res.dailyActive);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const dayOptions = [
    { value: 7, label: '7일' },
    { value: 14, label: '14일' },
    { value: 30, label: '30일' },
  ];

  const maxUsers = Math.max(...data.map(d => d.activeUsers), 1);

  return (
    <div>
      {/* Day selector */}
      <div className="flex gap-2 mb-4">
        {dayOptions.map(d => (
          <button
            key={d.value}
            onClick={() => setDays(d.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              days === d.value
                ? 'bg-[#3D61F1] text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 h-64 animate-pulse">
          <div className="h-full bg-gray-100 rounded-lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center text-gray-400 py-12">데이터가 없습니다</div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 mb-3">일별 활성 사용자 (최대 {maxUsers}명)</div>
          <div className="flex items-end gap-[2px] h-48 overflow-x-auto">
            {data.map((item) => {
              const height = maxUsers > 0 ? (item.activeUsers / maxUsers) * 100 : 0;
              const dateStr = new Date(item.date);
              const label = `${dateStr.getMonth() + 1}/${dateStr.getDate()}`;
              return (
                <div key={item.date} className="flex flex-col items-center flex-1 min-w-[20px]">
                  <div className="text-[9px] text-gray-500 mb-1 font-medium">
                    {item.activeUsers > 0 ? item.activeUsers : ''}
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      item.activeUsers > 0 ? 'bg-[#3D61F1]' : 'bg-gray-100'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%`, minHeight: '2px' }}
                  />
                  <div className="text-[8px] text-gray-400 mt-1 whitespace-nowrap">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Tab: Category Stats =====
function CategoryTab() {
  const [categories, setCategories] = useState<CategoryStatsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsAPI.getCategoryStats()
      .then(data => {
        if (data.success) setCategories(data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500'];

  if (loading) return <LoadingSkeleton count={4} />;
  if (categories.length === 0) return <div className="text-center text-gray-400 py-12">카테고리 데이터가 없습니다</div>;

  return (
    <div className="space-y-3">
      {categories.map((cat, idx) => (
        <div key={cat.category} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
            <span className="text-sm font-bold text-gray-900">{cat.category}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{formatNumber(cat.newsCount)}</div>
              <div className="text-[11px] text-gray-400">뉴스</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{formatNumber(cat.viewCount)}</div>
              <div className="text-[11px] text-gray-400">조회수</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{formatNumber(cat.likeCount)}</div>
              <div className="text-[11px] text-gray-400">좋아요</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Tab: Data Export =====
const CATEGORIES = ['전체', '모바일', 'PC', 'AI', '네트워크/통신', '보안', '기타'];

function DataTab() {
  const [category, setCategory] = useState('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customLimit, setCustomLimit] = useState('500');
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [counting, setCounting] = useState(false);

  // 필터 변경 시 건수 조회
  useEffect(() => {
    setCounting(true);
    setTotalCount(null);
    const params: Record<string, string> = {};
    if (category !== '전체') params.category = category;
    if (from) params.from = from;
    if (to) params.to = to;

    statsAPI.getExportCount(params)
      .then(data => {
        if (data.success) setTotalCount(data.count);
      })
      .catch(() => {})
      .finally(() => setCounting(false));
  }, [category, from, to]);

  const handleDownload = async () => {
    const limit = Math.max(parseInt(customLimit) || 500, 1);
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit };
      if (category !== '전체') params.category = category;
      if (from) params.from = from;
      if (to) params.to = to;
      await statsAPI.exportNewsCsv(params);
    } catch {
      Swal.fire({ icon: 'error', title: '다운로드 실패', text: '데이터를 내보내지 못했습니다.', confirmButtonColor: '#3D61F1' });
    } finally {
      setLoading(false);
    }
  };

  const presetLimits = [100, 500, 1000];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-[#3D61F1]" />
          <span className="text-sm font-bold text-gray-900">뉴스 데이터 내보내기</span>
        </div>

        {/* 카테고리 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">카테고리</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-[#3D61F1] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 기간 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">기간</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/30"
            />
            <span className="text-gray-400 text-sm">~</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/30"
            />
          </div>
        </div>

        {/* 총 건수 표시 */}
        <div className="mb-4 bg-gray-50 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">조건에 맞는 데이터</span>
            <span className="text-sm font-bold text-gray-900">
              {counting ? '조회 중...' : totalCount !== null ? `${totalCount.toLocaleString()}건` : '-'}
            </span>
          </div>
        </div>

        {/* 다운로드 건수 */}
        <div className="mb-5">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">다운로드 건수</label>
          <div className="flex items-center gap-2">
            {presetLimits.map(n => (
              <button
                key={n}
                onClick={() => setCustomLimit(String(n))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  customLimit === String(n)
                    ? 'bg-[#3D61F1] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              value={customLimit}
              onChange={e => setCustomLimit(e.target.value)}
              min="1"
              max="10000"
              placeholder="직접 입력"
              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/30"
            />
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <button
          onClick={handleDownload}
          disabled={loading || totalCount === 0}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            loading || totalCount === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#3D61F1] text-white hover:bg-[#2D4FD1] active:bg-[#2545C0]'
          }`}
        >
          <Download size={16} />
          {loading ? '다운로드 중...' : 'CSV 다운로드'}
        </button>
      </div>
    </div>
  );
}

// ===== Tab: Reviews (앱 리뷰 관리) =====
interface ReviewApp {
  id: number;
  name: string;
  packageId: string;
  storeUrl: string | null;
  category: string | null;
  isActive: boolean;
  lastCollectedAt: string | null;
}

interface ReviewItem {
  reviewId: number;
  author: string;
  content: string;
  rating: number;
  reviewDate: string;
  sentimentScore: number | null;
  aiSummary: string | null;
  aiCategory: string | null;
}

function ReviewsTab() {
  const [apps, setApps] = useState<ReviewApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [collecting, setCollecting] = useState(false);

  // 앱 추가 폼 상태
  const [newAppName, setNewAppName] = useState('');
  const [newAppPackageId, setNewAppPackageId] = useState('');
  const [newAppStoreUrl, setNewAppStoreUrl] = useState('');
  const [newAppCategory, setNewAppCategory] = useState('');
  const [addingApp, setAddingApp] = useState(false);

  // 리뷰 열람 상태
  const [reviewSubTab, setReviewSubTab] = useState<'manage' | 'browse'>('manage');
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [reviewRating, setReviewRating] = useState<string>('');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);

  const fetchApps = () => {
    setLoading(true);
    reviewAPI.getApps()
      .then(data => {
        if (data.success) setApps(data.apps || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // 앱 활성/비활성 토글
  const handleToggleActive = async (app: ReviewApp) => {
    try {
      const result = await reviewAPI.updateApp(app.id, { isActive: !app.isActive });
      if (result.success) {
        setApps(prev => prev.map(a => a.id === app.id ? { ...a, isActive: !a.isActive } : a));
      }
    } catch {
      Swal.fire('오류', '상태 변경에 실패했습니다.', 'error');
    }
  };

  // 앱 삭제
  const handleDeleteApp = (app: ReviewApp) => {
    Swal.fire({
      title: '앱 삭제',
      html: `<strong>${app.name}</strong><br/>이 앱의 모든 리뷰 데이터가 삭제됩니다.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await reviewAPI.deleteApp(app.id);
          Swal.fire('삭제 완료', '앱이 삭제되었습니다.', 'success');
          fetchApps();
        } catch (err: any) {
          const msg = err?.response?.data?.error || '삭제에 실패했습니다.';
          Swal.fire('오류', msg, 'error');
        }
      }
    });
  };

  // 앱 추가
  const handleAddApp = async () => {
    if (!newAppName.trim() || !newAppPackageId.trim()) return;
    setAddingApp(true);
    try {
      const data: { name: string; packageId: string; storeUrl?: string; category?: string } = {
        name: newAppName.trim(),
        packageId: newAppPackageId.trim(),
      };
      if (newAppStoreUrl.trim()) data.storeUrl = newAppStoreUrl.trim();
      if (newAppCategory.trim()) data.category = newAppCategory.trim();
      const result = await reviewAPI.addApp(data);
      if (result.success) {
        setShowAddModal(false);
        setNewAppName('');
        setNewAppPackageId('');
        setNewAppStoreUrl('');
        setNewAppCategory('');
        fetchApps();
        Swal.fire({ icon: 'success', title: '앱 추가 완료', confirmButtonColor: '#3D61F1' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || '앱 추가에 실패했습니다.';
      Swal.fire('오류', msg, 'error');
    } finally {
      setAddingApp(false);
    }
  };

  // 수동 수집 트리거
  const handleTriggerCollection = async () => {
    setCollecting(true);
    try {
      const result = await reviewAPI.triggerCollection();
      if (result.success) {
        Swal.fire({ icon: 'success', title: '수집 시작', text: '리뷰 수집이 시작되었습니다.', confirmButtonColor: '#3D61F1' });
        // 잠시 후 목록 갱신
        setTimeout(fetchApps, 3000);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || '수집 트리거에 실패했습니다.';
      Swal.fire('오류', msg, 'error');
    } finally {
      setCollecting(false);
    }
  };

  // 리뷰 조회
  const fetchReviews = async () => {
    if (!selectedAppId) return;
    setReviewsLoading(true);
    try {
      const params: Record<string, string> = { page: String(reviewPage), limit: '20' };
      if (reviewDate) params.date = reviewDate;
      if (reviewRating) params.rating = reviewRating;
      const data = await reviewAPI.getAppReviews(selectedAppId, params);
      if (data.success) {
        setReviews(data.reviews || []);
        setReviewTotal(data.pagination?.total || 0);
      }
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (reviewSubTab === 'browse' && selectedAppId) fetchReviews();
  }, [selectedAppId, reviewDate, reviewRating, reviewPage, reviewSubTab]);

  // 앱 목록 로드 후 첫 번째 앱 자동 선택
  useEffect(() => {
    if (apps.length > 0 && !selectedAppId) setSelectedAppId(apps[0].id);
  }, [apps]);

  const sentimentColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-500';
    if (score > 0.3) return 'bg-green-100 text-green-700';
    if (score < -0.3) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const categoryLabel: Record<string, string> = {
    bug: '버그', performance: '성능', ux: 'UX', feature_request: '기능요청',
    update: '업데이트', login: '로그인', praise: '칭찬', other: '기타',
  };

  return (
    <div>
      {/* 서브 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setReviewSubTab('manage')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${reviewSubTab === 'manage' ? 'bg-[#3D61F1] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
          앱 관리
        </button>
        <button
          onClick={() => setReviewSubTab('browse')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${reviewSubTab === 'browse' ? 'bg-[#3D61F1] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
          리뷰 열람
        </button>
      </div>

      {reviewSubTab === 'browse' ? (
        <div>
          {/* 필터 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={selectedAppId || ''}
              onChange={e => { setSelectedAppId(Number(e.target.value)); setReviewPage(1); }}
              className="flex-1 min-w-[140px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
            >
              {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input
              type="date"
              value={reviewDate}
              onChange={e => { setReviewDate(e.target.value); setReviewPage(1); }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
            />
            <select
              value={reviewRating}
              onChange={e => { setReviewRating(e.target.value); setReviewPage(1); }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">전체 평점</option>
              {[1,2,3,4,5].map(r => <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5-r)}</option>)}
            </select>
          </div>

          {/* 리뷰 목록 */}
          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-12">
              {selectedAppId ? '해당 조건의 리뷰가 없습니다' : '앱을 선택하세요'}
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">총 {reviewTotal}건</div>
              <div className="space-y-2">
                {reviews.map(r => (
                  <div key={r.reviewId} className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-yellow-500">{'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}</span>
                        <span className="text-xs text-gray-400">{r.author || '익명'}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{r.reviewDate ? new Date(r.reviewDate).toLocaleDateString('ko-KR') : ''}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">{r.content}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.sentimentScore !== null && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sentimentColor(r.sentimentScore)}`}>
                          감정 {r.sentimentScore > 0 ? '+' : ''}{r.sentimentScore?.toFixed(2)}
                        </span>
                      )}
                      {r.aiCategory && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          {categoryLabel[r.aiCategory] || r.aiCategory}
                        </span>
                      )}
                      {r.aiSummary && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">"{r.aiSummary}"</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* 페이지네이션 */}
              {reviewTotal > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                    disabled={reviewPage <= 1}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-40"
                  >이전</button>
                  <span className="px-3 py-1.5 text-sm text-gray-500">{reviewPage} / {Math.ceil(reviewTotal / 20)}</span>
                  <button
                    onClick={() => setReviewPage(p => p + 1)}
                    disabled={reviewPage >= Math.ceil(reviewTotal / 20)}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-40"
                  >다음</button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
      <div>
      {/* 상단 액션 버튼 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 py-2.5 bg-[#3D61F1] text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
        >
          + 앱 추가
        </button>
        <button
          onClick={handleTriggerCollection}
          disabled={collecting}
          className="flex-1 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {collecting ? '수집 중...' : '수동 수집'}
        </button>
      </div>

      {/* 앱 목록 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center text-gray-400 py-12">등록된 앱이 없습니다</div>
      ) : (
        <div className="space-y-2">
          {apps.map(app => (
            <div key={app.id} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{app.name}</span>
                  {app.category && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{app.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 활성/비활성 토글 */}
                  <button
                    onClick={() => handleToggleActive(app)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${app.isActive ? 'bg-green-400' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${app.isActive ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDeleteApp(app)}
                    className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    title="앱 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-1 font-mono">{app.packageId}</div>
              <div className="text-[11px] text-gray-400">
                마지막 수집: {app.lastCollectedAt ? relativeTime(app.lastCollectedAt) : '없음'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 앱 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">앱 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">앱 이름 *</label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  placeholder="예: 카카오톡"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">패키지 ID *</label>
                <input
                  type="text"
                  value={newAppPackageId}
                  onChange={e => setNewAppPackageId(e.target.value)}
                  placeholder="예: com.kakao.talk"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">스토어 URL</label>
                <input
                  type="url"
                  value={newAppStoreUrl}
                  onChange={e => setNewAppStoreUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">카테고리</label>
                <input
                  type="text"
                  value={newAppCategory}
                  onChange={e => setNewAppCategory(e.target.value)}
                  placeholder="예: 소셜, 생산성, 게임"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddApp}
                disabled={addingApp || !newAppName.trim() || !newAppPackageId.trim()}
                className="flex-1 py-2.5 bg-[#3D61F1] text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {addingApp ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </div>
  );
}

// ===== Main: AdminDashboard =====
const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'users', label: '회원' },
  { id: 'popular', label: '인기' },
  { id: 'trend', label: '추이' },
  { id: 'category', label: '카테고리' },
  { id: 'data', label: '데이터' },
  { id: 'reviews', label: '리뷰' },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 pb-8">
      <div className="px-4 py-4">
        {/* Tab bar */}
        <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm border border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#3D61F1] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'popular' && <PopularTab />}
        {activeTab === 'trend' && <TrendTab />}
        {activeTab === 'category' && <CategoryTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
      </div>
    </div>
  );
}
