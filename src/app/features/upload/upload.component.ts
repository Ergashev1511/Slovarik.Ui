import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/services/telegram.service';
import { UserService } from '../../core/services/user.service';
import { WordService } from '../../core/services/word.service';
import { StorageService } from '../../core/services/storage.service';
import { UploadResultDto, WordPairDto } from '../../core/dtos/word.dto';
import { CategoryDto } from '../../core/dtos/category.dto';

const USER_ID_KEY = 'slovarik_user_id';

@Component({
  selector: 'app-upload',
  standalone: true,
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly userService = inject(UserService);
  private readonly wordService = inject(WordService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  readonly userId = signal<string | null>(null);
  readonly loadingUser = signal(true);
  readonly errorUser = signal<string | null>(null);

  readonly selectedFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly result = signal<UploadResultDto | null>(null);

  readonly categories = signal<CategoryDto[]>([]);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly categoriesLoading = signal(false);

  ngOnInit(): void {
    const urlUserId = this.readUserIdFromUrl();
    if (urlUserId) {
      this.userId.set(urlUserId);
      this.storage.setString(USER_ID_KEY, urlUserId);
      this.loadingUser.set(false);
      this.loadCategories(urlUserId);
      return;
    }

    const cached = this.storage.getString(USER_ID_KEY);
    if (cached) {
      this.userId.set(cached);
      this.loadingUser.set(false);
      this.loadCategories(cached);
      return;
    }

    const telegramUser = this.telegram.user();
    if (!telegramUser) {
      this.loadingUser.set(false);
      this.errorUser.set('Foydalanuvchi aniqlanmadi.');
      return;
    }

    this.userService.getByTelegramId(telegramUser.id).subscribe({
      next: (u) => {
        this.userId.set(u.id);
        this.storage.setString(USER_ID_KEY, u.id);
        this.loadingUser.set(false);
        this.loadCategories(u.id);
      },
      error: () => {
        this.loadingUser.set(false);
        this.errorUser.set('Foydalanuvchi ma\'lumotlari yuklanmadi.');
      }
    });
  }

  private readUserIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('userId');
  }

  private loadCategories(userId: string): void {
    this.categoriesLoading.set(true);
    this.wordService.getCategoriesByUserId(userId).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
      }
    });
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.result.set(null);
    this.uploadError.set(null);
  }

  upload(): void {
    const id = this.userId();
    const file = this.selectedFile();
    if (!id || !file) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.result.set(null);

    this.wordService.upload(id, file, this.selectedCategoryId()).subscribe({
      next: (res) => {
        this.result.set(res);
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Yuklashda xatolik yuz berdi. Qayta urinib ko\'ring.');
      }
    });
  }

  finish(): void {
    this.router.navigate(['/words']);
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.result.set(null);
    this.uploadError.set(null);
  }
}
