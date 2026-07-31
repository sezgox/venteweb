import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EventMode, ParticipationType } from 'generated/prisma';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationsService } from 'src/core/services/invitations.service';
import { Event } from 'src/event/entities/event.entity';
import { EventRepository } from 'src/event/event.repository';
import { CreateInvitationDto } from 'src/participation/dto/create-invitation.dto';
import { Invitation } from 'src/participation/entities/participation-invitation.entity';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { UserRepository } from 'src/user/user.repository';

@Injectable()
export class EventInvitationsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventRepository: EventRepository,
    private readonly invitationsService: InvitationsService,
    private readonly participationRepository: ParticipationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async inviteFriendToEvent(
    invitedUserId: string,
    createInvitationDto: CreateInvitationDto,
    inviterId: string,
  ) {
    const invitedData = await this.userRepository.findOne(invitedUserId);
    const eventData = await this.eventRepository.findOne(
      createInvitationDto.eventId,
    );
    const inviterData = await this.userRepository.findOne(inviterId);

    if (!invitedData) {
      throw new BadRequestException(
        'El usuario al que quieres invitar no existe',
      );
    }
    if (!eventData) {
      throw new BadRequestException('El evento solicitado no existe');
    }
    if (!inviterData) {
      throw new BadRequestException(
        'El usuario que trata de invitar no existe',
      );
    }

    const areFriends = await this.userRepository.usersAreFriends(
      inviterId,
      invitedUserId,
    );
    if (!areFriends) {
      throw new ForbiddenException('You can only invite friends');
    }

    const event = new Event(eventData);
    const eventMode = this.resolveEventMode(
      event,
      createInvitationDto.eventMode,
    );

    if (
      event
        .invitationsForMode(eventMode)
        .some((invitation) => invitation.userId === invitedData.id)
    ) {
      throw new BadRequestException(
        'This friend already has a pending invitation',
      );
    }

    if (invitedData.id === inviterData.id) {
      throw new BadRequestException('No puedes invitarte a ti mismo!');
    }
    if (event.organizerId !== inviterId) {
      throw new ForbiddenException(
        'No puedes invitar a un evento que no eres creador!',
      );
    }
    if (event.hasAlreadyParticipated(invitedData.id, undefined, eventMode)) {
      throw new BadRequestException(
        'El usuario que estÃ¡s tratando de invitar ya estÃ¡ participando en este modo del evento!',
      );
    }
    if (createInvitationDto.type === ParticipationType.Volunteer) {
      if (!event.hasAvailableSlots(eventMode)) {
        throw new BadRequestException(
          'No hay mÃ¡s cupos para colaborar en este modo del evento, no puedes invitar a mÃ¡s personas para colaborar de momento...',
        );
      }
    } else {
      const attendeesInMode = event.participations.filter(
        (participation) =>
          participation.type === ParticipationType.Attendance &&
          (participation.eventMode ?? EventMode.OnSite) === eventMode,
      ).length;
      const maxAttendees =
        eventMode === EventMode.OnSite
          ? event.onSiteEvent?.maxAttendees
          : event.virtualEvent?.maxAttendees;
      if (
        maxAttendees != null &&
        maxAttendees > 0 &&
        attendeesInMode >= maxAttendees
      ) {
        throw new BadRequestException(
          'No hay mÃ¡s cupos para atender como pÃºblico en este modo del evento :(',
        );
      }
    }

    const invitation = new Invitation({
      ...createInvitationDto,
      eventMode,
    });
    const encryptedMasterKey =
      eventMode === EventMode.OnSite
        ? event.onSiteEvent?.invitation
        : event.virtualEvent?.invitation;
    if (!encryptedMasterKey) {
      throw new BadRequestException(
        `Event mode ${eventMode} does not support invitations`,
      );
    }
    const masterKey =
      this.invitationsService.decryptMasterKey(encryptedMasterKey);
    const token = await this.invitationsService.generateInvitation(
      event.id,
      event.organizerId,
      masterKey,
      invitedData.id,
      undefined,
      eventMode,
    );

    invitation.userId = invitedData.id;
    invitation.eventMode = eventMode;
    invitation.invitationToken = token;

    const createdInvitation =
      await this.participationRepository.createInvitationToParticipate(
        invitation,
      );
    const hydratedInvitation =
      await this.participationRepository.findInvitationById(
        createdInvitation.id,
      );

    this.eventEmitter.emit('invitation.created', {
      eventId: invitation.eventId,
      invitedUserId: invitation.userId,
      eventName: event.name,
      text: invitation.text,
    });

    return hydratedInvitation;
  }

  private resolveEventMode(event: Event, requestedMode?: EventMode) {
    const eventMode = requestedMode ?? event.canonicalMode();
    if (!event.hasMode(eventMode)) {
      throw new BadRequestException(
        `Event mode ${eventMode} is not available for this event`,
      );
    }
    return eventMode;
  }
}
