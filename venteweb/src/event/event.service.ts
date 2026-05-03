import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Category,
  EventMode,
  ParticipationType,
  Prisma,
  Visibility,
} from 'generated/prisma';
import { UuidService } from 'nestjs-uuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventInvitationsService } from 'src/core/services/event-invitations.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { CreateInvitationDto } from 'src/participation/dto/create-invitation.dto';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { ExternalInvitationActionDto } from 'src/participation/dto/external-invitation-action.dto';
import { PrepareInvitationDto } from 'src/participation/dto/prepare-invitation.dto';
import { CreateRequestParticipationDto } from 'src/participation/dto/create-request-participation.dto';
import { Invitation } from 'src/participation/entities/participation-invitation.entity';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { User } from 'src/user/entities/user.entity';
import { UserRepository } from 'src/user/user.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventRepository } from './event.repository';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly participationRepository: ParticipationRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userRepository: UserRepository,
    private readonly uuidService: UuidService,
    private readonly invitationsService: InvitationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly eventInvitationsService: EventInvitationsService,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    file: Express.Multer.File,
    reqUserId: string,
  ) {
    if (createEventDto.onSite) {
      const masterKey = this.invitationsService.generateMasterKey();
      (createEventDto.onSite as any).invitation =
        this.invitationsService.encryptMasterKey(masterKey);
    }
    if (createEventDto.virtual) {
      const masterKey = this.invitationsService.generateMasterKey();
      (createEventDto.virtual as any).invitation =
        this.invitationsService.encryptMasterKey(masterKey);
    }

    const include = { events: true };
    const userData = await this.userRepository.findOne(reqUserId, include);
    if (!userData) throw new NotFoundException(`User ${reqUserId} not found`);
    if (
      createEventDto.organizerId &&
      userData.id !== createEventDto.organizerId
    ) {
      throw new ForbiddenException(
        'No puedes crear eventos para otros usuarios',
      );
    }
    createEventDto.organizerId = userData.id;
    createEventDto.id = this.uuidService.generate();

    const user = new User(userData);
    const event = user.createEvent(createEventDto);

    let cdPayload: any;

    try {
      if (file) {
        const folder = 'events/' + createEventDto.id;
        cdPayload = await this.cloudinaryService.uploadFile(file, folder);
        const imageUrl = cdPayload.secure_url;
        event.poster = imageUrl;
      } else {
        event.poster = null;
      }
      const createdEvent = await this.eventRepository.create(event);
      return this.sanitizeEventForPublicView(createdEvent);
    } catch (error) {
      if (cdPayload?.public_id) {
        await this.cloudinaryService.deleteFile(cdPayload.public_id);
      }

      throw new BadRequestException(
        `Error creating event: ${error.message || error}`,
      );
    }
  }

  async findAll(
    filter: FilterEventDto,
    reqUserId?: string,
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Default de fecha
    filter.date = filter.date ?? new Date();
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const user = await this.userRepository.findOne(reqUserId);
    let friendsIds = [];
    if (user) {
      friendsIds = await this.userRepository.getFriends(user.id);
      friendsIds.push(user.id);
    }

    const volunteerOnly =
      filter.volunteer === true || filter.collaboration === true;
    const virtualScope = filter.virtualScope === 'all'
      ? 'all'
      : filter.virtual === true
        ? 'hybrid'
        : undefined;

    // Distance ordering (raw SQL through repository)
    if (filter.sortBy === 'distance' && virtualScope !== 'all') {
      const { centerLat, centerLng, latMin, latMax, lngMin, lngMax } =
        this.computeGeoParams(filter);

      const rows = await this.eventRepository.findEventIdsByDistance({
        centerLat,
        centerLng,
        date: filter.date,
        endDate: filter.endDate,
        language: filter.language,
        search: filter.search,
        category: filter.category as any,
        latMin,
        latMax,
        lngMin,
        lngMax,
        friendsIds,
        hasUser: !!user,
        requireVirtual: virtualScope === 'hybrid',
      });

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) {
        return { events: [], total: 0, page, limit };
      }

      const events = await this.eventRepository.findMany({
        id: { in: ids },
      } as any);
      const order = new Map<string, number>();
      rows.forEach((r, i) => order.set(r.id, i));
      events.sort((a: any, b: any) => order.get(a.id)! - order.get(b.id)!);

      let pipeline = volunteerOnly
        ? this.filterEventsNeedingVolunteers(events, EventMode.OnSite)
        : events;

      // Raw distance query matches name/tags only; align with full search (description, location, categories).
      const searchTerm = filter.search?.trim();
      if (searchTerm) {
        pipeline = pipeline.filter((event: any) =>
          this.matchesSearchTerm(event, searchTerm),
        );
      }

      const total = pipeline.length;
      const paged = pipeline.slice(skip, skip + limit);
      return {
        events: paged.map((event) => this.sanitizeEventForPublicView(event)),
        total,
        page,
        limit,
      };
    }

    const visibilityWhere = user
      ? this.getVisibilityWhere(filter.visibility, friendsIds)
      : { visibility: Visibility.Public };

    const baseWhere = this.getBaseWhere(filter, virtualScope);

    const where = { ...baseWhere, ...visibilityWhere };

    const orderBy = this.getOrderBy(filter);

    if (virtualScope === 'all') {
      let ordered = await this.eventRepository.findManyOrdered(where, {
        updatedAt: 'desc',
      });
      ordered = ordered.sort((a: any, b: any) => {
        const aStart = new Date(
          a.virtualEvent?.startDate ?? a.onSiteEvent?.startDate ?? 0,
        ).getTime();
        const bStart = new Date(
          b.virtualEvent?.startDate ?? b.onSiteEvent?.startDate ?? 0,
        ).getTime();
        return aStart - bStart;
      });
      const filtered = volunteerOnly
        ? this.filterEventsNeedingVolunteers(ordered, EventMode.Virtual)
        : ordered;
      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);
      return {
        events: paged.map((event) => this.sanitizeEventForPublicView(event)),
        total,
        page,
        limit,
      };
    }

    // Collaboration filter is applied in memory until expressed in Prisma (COUNT volunteer participations vs maxCollaborators).
    if (!volunteerOnly) {
      const total = await this.eventRepository.count(where);
      const events = await this.eventRepository.findManyPaginated({
        where,
        orderBy,
        skip,
        take: limit,
      });
      return {
        events: events.map((event) => this.sanitizeEventForPublicView(event)),
        total,
        page,
        limit,
      };
    }

    const ordered = await this.eventRepository.findManyOrdered(where, orderBy);
    const filtered = this.filterEventsNeedingVolunteers(
      ordered,
      EventMode.OnSite,
    );
    const total = filtered.length;
    const paged = filtered.slice(skip, skip + limit);
    return {
      events: paged.map((event) => this.sanitizeEventForPublicView(event)),
      total,
      page,
      limit,
    };
  }

  private filterEventsNeedingVolunteers(
    events: any[],
    mode: EventMode,
  ): any[] {
    return events.filter(
      (e: any) =>
        (mode === EventMode.OnSite
          ? e.onSiteEvent?.maxCollaborators
          : e.virtualEvent?.maxCollaborators) != null &&
        e.participations.filter(
          (p: any) =>
            p.type === ParticipationType.Volunteer &&
            (p.eventMode ?? EventMode.OnSite) === mode,
        ).length <
          (mode === EventMode.OnSite
            ? e.onSiteEvent?.maxCollaborators
            : e.virtualEvent?.maxCollaborators),
    );
  }

  private getOrderBy(
    filter: FilterEventDto,
  ):
    | Prisma.EventOrderByWithRelationInput
    | Prisma.EventOrderByWithRelationInput[] {
    const sortBy = filter.sortBy || 'date';

    switch (sortBy) {
      case 'date':
        return {
          onSiteEvent: {
            startDate: 'asc',
          },
        } as Prisma.EventOrderByWithRelationInput;

      case 'popularity':
        return {
          participations: {
            _count: 'desc',
          },
        };

      default:
        return {
          onSiteEvent: {
            startDate: 'asc',
          },
        } as Prisma.EventOrderByWithRelationInput;
    }
  }

  private getBaseWhere(filter: FilterEventDto, virtualScope?: 'hybrid' | 'all') {
    const where: Prisma.EventWhereInput = {
      language: filter.language || undefined,
      categories: filter.category ? { has: filter.category } : undefined,
    };

    if (virtualScope === 'all') {
      where.virtualEvent = {
        is: {
          startDate: { lte: filter.endDate || undefined },
          endDate: { gte: filter.date, lte: filter.endDate || undefined },
        },
      };
    } else {
      const onSiteWhere: Prisma.OnSiteEventWhereInput = {
        startDate: { lte: filter.endDate || undefined },
        endDate: { gte: filter.date, lte: filter.endDate || undefined },
      };

      if (
        filter.latMin !== undefined &&
        filter.latMax !== undefined &&
        filter.lngMin !== undefined &&
        filter.lngMax !== undefined
      ) {
        onSiteWhere.lat = { gte: filter.latMin, lte: filter.latMax };
        onSiteWhere.lng = { gte: filter.lngMin, lte: filter.lngMax };
      } else if (
        filter.lat !== undefined &&
        filter.lng !== undefined &&
        filter.radius !== undefined
      ) {
        const centerLat = filter.lat;
        const centerLng = filter.lng;
        const radiusKm = filter.radius;
        const latDelta = radiusKm / 111;
        const lngDelta =
          radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

        onSiteWhere.lat = {
          gte: centerLat - latDelta,
          lte: centerLat + latDelta,
        };
        onSiteWhere.lng = {
          gte: centerLng - lngDelta,
          lte: centerLng + lngDelta,
        };
      }

      where.onSiteEvent = { is: onSiteWhere };
      if (virtualScope === 'hybrid') {
        where.virtualEvent = { isNot: null };
      }
    }

    const searchTerm = filter.search?.trim();
    if (searchTerm) {
      const searchFilters = this.buildSearchFilters(
        searchTerm,
        virtualScope === 'all',
      );
      if (searchFilters.length > 0) {
        const existingAnd = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];
        where.AND = [...existingAnd, { OR: searchFilters }];
      }
    }

    return where;
  }

  private buildSearchFilters(
    searchTerm: string,
    includeVirtualPlatforms = false,
  ): Prisma.EventWhereInput[] {
    const normalized = searchTerm.toLowerCase();
    const tagCandidates = Array.from(
      new Set([searchTerm, normalized, searchTerm.toUpperCase()]),
    );
    const categoryMatches = Object.values(Category).filter((category) =>
      category.toLowerCase().includes(normalized),
    );

    const filters: Prisma.EventWhereInput[] = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { tags: { hasSome: tagCandidates } },
      {
        onSiteEvent: {
          is: {
            location: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      },
      {
        onSiteEvent: {
          is: {
            locationAlias: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      },
    ];

    if (includeVirtualPlatforms) {
      filters.push({
        virtualEvent: {
          is: {
            platforms: {
              some: {
                OR: [
                  { name: { contains: searchTerm, mode: 'insensitive' } },
                  { link: { contains: searchTerm, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      });
    }

    categoryMatches.forEach((category) => {
      filters.push({ categories: { has: category } });
    });

    return filters;
  }

  private getVisibilityWhere(visibility: Visibility, friendsIds: string[]) {
    let visibilityFilter: any;
    switch (visibility) {
      case Visibility.Private:
        // Solo eventos de amigos
        visibilityFilter = {
          visibility: Visibility.Private,
          organizerId: { in: friendsIds },
        };
        break;

      case Visibility.Public:
        visibilityFilter = { visibility: Visibility.Public };
        break;

      default:
        visibilityFilter = {
          OR: [
            { visibility: Visibility.Public },
            { visibility: Visibility.Private, organizerId: { in: friendsIds } },
          ],
        };
        break;
    }
    return visibilityFilter;
  }

  private matchesSearchTerm(event: any, search: string) {
    const term = search.toLowerCase();
    const nameMatch = event.name?.toLowerCase().includes(term);
    const descriptionMatch = event.description?.toLowerCase().includes(term);
    const locationMatch =
      event.onSiteEvent?.location?.toLowerCase().includes(term) ||
      event.onSiteEvent?.locationAlias?.toLowerCase().includes(term);
    const tagsMatch =
      Array.isArray(event.tags) &&
      event.tags.some((tag: string) => tag.toLowerCase().includes(term));
    const categoriesMatch =
      Array.isArray(event.categories) &&
      event.categories.some((category: string) =>
        category.toLowerCase().includes(term),
      );
    const platformMatch =
      Array.isArray(event.virtualEvent?.platforms) &&
      event.virtualEvent.platforms.some(
        (platform: { name?: string; link?: string }) =>
          platform.name?.toLowerCase().includes(term) ||
          platform.link?.toLowerCase().includes(term),
      );

    return Boolean(
      nameMatch ||
        descriptionMatch ||
        locationMatch ||
        tagsMatch ||
        categoriesMatch ||
        platformMatch,
    );
  }
  private computeGeoParams(filter: FilterEventDto) {
    let centerLat: number;
    let centerLng: number;
    let latMin: number | undefined;
    let latMax: number | undefined;
    let lngMin: number | undefined;
    let lngMax: number | undefined;

    const hasBBox =
      filter.latMin !== undefined &&
      filter.latMax !== undefined &&
      filter.lngMin !== undefined &&
      filter.lngMax !== undefined;

    if (hasBBox) {
      centerLat = (filter.latMin! + filter.latMax!) / 2;
      centerLng = (filter.lngMin! + filter.lngMax!) / 2;
      latMin = filter.latMin!;
      latMax = filter.latMax!;
      lngMin = filter.lngMin!;
      lngMax = filter.lngMax!;
    } else {
      const centerLatIn = filter.lat!;
      const centerLngIn = filter.lng!;
      const radiusKm = filter.radius!;
      const latDelta = radiusKm / 111;
      const lngDelta =
        radiusKm / (111 * Math.cos((centerLatIn * Math.PI) / 180));
      centerLat = centerLatIn;
      centerLng = centerLngIn;
      latMin = centerLatIn - latDelta;
      latMax = centerLatIn + latDelta;
      lngMin = centerLngIn - lngDelta;
      lngMax = centerLngIn + lngDelta;
    }

    return { centerLat, centerLng, latMin, latMax, lngMin, lngMax };
  }

  async findOne(id: string, reqUserId: string, invitation?: string) {
    const event = await this.eventRepository.findOne(id);
    const user = await this.userRepository.findOne(reqUserId);
    // Si el usuario ha enviado un token de invitación (recibido desde una invitación privada por la app o desde un link de invitación público), verificamos que sea válido
    const decodedInvitation = invitation
      ? this.invitationsService.decodeInvitation(invitation)
      : null;
    const invitationMode = this.resolveEventMode(
      event,
      decodedInvitation?.eventMode,
    );
    const invitationIsValid = invitation
      ? await this.invitationIsValid(
          event,
          invitation,
          invitationMode,
          decodedInvitation?.invitedUser,
          decodedInvitation?.externalUserId,
        )
      : false;
    let areFriends = false;
    
    if (user) {
      // Si el usuario es el creador del evento, devuelve el evento
      if (user.id === event.organizerId) {
        return this.sanitizeEventForPublicView(event);
      }
      // Si el evento es privado, verificamos si el usuario es un amigo del creador o tiene una invitación válida
      if (event.visibility === Visibility.Private) {
        areFriends = await this.userRepository.usersAreFriends(
          user.id,
          event.organizerId,
        );
        // Si el usuario no es un amigo del creador y no tiene una invitación válida, devuelve un error
        if (!areFriends && !invitationIsValid) {
          throw new ForbiddenException(
            'El evento no es público,no tienes una invitación válida y no eres un amigo del creador, así que no puedes verlo!',
          );
        }
      }
    }
    if(invitationIsValid || event.visibility === Visibility.Public || areFriends){
      // Si el usuario tiene una invitación válida o el evento es público o son amigos, devuelve el evento
          return this.sanitizeEventForPublicView(event);
    }else if(event.visibility === Visibility.Private && !invitationIsValid){
      throw new ForbiddenException(
        'El evento no es público y no tienes una invitación válida, así que no puedes verlo!',
      );
    }
  }

  private async invitationIsValid(
    eventData: any,
    invitation: string,
    eventMode: EventMode,
    invitedUser?: string,
    externalUserId?: string,
  ): Promise<boolean> {
    const encryptedKey = this.getModeInvitationSecret(eventData, eventMode);
    if (!encryptedKey) {
      return false;
    }
    const masterKey = this.invitationsService.decryptMasterKey(encryptedKey);
    return await this.invitationsService.verifyInvitation(
      invitation,
      masterKey,
      invitedUser,
      externalUserId,
    );
  }

  update(id: string, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  async remove(id: string, reqUserId: string) {
    const user = await this.userRepository.findOne(reqUserId);
    const eventData = await this.eventRepository.findOne(id);
    const event = new Event(eventData);
    if (event.endDate < new Date())
      throw new BadRequestException('No puedes eliminar eventos ya acabados');
    if (event.startDate < new Date())
      throw new BadRequestException('No puedes eliminar eventos ya comenzados');
    if (!event) throw new NotFoundException('El evento no existe');
    if (!user) throw new NotFoundException('El usuario solicitante no existe');
    if (user.id === event.organizerId) {
      try {
        if (event.poster) {
          const public_id = this.getPublicId(event.poster);
          this.cloudinaryService.deleteFile(public_id);
        }
      } catch (error) {
        throw new BadRequestException('Error al eliminar poster del evento!');
      } finally {
        return this.eventRepository.remove(id);
      }
    } else {
      throw new ForbiddenException(
        'No eres el creador del evento, no puedes eliminarlo',
      );
    }
  }

  getPublicId(url: string): string {
    const parts = url.split('/upload/');
    const pathAndVersion = parts[1];
    const pathParts = pathAndVersion.split('/').slice(1);
    const fileWithExt = pathParts.pop();
    const fileName = fileWithExt.split('.')[0];
    return [...pathParts, fileName].join('/');
  }

  async requestParticipation(
    eventId: string,
    createRequestParticipationDto: CreateRequestParticipationDto,
    reqUserId: string,
  ) {
    const eventData = await this.eventRepository.findOne(eventId);
    const requester = await this.userRepository.findOne(reqUserId);
    const eventFromAFriend = await this.userRepository.usersAreFriends(
      eventData.organizerId,
      requester.id,
    );
    if (!requester)
      throw new NotFoundException('El usuario solicitante no existe');
    if (!eventData)
      throw new NotFoundException('El evento solicitado no existe');
    if (requester.id !== createRequestParticipationDto.userId)
      throw new ForbiddenException('No puedes crear requests a otros usuarios');
    const event = new Event(eventData);
    const requestMode = this.resolveEventMode(
      eventData,
      createRequestParticipationDto.eventMode,
    );
    const invitationIsValid = createRequestParticipationDto.invitationToken
      ? await this.invitationIsValid(
          eventData,
          createRequestParticipationDto.invitationToken,
          requestMode,
        )
      : false;
    if (
      !invitationIsValid &&
      event.visibility == Visibility.Private &&
      !eventFromAFriend
    )
      throw new ForbiddenException(
        'Necesitas una invitación válida para colaborar en este evento!',
      );
    createRequestParticipationDto.eventId = event.id;
    createRequestParticipationDto.eventMode = requestMode;
    const requestParticipation = event.addRequestParticipation(
      createRequestParticipationDto,
    );
    return await this.participationRepository.createRequestParticipation(
      requestParticipation,
    );
  }

  async getInvitationToken(
    eventId: string,
    reqUserId: string,
    requestedMode?: EventMode,
  ) {
    const user = await this.userRepository.findOne(reqUserId);
    const event = await this.eventRepository.findOne(eventId);
    if (!event) throw new NotFoundException('El evento no existe');
    if (event.organizerId !== user.id)
      throw new ForbiddenException(
        'No puedes generar invitaciones para eventos que no eres creador',
      );
    const eventMode = this.resolveEventMode(event, requestedMode);
    const masterKey = this.invitationsService.decryptMasterKey(
      this.getModeInvitationSecret(event, eventMode),
    );
    const token = await this.invitationsService.generateInvitation(
      event.id,
      user.id,
      masterKey,
      undefined,
      undefined,
      eventMode,
    );
    return token;
  }

  async prepareInvitation(
    eventId: string,
    dto: PrepareInvitationDto,
    requesterId: string,
  ) {
    const eventData = await this.eventRepository.findOne(eventId);
    const requesterData = await this.userRepository.findOne(requesterId);

    if (!eventData) throw new NotFoundException('Event not found');
    if (!requesterData) throw new NotFoundException('Requester user not found');
    if (eventData.organizerId !== requesterData.id)
      throw new ForbiddenException('Only organizer can prepare invitations');
    if (dto.eventId !== eventId)
      throw new BadRequestException('Body eventId must match route event id');

    const event = new Event(eventData);
    const requester = new User(requesterData);

    const invitation = dto.userId
      ? await this.prepareRegisteredInvitation(requester.id, dto)
      : await this.prepareExternalInvitation(event, requester, dto);

    await this.dispatchPreparedInvitation(event, requester, invitation);
    return invitation;
  }

  private async prepareRegisteredInvitation(
    requesterId: string,
    dto: PrepareInvitationDto,
  ) {
    const invitationDto: CreateInvitationDto = {
      eventId: dto.eventId,
      text: dto.text,
      type: dto.type,
      userId: dto.userId,
      eventMode: dto.eventMode,
    };
    return await this.eventInvitationsService.inviteFriendToEvent(
      dto.userId,
      invitationDto,
      requesterId,
    );
  }

  private async prepareExternalInvitation(
    event: Event,
    requester: User,
    dto: PrepareInvitationDto,
  ) {
    const eventMode = this.resolveEventMode(event, dto.eventMode);
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const email = this.normalizeOptionalEmail(dto.email);
    const phone = this.normalizeOptionalPhone(dto.phone);

    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    const hasEmail = Boolean(email);
    const hasPhone = Boolean(phone);

    if (!hasEmail && !hasPhone)
      throw new BadRequestException(
        'You need to provide at least one contact method: email or phone',
      );

    const existingRegisteredUser = email
      ? await this.userRepository.findByUniqueInput({ email })
      : null;

    if (existingRegisteredUser) {
      const areFriends = await this.userRepository.usersAreFriends(
        requester.id,
        existingRegisteredUser.id,
      );
      if (!areFriends) {
        throw new ForbiddenException(
          'If the email belongs to a registered user, they must be your friend',
        );
      }

      return await this.prepareRegisteredInvitation(requester.id, {
        eventId: dto.eventId,
        text: dto.text,
        type: dto.type,
        userId: existingRegisteredUser.id,
        eventMode,
      });
    }

    const externalUser = await this.resolveExternalUserIdentity({
      firstName,
      lastName,
      email,
      phone,
    });

    if (
      externalUser &&
      event
        .invitationsForMode(eventMode)
        .some((invitation: any) => invitation.externalUserId === externalUser.id)
    ) {
      throw new BadRequestException(
        'This external contact already has a pending invitation',
      );
    }

    if (event.hasAlreadyParticipated(undefined, externalUser.id, eventMode)) {
      throw new BadRequestException(
        'This external contact is already participating in this event mode',
      );
    }

    const masterKey = this.invitationsService.decryptMasterKey(
      this.getModeInvitationSecret(event, eventMode),
    );
    const token = await this.invitationsService.generateInvitation(
      event.id,
      requester.id,
      masterKey,
      undefined,
      externalUser.id,
      eventMode,
    );
    const invitation = new Invitation({
      externalUserId: externalUser.id,
      eventId: event.id,
      eventMode,
      text: dto.text,
      invitationToken: token,
      type: ParticipationType.Attendance,
    });
    const createdInvitation =
      await this.participationRepository.createInvitationToParticipate(
        invitation,
      );
    const hydratedInvitation =
      await this.participationRepository.findInvitationById(
        createdInvitation.id,
      );
    return hydratedInvitation;
  }

  private async resolveExternalUserIdentity(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }) {
    const externalUserByEmail = data.email
      ? await this.participationRepository.findExternalUserByEmail(data.email)
      : null;
    const externalUserByPhone = data.phone
      ? await this.participationRepository.findExternalUserByPhone(data.phone)
      : null;

    if (
      externalUserByEmail &&
      externalUserByPhone &&
      externalUserByEmail.id !== externalUserByPhone.id
    ) {
      throw new ConflictException(
        'Email and phone belong to different external contacts',
      );
    }

    const externalUser = externalUserByEmail || externalUserByPhone;

    if (!externalUser) {
      return await this.participationRepository.createExternalUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      });
    }

    const updatePayload: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    } = {};

    if (!externalUser.email && data.email) {
      updatePayload.email = data.email;
    }

    if (!externalUser.phone && data.phone) {
      updatePayload.phone = data.phone;
    }

    if (externalUser.firstName !== data.firstName) {
      updatePayload.firstName = data.firstName;
    }

    if (externalUser.lastName !== data.lastName) {
      updatePayload.lastName = data.lastName;
    }

    if (Object.keys(updatePayload).length === 0) {
      return externalUser;
    }

    return await this.participationRepository.updateExternalUser(
      externalUser.id,
      updatePayload,
    );
  }

  private normalizeOptionalEmail(email?: string) {
    if (!email) return undefined;
    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeOptionalPhone(phone?: string) {
    if (!phone) return undefined;
    const normalized = phone.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private async dispatchPreparedInvitation(
    event: Event,
    requester: User,
    invitation: Invitation,
  ) {
    //NOTIFICA AL USUARIO EXTERNO INVITADO POR EMAIL
    if (invitation.externalUser?.email) {
      this.eventEmitter.emit('external-invitation.created', {
        eventId: event.id,
        eventName: event.name,
        invitationId: invitation.id,
        invitationToken: invitation.invitationToken,
        invitationText: invitation.text,
        organizerName: requester.name,
        organizerEmail: requester.email,
        recipientFirstName: invitation.externalUser.firstName,
        recipientLastName: invitation.externalUser.lastName,
        recipientEmail: invitation.externalUser.email || undefined,
      });
    }
  }

  async createParticipation(
    eventId: string,
    createParticipationDto: CreateParticipationDto,
    reqUserId: string,
  ) {
    if (createParticipationDto.invitationId) {
      return await this.acceptRegisteredInvitation(
        eventId,
        createParticipationDto,
        reqUserId,
      );
    }

    if (createParticipationDto.requestId) {
      return await this.acceptParticipationRequest(
        eventId,
        createParticipationDto,
        reqUserId,
      );
    }

    return await this.createDirectParticipation(
      eventId,
      createParticipationDto,
      reqUserId,
    );
  }

  async acceptExternalInvitation(
    externalUserId: string,
    dto: ExternalInvitationActionDto,
  ) {
    const invitation =
      await this.participationRepository.findExternalInvitationByToken(
        externalUserId,
        dto.invitation,
        dto.eventId,
      );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (dto.eventId && dto.eventId !== invitation.eventId) {
      throw new BadRequestException(
        'Body eventId must match invitation event id',
      );
    }

    const { eventData, event } = await this.loadEventParticipationContext(
      invitation.eventId,
    );
    const eventMode = this.resolveEventMode(
      eventData,
      dto.eventMode ?? invitation.eventMode,
    );
    const tokenOk = await this.invitationIsValid(
      eventData,
      dto.invitation,
      eventMode,
      undefined,
      externalUserId,
    );
    if (!tokenOk) {
      throw new ForbiddenException('Invalid invitation token');
    }
    if (invitation.type !== ParticipationType.Attendance) {
      throw new BadRequestException(
        'External users cannot be invited as volunteers',
      );
    }

    const createParticipationDto: CreateParticipationDto = {
      eventId: invitation.eventId,
      eventMode,
      type: invitation.type,
      invitation: dto.invitation,
      invitationId: invitation.id,
      externalUserId,
    };

    const { participation } = event.addAttendee(createParticipationDto, {
      invitation: true,
    });
    participation.externalUserId = externalUserId;

    return await this.participationRepository.createParticipation({
      participation,
      invitationId: invitation.id,
    });
  }

  async rejectExternalInvitation(
    externalUserId: string,
    dto: ExternalInvitationActionDto,
  ) {
    const invitation =
      await this.participationRepository.findExternalInvitationByToken(
        externalUserId,
        dto.invitation,
        dto.eventId,
      );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (dto.eventId && dto.eventId !== invitation.eventId) {
      throw new BadRequestException(
        'Body eventId must match invitation event id',
      );
    }

    const eventData = await this.eventRepository.findOne(invitation.eventId);
    const eventMode = this.resolveEventMode(
      eventData,
      dto.eventMode ?? invitation.eventMode,
    );
    const tokenOk = await this.invitationIsValid(
      eventData,
      dto.invitation,
      eventMode,
      undefined,
      externalUserId,
    );
    if (!tokenOk) {
      throw new ForbiddenException('Invalid invitation token');
    }

    return await this.participationRepository.removeInvitation(invitation.id);
  }

  private async acceptRegisteredInvitation(
    eventId: string,
    createParticipationDto: CreateParticipationDto,
    reqUserId: string,
  ) {
    const invitation = await this.participationRepository.findInvitationById(
      createParticipationDto.invitationId,
    );
    const requesterData = await this.userRepository.findOne(reqUserId);
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (!requesterData)
      throw new NotFoundException('Requester user does not exist');
    if (invitation.eventId !== eventId)
      throw new BadRequestException('Invitation does not belong to this event');
    if (invitation.externalUserId) {
      throw new ForbiddenException(
        'External invitations must be accepted through the public external endpoint',
      );
    }

    const { eventData, event } = await this.loadEventParticipationContext(
      eventId,
    );
    const eventMode = this.resolveEventMode(
      eventData,
      createParticipationDto.eventMode ?? invitation.eventMode,
    );
    const tokenToVerify =
      createParticipationDto.invitation || invitation.invitationToken;
    const tokenOk = await this.invitationIsValid(
      eventData,
      tokenToVerify,
      eventMode,
      invitation.userId ?? undefined,
    );
    if (!tokenOk) throw new ForbiddenException('Invalid invitation token');
    if (invitation.userId !== requesterData.id) {
      throw new ForbiddenException('You cannot accept another user invitation');
    }

    createParticipationDto.eventId = eventId;
    createParticipationDto.eventMode = eventMode;
    createParticipationDto.type = invitation.type;
    createParticipationDto.invitation = tokenToVerify;
    createParticipationDto.invitationId = invitation.id;
    createParticipationDto.userId = requesterData.id;
    createParticipationDto.externalUserId = undefined;

    if (invitation.type === ParticipationType.Attendance) {
      const { participation } = event.addAttendee(createParticipationDto, {
        invitation: true,
      });
      return await this.participationRepository.createParticipation({
        participation,
        invitationId: invitation.id,
      });
    }

    if (invitation.type === ParticipationType.Volunteer) {
      const { participation } = event.addCollaborator(createParticipationDto, {
        invitation: true,
      });
      return await this.participationRepository.createParticipation({
        participation,
        invitationId: invitation.id,
      });
    }

    throw new BadRequestException('Unsupported invitation participation type');
  }

  private async acceptParticipationRequest(
    eventId: string,
    createParticipationDto: CreateParticipationDto,
    reqUserId: string,
  ) {
    return await this.createParticipationFromRegisteredUserContext(
      eventId,
      createParticipationDto,
      reqUserId,
    );
  }

  private async createDirectParticipation(
    eventId: string,
    createParticipationDto: CreateParticipationDto,
    reqUserId: string,
  ) {
    return await this.createParticipationFromRegisteredUserContext(
      eventId,
      createParticipationDto,
      reqUserId,
    );
  }

  private async createParticipationFromRegisteredUserContext(
    eventId: string,
    createParticipationDto: CreateParticipationDto,
    reqUserId: string,
  ) {
    const requesterData = await this.userRepository.findOne(reqUserId);
    const participantData = await this.userRepository.findOne(
      createParticipationDto.userId,
    );
    const eventData = await this.eventRepository.findOne(eventId);
    if (!requesterData || !participantData)
      throw new NotFoundException(
        'No puedes participar en este evento, usuario no existe',
      );
    if (!eventData) throw new NotFoundException('El evento no existe');

    const eventFromAFriend =
      (await this.userRepository.usersAreFriends(
        eventData.organizerId,
        requesterData.id,
      )) || requesterData.id === eventData.organizerId;
    const eventMode = this.resolveEventMode(
      eventData,
      this.inferRequestMode(
        eventData,
        createParticipationDto.requestId,
        createParticipationDto.eventMode,
      ),
    );
    createParticipationDto.eventId = eventId;
    createParticipationDto.eventMode = eventMode;
    const participant = new User(participantData);
    const event = new Event(eventData);
    const requester = new User(requesterData);
    const invitationIsValid = createParticipationDto.invitation
      ? await this.invitationIsValid(
          eventData,
          createParticipationDto.invitation,
          eventMode,
        )
      : false;
    if (
      event.visibility == Visibility.Private &&
      !invitationIsValid &&
      !eventFromAFriend
    )
      throw new ForbiddenException(
        'Necesitas una invitacion valida para participar en este evento!',
      );
    const participation = event.addParticipant(
      participant,
      requester,
      createParticipationDto,
    );
    return await this.participationRepository.createParticipation(
      participation,
    );
  }

  private async loadEventParticipationContext(eventId: string) {
    const eventData = await this.eventRepository.findOne(eventId);
    const event = new Event(eventData);
    event.participations =
      await this.participationRepository.getParticipationsByEvent(eventId);
    return { eventData, event };
  }

  async cancelOrRejectRequest(
    eventId: string,
    requestId: string,
    reqUserId: string,
  ) {
    const eventData = await this.eventRepository.findOne(eventId);
    const userWhoAskToRemoveData = await this.userRepository.findOne(reqUserId);
    if (!eventData)
      throw new NotFoundException('El evento solicitado no existe');
    if (!userWhoAskToRemoveData)
      throw new NotFoundException('El usuario solicitante no existe');
    const userWhoAskToRemove = new User(userWhoAskToRemoveData);
    const event = new Event(eventData);
    const message = event.removeRequest(requestId, userWhoAskToRemove);
    const removedRequest =
      await this.participationRepository.removeParticipationRequest(requestId);
    return { removedRequest, message };
  }

  async removeParticipation(
    eventId: string,
    participationId: string,
    reqUserId: string,
  ) {
    const eventData = await this.eventRepository.findOne(eventId);
    const userWhoAskToRemoveData = await this.userRepository.findOne(reqUserId);
    if (!eventData)
      throw new NotFoundException('El evento solicitado no existe');
    if (!userWhoAskToRemoveData)
      throw new NotFoundException('El usuario solicitante no existe');
    const userWhoAskToRemove = new User(userWhoAskToRemoveData);
    const event = new Event(eventData);
    const message = event.removeParticipation(
      participationId,
      userWhoAskToRemove,
    );
    const removedParticipation =
      await this.participationRepository.removeParticipation(participationId);
    return { removedParticipation, message };
  }

  private resolveEventMode(eventData: any, requestedMode?: EventMode) {
    const event = eventData instanceof Event ? eventData : new Event(eventData);
    const eventMode = requestedMode ?? event.canonicalMode();
    if (!event.hasMode(eventMode)) {
      throw new BadRequestException(
        `Event mode ${eventMode} is not available for this event`,
      );
    }
    return eventMode;
  }

  private inferRequestMode(
    eventData: any,
    requestId?: string,
    fallback?: EventMode,
  ) {
    if (!requestId) return fallback;
    if (eventData.onSiteEvent?.requests?.some((request) => request.id === requestId)) {
      return EventMode.OnSite;
    }
    if (eventData.virtualEvent?.requests?.some((request) => request.id === requestId)) {
      return EventMode.Virtual;
    }
    return fallback;
  }

  private getModeInvitationSecret(eventData: any, eventMode: EventMode) {
    const secret =
      eventMode === EventMode.OnSite
        ? eventData.onSiteEvent?.invitation
        : eventData.virtualEvent?.invitation;
    if (!secret) {
      throw new BadRequestException(
        `Event mode ${eventMode} does not support invitations`,
      );
    }
    return secret;
  }

  private sanitizeEventForPublicView(eventData: any) {
    const event = eventData instanceof Event ? eventData : new Event(eventData);
    const canonicalMode = event.canonicalMode();
    const onSiteEvent = event.onSiteEvent
      ? {
          ...event.onSiteEvent,
          invitation: undefined,
          invitations: undefined,
        }
      : null;
    const virtualEvent = event.virtualEvent
      ? {
          ...event.virtualEvent,
          invitation: undefined,
          invitations: undefined,
        }
      : null;

    return {
      ...eventData,
      onlyVirtual: event.onlyVirtual,
      startDate: event.startDate,
      endDate: event.endDate,
      maxAttendees: event.maxAttendees ?? null,
      maxCollaborators: event.maxCollaborators ?? null,
      lat: event.lat,
      lng: event.lng,
      location: event.location,
      locationAlias: event.locationAlias,
      requiresRequest: event.requiresRequest,
      totalRate: event.totalRate ?? null,
      ratingCount: event.ratingCount,
      requests: event.requestsForMode(canonicalMode),
      onSiteEvent,
      virtualEvent,
    };
  }
}
