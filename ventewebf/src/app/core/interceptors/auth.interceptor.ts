import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError
} from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const refreshService = inject(TokenRefreshService);

  const addToken = (request: any, token: string | null) => {
    if (!token) return request;
    return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  };

  let token = localStorage.getItem('access_token');
  let authReq = addToken(req, token);

  return next(authReq).pipe(
    // No tocar token en respuestas normales
    catchError((error: HttpErrorResponse) => {
      // Si no es 401, propagar
      if (error.status !== 401) return throwError(() => error);

      // Si ya hay refresh en curso, esperar
      if (isRefreshing) {
        return refreshSubject.pipe(
          filter(t => !!t),
          take(1),
          switchMap(t => next(addToken(req, t)))
        );
      }

      // Token recibido en 401 (rotación de backend)
      const newTokenFrom401 = error.headers.get('x-access-token');
      if (newTokenFrom401) {
        console.log('Token recibido en 401:', newTokenFrom401);
        localStorage.setItem('access_token', newTokenFrom401);
        refreshSubject.next(newTokenFrom401);
      }

      isRefreshing = true;

      return refreshService.refreshToken().pipe(
        switchMap(newToken => {
          isRefreshing = false;
          localStorage.setItem('access_token', newToken);
          refreshSubject.next(newToken);
          return next(addToken(req, newToken));
        }),
        catchError(err => {
          isRefreshing = false;
          refreshSubject.next(null);
          return throwError(() => err);
        })
      );
    })
  );
};
