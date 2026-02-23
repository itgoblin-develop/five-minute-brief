import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import type { NewsItem } from '@/data/mockNews';
import { getRelativeTime, formatCount } from '@/utils/helpers';
import { Share2, Link as LinkIcon, Send, MessageCircle, MoreHorizontal, User, Heart, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { interactionAPI } from '@/lib/api';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

interface NewsDetailProps {
  item: NewsItem;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  initialScrollToComments?: boolean;
  likedIds: Set<string>;
  bookmarkedIds: Set<string>;
  onToggleLike: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

interface Comment {
  id: string;
  user: string;
  text: string;
  date: string;
  color: string;
  isMine?: boolean;
}

// Pastel colors for random profile backgrounds
const PROFILE_COLORS = [
  'bg-red-100 text-red-600',
  'bg-orange-100 text-orange-600',
  'bg-amber-100 text-amber-600',
  'bg-green-100 text-green-600',
  'bg-emerald-100 text-emerald-600',
  'bg-teal-100 text-teal-600',
  'bg-cyan-100 text-cyan-600',
  'bg-blue-100 text-blue-600',
  'bg-indigo-100 text-indigo-600',
  'bg-violet-100 text-violet-600',
  'bg-purple-100 text-purple-600',
  'bg-fuchsia-100 text-fuchsia-600',
  'bg-pink-100 text-pink-600',
  'bg-rose-100 text-rose-600',
];

const ArrowUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M6.37779 10.5915L10.3704 14.5841C10.5333 14.7471 10.6114 14.9372 10.6046 15.1545C10.5979 15.3718 10.513 15.5619 10.35 15.7249C10.1871 15.8742 9.99693 15.9523 9.77964 15.9591C9.56236 15.9659 9.37224 15.8878 9.20927 15.7249L3.8315 10.3471C3.75001 10.2656 3.6923 10.1773 3.65835 10.0823C3.6244 9.98721 3.60742 9.88536 3.60742 9.77671C3.60742 9.66807 3.6244 9.56622 3.65835 9.47116C3.6923 9.3761 3.75001 9.28783 3.8315 9.20634L9.20927 3.82857C9.35866 3.67918 9.54539 3.60449 9.76946 3.60449C9.99353 3.60449 10.1871 3.67918 10.35 3.82857C10.513 3.99153 10.5945 4.18505 10.5945 4.40912C10.5945 4.6332 10.513 4.82671 10.35 4.98968L6.37779 8.9619H15.4833C15.7142 8.9619 15.9077 9.03999 16.0639 9.19616C16.2201 9.35233 16.2982 9.54585 16.2982 9.77671C16.2982 10.0076 16.2201 10.2011 16.0639 10.3573C15.9077 10.5134 15.7142 10.5915 15.4833 10.5915H6.37779Z" fill="white"/>
  </svg>
);

export function NewsDetail({ 
  item, 
  isLoggedIn, 
  onLoginRequired, 
  initialScrollToComments = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark
}: NewsDetailProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const commentsRef = useRef<HTMLDivElement>(null);

  const [commentText, setCommentText] = useState("");
  const [editContent, setEditContent] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const isLiked = likedIds.has(item.id);
  const isBookmarked = bookmarkedIds.has(item.id);

  // 댓글 목록 API에서 가져오기
  useEffect(() => {
    interactionAPI.getComments(item.id).then(data => {
      if (data.success) {
        const mapped = data.comments.map((c: any, idx: number) => ({
          id: String(c.id),
          user: c.isMine ? '나' : c.nickname,
          text: c.content,
          date: getRelativeTime(c.createdAt),
          color: PROFILE_COLORS[idx % PROFILE_COLORS.length],
          isMine: c.isMine,
        }));
        setComments(mapped);
      }
    }).catch(() => {});
  }, [item.id]);

  useEffect(() => {
    if (initialScrollToComments && commentsRef.current) {
      setTimeout(() => {
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [initialScrollToComments]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다.');
    } catch (err) {
      console.error('Failed to copy link:', err);
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

    const articleUrl = `${window.location.origin}/news/${item.id}`;
    const description = item.content
      ? item.content.slice(0, 100) + (item.content.length > 100 ? '...' : '')
      : '';
    const imageUrl = item.imageUrl?.startsWith('http')
      ? item.imageUrl
      : `${window.location.origin}${item.imageUrl}`;

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: item.title,
          description,
          imageUrl,
          link: {
            mobileWebUrl: articleUrl,
            webUrl: articleUrl,
          },
        },
        buttons: [
          {
            title: '기사 보기',
            link: {
              mobileWebUrl: articleUrl,
              webUrl: articleUrl,
            },
          },
        ],
      });
    } catch (err) {
      console.error('Kakao share error:', err);
      toast.error('카카오톡 공유에 실패했습니다.');
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.text);
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await interactionAPI.deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
      setOpenMenuId(null);
      toast.success('댓글이 삭제되었습니다.');
      if (editingId === id) {
        setEditingId(null);
        setEditContent('');
      }
    } catch {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editContent.trim() || !editingId) return;

      try {
        await interactionAPI.updateComment(editingId, editContent.trim());
        setComments(prev => prev.map(c => c.id === editingId ? { ...c, text: editContent.trim() } : c));
        setEditingId(null);
        setEditContent("");
        toast.success('댓글이 수정되었습니다.');
      } catch {
        toast.error('댓글 수정에 실패했습니다.');
      }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }

    if (!commentText.trim()) return;

    try {
      const data = await interactionAPI.addComment(item.id, commentText.trim());
      if (data.success) {
        const newComment: Comment = {
          id: String(data.comment.id),
          user: '나',
          text: data.comment.content,
          date: '방금 전',
          color: PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)],
          isMine: true,
        };
        setComments([newComment, ...comments]);
        setCommentText("");
        toast.success('댓글이 등록되었습니다.');
      }
    } catch {
      toast.error('댓글 등록에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 pt-16">
      <article className="max-w-2xl mx-auto px-5">
        {/* Header Info */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-gray-900 dark:text-gray-100 leading-snug mb-3">
            {item.title}
          </h1>
          <div className="flex items-center justify-between text-sm">
             <div className="flex items-center text-gray-500 dark:text-gray-400">
               <span>{getRelativeTime(item.date)}</span>
             </div>
             
             {/* Stats: Like & Bookmark - Now Clickable */}
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => onToggleLike(item.id)}
                  className="flex items-center gap-1 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group active:scale-95"
                >
                  <Heart
                    size={20} 
                    className={clsx(
                      "transition-colors",
                      isLiked ? "fill-[#FF4B4B] text-[#FF4B4B]" : "fill-gray-300 text-gray-300 group-hover:text-gray-400 group-hover:fill-gray-400"
                    )} 
                    strokeWidth={0}
                  />
                  <span className={clsx("text-xs font-medium transition-colors", isLiked ? "text-[#FF4B4B]" : "text-gray-400 group-hover:text-gray-600")}>
                    {formatCount(item.likeCount + (isLiked ? 1 : 0))}
                  </span>
                </button>
                
                <button 
                  onClick={() => onToggleBookmark(item.id)}
                  className="flex items-center gap-1 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group active:scale-95"
                >
                  <Bookmark
                    size={20} 
                    className={clsx(
                      "transition-colors",
                      isBookmarked ? "fill-[#3D61F1] text-[#3D61F1]" : "fill-gray-300 text-gray-300 group-hover:text-gray-400 group-hover:fill-gray-400"
                    )} 
                    strokeWidth={0}
                  />
                  <span className={clsx("text-xs font-medium transition-colors", isBookmarked ? "text-[#3D61F1]" : "text-gray-400 group-hover:text-gray-600")}>
                    {formatCount(item.bookmarkCount + (isBookmarked ? 1 : 0))}
                  </span>
                </button>
             </div>
          </div>
        </div>

        {/* AI Summary Box */}
        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5 mb-8">
          <div className="flex items-center mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2" />
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">AI 3줄 요약</h3>
          </div>
          <ul className="space-y-2">
            {(item.summary || []).map((line, idx) => (
              <li key={idx} className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed pl-1">
                • {line}
              </li>
            ))}
          </ul>
        </div>

        {/* 썸네일 이미지 */}
        {item.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <ImageWithFallback
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg text-gray-800 dark:text-gray-200 leading-loose whitespace-pre-line mb-10">
          {item.content}
        </div>
        
        {/* Footer Text (Source removed) */}
        <div className="text-center mb-10">
           <p className="font-medium text-blue-600 text-sm">생성형 AI가 재구성한 소식입니다.</p>
        </div>

        {/* Share Buttons */}
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

        {/* Comments Section */}
        <div ref={commentsRef} className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-700 scroll-mt-20">
            {/* Comment Input Area - Updated Design */}
            <div className="flex flex-col gap-2 mb-8">
              <p className="font-medium text-[13px] text-[#222] dark:text-gray-200">
                댓글 <span className="text-[#5e5e5e] dark:text-gray-400">{comments.length}</span>
              </p>
              
              <div className="bg-[#f8f8f8] dark:bg-gray-800 h-[44px] relative rounded-[1000px] w-full flex items-center pl-[16px] pr-[8px] border border-[#f3f3f3] dark:border-gray-700">
                  <form onSubmit={handleCommentSubmit} className="flex-1 flex items-center justify-between">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onClick={() => {
                            if (!isLoggedIn) onLoginRequired();
                        }}
                        placeholder="새 댓글 입력"
                        readOnly={!isLoggedIn}
                        className="bg-transparent border-none outline-none text-[14px] text-[#222] dark:text-gray-200 placeholder:text-[#bbb] dark:placeholder:text-gray-500 flex-1 min-w-0"
                    />
                    <button 
                        type="submit"
                        className="bg-[#101010] rounded-full w-[32px] h-[32px] flex items-center justify-center shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!commentText.trim() && isLoggedIn}
                    >
                         <div className="rotate-90">
                           <ArrowUpIcon />
                         </div>
                    </button>
                  </form>
              </div>
            </div>

            {/* Comment List */}
            <div className="space-y-6">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${comment.color}`}>
                           <User size={16} fill="currentColor" />
                        </div>
                        <div className="flex-1">
                            {editingId === comment.id ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                           <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{comment.user}</span>
                                           <span className="text-xs text-gray-400 dark:text-gray-500">{comment.date}</span>
                                        </div>
                                    </div>
                                    <form onSubmit={handleUpdateSubmit} className="flex gap-2 items-end w-full">
                                        <div className="bg-[#f8f8f8] dark:bg-gray-800 flex-1 relative rounded-[6px] border border-[#e1e1e1] dark:border-gray-700">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full p-[12px] text-[14px] text-[#222] dark:text-gray-200 leading-[1.5] resize-none outline-none rounded-[6px] bg-transparent min-h-[80px]"
                                                autoFocus
                                            />
                                        </div>
                                        <button 
                                            type="submit"
                                            className="bg-[rgb(0,0,0)] rounded-full w-[32px] h-[32px] flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
                                        >
                                             <div className="rotate-90">
                                               <ArrowUpIcon />
                                             </div>
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                           <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{comment.user}</span>
                                           <span className="text-xs text-gray-400 dark:text-gray-500">{comment.date}</span>
                                        </div>
                                        {comment.isMine && (
                                           <div className="relative">
                                               <button 
                                                    onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                               >
                                                  <MoreHorizontal size={16} />
                                               </button>
                                               {openMenuId === comment.id && (
                                                   <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[80px] py-1 overflow-hidden">
                                                      <button 
                                                        onClick={() => handleEdit(comment)}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                      >
                                                        수정
                                                      </button>
                                                      <button 
                                                        onClick={() => handleDelete(comment.id)}
                                                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                      >
                                                        삭제
                                                      </button>
                                                   </div>
                                               )}
                                           </div>
                                        )}
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{comment.text}</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </article>

      {/* Webtoon Style Scroll Indicator */}
      <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800 z-50">
        <motion.div
          className="absolute top-0 left-0 bottom-0 bg-blue-600 origin-left"
          style={{ scaleX, width: "100%" }}
        />
      </div>
    </div>
  );
}
