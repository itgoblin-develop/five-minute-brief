import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Component5Neul5BunLogo from '@/imports/5Neul5BunLogo';
import { X, Eye, EyeOff, ChevronLeft, Check } from 'lucide-react';
import type { TermsType } from './TermsPage';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onOpenTerms: (type: TermsType) => void;
  canClose?: boolean;
}

type Mode = 'login' | 'signup';

export function LoginModal({ isOpen, onClose, onLogin, onOpenTerms, canClose = true }: LoginModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [authCode, setAuthCode] = useState('');
  
  // Validation States
  const [emailError, setEmailError] = useState('');
  const [authError, setAuthError] = useState(false);
  const [authButtonText, setAuthButtonText] = useState('인증하기');

  // Checkbox States
  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setMode('login');
    setId('');
    setPassword('');
    setPasswordConfirm('');
    setNickname('');
    setAuthCode('');
    setShowPassword(false);
    setShowPasswordConfirm(false);
    setEmailError('');
    setAuthError(false);
    setAuthButtonText('인증하기');
    setAgeChecked(false);
    setTermsChecked(false);
    setPrivacyChecked(false);
  };

  const validateEmail = () => {
    if (id && !id.includes('@')) {
      setEmailError('이메일 형식으로 입력해주세요.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setId(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  const handleAuthCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAuthCode(val);
    if (authError) setAuthError(false);
    if (authButtonText === '재전송') setAuthButtonText('인증하기');
  };

  const handleAuthClick = () => {
    if (authButtonText === '재전송') {
        toast.success('인증번호가 재전송되었습니다.');
        setAuthCode('');
        setAuthError(false);
        setAuthButtonText('인증하기');
        return;
    }
    
    // Mock validation: '123456' is correct
    if (authCode === '123456') {
        toast.success('인증되었습니다.');
        setAuthError(false);
        setAuthButtonText('재전송');
    } else {
        setAuthError(true);
        setAuthButtonText('재전송');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    if (isSubmitting) return;

    if (mode === 'signup') {
      if (password !== passwordConfirm) return;
      if (!ageChecked || !termsChecked || !privacyChecked) {
        toast.error('약관 동의 후 회원가입 가능합니다.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await login(id, password);
        if (result.success) {
          toast.success('로그인 성공!');
          onLogin();
        } else {
          toast.error(result.error || '로그인에 실패했습니다.');
        }
      } else {
        const result = await signup(id, nickname, password);
        if (result.success) {
          toast.success('회원가입 성공!');
          onLogin();
        } else {
          toast.error(result.error || '회원가입에 실패했습니다.');
        }
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    // Clear errors when switching
    setEmailError('');
  };

  const isPasswordMismatch = mode === 'signup' && passwordConfirm.length > 0 && password !== passwordConfirm;

  // Clear terms error when checkboxes change -> No longer needed as we use Toast
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto"
        >
          {/* Back Button (Top Left) */}
          {(mode === 'signup' || canClose) && (
            <button 
              onClick={mode === 'signup' ? toggleMode : onClose}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 z-10"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Close Button (Top Right) */}
          {canClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>
          )}

          <div className="flex-1 flex flex-col items-center justify-center w-full px-5 py-12">
            {/* Logo */}
            <div className="w-48 h-16 text-[#3D61F1] mb-8 shrink-0">
              <Component5Neul5BunLogo />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
              
              {/* Login Mode Fields */}
              <div className="space-y-4">
                {/* ID Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    아이디
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={handleIdChange}
                    onBlur={validateEmail}
                    placeholder="이메일 주소형식으로 입력해주세요"
                    className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      emailError 
                        ? 'border-red-500 focus:ring-red-200 focus:border-red-500' 
                        : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                    }`}
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>
                  )}
                </div>

                {mode === 'signup' && (
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900">
                            인증번호
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={authCode}
                                onChange={handleAuthCodeChange}
                                placeholder="숫자만 입력"
                                className={`flex-1 px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                    authError
                                    ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                                    : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={handleAuthClick}
                                className="px-4 py-3.5 bg-[#3D61F1] text-white font-bold rounded-2xl whitespace-nowrap hover:bg-blue-600 transition-colors"
                            >
                                {authButtonText}
                            </button>
                        </div>
                        {authError && (
                            <p className="text-red-500 text-xs mt-1 ml-1">인증번호를 다시 입력해주세요</p>
                        )}
                    </div>
                )}

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8~16자리 영문+숫자+특수문자 조합"
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Signup Extra Fields */}
                {mode === 'signup' && (
                  <>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900">
                            비밀번호 재확인
                        </label>
                        <div className="relative">
                            <input
                            type={showPasswordConfirm ? "text" : "password"}
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            placeholder="비밀번호를 다시 입력해주세요"
                            className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                isPasswordMismatch
                                ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                                : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                            }`}
                            />
                            <button
                            type="button"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                            {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {isPasswordMismatch && (
                            <p className="text-red-500 text-xs mt-1 ml-1">비밀번호가 일치하지 않습니다.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900">
                            닉네임
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="닉네임을 입력해주세요"
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
                        />
                    </div>



                    {/* Terms Checkboxes */}
                    <div className="pt-2 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${ageChecked ? 'bg-[#3D61F1] border-[#3D61F1]' : 'bg-white border-gray-300'}`}>
                                {ageChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={ageChecked} 
                                onChange={(e) => setAgeChecked(e.target.checked)} 
                            />
                            <span className="text-sm text-gray-600">만 14세 이상입니다.</span>
                        </label>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer group flex-1">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${termsChecked ? 'bg-[#3D61F1] border-[#3D61F1]' : 'bg-white border-gray-300'}`}>
                                    {termsChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={termsChecked} 
                                    onChange={(e) => setTermsChecked(e.target.checked)} 
                                />
                                <span className="text-sm text-gray-600">서비스 이용약관 동의</span>
                            </label>
                            <button 
                                type="button" 
                                onClick={() => onOpenTerms('service')}
                                className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
                            >
                                약관보기
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer group flex-1">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${privacyChecked ? 'bg-[#3D61F1] border-[#3D61F1]' : 'bg-white border-gray-300'}`}>
                                    {privacyChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={privacyChecked} 
                                    onChange={(e) => setPrivacyChecked(e.target.checked)} 
                                />
                                <span className="text-sm text-gray-600">개인정보수집방침 동의</span>
                            </label>
                            <button 
                                type="button" 
                                onClick={() => onOpenTerms('privacy')}
                                className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
                            >
                                약관보기
                            </button>
                        </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 mt-2">
                {/* Primary Button */}
                <button
                  type="submit"
                  className={`w-full text-white font-bold text-lg py-4 rounded-2xl transition-colors shadow-lg ${
                    mode === 'login' 
                      ? 'bg-[#3D61F1] hover:bg-blue-600 shadow-blue-500/20' 
                      : 'bg-[#3D61F1] hover:bg-blue-600 shadow-blue-500/20'
                  }`}
                >
                  {isSubmitting ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}
                </button>

                {/* Secondary Button (Signup for Login mode) */}
                {mode === 'login' && (
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="w-full font-bold text-lg py-4 rounded-2xl transition-colors border bg-black text-white hover:bg-gray-800 border-transparent"
                    >
                      회원가입
                    </button>
                )}
                
                {/* Text Link (Login for Signup mode) */}
                {mode === 'signup' && (
                     <div className="flex justify-center mt-2">
                        <button
                          type="button"
                          onClick={toggleMode}
                          className="text-gray-500 hover:text-gray-900 text-sm font-medium underline underline-offset-4"
                        >
                          이미 계정이 있으신가요? <span className="font-bold text-[#3D61F1]">로그인</span>
                        </button>
                     </div>
                )}
              </div>
            </form>

            {/* Guest Link */}
            {mode === 'login' && (
                <button
                onClick={onClose}
                className="mt-6 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors underline decoration-transparent hover:decoration-gray-400 underline-offset-4"
                >
                비회원으로 이용하기
                </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
