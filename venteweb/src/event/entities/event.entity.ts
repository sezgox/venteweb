import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Category, ParticipationType, Visibility } from 'generated/prisma';
import { EventStatus } from 'src/core/interfaces/event-status.enum';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { CreateRequestParticipationDto } from 'src/participation/dto/create-request-participation.dto';
import { Invitation } from 'src/participation/entities/participation-invitation.entity';
import { ParticipationRequest } from 'src/participation/entities/participation-request.entity';
import { Participation } from 'src/participation/entities/participation.entity';
import { User } from 'src/user/entities/user.entity';

export class Event {
    id: string;
    organizerId: string;
    poster: string;
    name: string;
    categories: Category[];
    description: string;
    visibility: Visibility;
    maxAttendees?: number;
    maxCollaborators?: number;
    lat: number;
    lng: number;
    location: string;
    startDate: Date;
    endDate: Date;
    requiresRequest: boolean;
    locationAlias: string;
    totalRate?: number;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    allowPosts?: boolean;
    language?: string;
    invitation?: string;

  // Relations (simplified references)
    participations?: Participation[] = [];
    requests?: ParticipationRequest[] = [];
    invitations?: Invitation[] = [];

    constructor(partial: Partial<Event>) {
        Object.assign(this, partial);
    }


    get status(): EventStatus {
        const now = new Date();
        if (this.startDate > now) return EventStatus.Upcoming;
        if (this.endDate > now) return EventStatus.Live;
        return EventStatus.Finished;
    }
  // ===========================================================
  // 🧠 Domain Logic
  // ===========================================================

    /**
     * Recalculate totalRate based on participant ratings
     */
    recalculateRate(): void {
        if(this.status !== EventStatus.Finished) {
            this.totalRate = null;
            return;
        }

        const rated = this.participations.filter((p) => typeof p.rating?.score === 'number');
        if (rated.length === 0) {
            this.totalRate = 0;
            return;
        }

        const sum = rated.reduce((acc, p) => acc + (p.rating.score ?? 0), 0);
        this.totalRate = sum / rated.length;
        
    }

    private canGetCollaborationRequests(request: CreateRequestParticipationDto) {
        const isUpcoming = this.status === EventStatus.Upcoming;
        if(!isUpcoming) throw new BadRequestException('No puedes pedir colaboración a un evento que ya está en curso o finalizado!');

        const creatorIsInDto = request.userId == this.organizerId;
        if(creatorIsInDto) throw new BadRequestException('No puedes pedir colaborar en tu propio evento!');

        const hasAlreadyRequested = this.requests.some(
            r => r.userId === request.userId
        );
        if(this.hasAlreadyParticipated(request.userId)) throw new BadRequestException('You are already participating in this event, try to cancel your actual participation and send the request again!')
        if(hasAlreadyRequested) throw new BadRequestException(`Ya hay una petición de colaboración pendiente para este evento`);
        if(!this.requiresRequest) throw new BadRequestException('Este evento no requiere peticiones para colaborar!');
    }

    hasAlreadyParticipated(userId: string){
        return this.participations.some(p => p.userId === userId);
    }

    hasAvailableSlots(): boolean{
        const collabCount = this.participations.filter(p => p.type === ParticipationType.Collaboration).length;
        return this.maxCollaborators != null && this.maxCollaborators > 0 && collabCount < this.maxCollaborators;
    }

    addRequestParticipation(createRequestParticipationDto: CreateRequestParticipationDto): ParticipationRequest {
        this.canGetCollaborationRequests(createRequestParticipationDto);
        const requestParticipation = new ParticipationRequest(createRequestParticipationDto);
        this.requests.push(requestParticipation);
        return requestParticipation;
    }
    acceptRequest(createParticipationDto: CreateParticipationDto) {
        const request = this.requests.find(r => r.id === createParticipationDto.requestId);
        if(!request) throw new BadRequestException('La petición solicitada para aceptar no existe');
        if(request.userId !== createParticipationDto.userId) throw new BadRequestException('La request de colaboración no es del usuario que quieres agregar como colaborador');
        const from = {request: true};
        return this.addCollaborator(createParticipationDto, from);
    }

    addAttendee(createParticipationDto: CreateParticipationDto, from?: {invitation?: boolean}){
        const attendees = this.participations.filter(p => p.type == ParticipationType.Attendance);
        if(this.maxAttendees && this.maxAttendees <= attendees.length) throw new BadRequestException('No hay más cupos para atender como público :(')
        if(this.hasAlreadyParticipated(createParticipationDto.userId)) throw new BadRequestException('Already participating in this event!')
        const participation = new Participation(createParticipationDto);
        return {participation, invitationId: from?.invitation ? createParticipationDto.invitationId : null};
    }

    addCollaborator(createParticipationDto: CreateParticipationDto, from?: {request?: boolean, invitation?:boolean}){
        if(createParticipationDto.type !== ParticipationType.Collaboration) throw new BadRequestException('No puedes colaborar en un evento con una participación de tipo "Attendance"');
        if(this.hasAlreadyParticipated(createParticipationDto.userId)) throw new BadRequestException('Already participating in this event!');
        if(!this.hasAvailableSlots()) throw new BadRequestException('No hay más cupos para colaborar en este evento :(');
        const participation = new Participation(createParticipationDto);
        const fromRequest = from?.request;
        const fromInvitation = from?.invitation;
        return {participation, requestId: fromRequest ? createParticipationDto.requestId : null, invitationId: fromInvitation ? createParticipationDto.invitationId : null};
    }

    addParticipant(participant: User, requester: User,createParticipationDto: CreateParticipationDto): {participation: Participation, requestId?: string}{
        if(this.status !== EventStatus.Upcoming) throw new BadRequestException('No puedes participar en un evento que ya está en curso o finalizado!');
        // Participante obtenido desde el dto.userId
        const participantIsCreator = participant.id == this.organizerId;
        if(participantIsCreator) throw new BadRequestException('No puedes participar en tu propio evento!');

        const requesterIsCreator = requester.id == this.organizerId;

        // Si la participación viene con requestId asociada -> significa que un usuario (creador del evento) está tratando de aceptar una request 
        if(createParticipationDto.requestId){
            if(!requesterIsCreator) throw new ForbiddenException('Solo el creador del evento puede aceptar peticiones!')
            return this.acceptRequest(createParticipationDto);
        }else{
            // Si la participación no viene con requestId asociada -> significa que un usuario (participante) está tratando de agregar una participación a un evento que no requiere peticiones(para colaborar)
            if(requesterIsCreator) throw new BadRequestException('No puedes participar en tu propio evento!'); // El usuario que envió la petición, es el creador del evento, no puede agregarse a sí mismo como participante.
            const requesterIsParticipant = requester.id == participant.id;
            // Si el usuario que ha iniciado la petición no es el usuario que está tratando de participar (en el dto), no puede agregar a ese otro usuario como participante.
            if(!requesterIsParticipant) throw new ForbiddenException('No puedes añadir participaciones a otros usuarios que no eres tú mismo');
            return createParticipationDto.type == ParticipationType.Attendance ? this.addAttendee(createParticipationDto) : this.addCollaborator(createParticipationDto);
        }
    }

    
    rejectRequest(): void {
    }

    rejectPendingRequests(): void {
        //QUITAR TODAS LAS REQUESTS QUE TENGA -> ES DECIR BORRARLAS DE AQUÍ Y MÁS ADELANTE DE LA BASE DE DATOS
    }

    removeCollaborator(userId: string): void {
    // Filtramos solo los participantes que NO sean el colaborador que queremos quitar
    }

    removeRequest(requestId: string, userWhoAskToRemove: User){
        const request = this.requests.find(r => r.id === requestId);
        if(!request) throw new BadRequestException('La petición solicitada para eliminar no existe');
        // Si el usuario que está solicitando elimnar la request es el creador del evento, se trata de un Rechazo de la petición
        const isRejection = userWhoAskToRemove.id === this.organizerId;
        // Si el usuario que está solicitando elimninar la request es el usuario que aparece en la request, se trata de una Cancelación de la petición
        const isCancellation = userWhoAskToRemove.id === request.userId;
        if(!isRejection && !isCancellation) throw new ForbiddenException('No puedes eliminar una petición de la cual no eres el creador ni el usuario que hizo la petición');
        return isCancellation ? "Request cancelada"  : "Request rechazada" ;
    }

    removeParticipation(participationId: string, userWhoAskToRemove: User){
        if(this.endDate < new Date()) throw new BadRequestException('No puedes eliminar una participación de un evento que ya ha terminado');
        if(this.startDate < new Date()) throw new BadRequestException('No puedes eliminar una participación de un evento que ya ha comenzado');
        const participation = this.participations.find(p => p.id === participationId);
        if(!participation) throw new BadRequestException('La participación solicitada para eliminar no existe');
        const isCancellation = userWhoAskToRemove.id === participation.userId;
        const isElimination = userWhoAskToRemove.id === this.organizerId;
        if(!isCancellation && !isElimination) throw new ForbiddenException('No puedes eliminar una participación de la cual no eres el creador');
        if(participation.type == ParticipationType.Attendance && isElimination) throw new ForbiddenException("No puedes eliminar una participación de tipo asistencia a tu evento!");
        return isCancellation ? "Participation cancelled" : "Collaborator removed";
    }

}
