import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private renderer: Renderer2;
  private isDark = false;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    const saved = localStorage.getItem('dark-mode');
    console.log(saved)
    if (saved === 'true') {
      this.enableDarkMode(true);
    }
  }

  toggleDarkMode() {
    this.enableDarkMode(!this.isDark);
  }

  private enableDarkMode(enable: boolean) {
    this.isDark = enable;
    const body = document.body;

    if (enable) {
      this.renderer.addClass(body, 'theme-dark');
      // Forzar color-scheme dark para iconos nativos
      this.renderer.setStyle(document.documentElement, 'color-scheme', 'dark');
    } else {
      this.renderer.removeClass(body, 'theme-dark');
      // Forzar color-scheme light para iconos nativos
      this.renderer.setStyle(document.documentElement, 'color-scheme', 'light');
    }

    localStorage.setItem('dark-mode', enable.toString());
  }

  get isDarkMode() {
    return this.isDark;
  }
}
