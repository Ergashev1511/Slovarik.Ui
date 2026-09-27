import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/services/telegram.service';
import { UserService } from '../../core/services/user.service';
import { WordService } from '../../core/services/word.service';
import { StorageService } from '../../core/services/storage.service';
import { BatchInsertResultDto, BatchWordDto } from '../../core/dtos/word.dto';
import { CategoryDto } from '../../core/dtos/category.dto';

const USER_ID_KEY = 'slovarik_user_id';

const PLACEHOLDER_JSON = `{
  "words": [
    { "wordUz": "kitob", "wordRu": "книга" },
    { "wordUz": "uy", "wordRu": "дом" }
  ]
}`;

export interface JsonValidationResult {
  valid: boolean;
  error: string | null;
  words: BatchWordDto[];
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [FormsModule],
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

  readonly jsonText = signal<string>('');
  readonly jsonValidation = signal<JsonValidationResult>({ valid: false, error: null, words: [] });
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly result = signal<BatchInsertResultDto | null>(null);

  readonly categories = signal<CategoryDto[]>([]);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly categoriesLoading = signal(false);
  readonly categoryDropdownOpen = signal(false);

  readonly placeholder = PLACEHOLDER_JSON;

  readonly selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return 'Kategoriyasiz';
    return this.categories().find(c => c.id === id)?.name ?? 'Kategoriyasiz';
  });

  readonly canSubmit = computed(() =>
    !!this.userId() && this.jsonValidation().valid && !this.submitting()
  );

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
    this.categoryDropdownOpen.set(false);
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update(v => !v);
  }

  onJsonChange(value: string): void {
    this.jsonText.set(value);
    this.result.set(null);
    this.submitError.set(null);
    this.jsonValidation.set(this.validateJson(value));
  }

  private validateJson(text: string): JsonValidationResult {
    const trimmed = text.trim();
    if (!trimmed) {
      return { valid: false, error: null, words: [] };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { valid: false, error: 'JSON sintaksisi noto\'g\'ri.', words: [] };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: 'Root element object bo\'lishi kerak: { "words": [...] }', words: [] };
    }

    const obj = parsed as Record<string, unknown>;
    if (!('words' in obj)) {
      return { valid: false, error: '"words" maydoni topilmadi.', words: [] };
    }

    if (!Array.isArray(obj['words'])) {
      return { valid: false, error: '"words" array bo\'lishi kerak.', words: [] };
    }

    const arr = obj['words'] as unknown[];
    if (arr.length === 0) {
      return { valid: false, error: '"words" array bo\'sh bo\'lmasligi kerak.', words: [] };
    }

    const words: BatchWordDto[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return { valid: false, error: `words[${i}]: object bo\'lishi kerak.`, words: [] };
      }
      const w = item as Record<string, unknown>;
      if (typeof w['wordUz'] !== 'string' || !(w['wordUz'] as string).trim()) {
        return { valid: false, error: `words[${i}]: "wordUz" string maydoni talab qilinadi.`, words: [] };
      }
      if (typeof w['wordRu'] !== 'string' || !(w['wordRu'] as string).trim()) {
        return { valid: false, error: `words[${i}]: "wordRu" string maydoni talab qilinadi.`, words: [] };
      }
      if ((w['wordUz'] as string).length > 500) {
        return { valid: false, error: `words[${i}]: "wordUz" 500 ta belgidan oshmasligi kerak.`, words: [] };
      }
      if ((w['wordRu'] as string).length > 500) {
        return { valid: false, error: `words[${i}]: "wordRu" 500 ta belgidan oshmasligi kerak.`, words: [] };
      }
      words.push({ wordUz: (w['wordUz'] as string).trim(), wordRu: (w['wordRu'] as string).trim() });
    }

    return { valid: true, error: null, words };
  }

  submit(): void {
    const id = this.userId();
    const validation = this.jsonValidation();
    if (!id || !validation.valid) return;

    this.submitting.set(true);
    this.submitError.set(null);
    this.result.set(null);

    this.wordService.batchInsert({
      userId: id,
      categoryId: this.selectedCategoryId(),
      words: validation.words
    }).subscribe({
      next: (res) => {
        this.result.set(res);
        this.submitting.set(false);
        if (res.success) {
          this.jsonText.set('');
          this.jsonValidation.set({ valid: false, error: null, words: [] });
        }
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('So\'zlarni saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.');
      }
    });
  }

  finish(): void {
    this.router.navigate(['/words']);
  }

  clearEditor(): void {
    this.jsonText.set('');
    this.jsonValidation.set({ valid: false, error: null, words: [] });
    this.result.set(null);
    this.submitError.set(null);
  }

  // ── Legacy: AI-based file upload — kept for future reactivation ───────────────────────────
  // readonly selectedFile = signal<File | null>(null);
  // readonly uploading = signal(false);
  // readonly uploadError = signal<string | null>(null);
  //
  // onFileSelected(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   const file = input.files?.[0] ?? null;
  //   this.selectedFile.set(file);
  //   this.result.set(null);
  //   this.uploadError.set(null);
  // }
  //
  // upload(): void {
  //   const id = this.userId();
  //   const file = this.selectedFile();
  //   if (!id || !file) return;
  //   this.uploading.set(true);
  //   this.uploadError.set(null);
  //   this.result.set(null);
  //   this.wordService.upload(id, file, this.selectedCategoryId()).subscribe({
  //     next: (res) => { this.result.set(res); this.uploading.set(false); },
  //     error: () => { this.uploading.set(false); this.uploadError.set('Yuklashda xatolik yuz berdi.'); }
  //   });
  // }
  //
  // removeFile(): void {
  //   this.selectedFile.set(null);
  //   this.result.set(null);
  //   this.uploadError.set(null);
  // }
  // ─────────────────────────────────────────────────────────────────────────────────────────
}
