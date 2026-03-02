import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import ITDokkaebiLogo from '@/imports/ITDokkaebiLogo';
import { Check, X } from 'lucide-react';
import type { TermsType } from './TermsPage';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { authAPI } from '@/lib/api';

interface SocialSignupModalProps {
  onComplete: () => void;
  onOpenTerms: (type: TermsType) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  kakao: '카카오',
  google: '구글',
  naver: '네이버',
};

export function SocialSignupModal({ onComplete, onOpenTerms }: SocialSignupModalProps) {
  const { socialSignupPending, completeSocialSignup, cancelSocialSignup } = useAuth();
  const [nickname, setNickname] = useState('');
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameError, setNicknameError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout>>();

  // 체크박스 상태
  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  // 추천 닉네임 초기값
  useEffect(() => {
    if (socialSignupPending?.suggestedNickname) {
      setNickname(socialSignupPending.suggestedNickname);
    }
  }, [socialSignupPending?.suggestedNickname]);

  // 닉네임 중복 확인 (디바운스)
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);

    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      setNicknameAvailable(null);
      if (nickname.length > 0 && (nickname.length < 2 || nickname.length > 20)) {
        setNicknameError('닉네임은 2자 이상 20자 이하여야 합니다');
      } else {
        setNicknameError('');
      }
      return;
    }

    setNicknameError('');
    setIsChecking(true);
    checkTimer.current = setTimeout(async () => {
      try {
        const data = await authAPI.checkNickname(nickname);
        if (data.success) {
          setNicknameAvailable(data.available);
          if (!data.available) {
            setNicknameError('이미 사용 중인 닉네임입니다');
          }
        }
      } catch {
        setNicknameAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [nickname]);

  if (!socialSignupPending) return null;

  const providerLabel = PROVIDER_LABELS[socialSignupPending.provider] || socialSignupPending.provider;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      toast.error('닉네임은 2자 이상 20자 이하여야 합니다.');
      return;
    }

    if (nicknameAvailable === false) {
      toast.error('이미 사용 중인 닉네임입니다.');
      return;
    }

    if (!ageChecked || !termsChecked || !privacyChecked) {
      toast.error('약관 동의 후 회원가입 가능합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeSocialSignup(nickname);
      if (result.success) {
        toast.success('회원가입이 완료되었습니다!');
        onComplete();
      } else {
        toast.error(result.error || '회원가입에 실패했습니다.');
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white dark:bg-gray-900 z-[100] flex flex-col overflow-y-auto"
    >
      {/* 닫기 버튼 */}
      <button
        onClick={cancelSocialSignup}
        className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 z-10"
      >
        <X size={24} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full px-5 py-12">
        {/* 로고 */}
        <div className="h-16 mb-6 shrink-0 flex items-center justify-center">
          <ITDokkaebiLogo />
        </div>

        {/* 소셜 인증 완료 안내 */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-full mb-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-bold text-green-700 dark:text-green-300">{providerLabel} 인증 완료</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">닉네임을 설정하고 약관에 동의하면 가입이 완료됩니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
          {/* 닉네임 입력 */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">닉네임</label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력해주세요 (2-20자)"
                maxLength={20}
                className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border rounded-2xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  nicknameError
                    ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                    : nicknameAvailable === true
                    ? 'border-green-500 focus:ring-green-200 focus:border-green-500'
                    : 'border-gray-100 dark:border-gray-700 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                }`}
              />
              {nicknameAvailable === true && !isChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              {isChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">확인 중...</div>
              )}
            </div>
            {nicknameError && <p className="text-red-500 text-xs mt-1 ml-1">{nicknameError}</p>}
            {nicknameAvailable === true && !nicknameError && <p className="text-green-600 dark:text-green-400 text-xs mt-1 ml-1">사용 가능한 닉네임입니다</p>}
          </div>

          {/* 약관 동의 체크박스 */}
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${ageChecked ? 'bg-[#3D61F1] border-[#3D61F1]' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                {ageChecked && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <input type="checkbox" className="hidden" checked={ageChecked} onChange={(e) => setAgeChecked(e.target.checked)} />
              <span className="text-sm text-gray-600 dark:text-gray-300">만 14세 이상입니다.</span>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group flex-1">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${termsChecked ? 'bg-[#3D61F1] border-[#3D61F1]' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                  {termsChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" className="hidden" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} />
                <span className="text-sm text-gray-600 dark:text-gray-300">서비스 이용약관 동의</span>
              </label>
              <button type="button" onClick={() => onOpenTerms('service')} className="text-xs text-gray-400 dark:text-gray-500 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300">약관보기</button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group flex-1">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${privacyChecked ? 'bg-[#3D61F1] border-[#3D61F1]' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                  {privacyChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" className="hidden" checked={privacyChecked} onChange={(e) => setPrivacyChecked(e.target.checked)} />
                <span className="text-sm text-gray-600 dark:text-gray-300">개인정보처리방침 동의</span>
              </label>
              <button type="button" onClick={() => onOpenTerms('privacy')} className="text-xs text-gray-400 dark:text-gray-500 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300">약관보기</button>
            </div>
          </div>

          {/* 가입 완료 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 mt-2"
          >
            {isSubmitting ? '처리 중...' : '가입 완료'}
          </button>

          {/* 취소 */}
          <button
            type="button"
            onClick={cancelSocialSignup}
            className="w-full text-gray-400 dark:text-gray-500 text-sm font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-4"
          >
            취소
          </button>
        </form>
      </div>
    </motion.div>
  );
}
