import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import { UploadResultDto, WordDto } from '../dtos/word.dto';
import { CategoryDto } from '../dtos/category.dto';

@Injectable({ providedIn: 'root' })
export class WordService {
  private readonly http = inject(HttpService);

  getByUserId(userId: string): Observable<WordDto[]> {
    return this.http.get<WordDto[]>(`words/${userId}`);
  }

  upload(userId: string, file: File): Observable<UploadResultDto> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('file', file);
    return this.http.postMultipart<UploadResultDto>('words/upload', formData);
  }

  getCategoriesByUserId(userId: string): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`categories/by-user/${userId}`);
  }
}
