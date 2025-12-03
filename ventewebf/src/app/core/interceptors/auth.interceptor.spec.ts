import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: jasmine.SpyObj<AuthService>;
  let usersService: jasmine.SpyObj<UsersService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'logout',
      'logoutSilent',
      'refreshToken',
      'getToken',
      'isAuthenticated',
    ]);
    const usersServiceSpy = jasmine.createSpyObj('UsersService', [
      'setCurrentUser',
      'clearCurrentUser',
      'getCurrentUser',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useValue: authInterceptor,
          multi: true,
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    usersService = TestBed.inject(UsersService) as jasmine.SpyObj<UsersService>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    const token = 'test-token';
    localStorage.setItem('access_token', token);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBeTruthy();
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('should not add Authorization header when token does not exist', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({});
  });

  it('should refresh token on 401 error and retry request', (done) => {
    const token = 'expired-token';
    const newToken = 'new-token';
    localStorage.setItem('access_token', token);

    authService.refreshToken.and.returnValue(Promise.resolve(true));

    httpClient.get('/api/test').subscribe({
      next: (response) => {
        expect(response).toEqual({ success: true });
        done();
      },
      error: () => {
        fail('Should not error after successful refresh');
        done();
      },
    });

    // First request fails with 401
    let req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Update token after refresh
    localStorage.setItem('access_token', newToken);

    // Retry request should be made
    setTimeout(() => {
      req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req.flush({ success: true });
    }, 100);
  });

  it('should logout on 401 when refresh fails', (done) => {
    const token = 'expired-token';
    localStorage.setItem('access_token', token);

    authService.refreshToken.and.returnValue(Promise.resolve(false));
    authService.logoutSilent.and.returnValue(Promise.resolve({ success: true, message: 'Logged out' } as any));

    httpClient.get('/api/test').subscribe({
      next: () => {
        fail('Should error after failed refresh');
        done();
      },
      error: () => {
        expect(authService.logoutSilent).toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not refresh on 401 for /auth/refresh endpoint', (done) => {
    const token = 'expired-token';
    localStorage.setItem('access_token', token);

    httpClient.post('/auth/refresh', {}).subscribe({
      next: () => {
        fail('Should error');
        done();
      },
      error: () => {
        expect(authService.refreshToken).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne('/auth/refresh');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('should logout on refresh error', (done) => {
    const token = 'expired-token';
    localStorage.setItem('access_token', token);

    authService.refreshToken.and.returnValue(Promise.reject(new Error('Refresh failed')));
    authService.logoutSilent.and.returnValue(Promise.resolve({ success: true, message: 'Logged out' } as any));

    httpClient.get('/api/test').subscribe({
      next: () => {
        fail('Should error after failed refresh');
        done();
      },
      error: () => {
        expect(authService.logoutSilent).toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });
});
