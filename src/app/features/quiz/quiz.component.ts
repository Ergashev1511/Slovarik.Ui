import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/services/telegram.service';
import { UserService } from '../../core/services/user.service';
import { QuizService } from '../../core/services/quiz.service';
import { WordService } from '../../core/services/word.service';
import { StorageService } from '../../core/services/storage.service';
import { CategoryDto } from '../../core/dtos/category.dto';
import {
  QuizDirection,
  QuizOrder,
  QuizQuestionDto,
  QuizResult,
  QuizSessionState,
  QuizStartRequestDto
} from '../../core/dtos/quiz.dto';

const USER_ID_KEY = 'slovarik_user_id';
const QUIZ_SESSION_KEY = 'slovarik_quiz_session';
const QUIZ_RESULT_KEY = 'slovarik_quiz_result';
const SHARED_SALT = 'slovarik-shared-salt-change-me-in-production';

type QuizView = 'settings' | 'question' | 'result';

@Component({
  selector: 'app-quiz',
  standalone: true,
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly userService = inject(UserService);
  private readonly quizService = inject(QuizService);
  private readonly wordService = inject(WordService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  readonly userId = signal<string | null>(null);
  readonly loadingUser = signal(true);
  readonly errorUser = signal<string | null>(null);

  readonly view = signal<QuizView>('settings');
  readonly quizOrder = QuizOrder;
  readonly quizDirection = QuizDirection;

  readonly questionCountOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: 'Hammasi', value: 9999 }
  ];
  readonly selectedCount = signal<number>(10);

  readonly orderOptions = [
    { label: 'Oxiridan', description: 'Yangi o\'rganilgan so\'zlardan boshlash', value: QuizOrder.Recent },
    { label: 'Tasodifiy', description: 'So\'zlar aralash holda chiqadi', value: QuizOrder.Random }
  ];
  readonly selectedOrder = signal<QuizOrder>(QuizOrder.Recent);

  readonly directionOptions = [
    { label: 'Uz → Ru', description: 'O\'zbekcha so\'z beriladi, ruscha tarjimasini toping', value: QuizDirection.UzToRu },
    { label: 'Ru → Uz', description: 'Ruscha so\'z beriladi, o\'zbekcha tarjimasini toping', value: QuizDirection.RuToUz }
  ];
  readonly selectedDirection = signal<QuizDirection>(QuizDirection.UzToRu);

  readonly categories = signal<CategoryDto[]>([]);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly categoriesLoading = signal(false);
  readonly categoryDropdownOpen = signal(false);

  readonly selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return 'Hammasi';
    return this.categories().find(c => c.id === id)?.name ?? 'Hammasi';
  });

  readonly session = signal<QuizSessionState | null>(null);
  readonly currentQuestion = signal<QuizQuestionDto | null>(null);
  readonly selectedOption = signal<number | null>(null);
  readonly correctOptionId = signal<number | null>(null);
  readonly isAnswerCorrect = signal<boolean | null>(null);
  readonly showFeedback = signal(false);

  readonly result = signal<QuizResult | null>(null);

  readonly progressPercent = computed(() => {
    const res = this.result();
    if (!res || res.total === 0) return 0;
    return (res.score / res.total) * 100;
  });

  readonly resultMessage = computed(() => {
    const res = this.result();
    if (!res) return '';
    const percent = res.total === 0 ? 0 : (res.score / res.total) * 100;
    if (percent >= 80) return 'Ajoyib natija!';
    if (percent >= 50) return 'Yaxshi natija!';
    return 'Yana bir bor urinib ko\'ring';
  });

  readonly questionProgress = computed(() => {
    const session = this.session();
    if (!session || session.questions.length === 0) return 0;
    return ((session.currentQuestionIndex + 1) / session.questions.length) * 100;
  });

  readonly questionPrompt = computed(() => {
    const q = this.currentQuestion();
    if (!q) return '';
    const match = q.question.match(/^"(.+?)"/);
    return match ? match[1] : q.question;
  });

  readonly questionHint = computed(() => {
    const q = this.currentQuestion();
    if (!q) return '';
    const match = q.question.match(/so'zining (.+)$/);
    return match ? match[1] : '';
  });

  readonly isLastQuestion = computed(() => {
    const session = this.session();
    if (!session) return false;
    return session.currentQuestionIndex >= session.questions.length - 1;
  });

  ngOnInit(): void {
    this.loadUserId();
  }

  private loadUserId(): void {
    const urlUserId = this.readUserIdFromUrl();
    if (urlUserId) {
      this.userId.set(urlUserId);
      this.storage.setString(USER_ID_KEY, urlUserId);
      this.loadingUser.set(false);
      this.loadCategories(urlUserId);
      this.tryResume();
      return;
    }

    const cached = this.storage.getString(USER_ID_KEY);
    if (cached) {
      this.userId.set(cached);
      this.loadingUser.set(false);
      this.loadCategories(cached);
      this.tryResume();
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
        this.tryResume();
      },
      error: () => {
        this.loadingUser.set(false);
        this.errorUser.set('Foydalanuvchi ma\'lumotlari yuklanmadi.');
      }
    });
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

  private readUserIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('userId');
  }

  private tryResume(): void {
    const resultRaw = this.storage.getString(QUIZ_RESULT_KEY);
    if (resultRaw) {
      try {
        this.result.set(JSON.parse(resultRaw));
        this.view.set('result');
        return;
      } catch {
        this.storage.remove(QUIZ_RESULT_KEY);
      }
    }

    const sessionRaw = this.storage.getString(QUIZ_SESSION_KEY);
    if (!sessionRaw) return;

    try {
      const parsed = JSON.parse(sessionRaw) as QuizSessionState;
      if (!parsed.questions || parsed.questions.length === 0) {
        this.storage.remove(QUIZ_SESSION_KEY);
        return;
      }
      this.session.set(parsed);
      this.currentQuestion.set(parsed.questions[parsed.currentQuestionIndex]);
      this.view.set('question');
    } catch {
      this.storage.remove(QUIZ_SESSION_KEY);
    }
  }

  selectCount(count: number): void {
    this.selectedCount.set(count);
  }

  selectOrder(order: QuizOrder): void {
    this.selectedOrder.set(order);
  }

  selectDirection(direction: QuizDirection): void {
    this.selectedDirection.set(direction);
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    this.categoryDropdownOpen.set(false);
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update(v => !v);
  }

  startQuiz(): void {
    const id = this.userId();
    if (!id) return;

    const request: QuizStartRequestDto = {
      userId: id,
      questionCount: this.selectedCount(),
      direction: this.selectedDirection(),
      selectFromEnd: this.selectedOrder() === QuizOrder.Recent,
      categoryId: this.selectedCategoryId()
    };

    this.quizService.startQuiz(request).subscribe({
      next: (response) => {
        const state: QuizSessionState = {
          quizId: response.quizId,
          userId: response.userId,
          direction: response.direction,
          questions: response.questions,
          currentQuestionIndex: 0,
          score: 0,
          answers: []
        };
        this.session.set(state);
        this.saveSession();
        this.currentQuestion.set(state.questions[0]);
        this.selectedOption.set(null);
        this.correctOptionId.set(null);
        this.isAnswerCorrect.set(null);
        this.showFeedback.set(false);
        this.view.set('question');
      },
      error: () => {
        this.errorUser.set('Testni boshlab bo\'lmadi. Yetarli so\'zlar mavjud emas.');
      }
    });
  }

  async answer(optionId: number): Promise<void> {
    const q = this.currentQuestion();
    const session = this.session();
    if (!q || !session || this.selectedOption() !== null) return;

    this.selectedOption.set(optionId);
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;

    const correct = await checkAnswerHash(option.text, q.correctAnswerHash);
    this.isAnswerCorrect.set(correct);

    const correctId = await this.findCorrectOptionId(q);
    this.correctOptionId.set(correctId);

    const updatedSession: QuizSessionState = {
      ...session,
      score: correct ? session.score + 1 : session.score,
      answers: [
        ...session.answers,
        { questionId: q.questionId, selectedOptionId: optionId, correct }
      ]
    };
    this.session.set(updatedSession);
    this.saveSession();
    this.showFeedback.set(true);
  }

  private async findCorrectOptionId(q: QuizQuestionDto): Promise<number | null> {
    for (const option of q.options) {
      if (await checkAnswerHash(option.text, q.correctAnswerHash)) {
        return option.id;
      }
    }
    return null;
  }

  next(): void {
    const session = this.session();
    if (!session) return;

    if (this.isLastQuestion()) {
      const quizResult: QuizResult = { score: session.score, total: session.questions.length };
      this.result.set(quizResult);
      this.storage.remove(QUIZ_SESSION_KEY);
      this.storage.setString(QUIZ_RESULT_KEY, JSON.stringify(quizResult));
      this.view.set('result');
      return;
    }

    const nextIndex = session.currentQuestionIndex + 1;
    const updatedSession = { ...session, currentQuestionIndex: nextIndex };
    this.session.set(updatedSession);
    this.saveSession();
    this.currentQuestion.set(updatedSession.questions[nextIndex]);
    this.selectedOption.set(null);
    this.correctOptionId.set(null);
    this.isAnswerCorrect.set(null);
    this.showFeedback.set(false);
  }

  private saveSession(): void {
    const session = this.session();
    if (session) {
      this.storage.setString(QUIZ_SESSION_KEY, JSON.stringify(session));
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  goHome(): void {
    this.storage.remove(QUIZ_RESULT_KEY);
    this.router.navigate(['/home']);
  }

  restart(): void {
    this.storage.remove(QUIZ_SESSION_KEY);
    this.storage.remove(QUIZ_RESULT_KEY);
    this.view.set('settings');
    this.result.set(null);
    this.session.set(null);
    this.currentQuestion.set(null);
    this.selectedOption.set(null);
    this.correctOptionId.set(null);
    this.isAnswerCorrect.set(null);
    this.showFeedback.set(false);
  }
}

async function checkAnswerHash(answer: string, hash: string): Promise<boolean> {
  const computed = await sha256(SHARED_SALT + answer);
  return computed.toLowerCase() === hash.toLowerCase();
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
