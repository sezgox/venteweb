import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AppLinkUrlService } from '../../core/services/app-link-url.service';

const PROMPT_DISMISSED_KEY = 'vente_app_open_prompt_dismissed';

@Component({
  selector: 'app-app-open-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-open-prompt.component.html',
  styleUrl: './app-open-prompt.component.css'
})
export class AppOpenPromptComponent {
  private readonly router = inject(Router);
  private readonly appLinkUrlService = inject(AppLinkUrlService);

  readonly currentUrl = signal(this.appLinkUrlService.getCurrentAppLinkUrl());
  readonly dismissed = signal(this.readDismissedState());
  readonly isAndroidMobileBrowser = computed(() => this.detectAndroidMobileBrowser());
  readonly visible = computed(() => this.isAndroidMobileBrowser() && !this.dismissed());
  readonly playStoreUrl = this.appLinkUrlService.playStoreUrl;

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentUrl.set(this.appLinkUrlService.getCurrentAppLinkUrl());
      });
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    }
  }

  private readDismissedState(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
  }

  private detectAndroidMobileBrowser(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const userAgent = navigator.userAgent || '';
    return /Android/i.test(userAgent) && /Mobile/i.test(userAgent);
  }
}

