import { useState, useEffect, useCallback } from 'react';
import { Save, Eye, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MDEditor from '@uiw/react-md-editor';
import { blogAPI } from '@/lib/api';
import { clsx } from 'clsx';

const CATEGORIES = ['인사이트', '테크 리뷰', '튜토리얼', '업계 이야기', '기타'];

interface BlogEditorProps {
  postId?: number | null;
  onBack: () => void;
  onSaved: (slug: string) => void;
}

export function BlogEditor({ postId, onBack, onSaved }: BlogEditorProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('인사이트');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // slug 자동 생성
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s가-힣-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 200);
  };

  // 기존 글 수정 시 데이터 로드
  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    // 관리자 목록에서 해당 글 찾기
    blogAPI.getAdminList({ limit: 100 })
      .then((data) => {
        if (data.success) {
          const post = data.posts.find((p: { id: number }) => p.id === postId);
          if (post) {
            setTitle(post.title);
            setSlug(post.slug);
            setExcerpt(post.excerpt || '');
            setCategory(post.category);
            setTagsInput(Array.isArray(post.tags) ? post.tags.join(', ') : '');
            setCoverImageUrl(post.coverImageUrl || '');
            setMetaDescription(post.metaDescription || '');
            setStatus(post.status as 'draft' | 'published');
            // 상세에서 content 가져오기
            blogAPI.getDetail(post.slug).then((detail) => {
              if (detail.success) setContent(detail.post.content || '');
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!postId) {
      setSlug(generateSlug(value));
    }
  };

  const parseTags = (): string[] => {
    return tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const handleSave = async (publishStatus?: 'draft' | 'published') => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    setSaving(true);
    const saveStatus = publishStatus || status;

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      content,
      excerpt: excerpt.trim() || undefined,
      category,
      tags: parseTags(),
      cover_image_url: coverImageUrl.trim() || undefined,
      status: saveStatus,
      meta_description: metaDescription.trim() || undefined,
    };

    try {
      let data;
      if (postId) {
        data = await blogAPI.update(postId, payload);
      } else {
        data = await blogAPI.create(payload);
      }

      if (data.success) {
        toast.success(saveStatus === 'published' ? '글이 발행되었습니다' : '임시 저장되었습니다');
        onSaved(data.post.slug);
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || '저장에 실패했습니다';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24" data-color-mode="auto">
      {/* 상단 버튼 */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> 돌아가기
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 inline mr-1" />
            임시 저장
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            {status === 'published' ? '업데이트' : '발행하기'}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {/* 제목 */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full text-2xl md:text-3xl font-bold bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none"
        />

        {/* Slug */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">/blog/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
            className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* 카테고리 + 태그 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">태그 (쉼표 구분)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="React, TypeScript, 리뷰"
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* 커버 이미지 URL */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">커버 이미지 URL</label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none"
          />
          {coverImageUrl && (
            <img src={coverImageUrl} alt="커버 미리보기" className="mt-2 w-full max-h-48 object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>

        {/* 발췌 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">발췌 (목록에 표시)</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="글의 요약을 짧게 적어주세요..."
            rows={2}
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none resize-none"
          />
        </div>

        {/* SEO 메타 설명 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">메타 설명 (SEO)</label>
          <input
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="검색엔진에 표시될 설명 (160자 이내)"
            maxLength={300}
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none"
          />
        </div>

        {/* Markdown 에디터 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">본문 (Markdown)</label>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={500}
            preview="live"
            visibleDragbar={false}
          />
        </div>
      </div>
    </div>
  );
}
