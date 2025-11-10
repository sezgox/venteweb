import { EventEmitter, inject, Injectable } from '@angular/core';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { LoginResponse, RegisterResponse } from '../interfaces/api-response.interface';
import { LoginDto } from '../interfaces/login.dto.interface';
import { RegisterDto } from './../interfaces/register.dto.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  public loggedIn: EventEmitter<boolean> = new EventEmitter();
  private redirectUrl: string | null = null;
  private readonly api = inject(ApiService);

  async login(loginData: LoginDto): Promise<LoginResponse> {
    return await this.api.request('POST', '/auth/login', loginData);
  }
  async register(registerData: RegisterDto): Promise<RegisterResponse> {
    return await this.api.request('POST', '/users', registerData);
  }

  async loginWithGoogle(tokenId: string) {
    return await this.api.request('POST', '/auth/google', { tokenId });
  }


  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp ? decoded.exp > now : false;
    } catch {
      return false;
    }
  }

  setRedirectUrl(url: string) {
    this.redirectUrl = url;
  }

  getRedirectUrl() {
    return this.redirectUrl;
  }

  clearRedirectUrl() {
    this.redirectUrl = null;
  }

}
