// src/app/game/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ScrambleAuthService {

  constructor(private http: HttpClient) {}

  getStoredToken(): string | null {
    return localStorage.getItem('lb_access_token');
  }

  getStoredCustomerId(): string | null {
    return localStorage.getItem('lb_customer_id');
  }

  isLoggedIn(): boolean {
    return !!this.getStoredToken();
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('lb_refresh_token');
    if (!refreshToken) return null;

    try {
      const res: any = await this.http.post(
        `${environment.apiBase}/auth/refresh`,
        { refreshToken }
      ).toPromise();

      const newToken = res?.token ?? res?.data?.token ?? res?.accessToken;
      if (newToken) {
        localStorage.setItem('lb_access_token', newToken);
        return newToken;
      }
      return null;
    } catch {
      this.clearStorage();
      return null;
    }
  }

  clearStorage(): void {
    localStorage.removeItem('lb_access_token');
    localStorage.removeItem('lb_refresh_token');
    localStorage.removeItem('lb_customer_id');
  }

  logout(): void {
    this.clearStorage();
  }
}
