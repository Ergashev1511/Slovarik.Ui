import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  hint_color?: string;
  link_color?: string;
}

interface TelegramWebAppInstance {
  ready(): void;
  expand(): void;
  close(): void;
  initData: string;
  initDataUnsafe: { user?: TelegramUser; start_param?: string };
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebAppInstance };
  }
}

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = signal<TelegramUser | null>(null);
  readonly colorScheme = signal<'light' | 'dark'>('light');
  readonly themeParams = signal<TelegramThemeParams>({});

  get webApp(): TelegramWebAppInstance | null {
    if (isPlatformBrowser(this.platformId)) {
      return window.Telegram?.WebApp ?? null;
    }
    return null;
  }

  init(): void {
    const webApp = this.webApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    this.user.set(webApp.initDataUnsafe.user ?? null);
    this.colorScheme.set(webApp.colorScheme ?? 'light');
    this.themeParams.set(webApp.themeParams ?? {});
  }

  get startParam(): string | null {
    return this.webApp?.initDataUnsafe.start_param ?? null;
  }

  get isTelegram(): boolean {
    return this.webApp !== null;
  }
}
