import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Resend } from 'resend';
import { resendConfig } from 'src/core/consts/resend-config.const';
import {
  buildActivationEmailHtml,
  buildActivationEmailSubject,
  buildActivationEmailText,
} from './templates/activation-email.template';

@Injectable()
export class ActivationMailService {
  private readonly logger = new Logger(ActivationMailService.name);
  private readonly resend: Resend | null;

  constructor() {
    this.resend = resendConfig.apiKey?.trim()
      ? new Resend(resendConfig.apiKey.trim())
      : null;
  }

  async sendActivationEmail(params: {
    to: string;
    recipientName: string;
    webActivationUrl: string;
  }): Promise<void> {
    if (!this.resend) {
      throw new InternalServerErrorException(
        'RESEND_API_KEY is not configured',
      );
    }
    const fromEmail = resendConfig.fromEmail?.trim();
    if (!fromEmail) {
      throw new InternalServerErrorException(
        'RESEND_FROM_EMAIL is not configured',
      );
    }

    const fromName = resendConfig.fromName?.trim();
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    const replyTo = resendConfig.inboundContactEmail?.trim();

    const { data, error } = await this.resend.emails.send({
      from,
      to: params.to,
      subject: buildActivationEmailSubject(),
      html: buildActivationEmailHtml({
        recipientName: params.recipientName,
        webActivationUrl: params.webActivationUrl,
      }),
      text: buildActivationEmailText({
        recipientName: params.recipientName,
        webActivationUrl: params.webActivationUrl,
      }),
      ...(replyTo ? { replyTo: [replyTo] } : {}),
    });

    if (error) {
      this.logger.warn(
        `Resend error: ${error.message ?? JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        typeof error.message === 'string'
          ? error.message
          : 'Failed to send activation email',
      );
    }

    if (!data?.id) {
      this.logger.warn('Resend returned no email id');
      throw new InternalServerErrorException(
        'Failed to send activation email (no id)',
      );
    }

    this.logger.log(
      `Resend accepted activation email id=${data.id} to=${params.to} from=${fromEmail}`,
    );
  }
}
