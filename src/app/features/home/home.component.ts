import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TelegramService } from '../../core/services/telegram.service';
import { UserService } from '../../core/services/user.service';
import { StorageService } from '../../core/services/storage.service';
import { UserDto } from '../../core/dtos/user.dto';

const DAILY_GOAL = 50;

const USER_ID_KEY = 'slovarik_user_id';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly userService = inject(UserService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  readonly user = signal<UserDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly telegramUser = this.telegram.user;

  readonly progress = computed(() => {
    const count = this.user()?.wordCount ?? 0;
    return Math.min(100, Math.round((count / DAILY_GOAL) * 100));
  });

  readonly remainingProgress = computed(() => Math.max(0, 100 - this.progress()));

  readonly greetingName = computed(() => {
    const u = this.user();
    return u?.fullName || u?.userName || 'do\'stim';
  });

  readonly avatarInitial = computed(() => {
    const name = this.greetingName();
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  ngOnInit(): void {
    const urlUserId = 'd3c20784-92c8-4b45-bfc6-6461a041f61f' // this.readUserIdFromUrl();
    if (urlUserId) {
      this.loadUserById(urlUserId);
      return;
    }

    const telegramUser = this.telegram.user();
    if (!telegramUser) {
      this.loading.set(false);
      this.error.set('Ilovani Telegram ichida oching.');
      return;
    }

    this.userService.getByTelegramId(telegramUser.id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.storage.setString(USER_ID_KEY, u.id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Foydalanuvchi ma\'lumotlari yuklanmadi.');
      }
    });
  }

  private readUserIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('userId');
  }

  private loadUserById(id: string): void {
    this.userService.getById(id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.storage.setString(USER_ID_KEY, u.id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Foydalanuvchi ma\'lumotlari yuklanmadi.');
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
