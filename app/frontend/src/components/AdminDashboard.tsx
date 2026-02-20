import { useState, useEffect } from 'react';
import { Users, Eye, Heart, Bookmark, MessageCircle, Newspaper, TrendingUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { statsAPI, adminAPI } from '@/lib/api';

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

type TabId = 'overview' | 'users' | 'popular' | 'trend' | 'category';

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
                </div>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${user.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
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

// ===== Main: AdminDashboard =====
const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'users', label: '회원' },
  { id: 'popular', label: '인기' },
  { id: 'trend', label: '추이' },
  { id: 'category', label: '카테고리' },
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
      </div>
    </div>
  );
}
