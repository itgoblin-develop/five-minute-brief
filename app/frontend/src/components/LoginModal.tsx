import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Component5Neul5BunLogo from '@/imports/5Neul5BunLogo';
import { X, Eye, EyeOff, ChevronLeft, Check } from 'lucide-react';
import type { TermsType } from './TermsPage';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { authAPI } from '@/lib/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onOpenTerms: (type: TermsType) => void;
  canClose?: boolean;
}

type Mode = 'login' | 'signup' | 'forgot';

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
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [authVerified, setAuthVerified] = useState(false);
  const [authButtonText, setAuthButtonText] = useState('인증하기');

  // Forgot Password States
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetCodeVerified, setResetCodeVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

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
    setCodeSent(false);
    setIsSendingCode(false);
    setAuthError(false);
    setAuthVerified(false);
    setAuthButtonText('인증하기');
    setResetCodeSent(false);
    setResetCode('');
    setResetCodeVerified(false);
    setNewPassword('');
    setNewPasswordConfirm('');
    setShowNewPassword(false);
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
    if (authVerified) return;
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAuthCode(val);
    if (authError) setAuthError(false);
    if (authButtonText === '재전송') setAuthButtonText('인증하기');
  };

  const handleSendCode = async () => {
    if (!validateEmail() || !id) {
      setEmailError('이메일을 입력해주세요.');
      return;
    }
    setIsSendingCode(true);
    try {
      const data = await authAPI.sendCode(id);
      if (data.success) {
        setCodeSent(true);
        setAuthCode('');
        setAuthError(false);
        setAuthVerified(false);
        setAuthButtonText('인증하기');
        toast.success('인증번호가 발송되었습니다. 이메일을 확인해주세요.');
        // 개발 모드: 콘솔에서 인증번호 확인 가능
        if (data.code) {
          console.log(`[DEV] 인증번호: ${data.code}`);
        }
      } else {
        toast.error(data.error || '인증번호 발송에 실패했습니다.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || '인증번호 발송에 실패했습니다.';
      toast.error(msg);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleAuthClick = async () => {
    if (authButtonText === '재전송') {
        await handleSendCode();
        return;
    }

    // 백엔드 API로 인증번호 검증
    try {
      const data = await authAPI.verifyCode(id, authCode);
      if (data.success) {
        toast.success('인증되었습니다.');
        setAuthError(false);
        setAuthVerified(true);
        setAuthButtonText('인증완료');
      } else {
        setAuthError(true);
        setAuthButtonText('재전송');
      }
    } catch {
      setAuthError(true);
      setAuthButtonText('재전송');
    }
  };

  const handleForgotSendCode = async () => {
    if (!validateEmail() || !id) {
      setEmailError('이메일을 입력해주세요.');
      return;
    }
    setIsSendingCode(true);
    try {
      const data = await authAPI.forgotPassword(id);
      if (data.success) {
        setResetCodeSent(true);
        setResetCode('');
        setResetCodeVerified(false);
        toast.success('가입된 이메일이면 인증번호가 발송됩니다.');
        if (data.code) console.log(`[DEV] 재설정 인증번호: ${data.code}`);
      } else {
        toast.error(data.error || '요청에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '요청에 실패했습니다.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleForgotVerifyCode = async () => {
    if (!resetCode || resetCode.length !== 6) {
      toast.error('6자리 인증번호를 입력해주세요.');
      return;
    }
    // 실제 인증번호 검증은 reset-password API 호출 시 백엔드에서 수행
    // 프론트에서는 입력 형식만 확인하고 다음 단계로 진행
    setResetCodeVerified(true);
    toast.success('새 비밀번호를 입력해주세요.');
  };

  const handleResetPassword = async () => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,16}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('비밀번호는 8~16자, 영문+숫자+특수문자 조합이어야 합니다.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await authAPI.resetPassword(id, resetCode, newPassword);
      if (data.success) {
        toast.success('비밀번호가 변경되었습니다. 로그인해주세요.');
        setMode('login');
        setPassword('');
      } else {
        toast.error(data.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    if (isSubmitting) return;

    if (mode === 'signup') {
      if (!authVerified) {
        toast.error('이메일 인증을 완료해주세요.');
        return;
      }
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
    setEmailError('');
    setResetCodeSent(false);
    setResetCode('');
    setResetCodeVerified(false);
    setNewPassword('');
    setNewPasswordConfirm('');
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
          {(mode === 'signup' || mode === 'forgot' || canClose) && (
            <button
              onClick={mode === 'signup' || mode === 'forgot' ? () => { setMode('login'); setEmailError(''); setResetCodeSent(false); setResetCode(''); setResetCodeVerified(false); setNewPassword(''); setNewPasswordConfirm(''); } : onClose}
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
            {mode === 'forgot' ? (
              /* ===== Forgot Password Mode ===== */
              <div className="w-full max-w-sm flex flex-col gap-5">
                <h2 className="text-xl font-bold text-gray-900 text-center">비밀번호 찾기</h2>
                <p className="text-sm text-gray-500 text-center -mt-2">가입한 이메일로 인증번호를 받아 비밀번호를 재설정합니다.</p>

                {/* Email + Send Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">이메일</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={id}
                      onChange={handleIdChange}
                      onBlur={validateEmail}
                      readOnly={resetCodeSent}
                      placeholder="가입한 이메일 주소"
                      className={`flex-1 px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        emailError ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleForgotSendCode}
                      disabled={isSendingCode || resetCodeVerified}
                      className={`px-4 py-3.5 font-bold rounded-2xl whitespace-nowrap transition-colors ${
                        resetCodeVerified ? 'bg-gray-300 text-white cursor-default' : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {isSendingCode ? '전송중...' : resetCodeSent ? '재전송' : '전송'}
                    </button>
                  </div>
                  {emailError && <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>}
                </div>

                {/* Verification Code */}
                {resetCodeSent && !resetCodeVerified && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900">인증번호</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="6자리 인증번호"
                        maxLength={6}
                        className="flex-1 px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleForgotVerifyCode}
                        className="px-4 py-3.5 font-bold rounded-2xl whitespace-nowrap bg-[#3D61F1] text-white hover:bg-blue-600 transition-colors"
                      >
                        인증하기
                      </button>
                    </div>
                  </div>
                )}

                {/* New Password */}
                {resetCodeVerified && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900">새 비밀번호</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="8~16자리 영문+숫자+특수문자 조합"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900">새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="비밀번호를 다시 입력해주세요"
                        className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          newPasswordConfirm && newPassword !== newPasswordConfirm ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                        }`}
                      />
                      {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                        <p className="text-red-500 text-xs mt-1 ml-1">비밀번호가 일치하지 않습니다.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isSubmitting}
                      className="w-full bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      {isSubmitting ? '처리 중...' : '비밀번호 변경'}
                    </button>
                  </>
                )}
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">

              {/* Login Mode Fields */}
              <div className="space-y-4">
                {/* ID Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    아이디
                  </label>
                  <div className={mode === 'signup' ? 'flex gap-2' : ''}>
                    <input
                      type="text"
                      value={id}
                      onChange={handleIdChange}
                      onBlur={validateEmail}
                      readOnly={mode === 'signup' && codeSent}
                      placeholder="이메일 주소형식으로 입력해주세요"
                      className={`${mode === 'signup' ? 'flex-1' : 'w-full'} px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        emailError
                          ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                          : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                      }`}
                    />
                    {mode === 'signup' && (
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={isSendingCode || authVerified}
                        className={`px-4 py-3.5 font-bold rounded-2xl whitespace-nowrap transition-colors ${
                          authVerified
                            ? 'bg-gray-300 text-white cursor-default'
                            : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      >
                        {isSendingCode ? '전송중...' : codeSent ? '재전송' : '전송'}
                      </button>
                    )}
                  </div>
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>
                  )}
                </div>

                {mode === 'signup' && codeSent && (
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900">
                            인증번호
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                  type="text"
                                  value={authCode}
                                  onChange={handleAuthCodeChange}
                                  placeholder="이메일로 전송된 6자리 숫자"
                                  readOnly={authVerified}
                                  maxLength={6}
                                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                      authVerified
                                      ? 'border-green-500 bg-green-50 focus:ring-green-200 focus:border-green-500'
                                      : authError
                                      ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                                      : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
                                  }`}
                              />
                              {authVerified && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check size={12} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <button
                                type="button"
                                onClick={handleAuthClick}
                                disabled={authVerified}
                                className={`px-4 py-3.5 font-bold rounded-2xl whitespace-nowrap transition-colors ${
                                    authVerified
                                    ? 'bg-green-500 text-white cursor-default'
                                    : 'bg-[#3D61F1] text-white hover:bg-blue-600'
                                }`}
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

                {/* Kakao Login Button */}
                {mode === 'login' && (
                  <>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">또는</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/api/auth/kakao'; }}
                      className="w-full font-bold text-lg py-4 rounded-2xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#FEE500', color: '#000000' }}
                    >
                      <svg width="22" height="22" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                        <path d="M128 36C70.562 36 24 72.013 24 116.8C24 145.95 43.222 171.742 72.063 186.298L61.89 224.086C61.24 226.508 64.013 228.462 66.125 227.074L111.077 197.274C116.593 197.84 122.248 198.128 128 198.128C185.438 198.128 232 162.115 232 117.328C232 72.541 185.438 36 128 36Z" fill="#000000"/>
                      </svg>
                      카카오 로그인
                    </button>
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/api/auth/google'; }}
                      className="w-full font-bold text-lg py-4 rounded-2xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700"
                    >
                      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.003 24.003 0 0 0 0 21.56l7.98-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      구글 로그인
                    </button>
                  </>
                )}

                {/* Forgot Password Link */}
                {mode === 'login' && (
                  <div className="flex justify-center mt-1">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setEmailError(''); }}
                      className="text-gray-400 hover:text-gray-600 text-sm font-medium underline underline-offset-4"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
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
            )}

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
