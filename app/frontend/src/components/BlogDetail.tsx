import { useState, useEffect, useCallback } from 'react';
import { Heart, Bookmark, MessageCircle, Eye, Share2, Edit3, Trash2, Send, CornerDownRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { blogAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { BlogPost } from '@/components/BlogCard';
import { getBlogCategoryColor } from '@/components/BlogCard';
import { getRelativeTime, formatCount } from '@/utils/helpers';
import { clsx } from 'clsx';

interface Comment {
  id: number;
  content: string;
  nickname: string;
  createdAt: string;
  updatedAt: string | null;
  parentId: number | null;
  isMine: boolean;
  replies: Comment[];
}

interface BlogDetailProps {
  slug: string;
  onBack: () => void;
  onEditClick: (postId: number) => void;
}

export function BlogDetail({ slug, onBack, onEditClick }: BlogDetailProps) {
  const { isLoggedIn, user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  // 댓글 상태
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; nickname: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: number; content: string } | null>(null);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    try {
      const data = await blogAPI.getDetail(slug);
      if (data.success) {
        setPost(data.post);
        setIsLiked(data.post.isLiked || false);
        setIsBookmarked(data.post.isBookmarked || false);
        setLikeCount(data.post.likeCount);
        setBookmarkCount(data.post.bookmarkCount);
      }
    } catch {
      toast.error('글을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchComments = useCallback(async () => {
    try {
      const data = await blogAPI.getComments(slug);
      if (data.success) setComments(data.comments);
    } catch { /* silent */ }
  }, [slug]);

  useEffect(() => { fetchPost(); fetchComments(); }, [fetchPost, fetchComments]);

  const handleLike = async () => {
    if (!isLoggedIn) { toast.error('로그인이 필요합니다'); return; }
    try {
      const data = await blogAPI.toggleLike(slug);
      if (data.success) {
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch { toast.error('오류가 발생했습니다'); }
  };

  const handleBookmark = async () => {
    if (!isLoggedIn) { toast.error('로그인이 필요합니다'); return; }
    try {
      const data = await blogAPI.toggleBookmark(slug);
      if (data.success) {
        setIsBookmarked(data.bookmarked);
        setBookmarkCount(data.bookmarkCount);
        toast.success(data.bookmarked ? '보관함에 추가했습니다' : '보관함에서 제거했습니다');
      }
    } catch { toast.error('오류가 발생했습니다'); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('링크가 복사되었습니다');
      }
    } catch { /* user cancelled */ }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!isLoggedIn) { toast.error('로그인이 필요합니다'); return; }
    try {
      const data = await blogAPI.addComment(slug, newComment.trim());
      if (data.success) {
        setNewComment('');
        fetchComments();
        toast.success('댓글이 작성되었습니다');
      }
    } catch { toast.error('댓글 작성에 실패했습니다'); }
  };

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim()) return;
    try {
      const data = await blogAPI.addComment(slug, replyContent.trim(), parentId);
      if (data.success) {
        setReplyTo(null);
        setReplyContent('');
        fetchComments();
      }
    } catch { toast.error('답글 작성에 실패했습니다'); }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editingComment?.content.trim()) return;
    try {
      const data = await blogAPI.updateComment(commentId, editingComment.content.trim());
      if (data.success) {
        setEditingComment(null);
        fetchComments();
      }
    } catch { toast.error('댓글 수정에 실패했습니다'); }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      const data = await blogAPI.deleteComment(commentId);
      if (data.success) fetchComments();
    } catch { toast.error('댓글 삭제에 실패했습니다'); }
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('이 글을 삭제하시겠습니까?')) return;
    try {
      const data = await blogAPI.delete(post.id);
      if (data.success) {
        toast.success('글이 삭제되었습니다');
        onBack();
      }
    } catch { toast.error('삭제에 실패했습니다'); }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>글을 찾을 수 없습니다</p>
      </div>
    );
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={clsx('py-3', isReply && 'ml-8 border-l-2 border-gray-100 dark:border-gray-700 pl-4')}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{comment.nickname}</span>
        <span className="text-xs text-gray-400">{getRelativeTime(comment.createdAt)}</span>
        {comment.updatedAt && <span className="text-xs text-gray-400">(수정됨)</span>}
      </div>

      {editingComment?.id === comment.id ? (
        <div className="flex gap-2 mt-1">
          <input
            value={editingComment.content}
            onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg"
          />
          <button onClick={() => handleUpdateComment(comment.id)} className="text-xs text-indigo-600 font-medium">저장</button>
          <button onClick={() => setEditingComment(null)} className="text-xs text-gray-400">취소</button>
        </div>
      ) : (
        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
      )}

      <div className="flex gap-3 mt-1.5">
        {!isReply && isLoggedIn && (
          <button onClick={() => setReplyTo({ id: comment.id, nickname: comment.nickname })} className="text-xs text-gray-400 hover:text-indigo-500">답글</button>
        )}
        {comment.isMine && (
          <>
            <button onClick={() => setEditingComment({ id: comment.id, content: comment.content })} className="text-xs text-gray-400 hover:text-indigo-500">수정</button>
            <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-gray-400 hover:text-red-500">삭제</button>
          </>
        )}
      </div>

      {/* 답글 입력 */}
      {replyTo?.id === comment.id && (
        <div className="flex gap-2 mt-2 ml-4">
          <CornerDownRight className="w-4 h-4 text-gray-300 mt-2 shrink-0" />
          <input
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
            placeholder={`@${comment.nickname}에게 답글...`}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg"
            autoFocus
          />
          <button onClick={() => handleReply(comment.id)} className="text-indigo-600"><Send className="w-4 h-4" /></button>
          <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400">취소</button>
        </div>
      )}

      {/* 답글 목록 */}
      {comment.replies?.map((reply) => renderComment(reply, true))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24">
      {/* 커버 이미지 */}
      {post.coverImageUrl && (
        <div className="relative -mx-4 mb-6">
          <img src={post.coverImageUrl} alt={post.title} className="w-full aspect-[2/1] object-cover" />
        </div>
      )}

      {/* 메타 정보 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className={clsx('px-3 py-1 text-white text-xs font-bold rounded-full', getBlogCategoryColor(post.category))}>
          {post.category}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{post.authorName}</span>
        <span className="text-sm text-gray-400">·</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{getRelativeTime(post.publishedAt || post.createdAt)}</span>
        <span className="text-sm text-gray-400">·</span>
        <span className="text-sm text-gray-400 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> {formatCount(post.viewCount)}
        </span>
      </div>

      {/* 제목 */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
        {post.title}
      </h1>

      {/* 태그 */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span key={tag} className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 본문 (Markdown 렌더링) */}
      <article className="prose prose-gray dark:prose-invert max-w-none mb-8 prose-headings:font-bold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-xl prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800">
        <Markdown remarkPlugins={[remarkGfm]}>
          {post.content || ''}
        </Markdown>
      </article>

      {/* 인터랙션 바 */}
      <div className="flex items-center justify-between py-4 border-t border-b border-gray-100 dark:border-gray-800 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="flex items-center gap-1.5 text-sm">
            <Heart className={clsx('w-5 h-5', isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
            <span className={isLiked ? 'text-red-500 font-medium' : 'text-gray-500'}>{formatCount(likeCount)}</span>
          </button>
          <button onClick={handleBookmark} className="flex items-center gap-1.5 text-sm">
            <Bookmark className={clsx('w-5 h-5', isBookmarked ? 'fill-indigo-500 text-indigo-500' : 'text-gray-400')} />
            <span className={isBookmarked ? 'text-indigo-500 font-medium' : 'text-gray-500'}>{formatCount(bookmarkCount)}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user?.isAdmin && (
            <>
              <button onClick={() => onEditClick(post.id)} className="p-2 text-gray-400 hover:text-indigo-500"><Edit3 className="w-5 h-5" /></button>
              <button onClick={handleDeletePost} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
            </>
          )}
          <button onClick={handleShare} className="p-2 text-gray-400 hover:text-indigo-500"><Share2 className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">댓글</h2>

        {/* 댓글 입력 */}
        {isLoggedIn ? (
          <div className="flex gap-2 mb-6">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="댓글을 작성해주세요..."
              maxLength={500}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-6">로그인하면 댓글을 작성할 수 있습니다.</p>
        )}

        {/* 댓글 목록 */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>
      </section>
    </div>
  );
}
