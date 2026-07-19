import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramService } from '../../core/services/telegram.service';
import { UserService } from '../../core/services/user.service';
import { WordService } from '../../core/services/word.service';
import { StorageService } from '../../core/services/storage.service';
import { WordDto } from '../../core/dtos/word.dto';

const USER_ID_KEY = 'slovarik_user_id';

@Component({
  selector: 'app-words',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './words.component.html',
  styleUrl: './words.component.css'
})
export class WordsComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly userService = inject(UserService);
  private readonly wordService = inject(WordService);
  private readonly storage = inject(StorageService);

  readonly userId = signal<string | null>(null);
  readonly words = signal<WordDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');

  readonly filteredWords = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.words();
    return this.words().filter(
      (w) =>
        w.wordUz.toLowerCase().includes(term) ||
        w.wordRu.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    const urlUserId = this.readUserIdFromUrl();
    if (urlUserId) {
      this.userId.set(urlUserId);
      this.storage.setString(USER_ID_KEY, urlUserId);
      this.loadWords(urlUserId);
      return;
    }

    const cached = this.storage.getString(USER_ID_KEY);
    if (cached) {
      this.userId.set(cached);
      this.loadWords(cached);
      return;
    }

    const telegramUser = this.telegram.user();
    if (!telegramUser) {
      this.loading.set(false);
      this.error.set('Foydalanuvchi aniqlanmadi.');
      return;
    }

    this.userService.getByTelegramId(telegramUser.id).subscribe({
      next: (u) => {
        this.userId.set(u.id);
        this.storage.setString(USER_ID_KEY, u.id);
        this.loadWords(u.id);
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

  private loadWords(id: string): void {
    this.wordService.getByUserId(id).subscribe({
      next: (list) => {
        this.words.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('So\'zlar ro\'yxati yuklanmadi.');
      }
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
  }
}
