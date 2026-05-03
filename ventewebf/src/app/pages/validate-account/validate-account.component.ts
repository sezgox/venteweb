import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../../core/services/auth.service';

type ActivationState = 'loading' | 'success' | 'error';

function isHandheldUserAgent(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

@Component({
  selector: 'app-validate-account',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './validate-account.component.html',
  styleUrls: ['./validate-account.component.css'],
})
export class ValidateAccountComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly state = signal<ActivationState>('loading');
  readonly message = signal('Activating your account...');

  constructor() {
    void this.activate();
  }

  private buildAppDeepLink(token: string): string {
    const base = environment.activationAppDeepLinkBase.replace(/\/+$/, '');
    return `${base}/validate-account?token=${encodeURIComponent(token)}`;
  }

  /**
   * On handhelds, navigate to vente:// immediately. If the tab goes to the background, skip
   * browser activation (app handles the token). If still visible, log only and let the
   * caller continue with API activation.
   */
  private async tryNativeAppDeepLink(token: string): Promise<boolean> {
    if (!isHandheldUserAgent()) {
      return false;
    }

    const appUrl = this.buildAppDeepLink(token);
    try {
      window.location.href = appUrl;
    } catch (err) {
      console.error('Vente app deep link: navigation threw', err);
      return false;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 450);
    });

    if (document.visibilityState === 'hidden') {
      return true;
    }

    console.error(
      'Vente app deep link: page still visible (app may be missing or scheme blocked)',
    );
    return false;
  }

  private activationErrorMessage(error: unknown): string {
    const raw =
      error instanceof Error ? error.message : 'Activation link could not be validated.';
    if (/already used/i.test(raw)) {
      return 'This link was already used — your account may already be active. Try logging in.';
    }
    return raw;
  }

  private async activate(): Promise<void> {
    const token =
      this.route.snapshot.queryParamMap.get('token') ??
      this.route.snapshot.queryParamMap.get('oobCode');

    if (!token) {
      this.state.set('error');
      this.message.set('Activation link is missing a token.');
      return;
    }

    const handedOff = await this.tryNativeAppDeepLink(token);
    if (handedOff) {
      return;
    }

    try {
      await this.authService.validateActivationCode(token);
      this.state.set('success');
      this.message.set('Account activated. You can log in now.');
      setTimeout(() => void this.router.navigate(['/events']), 1800);
    } catch (error) {
      this.state.set('error');
      this.message.set(this.activationErrorMessage(error));
    }
  }
}
