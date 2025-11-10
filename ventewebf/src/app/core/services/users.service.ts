import { inject, Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject, Observable } from 'rxjs';
import { CreateParticipationDto, InvitationDto } from '../interfaces/events.interfaces';
import { UserSummary } from '../interfaces/user.interfaces';
import { FollowResponse, InvitationResponse, ManageEventsResponse, SearchUsersResponse, UpdateUserResponse, UserResponse } from './../interfaces/api-response.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly api = inject(ApiService);

  private currentUserSubject = new BehaviorSubject<UserSummary | null>(null);
  currentUser$: Observable<UserSummary | null> = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUserFromToken();
  }

  /** Devuelve el usuario actual (o null si no hay sesión) */
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

  /** Intenta decodificar el token guardado y establecer el usuario */
  private loadUserFromToken(): void {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const decoded: any = jwtDecode(token);
      this.currentUserSubject.next({
        id: decoded.sub,
        name: decoded.name,
        username: decoded.username,
        email: decoded.email,
        photo: decoded.photo,
        locale: decoded.locale,
        bio: decoded.bio
      });
    } catch (err) {
      console.error('Error decodificando token JWT:', err);
      this.currentUserSubject.next(null);
    }
  }

  async getManagedEvents(): Promise<ManageEventsResponse>{
    return await this.api.request('GET', '/users/manage/events');
  }

  async getProfile(username: string): Promise<UserResponse>{
    return await this.api.request('GET', `/users/${username}`);
  }

  async followUser(userId: string): Promise<FollowResponse>{
    return await this.api.request('POST', `/users/${userId}/follows`);
  }

  async unfollowUser(userId: string): Promise<FollowResponse>{
    return await this.api.request('DELETE', `/users/${userId}/follows`);
  }

  async updateUser(userId: string, formData: FormData): Promise<UpdateUserResponse>{
    return await this.api.request('PATCH', `/users/${userId}`, formData);
  }

  async searchUsers(search: string): Promise<SearchUsersResponse>{
    return await this.api.request('GET', `/users?search=${search}`);
  }

  async inviteUserToEvent(userId: string, invitationDto: InvitationDto): Promise<InvitationResponse>{
    return await this.api.request('POST', `/users/${userId}/invitations/`, invitationDto);
  }

  async rejectOrCancelInvitation(invitedUserId: string, invitationId: string): Promise<InvitationResponse>{
    return await this.api.request('DELETE', `/users/${invitedUserId}/invitations/${invitationId}`);
  }

  async acceptInvitation(invitedUserId: string, participationDto: CreateParticipationDto): Promise<InvitationResponse>{
    return await this.api.request('POST', `/users/${invitedUserId}/invitations/${participationDto.invitationId}`, participationDto);
  }

}
