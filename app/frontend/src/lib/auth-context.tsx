import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { userAPI, authAPI } from './api';

interface User {
  userId: number;
  email: string;
  nickname: string;
  isAdmin: boolean;
}

interface PendingDeletion {
  deletedAt: string;
  scheduledAt: string;
  daysRemaining: number;
}

interface SocialSignupInfo {
  token: string;
  provider: string;
  suggestedNickname?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  pendingDeletion: PendingDeletion | null;
  socialSignupPending: SocialSignupInfo | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, nickname: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearPendingDeletion: () => void;
  completeSocialSignup: (nickname: string) => Promise<{ success: boolean; error?: string }>;
  cancelSocialSignup: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [socialSignupPending, setSocialSignupPending] = useState<SocialSignupInfo | null>(null);

  const refreshUser = async () => {
    try {
      const data = await userAPI.getMe();
      if (data.success) {
        setUser(data.user);
        setPendingDeletion(data.pendingDeletion || null);
      }
    } catch {
      setUser(null);
      setPendingDeletion(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // 소셜 가입 완료 페이지 리다이렉트 처리 (신규 사용자)
    const socialSignup = params.get('social_signup');
    const tempToken = params.get('token');
    const provider = params.get('provider');

    if (socialSignup === 'pending' && tempToken && provider) {
      // 임시 토큰에서 suggestedNickname 추출 (JWT 디코딩)
      let suggestedNickname: string | undefined;
      try {
        const payload = JSON.parse(atob(tempToken.split('.')[1]));
        suggestedNickname = payload.suggestedNickname;
      } catch { /* ignore */ }

      setSocialSignupPending({ token: tempToken, provider, suggestedNickname });

      // URL 파라미터 정리
      const url = new URL(window.location.href);
      url.searchParams.delete('social_signup');
      url.searchParams.delete('token');
      url.searchParams.delete('provider');
      window.history.replaceState({}, '', url.pathname + (url.search || '/'));
      setIsLoading(false);
      return;
    }

    // 소셜 로그인 후 리다이렉트 처리 (기존 사용자 - 카카오, 구글, 네이버)
    const kakaoLogin = params.get('kakao_login');
    const googleLogin = params.get('google_login');
    const naverLogin = params.get('naver_login');

    if (kakaoLogin || googleLogin || naverLogin) {
      // URL에서 소셜 로그인 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('kakao_login');
      url.searchParams.delete('google_login');
      url.searchParams.delete('naver_login');
      url.searchParams.delete('message');
      url.searchParams.delete('pending_deletion');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      if (data.success) {
        if (data.pendingDeletion) {
          setPendingDeletion(data.pendingDeletion);
        }
        await refreshUser();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || '로그인 중 오류가 발생했습니다.',
      };
    }
  };

  const signup = async (email: string, nickname: string, password: string) => {
    try {
      const data = await authAPI.signup(email, nickname, password);
      if (data.success) {
        await refreshUser();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || '회원가입 중 오류가 발생했습니다.',
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    setUser(null);
    setPendingDeletion(null);
  };

  const clearPendingDeletion = () => {
    setPendingDeletion(null);
  };

  const completeSocialSignup = useCallback(async (nickname: string) => {
    if (!socialSignupPending) {
      return { success: false, error: '소셜 인증 정보가 없습니다.' };
    }
    try {
      const data = await authAPI.socialSignup(socialSignupPending.token, nickname);
      if (data.success) {
        setSocialSignupPending(null);
        await refreshUser();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || '회원가입 중 오류가 발생했습니다.',
      };
    }
  }, [socialSignupPending]);

  const cancelSocialSignup = useCallback(() => {
    setSocialSignupPending(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        pendingDeletion,
        socialSignupPending,
        login,
        signup,
        logout,
        refreshUser,
        clearPendingDeletion,
        completeSocialSignup,
        cancelSocialSignup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
