import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Инициализируем Telegram WebApp если доступен
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        initData: string
        initDataUnsafe: { user?: { id: number; first_name: string; username?: string } }
        themeParams: Record<string, string>
        colorScheme: 'light' | 'dark'
      }
    }
  }
}

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
