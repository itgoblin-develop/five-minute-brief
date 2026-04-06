import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { newsletterAPI } from '@/lib/api';

interface NewsletterSubscribeProps {
  userEmail?: string;
  isLoggedIn: boolean;
}

export function NewsletterSubscribe({ userEmail, isLoggedIn }: NewsletterSubscribeProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('유효한 이메일을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await newsletterAPI.subscribe(email.trim());
      if (data.success) {
        setIsSubscribed(true);
        toast.success(data.message);
      }
    } catch {
      toast.error('구독 신청에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="mx-4 my-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
        <Check size={24} className="mx-auto mb-2 text-green-500" />
        <p className="text-sm font-medium text-green-700 dark:text-green-300">인증 이메일을 확인해주세요!</p>
      </div>
    );
  }

  return (
    <div className="mx-4 my-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-blue-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Mail size={16} className="text-blue-500" />
        <span className="text-sm font-bold text-gray-900 dark:text-white">매일 아침 IT 브리핑을 받아보세요</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">비형×현결이 큐레이션한 IT 소식을 이메일로 받아보세요.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : '구독'}
        </button>
      </form>
    </div>
  );
}
