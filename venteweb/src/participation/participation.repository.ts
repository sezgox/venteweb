import { Injectable } from '@nestjs/common';
import { EventMode } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';
import { Invitation } from './entities/participation-invitation.entity';
import { ParticipationRequest } from './entities/participation-request.entity';
import { Participation } from './entities/participation.entity';

@Injectable()
export class ParticipationRepository {
  constructor(private prisma: PrismaService) {}

  private normalizeNullableContactValue(value?: string) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async createParticipation(participationForm: {
    participation: Participation;
    requestId?: string;
    invitationId?: string;
  }) {
    const { participation, requestId, invitationId } = participationForm;
    const data = {
      userId: participation.userId,
      externalUserId: participation.externalUserId,
      eventId: participation.eventId,
      eventMode: participation.eventMode ?? EventMode.OnSite,
      type: participation.type,
      invitation: participation.invitation,
    };

    return await this.prisma.$transaction(async (tx) => {
      const createdParticipation = await tx.participation.create({ data });
      if (requestId) await tx.request.delete({ where: { id: requestId } });
      if (invitationId)
        await tx.invitation.delete({ where: { id: invitationId } });
      return createdParticipation;
    });
  }

  async createRequestParticipation(participationRequest: ParticipationRequest) {
    const eventMode = participationRequest.eventMode ?? EventMode.OnSite;
    const data = {
      userId: participationRequest.userId,
      eventId: participationRequest.eventId,
      eventMode,
      onSiteEventId:
        eventMode === EventMode.OnSite ? participationRequest.eventId : null,
      virtualEventId:
        eventMode === EventMode.Virtual ? participationRequest.eventId : null,
      text: participationRequest.text,
    };
    return await this.prisma.request.create({ data });
  }

  async createInvitationToParticipate(invitation: Invitation) {
    const eventMode = invitation.eventMode ?? EventMode.OnSite;
    const data = {
      userId: invitation.userId,
      externalUserId: invitation.externalUserId,
      eventId: invitation.eventId,
      eventMode,
      onSiteEventId: eventMode === EventMode.OnSite ? invitation.eventId : null,
      virtualEventId:
        eventMode === EventMode.Virtual ? invitation.eventId : null,
      text: invitation.text,
      invitationToken: invitation.invitationToken,
      type: invitation.type,
    };
    return await this.prisma.invitation.create({ data });
  }

  async findExternalUserByEmail(email: string) {
    return await this.prisma.externalUser.findFirst({ where: { email } });
  }

  async findExternalUserByPhone(phone: string) {
    return await this.prisma.externalUser.findFirst({ where: { phone } });
  }

  async createExternalUser(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }) {
    return await this.prisma.externalUser.create({
      data: {
        ...data,
        email: this.normalizeNullableContactValue(data.email),
        phone: this.normalizeNullableContactValue(data.phone),
      },
    });
  }

  async updateExternalUser(
    externalUserId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
  ) {
    return await this.prisma.externalUser.update({
      where: { id: externalUserId },
      data: {
        ...data,
        email: this.normalizeNullableContactValue(data.email),
        phone: this.normalizeNullableContactValue(data.phone),
      },
    });
  }

  async removeParticipationRequest(requestId: string) {
    return await this.prisma.request.delete({ where: { id: requestId } });
  }

  async findInvitationById(invitationId: string) {
    return await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { event: true, externalUser: true, user: true },
    });
  }

  async findExternalInvitationByToken(
    externalUserId: string,
    invitationToken: string,
    eventId?: string,
  ) {
    return await this.prisma.invitation.findFirst({
      where: {
        externalUserId,
        invitationToken,
        eventId: eventId || undefined,
      },
      include: { event: true, externalUser: true, user: true },
    });
  }

  async getParticipationsByEvent(eventId: string) {
    return await this.prisma.participation.findMany({
      where: { eventId },
      include: { user: true, externalUser: true, rating: true },
    });
  }

  async removeParticipation(participationId: string) {
    return await this.prisma.participation.delete({
      where: { id: participationId },
    });
  }

  async removeInvitation(invitationId: string) {
    return await this.prisma.invitation.delete({ where: { id: invitationId } });
  }
}
