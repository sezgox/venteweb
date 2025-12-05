import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { UserSummary } from "../interfaces/user.interfaces";

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {

  // Inicialmente null, se actualiza cuando se logea el usuario
  private currentUserSubject = new BehaviorSubject<UserSummary | null>(null);
  currentUser$: Observable<UserSummary | null> = this.currentUserSubject.asObservable();

  constructor() {}

    getCurrentUser(): UserSummary | null {
        return this.currentUserSubject.value;
    }

  /** Guarda el usuario actual (por ejemplo, tras iniciar sesión) */
setCurrentUser(user: UserSummary): void {
    this.currentUserSubject.next(user);
    }

    /** Elimina al usuario actual (logout) */
    clearCurrentUser(): void {
        this.currentUserSubject.next(null);
    }
}