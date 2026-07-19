import { Injectable, inject } from '@angular/core';
import { HttpService } from './http.service';
import { UserDto } from '../dtos/user.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpService);

  getByTelegramId(telegramId: number): Observable<UserDto> {
    return this.http.get<UserDto>(`users/by-telegram/${telegramId}`);
  }

  getById(userId: string): Observable<UserDto> {
    return this.http.get<UserDto>(`users/${userId}`);
  }
}
