import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from 'generated/prisma';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationListener {
  constructor(private notifications: NotificationsService) {}

  @OnEvent('invitation.created')
  async handleInvitationCreated(payload: {
    eventId: string;
    invitedUserId: string;
    eventName: string;
    text?: string;
  }) {
    const notification = await this.notifications.createNotification(
      payload.invitedUserId,
      NotificationType.Invitation,
      `You've been invited to ${payload.eventName}`,
      payload.text || 'You received a new invitation',
      payload.eventId,
    );
  }

  @OnEvent('reminder.created')
  async handleReminderCreated(payload: {
    eventId: string;
    userId: string;
    eventName: string;
    text?: string;
  }) {
    const notification = await this.notifications.createNotification(
      payload.userId,
      NotificationType.Reminder,
      `You've been reminded to ${payload.eventName}`,
      payload.text || 'You received a new reminder',
      payload.eventId,
    );
  }

}
