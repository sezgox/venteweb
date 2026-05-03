import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from 'generated/prisma';
import { InvitationMailService } from './invitation-mail.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notifications: NotificationsService,
    private readonly invitationMailService: InvitationMailService,
  ) {}

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
      `Remember, ${payload.eventName} is starting soon!`,
      payload.text || 'You received a new reminder',
      payload.eventId,
    );
  }

  @OnEvent('external-invitation.created')
  async handleExternalInvitationCreated(payload: {
    eventId: string;
    eventName: string;
    invitationId: string;
    invitationToken: string;
    invitationText?: string;
    organizerName: string;
    organizerEmail: string;
    recipientFirstName: string;
    recipientLastName: string;
    recipientEmail?: string;
  }) {
    if (!payload.recipientEmail) {
      this.logger.log(
        `Skipping external invitation email for invitation ${payload.invitationId} because recipient has no email address.`,
      );
      return;
    }

    try {
      await this.invitationMailService.sendExternalInvitationEmail({
        recipientEmail: payload.recipientEmail,
        recipientFirstName: payload.recipientFirstName,
        recipientLastName: payload.recipientLastName,
        organizerName: payload.organizerName,
        eventId: payload.eventId,
        eventName: payload.eventName,
        invitationId: payload.invitationId,
        invitationText: payload.invitationText,
        invitationToken: payload.invitationToken,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send external invitation email for invitation ${payload.invitationId}: ${error.message}`,
      );
    }
  }
}
