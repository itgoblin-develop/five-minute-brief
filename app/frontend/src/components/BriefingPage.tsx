import { useState, useEffect } from 'react';
import { Newspaper, CalendarDays, CalendarRange, Loader2 } from 'lucide-react';
import { briefingAPI } from '@/lib/api';
import { DailyBriefCard } from './DailyBriefCard';
import type { DailyBrief } from './DailyBriefCard';
import { WeeklyBriefCard } from './WeeklyBriefCard';
import type { WeeklyBrief } from './WeeklyBriefCard';
import { MonthlyBriefCard } from './MonthlyBriefCard';
import type { MonthlyBrief } from './MonthlyBriefCard';

type BriefingTab = 'daily' | 'weekly' | 'monthly';

interface BriefingPageProps {
  /** 현재 활성 탭 (외부에서 제어) */
  activeTab?: BriefingTab;
  /** 브리핑 카드 클릭 시 상세 페이지로 이동 */
  onBriefClick?: (type: BriefingTab, data: DailyBrief | WeeklyBrief | MonthlyBrief) => void;
}

const TABS: { key: BriefingTab; label: string; icon: typeof Newspaper }[] = [
  { key: 'daily', label: '일간', icon: Newspaper },
  { key: 'weekly', label: '주간', icon: CalendarDays },
  { key: 'monthly', label: '월간', icon: CalendarRange },
];

export function BriefingPage({ activeTab: externalTab, onBriefClick }: BriefingPageProps) {
  const [tab, setTab] = useState<BriefingTab>(externalTab || 'daily');
  const [dailyBriefs, setDailyBriefs] = useState<DailyBrief[]>([]);
  const [weeklyBriefs, setWeeklyBriefs] = useState<WeeklyBrief[]>([]);
  const [monthlyBriefs, setMonthlyBriefs] = useState<MonthlyBrief[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (externalTab) setTab(externalTab);
  }, [externalTab]);

  useEffect(() => {
    loadBriefs(tab);
  }, [tab]);

  const loadBriefs = async (type: BriefingTab) => {
    setIsLoading(true);
    try {
      if (type === 'daily') {
        const data = await briefingAPI.getDailyList({ page: 1, limit: 10 });
        if (data.success) setDailyBriefs(data.briefs);
      } else if (type === 'weekly') {
        const data = await briefingAPI.getWeeklyList({ page: 1, limit: 10 });
        if (data.success) setWeeklyBriefs(data.briefs);
      } else if (type === 'monthly') {
        const data = await briefingAPI.getMonthlyList({ page: 1, limit: 10 });
        if (data.success) setMonthlyBriefs(data.briefs);
      }
    } catch {
      // API 오류 시 빈 상태 유지
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailyClick = async (brief: DailyBrief) => {
    try {
      const data = await briefingAPI.getDailyDetail(brief.id);
      if (data.success) {
        onBriefClick?.('daily', data.brief);
        return;
      }
    } catch { /* fallback */ }
    onBriefClick?.('daily', brief);
  };

  const handleWeeklyClick = async (brief: WeeklyBrief) => {
    try {
      const data = await briefingAPI.getWeeklyDetail(brief.id);
      if (data.success) {
        onBriefClick?.('weekly', data.brief);
        return;
      }
    } catch { /* fallback */ }
    onBriefClick?.('weekly', brief);
  };

  const handleMonthlyClick = async (brief: MonthlyBrief) => {
    try {
      const data = await briefingAPI.getMonthlyDetail(brief.id);
      if (data.success) {
        onBriefClick?.('monthly', data.brief);
        return;
      }
    } catch { /* fallback */ }
    onBriefClick?.('monthly', brief);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 탭 바 */}
      <div className="bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-sm sticky top-0 z-10 px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                tab === key
                  ? 'bg-black text-white shadow-md dark:bg-white dark:text-black'
                  : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : tab === 'daily' ? (
          dailyBriefs.length > 0 ? (
            dailyBriefs.map(brief => (
              <DailyBriefCard key={brief.id} brief={brief} onClick={handleDailyClick} />
            ))
          ) : (
            <EmptyState
              icon={<Newspaper size={48} className="text-emerald-200" />}
              text="아직 일간 뉴스레터가 없습니다"
              subtext="매일 파이프라인 실행 후 자동 생성됩니다"
            />
          )
        ) : tab === 'weekly' ? (
          weeklyBriefs.length > 0 ? (
            weeklyBriefs.map(brief => (
              <WeeklyBriefCard key={brief.id} brief={brief} onClick={handleWeeklyClick} />
            ))
          ) : (
            <EmptyState
              icon={<CalendarDays size={48} className="text-blue-200" />}
              text="아직 주간 브리핑이 없습니다"
              subtext="매주 월요일 자동 생성됩니다"
            />
          )
        ) : tab === 'monthly' ? (
          monthlyBriefs.length > 0 ? (
            monthlyBriefs.map(brief => (
              <MonthlyBriefCard key={brief.id} brief={brief} onClick={handleMonthlyClick} />
            ))
          ) : (
            <EmptyState
              icon={<CalendarRange size={48} className="text-purple-200" />}
              text="아직 월간 리포트가 없습니다"
              subtext="매월 1일 자동 생성됩니다"
            />
          )
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ icon, text, subtext }: { icon: React.ReactNode; text: string; subtext: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 opacity-40">{icon}</div>
      <p className="font-bold text-gray-500 dark:text-gray-400 mb-1">{text}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500">{subtext}</p>
    </div>
  );
}
