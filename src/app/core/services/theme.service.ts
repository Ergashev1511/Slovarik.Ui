import { Injectable, PLATFORM_ID, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TelegramService } from './telegram.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly telegram = inject(TelegramService);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    effect(() => {
      const params = this.telegram.themeParams();
      const root = document.documentElement;

      root.style.setProperty('--tg-bg-color', params.bg_color ?? '#000000');
      root.style.setProperty('--tg-text-color', params.text_color ?? '#ffffff');
      root.style.setProperty('--tg-button-color', params.button_color ?? '#3b82f6');
      root.style.setProperty('--tg-button-text-color', params.button_text_color ?? '#ffffff');
      root.style.setProperty('--tg-secondary-bg-color', params.secondary_bg_color ?? '#1c1c1e');
      root.style.setProperty('--tg-hint-color', params.hint_color ?? '#8e8e93');
    });
  }
}
