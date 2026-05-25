import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/dashboard/DashboardPage';
import ImportPage from './pages/dashboard/ImportPage';
import { authApi } from './services/api/authApi';
import { getInitData, tgReady } from './services/telegram/telegramSdk';
import { useUserStore } from './store/userStore';

function Splash() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">⚡</div>
        <p className="text-sm text-gray-400 animate-pulse">Загрузка…</p>
      </div>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">❌</div>
        <p className="font-semibold text-gray-800 mb-2">Ошибка авторизации</p>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    tgReady();

    // В dev-режиме — если нет Telegram, используем 'dev' для bypass
    const initData = getInitData() || (import.meta.env.DEV ? 'dev' : '');

    authApi
      .loginTelegram(initData)
      .then(({ accessToken, user }) => {
        setUser(user, accessToken);
        setStatus('ok');
      })
      .catch((e: any) => {
        const msg =
          e?.response?.data?.message ?? e?.message ?? 'Не удалось авторизоваться';
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [setUser]);

  if (status === 'loading') return <Splash />;
  if (status === 'error') return <AuthError message={errorMsg} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/import" element={<ImportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
