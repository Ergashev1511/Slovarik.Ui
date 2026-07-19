import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import {
  QuizStartRequestDto,
  QuizStartResponseDto
} from '../dtos/quiz.dto';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpService);

  startQuiz(request: QuizStartRequestDto): Observable<QuizStartResponseDto> {
    return this.http.post<QuizStartResponseDto>('quiz/start', request);
  }
}
