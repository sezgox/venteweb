import { inject, Injectable } from '@angular/core';
import { LoginResponse, LoginSuccessResponse, RegisterResponse } from '../interfaces/api-response.interface';
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

  async sendActivationEmail(email: string, password: string): Promise<void> {
    const res = await this.api.request<{ success?: boolean }>(
      'POST',
      '/auth/activation/request-email',
      { email, password },
    );
    if (!res.success) {
      throw new Error(
        'message' in res ? String((res as { message?: string }).message) : 'Request failed',
      );
    }
  }

  async validateActivationCode(token: string): Promise<void> {
    const res = await this.api.request('POST', '/auth/activation/confirm', {
      token,
    });
    if (!res.success) {
      throw new Error(
        'message' in res ? String((res as { message?: string }).message) : 'Activation failed',
      );
    }
  }

  async loginWithGoogle(tokenId: string) {
    return await this.api.request('POST', '/auth/google', { tokenId });
  }

  async logout(){
    localStorage.removeItem("access_token");
    this.usersService.clearCurrentUser();
    this.api.request('POST', `/auth/logout`).then( () => {
      //window.location.reload();
    });
  }

  async logoutSilent(){
    localStorage.removeItem("access_token");
    this.usersService.clearCurrentUser();
    return await this.api.request('POST', `/auth/logout`);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

    async refreshToken(): Promise<boolean> {
      const res = await this.api.request('POST', '/auth/refresh');
      console.log(res)
      if(res.success){
        localStorage.setItem("access_token", (res as LoginSuccessResponse).results.access_token);
        this.usersService.setCurrentUser((res as LoginSuccessResponse).results.user);
        return true;
      }
      return false;
    }

  isAuthenticated(): boolean {
    return !!this.usersService.getCurrentUser();
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
