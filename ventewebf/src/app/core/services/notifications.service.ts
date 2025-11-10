import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Manager, Socket } from 'socket.io-client';
import { environment } from '../../../enviroments/enviroment';
import { NotificationsResponse } from '../interfaces/api-response.interface';
import { ApiService } from './api.service';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  createdAt: string;
}
export enum NotificationType {
  Post = 'Post',
  Reminder = 'Reminder',
  RequestCollaboration = 'RequestCollaboration',
  RequestAnswered = 'RequestAnswered',
  Participation  = 'Participation',
  Rating = 'Rating',
  Invitation = 'Invitation',
  InvitationAnswered = 'InvitationAnswered'
}
@Injectable({ providedIn: 'root' })
export class NotificationsService {

  private manager!: Manager;
  private socket!: Socket;
  private initialized = false;

  private readonly api = inject(ApiService);

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  connect(token: string): void {
    if (this.initialized) return;

    this.manager = new Manager(environment.apiUrl, {
      path: '/notifications', // path de tu gateway
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: false,
    });

    this.socket = this.manager.socket('/',{auth: { token }});

    this.setupListeners();
    this.socket.connect();
    this.initialized = true;
  }

  private setupListeners() {
    this.socket.on('connect', () => console.log('✅ Connected to notifications WS'));
    this.socket.on('disconnect', () => console.log('⚠️ Disconnected from notifications WS'));
    this.socket.on('connect_error', (err: any) => console.error('❌ WS Connection Error:', err.message));

    this.socket.on('notification', (notification: Notification) => {
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...current]);
    });
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.initialized = false;
  }

  async getNotifications(): Promise<NotificationsResponse>{
    return await this.api.request('GET', `/notifications`);
  }

  async markAsRead(notificationId: string): Promise<NotificationsResponse>{
    return await this.api.request('PATCH', `/notifications/${notificationId}`);
  }
}
