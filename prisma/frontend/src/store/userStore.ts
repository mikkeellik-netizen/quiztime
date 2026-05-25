import { create } from 'zustand';
import { AuthUser } from '../services/api/authApi';

interface UserState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser(user: AuthUser, token: string): void;
  clear(): void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user, token) => {
    localStorage.setItem('accessToken', token);
    set({ user, isAuthenticated: true });
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false });
  },
}));
