import apiClient from './apiClient';

export interface AuthUser {
  id: string;
  displayName: string;
  username?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  async loginTelegram(initData: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/api/auth/telegram', { initData });
    return res.data;
  },
};
