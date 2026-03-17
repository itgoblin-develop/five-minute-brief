import { useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { MessageCircle, Link as LinkIcon, TrendingUp, Hash, BookOpen, Pencil, Trash2, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryColor, isToday } from '@/utils/helpers';
import { adminAPI } from '@/lib/api';
import type { DailyBrief } from './DailyBriefCard';
import type { WeeklyBrief } from './WeeklyBriefCard';
import type { MonthlyBrief } from './MonthlyBriefCard';

type BriefingType = 'daily' | 'weekly' | 'monthly';

interface BriefingDetailProps {
  type: BriefingType;
  data: DailyBrief | WeeklyBrief | MonthlyBrief;
  isAdmin?: boolean;
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

export function BriefingDetail({ type, data, isAdmin }: BriefingDetailProps) {
  const { scrollYProgress } = useScroll();

  // 현결 에디터 코멘트 (일간/월간 전용)
  const [editorComment, setEditorComment] = useState<string | null>((data as any).editorComment || null);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(editorComment || '');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // 주간 대화 (dialogue) 상태
  type DialogueTurn = { speaker: '비형' | '현결'; text: string };
  const [dialogue, setDialogue] = useState<DialogueTurn[]>((data as WeeklyBrief).dialogue || []);
  const [editingTurnIdx, setEditingTurnIdx] = useState<number | null>(null);
  const [turnDraft, setTurnDraft] = useState('');
  const [isSavingDialogue, setIsSavingDialogue] = useState(false);

  const handleSaveTurn = async (idx: number) => {
    if (!turnDraft.trim()) return;
    setIsSavingDialogue(true);
    const updated = dialogue.map((t, i) => i === idx ? { ...t, text: turnDraft.trim() } : t);
    try {
      const result = await adminAPI.updateWeeklyDialogue((data as any).id, updated);
      if (result.success) {
        setDialogue(updated);
        setEditingTurnIdx(null);
        toast.success('대화가 저장되었습니다.');
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSavingDialogue(false);
    }
  };

  const handleSaveEditorComment = async () => {
    if (!commentDraft.trim()) return;
    setIsSavingComment(true);
    try {
      const result = await adminAPI.updateBriefingEditorComment(type, (data as any).id, commentDraft.trim());
      if (result.success) {
        setEditorComment(commentDraft.trim());
        setIsEditingComment(false);
        toast.success('현결 코멘트가 저장되었습니다.');
      }
    } catch {
      toast.error('코멘트 저장에 실패했습니다.');
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDeleteEditorComment = async () => {
    setIsSavingComment(true);
    try {
      const result = await adminAPI.updateBriefingEditorComment(type, (data as any).id, null);
      if (result.success) {
        setEditorComment(null);
        setCommentDraft('');
        setIsEditingComment(false);
        toast.success('코멘트가 삭제되었습니다.');
      }
    } catch {
      toast.error('코멘트 삭제에 실패했습니다.');
    } finally {
      setIsSavingComment(false);
    }
  };
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
    // 주간은 dialogue가 있으면 weeklyComment 섹션 숨김 (대화 버블이 대체)
    if (type === 'weekly') return (data as WeeklyBrief).dialogue?.length ? null : (data as WeeklyBrief).weeklyComment;
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
          imageUrl: data.coverImageUrl || `${window.location.origin}/og-image.png`,
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
      <article className="max-w-2xl md:max-w-4xl mx-auto px-5 md:px-8">
        {/* 그라데이션 배너 */}
        <div
          className={`bg-gradient-to-r ${theme.gradient} -mx-5 px-5 py-8 mb-6 relative overflow-hidden`}
          style={data.coverImageUrl ? {
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0.45)), url(${data.coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          <p className="text-white/80 text-sm font-medium mb-2 relative z-10">{theme.label}</p>
          <h1 className="text-[24px] font-bold text-white leading-snug mb-3 relative z-10">
            {data.title}
          </h1>
          <p className="text-white/70 text-sm relative z-10">{getDateInfo()}</p>
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
                {type === 'daily'
                ? (isToday((data as DailyBrief).dateLabel) ? '오늘의 키워드' : '주요 키워드')
                : type === 'weekly' ? '주간 트렌드' : '월간 키워드 TOP'}
              </h2>
            </div>
            <div className="space-y-2.5">
              {data.topKeywords.map((kw, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                  <span className={`${theme.keywordBg} ${theme.keywordText} px-3 py-0.5 rounded-full text-xs font-bold inline-block mb-1.5`}>
                    {kw.keyword}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {kw.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 본문 영역: 일간 — 카테고리별 하이라이트 */}
        {type === 'daily' && (data as DailyBrief).categoryHighlights?.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">비형이 골라본 핵심 소식</h2>
            {(data as DailyBrief).categoryHighlights.map((hl, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <span className={`${getCategoryColor(hl.category)} text-white text-xs px-2.5 py-0.5 rounded-full font-medium inline-block mb-3`}>
                  {hl.category}
                </span>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-2 leading-snug">{hl.title}</h3>
                <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed">{hl.summary}</p>
              </div>
            ))}
          </div>
        )}

        {/* 본문 영역: 주간 — 카테고리별 하이라이트 */}
        {type === 'weekly' && (data as WeeklyBrief).categoryHighlights?.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">비형이 파헤친 이번 주 이슈</h2>
            {(data as WeeklyBrief).categoryHighlights.map((hl, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <span className={`${theme.keywordBg} ${theme.keywordText} text-xs px-2.5 py-0.5 rounded-full font-bold inline-block mb-3`}>
                  {hl.category}
                </span>
                {hl.content.split('\n\n').map((paragraph, pi) => (
                  <p key={pi} className={`text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed ${pi > 0 ? 'mt-3' : ''}`}>
                    {paragraph}
                  </p>
                ))}
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

        {/* 앱 리뷰 핫이슈 — reviewHighlights가 있을 때만 렌더링 */}
        {type === 'daily' && (data as any).reviewHighlights?.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className={theme.accent} />
              <h2 className="font-bold text-gray-900 dark:text-gray-100">앱 리뷰 핫이슈</h2>
            </div>
            <div className="space-y-3">
              {(data as any).reviewHighlights.map((hl: any, i: number) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100">{hl.appName}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-sm">
                        {'★'.repeat(Math.round(hl.avgRating || 0))}{'☆'.repeat(5 - Math.round(hl.avgRating || 0))}
                      </span>
                      <span className="text-xs text-gray-400">({hl.reviewCount}건)</span>
                    </div>
                  </div>
                  {hl.sentimentSummary && (
                    <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed mb-2">{hl.sentimentSummary}</p>
                  )}
                  {hl.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hl.hashtags.map((tag: string, j: number) => (
                        <span key={j} className={`text-xs ${theme.accent}`}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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

        {/* 주간 브리핑 — 비형↔현결 티키타카 대화 */}
        {type === 'weekly' && dialogue.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className={theme.accent} />
              <h2 className="font-bold text-gray-900 dark:text-gray-100">이번 주 IT 토론</h2>
              {(data as WeeklyBrief).centralKeyword && (
                <span className="ml-auto px-3 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                  # {(data as WeeklyBrief).centralKeyword}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {dialogue.map((turn, idx) => {
                const isBihyeong = turn.speaker === '비형';
                const isEditing = editingTurnIdx === idx;
                return (
                  <div key={idx} className={`flex ${isBihyeong ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] ${isBihyeong ? '' : 'items-end flex flex-col'}`}>
                      {/* 화자 이름 */}
                      <span className={`text-xs font-bold mb-1 block ${isBihyeong ? 'text-blue-500 pl-1' : 'text-amber-600 dark:text-amber-400 pr-1 text-right'}`}>
                        {isBihyeong ? '🧙 비형' : '🎙️ 현결'}
                      </span>
                      {/* 말풍선 */}
                      <div className={`relative rounded-2xl px-4 py-3 ${
                        isBihyeong
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-gray-800 dark:text-gray-200 rounded-tr-sm'
                      }`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={turnDraft}
                              onChange={(e) => setTurnDraft(e.target.value)}
                              className="w-full text-[14px] bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg p-2 resize-y outline-none focus:ring-2 focus:ring-amber-400 min-h-[60px]"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingTurnIdx(null)}
                                className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSaveTurn(idx)}
                                disabled={isSavingDialogue || !turnDraft.trim()}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50"
                              >
                                {isSavingDialogue ? '저장 중...' : '저장'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[14px] leading-relaxed">{turn.text}</p>
                        )}
                        {/* 관리자 편집 버튼 — 현결 발언만 */}
                        {isAdmin && !isBihyeong && !isEditing && (
                          <button
                            onClick={() => { setTurnDraft(turn.text); setEditingTurnIdx(idx); }}
                            className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 shadow-sm"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 현결 코멘트 (일간/월간 전용, 주간은 dialogue로 대체) */}
        {type !== 'weekly' && (editorComment || (isAdmin && !isEditingComment)) && (
          <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <span className="text-lg mr-2">🎙️</span>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">현결의 한마디</h3>
              </div>
              {isAdmin && !isEditingComment && (
                <div className="flex gap-1">
                  <button
                    onClick={() => { setCommentDraft(editorComment || ''); setIsEditingComment(true); }}
                    className="p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  {editorComment && (
                    <button
                      onClick={handleDeleteEditorComment}
                      className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {isEditingComment ? (
              <div className="space-y-2">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="이 브리핑에 대한 현결의 코멘트를 남겨보세요..."
                  className="w-full text-[15px] md:text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-3 md:p-4 resize-y outline-none focus:ring-2 focus:ring-amber-400 min-h-[80px] md:min-h-[120px]"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditingComment(false)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEditorComment}
                    disabled={isSavingComment || !commentDraft.trim()}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSavingComment ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : editorComment ? (
              <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">{editorComment}</p>
            ) : isAdmin ? (
              <button
                onClick={() => setIsEditingComment(true)}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
              >
                + 코멘트 추가하기
              </button>
            ) : null}
          </div>
        )}

        {/* 풋터 텍스트 */}
        <div className="text-center mb-10">
          <p className={`font-medium text-sm ${theme.accent}`}>
            비형이 정성껏 골라 쓴 이야기야. 읽어줘서 고마워! 🪄
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
