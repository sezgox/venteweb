import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { resendConfig } from 'src/core/consts/resend-config.const';
import {
  buildExternalInvitationEmailHtml,
  buildExternalInvitationEmailSubject,
  buildExternalInvitationEmailText,
} from './templates/external-invitation-email.template';

export interface ExternalInvitationMailPayload {
  recipientEmail: string;
  recipientFirstName: string;
  recipientLastName: string;
  organizerName: string;
  eventId: string;
  eventName: string;
  invitationId: string;
  invitationText?: string;
  invitationToken: string;
}

@Injectable()
export class InvitationMailService {
  private readonly logger = new Logger(InvitationMailService.name);
  private readonly resend: Resend | null;

  constructor() {
    this.resend = resendConfig.apiKey?.trim()
      ? new Resend(resendConfig.apiKey.trim())
      : null;
  }

  private buildEventGuestUrl(eventId: string, invitationToken: string): string {
    const base = resendConfig.activationPublicWebOrigin.replace(/\/+$/, '');
    const token = encodeURIComponent(invitationToken);
    return `${base}/events/event/${eventId}?invitation=${token}&guest=true`;
  }

  /**
   * Sends external invitation email via Resend. If Resend is not configured,
   * logs a warning and skips (invitation record still succeeds).
   */
  async sendExternalInvitationEmail(
    payload: ExternalInvitationMailPayload,
  ): Promise<{ delivered: boolean; skipped: boolean }> {
    if (!this.resend) {
      this.logger.warn(
        'Skipping external invitation email because RESEND_API_KEY is not configured.',
      );
      return { delivered: false, skipped: true };
    }
    const fromEmail = resendConfig.fromEmail?.trim();
    if (!fromEmail) {
      this.logger.warn(
        'Skipping external invitation email because RESEND_FROM_EMAIL is not configured.',
      );
      return { delivered: false, skipped: true };
    }

    const fromName = resendConfig.fromName?.trim();
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const replyTo = resendConfig.inboundContactEmail?.trim();
    const eventGuestUrl = this.buildEventGuestUrl(
      payload.eventId,
      payload.invitationToken,
    );

    const { data, error } = await this.resend.emails.send({
      from,
      to: payload.recipientEmail,
      subject: buildExternalInvitationEmailSubject({
        eventName: payload.eventName,
      }),
      html: buildExternalInvitationEmailHtml({
        recipientFirstName: payload.recipientFirstName,
        recipientLastName: payload.recipientLastName,
        eventName: payload.eventName,
        organizerName: payload.organizerName,
        invitationText: payload.invitationText,
        eventGuestUrl,
      }),
      text: buildExternalInvitationEmailText({
        recipientFirstName: payload.recipientFirstName,
        recipientLastName: payload.recipientLastName,
        eventName: payload.eventName,
        organizerName: payload.organizerName,
        invitationText: payload.invitationText,
        eventGuestUrl,
      }),
      ...(replyTo ? { replyTo: [replyTo] } : {}),
    });

    if (error) {
      this.logger.error(
        `Resend error for external invitation ${payload.invitationId}: ${
          error.message ?? JSON.stringify(error)
        }`,
      );
      throw new Error(
        typeof error.message === 'string'
          ? error.message
          : 'Failed to send external invitation email',
      );
    }

    if (!data?.id) {
      this.logger.warn(
        `Resend returned no email id for external invitation ${payload.invitationId}`,
      );
      throw new Error('Failed to send external invitation email (no id)');
    }

    this.logger.log(
      `Resend accepted external invitation email id=${data.id} invitation=${payload.invitationId} to=${payload.recipientEmail}`,
    );
    return { delivered: true, skipped: false };
  }
}
