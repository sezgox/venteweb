import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: 'root'
})

export class LoadingService {
  #loading = signal(false);
  loading = this.#loading.asReadonly();

  loadingOn(): void {
    this.#loading.set(true);
  }
  loadingOff(): void {
    this.#loading.set(false);
  }
}
