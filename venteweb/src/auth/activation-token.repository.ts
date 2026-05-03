import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma.service';

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ConsumeActivationResult =
  | { ok: true; alreadyActive: boolean }
  | { ok: false; reason: 'invalid' | 'used' | 'expired' };

@Injectable()
export class ActivationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  createRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  activationExpiresAt(): Date {
    return new Date(Date.now() + ACTIVATION_TTL_MS);
  }

  async revokePendingForUser(userId: string): Promise<void> {
    await this.prisma.activationToken.deleteMany({
      where: { userId, consumedAt: null },
    });
  }

  async createPending(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<{ id: string }> {
    const row = await this.prisma.activationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return { id: row.id };
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.activationToken.delete({ where: { id } });
    } catch {
      /* ignore if already removed */
    }
  }

  async consumeAndActivate(tokenHash: string): Promise<ConsumeActivationResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.activationToken.findUnique({
        where: { tokenHash },
      });
      if (!row) {
        return { ok: false, reason: 'invalid' };
      }
      if (row.consumedAt) {
        return { ok: false, reason: 'used' };
      }
      if (row.expiresAt < new Date()) {
        return { ok: false, reason: 'expired' };
      }

      const user = await tx.user.findUnique({ where: { id: row.userId } });
      if (!user) {
        return { ok: false, reason: 'invalid' };
      }

      await tx.activationToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });

      if (user.active) {
        return { ok: true, alreadyActive: true };
      }

      await tx.user.update({
        where: { id: row.userId },
        data: {
          active: true,
          activatedAt: new Date(),
          emailSent: true,
        },
      });

      return { ok: true, alreadyActive: false };
    });
  }
}
