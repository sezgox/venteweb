import { inject, Injectable, signal } from '@angular/core';
import { InvitationDto } from '../interfaces/events.interfaces';
import { UserSummary } from '../interfaces/user.interfaces';
import {
  FollowResponse,
  InvitationResponse,
  ManageEventsResponse,
  ManageEventsSuccessResponse,
  SearchUsersResponse,
  UpdateUserResponse,
  UserResponse,
  UserSuccessReponse
} from './../interfaces/api-response.interface';
import { ApiService } from './api.service';
import { UserSessionService } from './user-session.service';
import { ManageEvents } from '../interfaces/manage-events.interface';
import { User } from '../interfaces/user.interfaces';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly api = inject(ApiService);
  private readonly sessionService = inject(UserSessionService);
  private readonly managedEventsState = signal<ManageEvents | null>(null);
  private readonly profileCacheState = signal<Record<string, User>>({});

  readonly managedEvents = this.managedEventsState.asReadonly();
  readonly profileCache = this.profileCacheState.asReadonly();

  constructor() {
    this.loadUser();
  }

  async loadAuthenticatedUser(): Promise<UserResponse> {
    return await this.api.request('GET', `/auth/me`);
  }

  /** Devuelve el usuario actual (o null si no hay sesión) */
  getCurrentUser(): UserSummary | null {
    return this.sessionService.getCurrentUser();
  }

  /** Guarda el usuario actual (por ejemplo, tras iniciar sesión) */
  setCurrentUser(user: UserSummary): void {
    this.sessionService.setCurrentUser(user);
  }

  /** Elimina al usuario actual (logout) */
  clearCurrentUser(): void {
    this.sessionService.clearCurrentUser();
  }

  /** Intenta decodificar el token guardado y establecer el usuario */
  private async loadUser(): Promise<void> {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const res = await this.loadAuthenticatedUser();
    if(res.success){
      this.setCurrentUser((res as UserSuccessReponse).results);
    }
  }

  async getManagedEvents(force = false): Promise<ManageEventsResponse> {
    const cached = this.managedEventsState();
    if (!force && cached) {
      return {
        success: true,
        message: 'Managed events loaded from cache',
        results: cached
      } as ManageEventsSuccessResponse;
    }

    const response = await this.api.request<ManageEvents>('GET', '/users/manage/events');
    if (response.success) {
      this.managedEventsState.set((response as ManageEventsSuccessResponse).results);
    }
    return response as ManageEventsResponse;
  }

  invalidateManagedEventsCache(): void {
    this.managedEventsState.set(null);
  }

  async getProfile(username: string, force = false): Promise<UserResponse> {
    const cache = this.profileCacheState();
    if (!force && cache[username]) {
      return {
        success: true,
        message: 'Profile loaded from cache',
        results: cache[username]
      } as UserSuccessReponse;
    }

    const response = await this.api.request<User>('GET', `/users/${username}`);
    if (response.success) {
      const user = (response as UserSuccessReponse).results;
      this.profileCacheState.update(current => ({ ...current, [username]: user }));
    }
    return response as UserResponse;
  }

  invalidateProfileCache(username?: string): void {
    if (!username) {
      this.profileCacheState.set({});
      return;
    }
    this.profileCacheState.update(current => {
      const next = { ...current };
      delete next[username];
      return next;
    });
  }

  async followUser(userId: string): Promise<FollowResponse>{
    const response = await this.api.request('POST', `/users/${userId}/follows`);
    if (response.success) {
      this.invalidateProfileCache();
    }
    return response as FollowResponse;
  }

  async unfollowUser(userId: string): Promise<FollowResponse>{
    const response = await this.api.request('DELETE', `/users/${userId}/follows`);
    if (response.success) {
      this.invalidateProfileCache();
    }
    return response as FollowResponse;
  }

  async updateUser(userId: string, formData: FormData): Promise<UpdateUserResponse>{
    const response = await this.api.request('PATCH', `/users/${userId}`, formData);
    if (response.success) {
      this.invalidateProfileCache();
    }
    return response as UpdateUserResponse;
  }

  async searchUsers(search: string): Promise<SearchUsersResponse>{
    return await this.api.request('GET', `/users?search=${search}`);
  }

  async searchFriends(search: string): Promise<SearchUsersResponse>{
    return await this.api.request('GET', `/users/friends/search?search=${encodeURIComponent(search ?? '')}`);
  }

  async inviteUserToEvent(userId: string, invitationDto: InvitationDto): Promise<InvitationResponse>{
    const response = await this.api.request('POST', `/users/${userId}/invitations/`, invitationDto);
    if (response.success) {
      this.invalidateManagedEventsCache();
    }
    return response as InvitationResponse;
  }

  async rejectOrCancelInvitation(invitedUserId: string, invitationId: string): Promise<InvitationResponse>{
    const response = await this.api.request('DELETE', `/users/${invitedUserId}/invitations/${invitationId}`);
    if (response.success) {
      this.invalidateManagedEventsCache();
    }
    return response as InvitationResponse;
  }

}
