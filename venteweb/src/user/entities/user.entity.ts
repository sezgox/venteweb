import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Follow, Level, ParticipationType, Permission, Visibility } from 'generated/prisma';
import { EventStatus } from 'src/core/interfaces/event-status.enum';
import { CreateEventDto } from 'src/event/dto/create-event.dto';
import { Event } from 'src/event/entities/event.entity';
import { CreateInvitationDto } from 'src/participation/dto/create-invitation.dto';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { Invitation } from 'src/participation/entities/participation-invitation.entity';
import { Participation } from 'src/participation/entities/participation.entity';

export class User {
    id: string;
    username: string;
    name: string;
    password?: string;
    email: string;
    photo: string;
    permission: Permission = Permission.Standard;
    level: Level = Level.New;
    bio?: string;
    location?: string;
    createdAt?: Date;
    updatedAt?: Date;
    lastLogin?: Date;

    events: Event[] = [];
    participations: Participation[] = [];
    invitations: Invitation[] = [];
    requests: Request[] = [];
    followers: Follow[] = [];
    following: Follow[] = [];

    constructor(partial: Partial<User> = {}) {
        const { events, ...rest } = partial;
        
        Object.assign(this, rest);
        
        // Transformar los eventos planos en instancias de Event
        if (events && Array.isArray(events)) {
            this.events = events.map(event => new Event(event));
        } else {
            this.events = [];
        }
    }

    canFollow(followingUser: User){
        if(this.following.find(follow => follow.followedId === followingUser.id)) throw new BadRequestException('Ya sigues a este usuario');
    }
    canUnfollow(followingUser: User){
        console.log(this.following);
        console.log(followingUser.id)
        if(!this.following.find(follow => follow.followedId === followingUser.id)) throw new BadRequestException('No sigues a este usuario');
    }

    upgradePermission(): void {
        if (this.permission === Permission.Premium) {
            throw new BadRequestException('User is already premium.');
        }
        this.permission = Permission.Premium;
    }

    upgradeLevel(): void {
        const next: Record<Level, Level> = {
            [Level.New]: Level.Active,
            [Level.Active]: Level.Featured,
            [Level.Featured]: Level.Influencer,
            [Level.Influencer]: Level.Influencer,
        };
        this.level = next[this.level];
    }

    private canCreateThisEvent(event: CreateEventDto) {
/*         this.events.forEach(e => e.status)
        const activeEvents = this.events.filter(
            (e) => e.status !== EventStatus.Finished,
        );

        // ----------------------------------------------------------
        // 1️⃣ LÍMITE DE EVENTOS ACTIVOS
        // ----------------------------------------------------------
        const limits: Record<Permission, Record<Level, number>> = {
            [Permission.Premium]: {
                [Level.New]: 4,
                [Level.Active]: 5,
                [Level.Featured]: 6,
                [Level.Influencer]: 7,
            },
            [Permission.Standard]: {
                [Level.New]: 0,
                [Level.Active]: 1,
                [Level.Featured]: 2,
                [Level.Influencer]: 3,
            },
        };

        const maxAllowed = limits[this.permission][this.level];
        if (activeEvents.length > maxAllowed) {
            throw new ForbiddenException(`Has alcanzado el límite de eventos activos permitidos para tu nivel (${maxAllowed}).`);
        }

        // ----------------------------------------------------------
        // 2️⃣ PROXIMIDAD TEMPORAL DEL EVENTO (startDate)
        // ----------------------------------------------------------
        const now = new Date();
        const startDate = new Date(event.startDate);
        const monthMs = 1000 * 60 * 60 * 24 * 30;
        const yearMs = monthMs * 12;

        const startLimits: Record<Permission, Record<Level, number>> = {
            [Permission.Premium]: {
                [Level.New]: yearMs,
                [Level.Active]: yearMs,
                [Level.Featured]: yearMs,
                [Level.Influencer]: yearMs,
            },
            [Permission.Standard]: {
                [Level.New]: monthMs,
                [Level.Active]: monthMs * 2,
                [Level.Featured]: monthMs * 4,
                [Level.Influencer]: monthMs * 6,
            },
        };

        const diffStart = startDate.getTime() - now.getTime();
        if (diffStart > startLimits[this.permission][this.level]) {
            throw new BadRequestException(`El evento no puede programarse con tanta antelación para tu nivel (${this.level}).`);
        }

        // ----------------------------------------------------------
        // 3️⃣ DURACIÓN DEL EVENTO
        // ----------------------------------------------------------
        const endDate = new Date(event.endDate);
        const diffDuration = endDate.getTime() - startDate.getTime();
        const hourMs = 1000 * 60 * 60;
        const dayMs = hourMs * 24;

        const durationLimits: Record<Permission, Record<Level, number>> = {
            [Permission.Premium]: {
                [Level.New]: dayMs * 1,
                [Level.Active]: dayMs * 2,
                [Level.Featured]: dayMs * 7,
                [Level.Influencer]: dayMs * 30,
            },
            [Permission.Standard]: {
                [Level.New]: hourMs * 6,
                [Level.Active]: dayMs * 1,
                [Level.Featured]: dayMs * 2,
                [Level.Influencer]: dayMs * 7,
            },
        };

        if (diffDuration > durationLimits[this.permission][this.level]) {
            throw new BadRequestException(`La duración del evento excede el máximo permitido para tu nivel (${this.level}).`);
        } */

    }

    canGetUpgraded(): boolean {
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);

        // 🔹 Eventos creados por el usuario y finalizados en el último año
        const finishedOwnEvents = this.events.filter(
            (e) => e.status === EventStatus.Finished && new Date(e.endDate) >= oneYearAgo && e.visibility === Visibility.Public,
        );

        console.log(`Usuario ${this.username} tiene ${finishedOwnEvents.length} eventos finalizados en el último año`);
        // 🔹 Eventos en los que el usuario participó (si existe la propiedad)
        const finishedParticipations = (this.participations ?? []).filter(
            (p) => p.event.status === EventStatus.Finished && new Date(p.event.endDate) >= oneYearAgo && p.event.visibility === Visibility.Public,
        );
        console.log(`Usuario ${this.username} tiene ${finishedParticipations.length} eventos en los que ha participado en el último año`);
        // 🧠 Funciones auxiliares
        const countOwnEventsWith = (minParticipants: number) =>
            finishedOwnEvents.filter((e) => e.participations.length > minParticipants).length;

        const countParticipatedEventsWith = (minParticipants: number) =>
            finishedParticipations.filter((p) => p.event.participations.length > minParticipants).length;

        // ----------------------------------------------------------
        // 🔸 Lógica según el nivel actual
        // ----------------------------------------------------------
        switch (this.level) {
            case Level.New: {
                if (countOwnEventsWith(5) >= 5) return true;
                if (countOwnEventsWith(5) >= 3 && countParticipatedEventsWith(5) >= 3) return true;
                if (countParticipatedEventsWith(10) > 15) return true;
                break;
            }

            case Level.Active: {
                if (countOwnEventsWith(10) >= 10) return true;
                if (countOwnEventsWith(10) >= 5 && countParticipatedEventsWith(10) >= 10) return true;
                break;
            }

            case Level.Featured: {
                if (countOwnEventsWith(20) >= 20) return true;
                if (countOwnEventsWith(15) >= 15 && countParticipatedEventsWith(20) >= 20) return true;
                break;
            }

            case Level.Influencer:
                return false; // 👑 no puede subir más
        }
    }

    createEvent(createEventDto: CreateEventDto): Event {
        this.canCreateThisEvent(createEventDto)
        return new Event(createEventDto);
    }

    inviteUserToEvent(invited: User, event: Event, createInvitationDto: CreateInvitationDto): Invitation {
        // Si el usuario a invitar es el usuario que está invitando...
        if(this.id === invited.id){
            throw new BadRequestException('No puedes invitarte a ti mismo!');
        }
        // Si el usuario que está invitando no es el creador del evento...
        if(event.organizerId !== this.id){
            throw new ForbiddenException('No puedes invitar a un evento que no eres creador!');
        }
        // Si el usuario ya aparece en las participaciones del evento...
        if(event.hasAlreadyParticipated(invited.id)) throw new BadRequestException('El usuario que estás tratando de invitar ya está participando en este evento!');

        //Si la invitación es para colaborar...(o si no lo es...)
        if(createInvitationDto.type === ParticipationType.Collaboration){
            if(!event.hasAvailableSlots()) throw new BadRequestException('No hay más cupos para colaborar en este evento, no puedes invitar a más personas para colaborar de momento...');
        }else{
            if(event.maxAttendees && event.maxAttendees >= event.participations.length) throw new BadRequestException('No hay más cupos para atender como público :(')
        }
        const invitation = new Invitation(createInvitationDto);
        return invitation;
    }

    removeInvitation(invitation: Invitation, invited: User){
        const isCancellation = this.id === invitation.event.organizerId;
        const isRejection = invited.id === invitation.userId;
        if(!isRejection && !isCancellation) throw new ForbiddenException('No puedes eliminar una invitación de la cual no eres el usuario que hizo la invitación o el usuario invitado');
        return isCancellation ? "Invitación cancelada"  : "Invitación rechazada" ;
    }

    acceptInvitation(invitation: Invitation, createParticipationDto: CreateParticipationDto){
        if(invitation.userId !== this.id) throw new ForbiddenException('No puedes aceptar una invitación de otro usuario');
        if(createParticipationDto.eventId !== invitation.eventId) throw new BadRequestException('La invitación no es para este evento');
    }

    getManagedEvents(){
        return {events: this.events, participations: this.participations, invitations: this.invitations, requests: this.requests};
    }

}
