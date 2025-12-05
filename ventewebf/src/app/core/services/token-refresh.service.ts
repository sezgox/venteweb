import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, first, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {

  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor() {}

  waitForRefresh() {
    return this.refreshSubject.pipe(
      filter(token => token !== null),
      first()
    );
  }

  setToken(token: string) {
    this.refreshSubject.next(token);
  }

  refreshToken() {
      if (this.isRefreshing) {
        return this.waitForRefresh();
      }

      this.isRefreshing = true;

      const newToken = localStorage.getItem('access_token')!;
      this.refreshSubject.next(newToken);

      this.isRefreshing = false;

      return of(newToken);  // 🔥 observable, no Promise
    }
}
