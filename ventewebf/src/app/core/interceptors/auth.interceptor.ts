import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const token = localStorage.getItem('access_token');
  
  if(token){
    const clonedReq = req.clone({ 
      headers: req.headers.set('Authorization', 'Bearer ' + token) 
    });
    return next(clonedReq).pipe(
      catchError((error) => {
        // Si el error es 401 (token expirado) y no es una petición de refresh
        if (error.status === 401 && !req.url.includes('/auth/refresh')) {
          // Obtener AuthService del injector
          const authService = injector.get(AuthService);
          return from(authService.refreshToken()).pipe(
            switchMap((refreshed) => {
              if (refreshed) {
                // Obtener el nuevo token y reintentar la petición
                const newToken = localStorage.getItem('access_token');
                const retryReq = req.clone({
                  headers: req.headers.set('Authorization', 'Bearer ' + newToken)
                });
                return next(retryReq);
              } else {
                // Si el refresh falla, hacer logout
                return from(authService.logout()).pipe(
                  switchMap(() => throwError(() => error))
                );
              }
            }),
            catchError(() => {
              // Si algo falla en el refresh, hacer logout
              return from(authService.logout()).pipe(
                switchMap(() => throwError(() => error))
              );
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};
