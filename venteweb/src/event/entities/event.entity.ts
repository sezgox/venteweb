import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  Category,
  EventMode,
  ParticipationType,
  Visibility,
} from 'generated/prisma';
import { EventStatus } from 'src/core/interfaces/event-status.enum';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { CreateRequestParticipationDto } from 'src/participation/dto/create-request-participation.dto';
import { Invitation } from 'src/participation/entities/participation-invitation.entity';
import { Rating } from 'src/participation/entities/participation-rating.entity';
import { ParticipationRequest } from 'src/participation/entities/participation-request.entity';
import { Participation } from 'src/participation/entities/participation.entity';
import { User } from 'src/user/entities/user.entity';

export class VirtualPlatform {
  id?: string;
  name: string;
  link: string;

  constructor(partial: Partial<VirtualPlatform> = {}) {
    Object.assign(this, partial);
  }
}

export class OnSiteEventDetails {
  eventId?: string;
  maxAttendees?: number | null;
  maxCollaborators?: number | null;
  lat: number;
  lng: number;
  location: string;
  locationAlias?: string | null;
  startDate: Date;
  endDate: Date;
  requiresRequest = false;
  invitation?: string | null;
  totalRate?: number | null;
  ratingCount = 0;
  requests: ParticipationRequest[] = [];
  invitations: Invitation[] = [];
  ratings: Rating[] = [];

  constructor(partial: Partial<OnSiteEventDetails> = {}) {
    Object.assign(this, partial);
    this.requests = (partial.requests ?? []).map(
      (request) => new ParticipationRequest(request),
    );
    this.invitations = (partial.invitations ?? []).map(
      (invitation) => new Invitation(invitation),
    );
    this.ratings = (partial.ratings ?? []).map((rating) => new Rating(rating));
  }
}

export class VirtualEventDetails {
  eventId?: string;
  maxAttendees?: number | null;
  maxCollaborators?: number | null;
  requiresRequest = false;
  invitation?: string | null;
  totalRate?: number | null;
  ratingCount = 0;
  startDate: Date;
  endDate: Date;
  platforms: VirtualPlatform[] = [];
  requests: ParticipationRequest[] = [];
  invitations: Invitation[] = [];
  ratings: Rating[] = [];

  constructor(partial: Partial<VirtualEventDetails> = {}) {
    Object.assign(this, partial);
    this.platforms = (partial.platforms ?? []).map(
      (platform) => new VirtualPlatform(platform),
    );
    this.requests = (partial.requests ?? []).map(
      (request) => new ParticipationRequest(request),
    );
    this.invitations = (partial.invitations ?? []).map(
      (invitation) => new Invitation(invitation),
    );
    this.ratings = (partial.ratings ?? []).map((rating) => new Rating(rating));
  }
}

export class Event {
  id: string;
  organizerId: string;
  poster?: string | null;
  canceledAt?: Date | null;
  name: string;
  categories: Category[];
  description: string;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
  tags: string[] = [];
  allowPosts?: boolean;
  language?: string;
  onlyVirtual = false;
  onSiteEvent?: OnSiteEventDetails | null;
  virtualEvent?: VirtualEventDetails | null;

  participations: Participation[] = [];

  constructor(partial: Partial<Event>) {
    const normalized = partial as Partial<Event> & {
      onSite?: Partial<OnSiteEventDetails> | null;
      virtual?: Partial<VirtualEventDetails> | null;
    };
    Object.assign(this, normalized);
    this.onSiteEvent = normalized.onSiteEvent
      ? new OnSiteEventDetails(normalized.onSiteEvent)
      : normalized.onSite
        ? new OnSiteEventDetails(normalized.onSite)
        : null;
    this.virtualEvent = normalized.virtualEvent
      ? new VirtualEventDetails(normalized.virtualEvent)
      : normalized.virtual
        ? new VirtualEventDetails(normalized.virtual)
        : null;
    this.participations = (partial.participations ?? []).map(
      (participation) => new Participation(participation),
    );
  }

  get startDate(): Date {
    return this.onSiteEvent?.startDate ?? this.virtualEvent?.startDate;
  }

  get endDate(): Date {
    return this.onSiteEvent?.endDate ?? this.virtualEvent?.endDate;
  }

  get maxAttendees(): number | null | undefined {
    return this.onSiteEvent?.maxAttendees ?? this.virtualEvent?.maxAttendees;
  }

  get maxCollaborators(): number | null | undefined {
    return (
      this.onSiteEvent?.maxCollaborators ?? this.virtualEvent?.maxCollaborators
    );
  }

  get lat(): number {
    return this.onSiteEvent?.lat ?? 0;
  }

  get lng(): number {
    return this.onSiteEvent?.lng ?? 0;
  }

  get location(): string {
    return this.onSiteEvent?.location ?? '';
  }

  get locationAlias(): string {
    return this.onSiteEvent?.locationAlias ?? '';
  }

  get requiresRequest(): boolean {
    return (
      this.onSiteEvent?.requiresRequest ??
      this.virtualEvent?.requiresRequest ??
      false
    );
  }

  get totalRate(): number | null | undefined {
    return this.onSiteEvent?.totalRate ?? this.virtualEvent?.totalRate;
  }

  get ratingCount(): number {
    return this.onSiteEvent?.ratingCount ?? this.virtualEvent?.ratingCount ?? 0;
  }

  get invitation(): string | null | undefined {
    return this.onSiteEvent?.invitation ?? this.virtualEvent?.invitation;
  }

  get status(): EventStatus {
    return this.statusForMode(this.canonicalMode());
  }

  canonicalMode(): EventMode {
    return this.onSiteEvent ? EventMode.OnSite : EventMode.Virtual;
  }

  hasMode(mode: EventMode): boolean {
    return mode === EventMode.OnSite
      ? Boolean(this.onSiteEvent)
      : Boolean(this.virtualEvent);
  }

  modeDetails(mode: EventMode): OnSiteEventDetails | VirtualEventDetails {
    const details =
      mode === EventMode.OnSite ? this.onSiteEvent : this.virtualEvent;
    if (!details) {
      throw new BadRequestException(
        `Event mode ${mode} is not available for this event`,
      );
    }
    return details;
  }

  statusForMode(mode: EventMode): EventStatus {
    const details = this.modeDetails(mode);
    const now = new Date();
    if (details.startDate > now) return EventStatus.Upcoming;
    if (details.endDate > now) return EventStatus.Live;
    return EventStatus.Finished;
  }

  requestsForMode(mode: EventMode): ParticipationRequest[] {
    return [...this.modeDetails(mode).requests];
  }

  invitationsForMode(mode: EventMode): Invitation[] {
    return [...this.modeDetails(mode).invitations];
  }

  platforms(): VirtualPlatform[] {
    return [...(this.virtualEvent?.platforms ?? [])];
  }

  hasAlreadyParticipated(
    userId?: string,
    externalUserId?: string,
    eventMode?: EventMode,
  ) {
    const pool =
      eventMode == null
        ? this.participations
        : this.participations.filter(
            (participation) =>
              (participation.eventMode ?? EventMode.OnSite) === eventMode,
          );
    if (externalUserId) {
      return pool.some(
        (participation) => participation.externalUserId === externalUserId,
      );
    }
    return pool.some((participation) => participation.userId === userId);
  }

  private participationsForMode(mode: EventMode) {
    return this.participations.filter(
      (participation) => (participation.eventMode ?? EventMode.OnSite) === mode,
    );
  }

  recalculateRate(mode: EventMode = this.canonicalMode()): void {
    if (this.statusForMode(mode) !== EventStatus.Finished) {
      this.assignModeRatingAggregate(mode, null, 0);
      return;
    }

    const rated = this.participationsForMode(mode).filter(
      (participation) => typeof participation.rating?.score === 'number',
    );
    if (rated.length === 0) {
      this.assignModeRatingAggregate(mode, 0, 0);
      return;
    }

    const sum = rated.reduce(
      (acc, participation) => acc + (participation.rating?.score ?? 0),
      0,
    );
    this.assignModeRatingAggregate(mode, sum / rated.length, rated.length);
  }

  private assignModeRatingAggregate(
    mode: EventMode,
    totalRate: number | null,
    ratingCount: number,
  ): void {
    const target = this.modeDetails(mode);
    target.totalRate = totalRate;
    target.ratingCount = ratingCount;
  }

  private canGetVolunteerRequests(
    request: CreateRequestParticipationDto,
    mode: EventMode,
  ) {
    const details = this.modeDetails(mode);
    const isUpcoming = this.statusForMode(mode) === EventStatus.Upcoming;
    if (!isUpcoming) {
      throw new BadRequestException(
        'No puedes pedir voluntariado a un evento que ya está en curso o finalizado!',
      );
    }

    if (request.userId === this.organizerId) {
      throw new BadRequestException(
        'No puedes pedir colaborar en tu propio evento!',
      );
    }

    if (this.hasAlreadyParticipated(request.userId, undefined, mode)) {
      throw new BadRequestException(
        'You are already participating in this event mode, try to cancel your actual participation and send the request again!',
      );
    }

    const hasAlreadyRequested = details.requests.some(
      (existingRequest) => existingRequest.userId === request.userId,
    );
    if (hasAlreadyRequested) {
      throw new BadRequestException(
        'Ya hay una petición de voluntariado pendiente para este modo del evento',
      );
    }

    if (!details.requiresRequest) {
      throw new BadRequestException(
        'Este modo del evento no requiere peticiones para colaborar!',
      );
    }
  }

  hasAvailableSlots(mode: EventMode = this.canonicalMode()): boolean {
    const details = this.modeDetails(mode);
    const collabCount = this.participationsForMode(mode).filter(
      (participation) => participation.type === ParticipationType.Volunteer,
    ).length;
    return (
      details.maxCollaborators != null &&
      details.maxCollaborators > 0 &&
      collabCount < details.maxCollaborators
    );
  }

  addRequestParticipation(
    createRequestParticipationDto: CreateRequestParticipationDto,
  ): ParticipationRequest {
    const mode = createRequestParticipationDto.eventMode ?? EventMode.OnSite;
    this.canGetVolunteerRequests(createRequestParticipationDto, mode);
    const requestParticipation = new ParticipationRequest({
      ...createRequestParticipationDto,
      eventMode: mode,
    });
    this.modeDetails(mode).requests.push(requestParticipation);
    return requestParticipation;
  }

  acceptRequest(createParticipationDto: CreateParticipationDto) {
    const mode = createParticipationDto.eventMode ?? EventMode.OnSite;
    const request = this.modeDetails(mode).requests.find(
      (existingRequest) =>
        existingRequest.id === createParticipationDto.requestId,
    );
    if (!request) {
      throw new BadRequestException(
        'La petición solicitada para aceptar no existe',
      );
    }
    if (request.userId !== createParticipationDto.userId) {
      throw new BadRequestException(
        'La request de voluntariado no es del usuario que quieres agregar como colaborador',
      );
    }
    return this.addCollaborator(
      { ...createParticipationDto, eventMode: mode },
      { request: true },
    );
  }

  addAttendee(
    createParticipationDto: CreateParticipationDto,
    from?: { invitation?: boolean },
  ) {
    const mode = createParticipationDto.eventMode ?? EventMode.OnSite;
    const details = this.modeDetails(mode);
    const attendees = this.participationsForMode(mode).filter(
      (participation) => participation.type === ParticipationType.Attendance,
    );
    if (details.maxAttendees && details.maxAttendees <= attendees.length) {
      throw new BadRequestException(
        'No hay más cupos para atender como público :(',
      );
    }
    if (
      this.hasAlreadyParticipated(
        createParticipationDto.userId,
        createParticipationDto.externalUserId,
        mode,
      )
    ) {
      throw new BadRequestException(
        'Already participating in this event mode!',
      );
    }
    const participation = new Participation({
      ...createParticipationDto,
      eventMode: mode,
    });
    return {
      participation,
      invitationId: from?.invitation
        ? createParticipationDto.invitationId
        : null,
    };
  }

  addCollaborator(
    createParticipationDto: CreateParticipationDto,
    from?: { request?: boolean; invitation?: boolean },
  ) {
    const mode = createParticipationDto.eventMode ?? EventMode.OnSite;
    if (createParticipationDto.type !== ParticipationType.Volunteer) {
      throw new BadRequestException(
        'No puedes colaborar en un evento con una participación de tipo "Attendance"',
      );
    }
    if (
      this.hasAlreadyParticipated(
        createParticipationDto.userId,
        undefined,
        mode,
      )
    ) {
      throw new BadRequestException(
        'Already participating in this event mode!',
      );
    }
    if (!this.hasAvailableSlots(mode)) {
      throw new BadRequestException(
        'No hay más cupos para colaborar en este modo del evento :(',
      );
    }
    const participation = new Participation({
      ...createParticipationDto,
      eventMode: mode,
    });
    return {
      participation,
      requestId: from?.request ? createParticipationDto.requestId : null,
      invitationId: from?.invitation
        ? createParticipationDto.invitationId
        : null,
    };
  }

  addParticipant(
    participant: User,
    requester: User,
    createParticipationDto: CreateParticipationDto,
  ): {
    participation: Participation;
    requestId?: string;
    invitationId?: string | null;
  } {
    const mode = createParticipationDto.eventMode ?? EventMode.OnSite;
    if (this.statusForMode(mode) !== EventStatus.Upcoming) {
      throw new BadRequestException(
        'No puedes participar en un evento que ya está en curso o finalizado!',
      );
    }

    if (participant.id === this.organizerId) {
      throw new BadRequestException(
        'No puedes participar en tu propio evento!',
      );
    }

    const requesterIsCreator = requester.id === this.organizerId;

    if (createParticipationDto.requestId) {
      if (!requesterIsCreator) {
        throw new ForbiddenException(
          'Solo el creador del evento puede aceptar peticiones!',
        );
      }
      return this.acceptRequest({ ...createParticipationDto, eventMode: mode });
    }

    if (requesterIsCreator) {
      throw new BadRequestException(
        'No puedes participar en tu propio evento!',
      );
    }

    if (requester.id !== participant.id) {
      throw new ForbiddenException(
        'No puedes añadir participaciones a otros usuarios que no eres tú mismo',
      );
    }

    return createParticipationDto.type === ParticipationType.Attendance
      ? this.addAttendee({ ...createParticipationDto, eventMode: mode })
      : this.addCollaborator({ ...createParticipationDto, eventMode: mode });
  }

  rejectRequest(): void {}

  rejectPendingRequests(): void {}

  removeCollaborator(_: string): void {}

  removeRequest(requestId: string, userWhoAskToRemove: User) {
    const request =
      this.onSiteEvent?.requests.find(
        (existingRequest) => existingRequest.id === requestId,
      ) ??
      this.virtualEvent?.requests.find(
        (existingRequest) => existingRequest.id === requestId,
      );
    if (!request) {
      throw new BadRequestException(
        'La petición solicitada para eliminar no existe',
      );
    }
    const isRejection = userWhoAskToRemove.id === this.organizerId;
    const isCancellation = userWhoAskToRemove.id === request.userId;
    if (!isRejection && !isCancellation) {
      throw new ForbiddenException(
        'No puedes eliminar una petición de la cual no eres el creador ni el usuario que hizo la petición',
      );
    }
    return isCancellation ? 'Request cancelada' : 'Request rechazada';
  }

  removeParticipation(participationId: string, userWhoAskToRemove: User) {
    const participation = this.participations.find(
      (existingParticipation) => existingParticipation.id === participationId,
    );
    if (!participation) {
      throw new BadRequestException(
        'La participación solicitada para eliminar no existe',
      );
    }

    const mode = participation.eventMode ?? EventMode.OnSite;
    const details = this.modeDetails(mode);
    if (details.endDate < new Date()) {
      throw new BadRequestException(
        'No puedes eliminar una participación de un evento que ya ha terminado',
      );
    }
    if (details.startDate < new Date()) {
      throw new BadRequestException(
        'No puedes eliminar una participación de un evento que ya ha comenzado',
      );
    }

    const isCancellation = userWhoAskToRemove.id === participation.userId;
    const isElimination = userWhoAskToRemove.id === this.organizerId;
    if (!isCancellation && !isElimination) {
      throw new ForbiddenException(
        'No puedes eliminar una participación de la cual no eres el creador',
      );
    }
    if (participation.type === ParticipationType.Attendance && isElimination) {
      throw new ForbiddenException(
        'No puedes eliminar una participación de tipo asistencia a tu evento!',
      );
    }
    return isCancellation ? 'Participation cancelled' : 'Collaborator removed';
  }
}
