import { Injectable } from '@nestjs/common';
import { NotificationType } from 'generated/prisma';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private repo: NotificationRepository,
    private gateway: NotificationsGateway
  ) {}

  /**
   * Crea una notificación en la base de datos y la envía al usuario
   * por WebSocket en tiempo real.
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: string
  ) {
    // 1️⃣ Guardar en la base de datos
    const notification = await this.repo.create({
      userId,
      type,
      title,
      message,
      relatedId,
    });

    // 2️⃣ Enviar al usuario conectado mediante WebSocket
    this.gateway.notifyUser(userId, notification);

    return notification;
  }

  async getNotificationsForUser(userId: string) {
    return await this.repo.findMany(userId);
  }

  async markAsRead(id: string) {
    return await this.repo.markAsRead(id);
  }


}
