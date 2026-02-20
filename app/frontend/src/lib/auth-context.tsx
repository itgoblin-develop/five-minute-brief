import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { userAPI, authAPI } from './api';

interface User {
  userId: number;
  email: string;
  nickname: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, nickname: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await userAPI.getMe();
      if (data.success) {
        setUser(data.user);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      if (data.success) {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
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
