import { Injectable } from '@angular/core';
import { APP_LINKS_CONFIG } from '../consts/app-links.const';

type AppLinkQueryValue = string | number | boolean | null | undefined;

@Injectable({
  providedIn: 'root'
})
export class AppLinkUrlService {
  readonly baseUrl = APP_LINKS_CONFIG.baseUrl;
  readonly playStoreUrl = APP_LINKS_CONFIG.playStoreUrl;

  getCurrentAppLinkUrl(): string {
    if (typeof window === 'undefined') {
      return this.baseUrl;
    }

    return window.location.href;
  }

  buildOpenUrl(pathSegments: Array<string | number>, queryParams: Record<string, AppLinkQueryValue> = {}): string {
    const sanitizedSegments = pathSegments
      .map(segment => String(segment).trim())
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment));

    const pathname = sanitizedSegments.length > 0 ? `/open/${sanitizedSegments.join('/')}` : '/open';
    return this.buildUrl(pathname, queryParams);
  }

  buildUrl(pathname: string, queryParams: Record<string, AppLinkQueryValue> = {}): string {
    const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const url = new URL(normalizedPathname, this.baseUrl);

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value == null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }
}
