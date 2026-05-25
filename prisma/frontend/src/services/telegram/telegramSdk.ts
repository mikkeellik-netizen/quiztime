interface TelegramWebApp {
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready(): void;
  expand(): void;
  close(): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

const tg: TelegramWebApp | null =
  typeof window !== 'undefined' ? (window.Telegram?.WebApp ?? null) : null;

export function getInitData(): string {
  return tg?.initData ?? '';
}

export function isTelegram(): boolean {
  return Boolean(tg?.initData);
}

export function tgReady(): void {
  if (tg) {
    tg.ready();
    tg.expand();
  }
}
