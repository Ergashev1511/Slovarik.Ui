import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { LoaderService } from './loader.service';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly client = inject(HttpClient);
  private readonly loader = inject(LoaderService);
  private readonly config = inject(AppConfigService);

  private get baseUrl(): string {
    return this.config.apiUrl;
  }

  get<T>(url: string, params: Record<string, string> = {}): Observable<T> {
    this.loader.show();
    return this.client.get<T>(`${this.baseUrl}/${url}`, {
      params: new HttpParams({ fromObject: params }),
      headers: this.makeHeaders()
    }).pipe(finalize(() => this.loader.hide()));
  }

  post<T>(url: string, body: unknown = {}): Observable<T> {
    this.loader.show();
    return this.client.post<T>(`${this.baseUrl}/${url}`, body, {
      headers: this.makeHeaders()
    }).pipe(finalize(() => this.loader.hide()));
  }

  postMultipart<T>(url: string, body: FormData): Observable<T> {
    this.loader.show();
    return this.client.post<T>(`${this.baseUrl}/${url}`, body, {
      headers: new HttpHeaders({ Accept: 'application/json' })
    }).pipe(finalize(() => this.loader.hide()));
  }

  private makeHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });
  }
}
