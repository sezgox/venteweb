import { Injectable, signal } from "@angular/core";
import { UserSummary } from "../interfaces/user.interfaces";

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {

  // Inicialmente null, se actualiza cuando se logea el usuario
  #currentUser = signal<UserSummary | null>(null);
  currentUser = this.#currentUser.asReadonly();

  constructor() {}

    getCurrentUser(): UserSummary | null {
      return this.currentUser();
    }

  /** Guarda el usuario actual (por ejemplo, tras iniciar sesión) */
    setCurrentUser(user: UserSummary): void {
      this.#currentUser.set(user);
    }

    /** Elimina al usuario actual (logout) */
    clearCurrentUser(): void {
      this.#currentUser.set(null);
    }
}
