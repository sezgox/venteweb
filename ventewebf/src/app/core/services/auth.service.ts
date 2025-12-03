import { inject, Injectable } from '@angular/core';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { LoginResponse, RegisterResponse } from '../interfaces/api-response.interface';
import { LoginDto } from '../interfaces/login.dto.interface';
import { RegisterDto } from './../interfaces/register.dto.interface';
import { ApiService } from './api.service';
import { UsersService } from './users.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private redirectUrl: string | null = null;
  private readonly api = inject(ApiService);
  private readonly usersService = inject(UsersService);


  async login(loginData: LoginDto): Promise<LoginResponse> {
    return await this.api.request('POST', '/auth/login', loginData);
  }
  async register(registerData: RegisterDto): Promise<RegisterResponse> {
    return await this.api.request('POST', '/users', registerData);
  }

  async loginWithGoogle(tokenId: string) {
    return await this.api.request('POST', '/auth/google', { tokenId });
  }

  async logout(){
    return await this.api.request('POST', `/auth/logout`);
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
      console.log('All good');
      const authenticated = decoded.exp ? decoded.exp > now : false;
      if (!authenticated) {
        this.usersService.clearCurrentUser();
        console.log('Token expired');
      }
      return authenticated;
    } catch {
      this.usersService.clearCurrentUser();
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
