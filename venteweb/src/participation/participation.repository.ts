import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Invitation } from './entities/participation-invitation.entity';
import { ParticipationRequest } from './entities/participation-request.entity';
import { Participation } from './entities/participation.entity';

@Injectable()
export class ParticipationRepository {

    constructor(private prisma: PrismaService){}

    async createParticipation(participationForm : {participation: Participation, requestId?: string, invitationId?: string}) {
        const { participation, requestId, invitationId } = participationForm;
        const data = {
            userId: participationForm.participation.userId,
            eventId: participationForm.participation.eventId,
            type: participation.type,
            invitation: participation.invitation,
        };

        return await this.prisma.$transaction(async (tx) => {
            // Crear la participación
            const createdParticipation = await tx.participation.create({ data });
            console.log(createdParticipation)
            // Si existe una request asociada, la eliminamos
            if (requestId) await tx.request.delete({ where: { id: requestId }});

            // Si existe la invitación asociada, la eliminamos
            if (invitationId) await tx.invitation.delete({ where: { id: invitationId }});
            return createdParticipation;
        });
    }

    async createRequestParticipation(participationRequest: ParticipationRequest) {
        const data = {
            userId: participationRequest.userId,
            eventId: participationRequest.eventId,
            text: participationRequest.text,
        }
        return await this.prisma.request.create({data});
    }

    async createInvitationToParticipate(invitation: Invitation) {
        const data = {
            userId: invitation.userId,
            eventId: invitation.eventId,
            text: invitation.text,
            invitationToken: invitation.invitationToken,
            type: invitation.type,
        }
        return await this.prisma.invitation.create({data});
    }

    async removeParticipationRequest(requestId: string){
        return await this.prisma.request.delete({where: {id: requestId}});
    }

    async findInvitationById(invitationId: string){
        return await this.prisma.invitation.findUnique({where: {id: invitationId}, include: {event: true}});
    }

    async getParticipationsByEvent(eventId: string){
        return await this.prisma.participation.findMany({where: {eventId}, include: {user: true}});
    }

    async removeParticipation(participationId: string){
        return await this.prisma.participation.delete({where: {id: participationId}});
    }

    async removeInvitation(invitationId: string){
        return await this.prisma.invitation.delete({where: {id: invitationId}});
    }

}