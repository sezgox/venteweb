import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  console.log('interceptando...')
  if(token){
    const clonedReq = req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + localStorage.getItem('access_token')) });
    return next(clonedReq);
  }
  console.log(req.headers)
  return next(req);
};
