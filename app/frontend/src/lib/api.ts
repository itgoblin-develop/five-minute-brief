import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// 401 응답 시 토큰 자동 갱신 인터셉터
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach(cb => cb(success));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // 401이고, refresh 요청 자체가 아니고, 아직 재시도하지 않은 경우
    // 비로그인 상태(/api/user/me 등)에서는 불필요한 refresh 호출 방지
    const isUserMeRequest = originalRequest.url?.includes('/api/user/me');
    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/refresh') && !originalRequest._retry && !isUserMeRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((success) => {
            if (success) {
              originalRequest._retry = true;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }
      isRefreshing = true;
      originalRequest._retry = true;
      try {
        await api.post('/api/auth/refresh');
        isRefreshing = false;
        onRefreshed(true);
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        onRefreshed(false);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (email: string, nickname: string, password: string) => {
    const res = await api.post('/api/auth/signup', { email, nickname, password });
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/api/auth/logout');
    return res.data;
  },
  sendCode: async (email: string) => {
    const res = await api.post('/api/auth/send-code', { email });
    return res.data;
  },
  verifyCode: async (email: string, code: string) => {
    const res = await api.post('/api/auth/verify-code', { email, code });
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post('/api/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (email: string, code: string, newPassword: string) => {
    const res = await api.post('/api/auth/reset-password', { email, code, newPassword });
    return res.data;
  },
  refreshToken: async () => {
    const res = await api.post('/api/auth/refresh');
    return res.data;
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const res = await api.get('/api/user/profile');
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/api/user/me');
    return res.data;
  },
  updateProfile: async (data: Record<string, string>) => {
    const res = await api.put('/api/user/profile', data);
    return res.data;
  },
  deleteAccount: async () => {
    const res = await api.delete('/api/user/account');
    return res.data;
  },
};

// News API
export const newsAPI = {
  getList: async (params?: { category?: string; page?: number; limit?: number }) => {
    const res = await api.get('/api/news', { params });
    return res.data;
  },
  getDetail: async (id: string | number) => {
    const res = await api.get(`/api/news/${id}`);
    return res.data;
  },
  getCategories: async () => {
    const res = await api.get('/api/news/categories');
    return res.data;
  },
};

// Interaction API (likes, bookmarks, comments)
export const interactionAPI = {
  toggleLike: async (newsId: string | number) => {
    const res = await api.post(`/api/news/${newsId}/like`);
    return res.data;
  },
  toggleBookmark: async (newsId: string | number) => {
    const res = await api.post(`/api/news/${newsId}/bookmark`);
    return res.data;
  },
  getLikes: async () => {
    const res = await api.get('/api/user/likes');
    return res.data;
  },
  getBookmarks: async () => {
    const res = await api.get('/api/user/bookmarks');
    return res.data;
  },
  getMyComments: async () => {
    const res = await api.get('/api/user/comments');
    return res.data;
  },
  getComments: async (newsId: string | number) => {
    const res = await api.get(`/api/news/${newsId}/comments`);
    return res.data;
  },
  addComment: async (newsId: string | number, content: string) => {
    const res = await api.post(`/api/news/${newsId}/comments`, { content });
    return res.data;
  },
  updateComment: async (commentId: string | number, content: string) => {
    const res = await api.put(`/api/comments/${commentId}`, { content });
    return res.data;
  },
  deleteComment: async (commentId: string | number) => {
    const res = await api.delete(`/api/comments/${commentId}`);
    return res.data;
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    const res = await api.get('/api/user/settings');
    return res.data;
  },
  update: async (data: {
    push_enabled?: boolean;
    notification_time?: string;
    notification_days?: string[];
  }) => {
    const res = await api.put('/api/user/settings', data);
    return res.data;
  },
};

// Stats API (관리자 통계)
export const statsAPI = {
  getOverview: async () => {
    const res = await api.get('/api/stats/overview');
    return res.data;
  },
  getPopularNews: async (params?: { period?: string; limit?: number }) => {
    const res = await api.get('/api/stats/popular-news', { params });
    return res.data;
  },
  getDailyActive: async (params?: { days?: number }) => {
    const res = await api.get('/api/stats/daily-active', { params });
    return res.data;
  },
  getCategoryStats: async () => {
    const res = await api.get('/api/stats/category-stats');
    return res.data;
  },
};

export default api;
