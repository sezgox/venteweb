import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Category, ParticipationType, Prisma, Visibility } from 'generated/prisma';
import { UuidService } from 'nestjs-uuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EVENT_IMAGE_DEFAULT } from 'src/core/consts/event-image-default.const';
import { InvitationsService } from 'src/core/services/invitations.service';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { CreateRequestParticipationDto } from 'src/participation/dto/create-request-participation.dto';
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
      private readonly invitationsService: InvitationsService
    ) {}

  async create(createEventDto: CreateEventDto, file: Express.Multer.File, reqUserId: string) {
    
    const masterKey = this.invitationsService.generateMasterKey();
    const encryptedInvitation = this.invitationsService.encryptMasterKey(masterKey);
   /*  console.log(masterKey)
    console.log(encryptedInvitation) */
    createEventDto.invitation = encryptedInvitation;

    const include = {events: true};
    const userData = await this.userRepository.findOne(reqUserId, include);

    if(userData.id !== createEventDto.organizerId) throw new ForbiddenException('No puedes crear eventos para otros usuarios');
    
    if(!userData) throw new NotFoundException(`User ${reqUserId} not found`);
    createEventDto.organizerId = userData.id;
    createEventDto.id = this.uuidService.generate();

    const user = new User(userData);
    const event = user.createEvent(createEventDto);

    let cdPayload: any;

    try {
      const folder = 'events/' + createEventDto.id;

      if(file){
        cdPayload = await this.cloudinaryService.uploadFile(file, folder);
        const imageUrl = cdPayload.secure_url;
        event.poster = imageUrl;
      }
      return await this.eventRepository.create(event);

    } catch (error) {

      if (cdPayload?.public_id) {
        await this.cloudinaryService.deleteFile(cdPayload.public_id);
      }

      throw new BadRequestException(
        `Error creating event: ${error.message || error}`,
      );

    }

  }

  async findAll(filter: FilterEventDto, reqUserId: string) {
    // Default de fecha
    filter.date = filter.date ?? new Date();

    const user = await this.userRepository.findOne(reqUserId);
    let friendsIds = [];
    if(user){
      friendsIds = await this.userRepository.getFriends(user.id);
      friendsIds.push(user.id)
    }

    // Distance ordering (raw SQL through repository)
    if (filter.sortBy === 'distance') {
      const { centerLat, centerLng, latMin, latMax, lngMin, lngMax } = this.computeGeoParams(filter);

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
      });

      const ids = rows.map(r => r.id);
      if (ids.length === 0) return [];

      const events = await this.eventRepository.findMany({ id: { in: ids } } as any);
      const order = new Map<string, number>();
      rows.forEach((r, i) => order.set(r.id, i));
      events.sort((a: any, b: any) => (order.get(a.id)! - order.get(b.id)!));
      const filtered = (filter.collaboration === true)
        ? events.filter((e: any) => e.maxCollaborators != null && e.participations.filter((p: any) => p.type === ParticipationType.Collaboration).length < e.maxCollaborators)
        : events;
      const searchFiltered = filter.search ? filtered.filter((event: any) => this.matchesSearchTerm(event, filter.search!)) : filtered;
      return searchFiltered;
    }

    const visibilityWhere = user ? this.getVisibilityWhere(filter.visibility, friendsIds) : {visibility: Visibility.Public};

    console.log(friendsIds);
    const baseWhere = this.getBaseWhere(filter);

    const where = { ...baseWhere, ...visibilityWhere };
    //console.log(where);

    const orderBy = this.getOrderBy(filter);

    const events = await this.eventRepository.findMany(where);
    const filtered = (filter.collaboration === true)
      ? events.filter((e: any) => e.maxCollaborators != null && e.participations.filter((p: any) => p.type === ParticipationType.Collaboration).length < e.maxCollaborators)
      : events;
    const searchFiltered = filter.search ? filtered.filter((event: any) => this.matchesSearchTerm(event, filter.search!)) : filtered;
    return searchFiltered;
  }

  private getOrderBy(filter: FilterEventDto): Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] {
    const sortBy = filter.sortBy || 'date';
    
    switch(sortBy) {
        case 'date':
            return { startDate: 'asc' };
        
        case 'popularity':
            return { 
                participations: { 
                    _count: 'desc' 
                } 
            };
        
        default:
            return { startDate: 'asc' };
    }
}

  private getBaseWhere(filter: FilterEventDto) {

    const where: Prisma.EventWhereInput = {
      startDate: { lte: filter.endDate || undefined },
      endDate: { gte: filter.date, lte: filter.endDate || undefined },
      language: filter.language || undefined,
      categories: filter.category ? { has: filter.category } : undefined,
    };

    if (filter.latMin !== undefined && filter.latMax !== undefined && filter.lngMin !== undefined && filter.lngMax !== undefined) {
      where.lat = { gte: filter.latMin, lte: filter.latMax };
      where.lng = { gte: filter.lngMin, lte: filter.lngMax };
    } else if (filter.lat !== undefined && filter.lng !== undefined && filter.radius !== undefined) {
      const centerLat = filter.lat;
      const centerLng = filter.lng;
      const radiusKm = filter.radius;

      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

      where.lat = { gte: centerLat - latDelta, lte: centerLat + latDelta };
      where.lng = { gte: centerLng - lngDelta, lte: centerLng + lngDelta };
    }

    const searchTerm = filter.search?.trim();
    if (searchTerm) {
      const searchFilters = this.buildSearchFilters(searchTerm);
      if (searchFilters.length > 0) {
        const existingAnd = Array.isArray(where.AND)
          ? where.AND
          : where.AND
          ? [where.AND]
          : [];
        where.AND = [...existingAnd, { OR: searchFilters }];
      }
    }
    console.log(where)

    return where;
  }

  private buildSearchFilters(searchTerm: string): Prisma.EventWhereInput[] {
    const normalized = searchTerm.toLowerCase();
    const tagCandidates = Array.from(new Set([searchTerm, normalized, searchTerm.toUpperCase()]));
    const categoryMatches = Object.values(Category).filter((category) => category.toLowerCase().includes(normalized));

    const filters: Prisma.EventWhereInput[] = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { tags: { hasSome: tagCandidates } },
    ];

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
    const locationMatch = event.location?.toLowerCase().includes(term);
    const tagsMatch = Array.isArray(event.tags) && event.tags.some((tag: string) => tag.toLowerCase().includes(term));
    const categoriesMatch = Array.isArray(event.categories) && event.categories.some((category: string) => category.toLowerCase().includes(term));

    return Boolean(nameMatch || descriptionMatch || locationMatch || tagsMatch || categoriesMatch);
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
      const lngDelta = radiusKm / (111 * Math.cos((centerLatIn * Math.PI) / 180));
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
    if(user){
      if(user.id === event.organizerId) return event;

      if (event.visibility === Visibility.Private) {
        const areFriends = await this.userRepository.usersAreFriends(user.id, event.organizerId);
        // Si el usuario ha enviado un token de invitación (recibido desde una invitación privada por la app o desde un link de invitación público), verificamos que sea válido
        const invitationIsValid = invitation ? await this.invitationIsValid(event.invitation, invitation, user.id) : false;
        if(!areFriends && !invitationIsValid){
          throw new ForbiddenException('El evento no es público,no tienes una invitación válida y no eres un amigo del creador, así que no puedes verlo!');
        }
      }
    }else if(event.visibility === Visibility.Private){
      throw new ForbiddenException('El evento no es público y no puedes verlo sin una invitación válida!');
    }

    const { requests, invitations, ...eventView } = event;
    return eventView;
  }

  private async invitationIsValid(encryptedKey: string, invitation: string, invitedUser?: string): Promise<boolean>{
    const masterKey = this.invitationsService.decryptMasterKey(encryptedKey);
    return await this.invitationsService.verifyInvitation(invitation, masterKey, invitedUser);
  }

  update(id: string, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  async remove(id: string, reqUserId: string) {
    const user = await this.userRepository.findOne(reqUserId);
    const event = await this.eventRepository.findOne(id);
    if(event.endDate < new Date()) throw new BadRequestException('No puedes eliminar eventos ya acabados');
    if(event.startDate < new Date()) throw new BadRequestException('No puedes eliminar eventos ya comenzados');
    if(!event) throw new NotFoundException('El evento no existe');
    if(!user) throw new NotFoundException('El usuario solicitante no existe');
    if(user.id === event.organizerId){
      try {
        if(event.poster != EVENT_IMAGE_DEFAULT){
          const public_id = this.getPublicId(event.poster);
          this.cloudinaryService.deleteFile(public_id);
        }
      } catch (error) {
        throw new BadRequestException('Error al eliminar poster del evento!');
      }finally{
        return this.eventRepository.remove(id);
      }
    }else{
      throw new ForbiddenException('No eres el creador del evento, no puedes eliminarlo');
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

  async requestParticipation(eventId: string, createRequestParticipationDto: CreateRequestParticipationDto, reqUserId: string) {
    const eventData = await this.eventRepository.findOne(eventId);
    const requester = await this.userRepository.findOne(reqUserId);
    const eventFromAFriend = await this.userRepository.usersAreFriends(eventData.organizerId, requester.id);
    if(!requester) throw new NotFoundException('El usuario solicitante no existe');
    if(!eventData) throw new NotFoundException('El evento solicitado no existe');
    if(requester.id !== createRequestParticipationDto.userId) throw new ForbiddenException('No puedes crear requests a otros usuarios');
    const event = new Event(eventData);
    const invitationIsValid = await this.invitationIsValid(eventData.invitation, createRequestParticipationDto.invitationToken);
    if(!invitationIsValid && event.visibility == Visibility.Private && !eventFromAFriend) throw new ForbiddenException('Necesitas una invitación válida para colaborar en este evento!');
    createRequestParticipationDto.eventId = event.id;
    const requestParticipation = event.addRequestParticipation(createRequestParticipationDto);
    return await this.participationRepository.createRequestParticipation(requestParticipation);
  }

  async getInvitationToken(eventId: string, reqUserId: string){
    const user = await this.userRepository.findOne(reqUserId);
    const event = await this.eventRepository.findOne(eventId);
    if(!event) throw new NotFoundException('El evento no existe');
    if(event.organizerId !== user.id) throw new ForbiddenException('No puedes generar invitaciones para eventos que no eres creador');
    const masterKey = this.invitationsService.decryptMasterKey(event.invitation);
    const token = await this.invitationsService.generateInvitation(event.id, user.id, masterKey);
    return token;
  }

  async createParticipation(eventId: string,createParticipationDto: CreateParticipationDto, reqUserId: string){
    //requester obtenido del token de la petición http
    const requesterData = await this.userRepository.findOne(reqUserId);
    const participantData = await this.userRepository.findOne(createParticipationDto.userId);
    const eventData = await this.eventRepository.findOne(eventId);
    const eventFromAFriend = await this.userRepository.usersAreFriends(eventData.organizerId, requesterData.id) || (requesterData.id === eventData.organizerId);
    createParticipationDto.eventId = eventId;
    if(!requesterData || !participantData) throw new NotFoundException('No puedes participar en este evento, usuario no existe')
    if(!eventData) throw new NotFoundException('El evento no existe')
    const participant = new User(participantData);
    const event = new Event(eventData);
    const requester = new User(requesterData);
    const invitationIsValid = await this.invitationIsValid(event.invitation, createParticipationDto.invitation);
    if(event.visibility == Visibility.Private && !invitationIsValid && !eventFromAFriend) throw new ForbiddenException('Necesitas una invitación válida para participar en este evento!');
    const participation = event.addParticipant(participant, requester, createParticipationDto);
    return await this.participationRepository.createParticipation(participation);
  }

  async cancelOrRejectRequest(eventId: string, requestId: string, reqUserId: string) {
    const eventData = await this.eventRepository.findOne(eventId);
    const userWhoAskToRemoveData = await this.userRepository.findOne(reqUserId);
    if(!eventData) throw new NotFoundException('El evento solicitado no existe');
    if(!userWhoAskToRemoveData) throw new NotFoundException('El usuario solicitante no existe');
    const userWhoAskToRemove = new User(userWhoAskToRemoveData);
    const event = new Event(eventData);
    const message = event.removeRequest(requestId,userWhoAskToRemove)
    const removedRequest =  await this.participationRepository.removeParticipationRequest(requestId);
    return {removedRequest, message}
  }

  async removeParticipation(eventId: string, participationId: string, reqUserId: string){
    const eventData = await this.eventRepository.findOne(eventId);
    const userWhoAskToRemoveData = await this.userRepository.findOne(reqUserId);
    if(!eventData) throw new NotFoundException('El evento solicitado no existe');
    if(!userWhoAskToRemoveData) throw new NotFoundException('El usuario solicitante no existe');
    const userWhoAskToRemove = new User(userWhoAskToRemoveData);
    const event = new Event(eventData);
    const message = event.removeParticipation(participationId,userWhoAskToRemove);
    const removedParticipation =  await this.participationRepository.removeParticipation(participationId);
    return {removedParticipation, message}
  }

}
