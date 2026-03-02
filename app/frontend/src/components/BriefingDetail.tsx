import { motion, useScroll, useSpring } from 'motion/react';
import { MessageCircle, Link as LinkIcon, TrendingUp, Hash, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryColor } from '@/utils/helpers';
import type { DailyBrief } from './DailyBriefCard';
import type { WeeklyBrief } from './WeeklyBriefCard';
import type { MonthlyBrief } from './MonthlyBriefCard';

type BriefingType = 'daily' | 'weekly' | 'monthly';

interface BriefingDetailProps {
  type: BriefingType;
  data: DailyBrief | WeeklyBrief | MonthlyBrief;
}

// 타입별 테마
const THEMES = {
  daily: {
    gradient: 'from-emerald-500 to-teal-600',
    progressBar: 'bg-emerald-500',
    accent: 'text-emerald-500',
    accentBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    accentBorder: 'border-emerald-400',
    keywordBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    keywordText: 'text-emerald-700 dark:text-emerald-300',
    label: '일간 브리핑',
  },
  weekly: {
    gradient: 'from-blue-500 to-indigo-600',
    progressBar: 'bg-blue-500',
    accent: 'text-blue-500',
    accentBg: 'bg-blue-50 dark:bg-blue-900/20',
    accentBorder: 'border-blue-400',
    keywordBg: 'bg-blue-50 dark:bg-blue-900/30',
    keywordText: 'text-blue-700 dark:text-blue-300',
    label: '주간 브리핑',
  },
  monthly: {
    gradient: 'from-purple-500 to-pink-600',
    progressBar: 'bg-purple-500',
    accent: 'text-purple-500',
    accentBg: 'bg-purple-50 dark:bg-purple-900/20',
    accentBorder: 'border-purple-400',
    keywordBg: 'bg-purple-50 dark:bg-purple-900/30',
    keywordText: 'text-purple-700 dark:text-purple-300',
    label: '월간 리포트',
  },
};

export function BriefingDetail({ type, data }: BriefingDetailProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const theme = THEMES[type];

  // 타입별 데이터 추출
  const getDateInfo = () => {
    if (type === 'daily') return (data as DailyBrief).dateLabel;
    if (type === 'weekly') return (data as WeeklyBrief).period;
    return (data as MonthlyBrief).period;
  };

  const getIntroComment = () => {
    if (type === 'daily') return (data as DailyBrief).introComment;
    if (type === 'weekly') return (data as WeeklyBrief).weeklyComment;
    return (data as MonthlyBrief).monthlyEditorial;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  const handleKakaoShare = () => {
    if (!window.Kakao) {
      toast.error('카카오 SDK를 불러오지 못했습니다.');
      return;
    }
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init('bd34fdeb06cdc16afcaaae2b8cdbe0b3');
    }

    const briefUrl = window.location.href;
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: data.title,
          description: getIntroComment()?.slice(0, 100) || '',
          imageUrl: `${window.location.origin}/og-image.png`,
          link: { mobileWebUrl: briefUrl, webUrl: briefUrl },
        },
        buttons: [{ title: '브리핑 보기', link: { mobileWebUrl: briefUrl, webUrl: briefUrl } }],
      });
    } catch {
      toast.error('카카오톡 공유에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 pt-16">
      <article className="max-w-2xl mx-auto px-5">
        {/* 그라데이션 배너 */}
        <div className={`bg-gradient-to-r ${theme.gradient} -mx-5 px-5 py-8 mb-6`}>
          <p className="text-white/80 text-sm font-medium mb-2">{theme.label}</p>
          <h1 className="text-[24px] font-bold text-white leading-snug mb-3">
            {data.title}
          </h1>
          <p className="text-white/70 text-sm">{getDateInfo()}</p>
        </div>

        {/* IT 도깨비 비형의 한마디 */}
        {getIntroComment() && (
          <div className={`${theme.accentBg} border border-gray-100 dark:border-gray-700 rounded-xl p-5 mb-8`}>
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">🧙</span>
              <h3 className={`text-sm font-bold ${theme.accent}`}>IT 도깨비 비형의 한마디</h3>
            </div>
            <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
              {getIntroComment()}
            </p>
          </div>
        )}

        {/* 키워드 섹션 */}
        {data.topKeywords && data.topKeywords.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {type === 'monthly' ? (
                <Hash size={16} className={theme.accent} />
              ) : (
                <TrendingUp size={16} className={theme.accent} />
              )}
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {type === 'daily' ? '오늘의 키워드' : type === 'weekly' ? '주간 트렌드' : '월간 키워드 TOP'}
              </h2>
            </div>
            <div className="space-y-3">
              {data.topKeywords.map((kw, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`${theme.keywordBg} ${theme.keywordText} px-3 py-1 rounded-full text-xs font-bold shrink-0`}>
                    {kw.keyword}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pt-0.5">
                    {kw.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 본문 영역: 일간/주간 — 카테고리별 하이라이트 */}
        {type === 'daily' && (data as DailyBrief).categoryHighlights?.length > 0 && (
          <div className="mb-8 space-y-5">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">카테고리별 핵심</h2>
            {(data as DailyBrief).categoryHighlights.map((hl, i) => (
              <div key={i} className={`border-l-3 ${theme.accentBorder} pl-4 py-1`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${getCategoryColor(hl.category)} text-white text-xs px-2.5 py-0.5 rounded-full font-medium`}>
                    {hl.category}
                  </span>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{hl.title}</h3>
                </div>
                <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed">{hl.summary}</p>
              </div>
            ))}
          </div>
        )}

        {type === 'weekly' && (data as WeeklyBrief).categoryHighlights?.length > 0 && (
          <div className="mb-8 space-y-5">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">주요 이슈 분석</h2>
            {(data as WeeklyBrief).categoryHighlights.map((hl, i) => (
              <div key={i} className={`border-l-3 ${theme.accentBorder} pl-4 py-1`}>
                <p className={`text-xs font-bold ${theme.accent} mb-2`}>{hl.category}</p>
                <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{hl.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* 본문 영역: 월간 — 심층 분석 기사 */}
        {type === 'monthly' && (data as MonthlyBrief).deepArticles?.length > 0 && (
          <div className="mb-8 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className={theme.accent} />
              <h2 className="font-bold text-gray-900 dark:text-gray-100">심층 분석</h2>
            </div>
            {(data as MonthlyBrief).deepArticles.map((article, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">{article.title}</h3>
                <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{article.content}</p>
                {article.hashtags && article.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {article.hashtags.map((tag, j) => (
                      <span key={j} className={`text-xs ${theme.accent}`}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 마무리 코멘트 — 일간 */}
        {type === 'daily' && (data as DailyBrief).dailyComment && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-8">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">💬</span>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">비형의 마무리</h3>
            </div>
            <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed">
              {(data as DailyBrief).dailyComment}
            </p>
          </div>
        )}

        {/* 마무리 코멘트 — 주간 (다음 주 프리뷰) */}
        {type === 'weekly' && (data as WeeklyBrief).nextWeekPreview?.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-8">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">🔮</span>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">다음 주 주목 포인트</h3>
            </div>
            <ul className="space-y-2">
              {(data as WeeklyBrief).nextWeekPreview.map((item, i) => (
                <li key={i} className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed pl-1">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 풋터 텍스트 */}
        <div className="text-center mb-10">
          <p className={`font-medium text-sm ${theme.accent}`}>
            IT 도깨비 비형이 정리한 브리핑입니다.
          </p>
        </div>

        {/* 공유 버튼 */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleKakaoShare}
              className="flex-1 max-w-[160px] flex items-center justify-center gap-2 bg-[#FEE500] text-[#3c1e1e] py-3 rounded-xl font-bold hover:bg-[#FDD835] transition-colors"
            >
              <MessageCircle className="fill-current" size={20} />
              카카오 공유
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 max-w-[160px] flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <LinkIcon size={20} />
              링크 복사
            </button>
          </div>
        </div>
      </article>

      {/* 스크롤 프로그레스 바 */}
      <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800 z-50">
        <motion.div
          className={`absolute top-0 left-0 bottom-0 ${theme.progressBar} origin-left`}
          style={{ scaleX, width: '100%' }}
        />
      </div>
    </div>
  );
}
