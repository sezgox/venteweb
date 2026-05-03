import { Injectable } from '@angular/core';
import { environment } from '../../../enviroments/enviroment';

interface FirebaseSignInResponse {
  idToken: string;
  email: string;
  localId: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private readonly baseUrl = 'https://identitytoolkit.googleapis.com/v1';

  async sendEmailVerification(email: string, password: string): Promise<void> {
    const session = await this.signInWithPassword(email, password);
    await this.post('accounts:sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken: session.idToken,
      continueUrl: this.buildContinueUrl(),
      canHandleCodeInApp: true,
    });
  }

  async applyEmailVerificationCode(code: string): Promise<void> {
    await this.post('accounts:update', { oobCode: code });
  }

  private async signInWithPassword(email: string, password: string): Promise<FirebaseSignInResponse> {
    return await this.post<FirebaseSignInResponse>('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });
  }

  private async post<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}?key=${environment.firebase.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(this.getFirebaseErrorMessage(payload?.error?.message));
    }

    return payload as T;
  }

  private buildContinueUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:4200/validate-account';
    }

    return `${window.location.origin}/validate-account`;
  }

  private getFirebaseErrorMessage(code?: string): string {
    switch (code) {
      case 'EMAIL_NOT_FOUND':
      case 'INVALID_LOGIN_CREDENTIALS':
      case 'INVALID_PASSWORD':
        return 'Could not sign in to Firebase to send verification email.';
      case 'INVALID_OOB_CODE':
      case 'EXPIRED_OOB_CODE':
        return 'Activation link is invalid or expired.';
      default:
        return code ?? 'Firebase verification failed.';
    }
  }
}
