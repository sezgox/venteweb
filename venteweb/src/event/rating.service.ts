import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventMode, NotificationType } from 'generated/prisma';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Event } from './entities/event.entity';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { RatingRepository, RatingWithUser } from './rating.repository';
import { UpsertRatingDto } from './dto/upsert-rating.dto';

@Injectable()
export class RatingService {
  constructor(
    private readonly ratingRepository: RatingRepository,
    private readonly eventRepository: EventRepository,
    private readonly eventService: EventService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async upsertRating(eventId: string, userId: string, dto: UpsertRatingDto) {
    const rawEvent = await this.eventRepository.findOne(eventId);
    const event = new Event(rawEvent);
    const eventMode = this.resolveEventMode(event, dto.eventMode);
    this.assertEventCanBeRated(event, userId, eventMode);

    const participation =
      await this.ratingRepository.findRegisteredParticipation(
        eventId,
        userId,
        eventMode,
      );
    if (!participation) {
      throw new ForbiddenException(
        'Only registered participants can rate this event mode',
      );
    }

    const result = await this.ratingRepository.upsertRating({
      eventId,
      userId,
      eventMode,
      participationId: participation.id,
      score: dto.score,
      text: dto.text?.trim() || undefined,
    });

    if (result.created || result.previousScore !== dto.score) {
      await this.notifyOrganizer(event, result.created, dto.score, eventMode);
    }

    return {
      rating: this.toRatingResponse(result.rating),
      event: {
        eventMode,
        totalRate: result.event.totalRate,
        ratingCount: result.event.ratingCount,
      },
    };
  }

  async listRatings(
    eventId: string,
    reqUserId: string,
    eventMode: EventMode | undefined,
    page = 1,
    limit = 20,
    invitation?: string,
  ) {
    const rawEvent = await this.eventRepository.findOne(eventId);
    const event = new Event(rawEvent);
    const resolvedMode = this.resolveEventMode(event, eventMode);
    await this.assertCanViewRatings(eventId, reqUserId, invitation);
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (normalizedPage - 1) * normalizedLimit;
    const [ratings, total] = await Promise.all([
      this.ratingRepository.findManyByEvent(
        eventId,
        resolvedMode,
        skip,
        normalizedLimit,
      ),
      this.ratingRepository.countByEvent(eventId, resolvedMode),
    ]);

    return {
      ratings: ratings.map((rating) => this.toRatingResponse(rating)),
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNextPage: skip + ratings.length < total,
      eventMode: resolvedMode,
    };
  }

  async getSummary(
    eventId: string,
    reqUserId: string,
    eventMode: EventMode | undefined,
    invitation?: string,
  ) {
    const rawEvent = await this.eventRepository.findOne(eventId);
    const event = new Event(rawEvent);
    const resolvedMode = this.resolveEventMode(event, eventMode);
    await this.assertCanViewRatings(eventId, reqUserId, invitation);
    return {
      ...(await this.ratingRepository.getSummary(eventId, resolvedMode)),
      eventMode: resolvedMode,
    };
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

  private assertEventCanBeRated(
    event: Event,
    userId: string,
    eventMode: EventMode,
  ) {
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId === userId) {
      throw new ForbiddenException('Organizers cannot rate their own events');
    }
    const details = event.modeDetails(eventMode);
    if (new Date(details.endDate).getTime() > Date.now()) {
      throw new BadRequestException('Event can only be rated after it ends');
    }
  }

  private async assertCanViewRatings(
    eventId: string,
    reqUserId: string,
    invitation?: string,
  ) {
    await this.eventService.findOne(eventId, reqUserId, invitation);
  }

  private async notifyOrganizer(
    event: Event,
    created: boolean,
    score: number,
    eventMode: EventMode,
  ) {
    await this.notificationsService.createNotification(
      event.organizerId,
      NotificationType.Rating,
      created
        ? `New rating for ${event.name}`
        : `Rating updated for ${event.name}`,
      `Your ${eventMode} event experience received ${score} stars.`,
      event.id,
    );
  }

  private toRatingResponse(rating: RatingWithUser) {
    return {
      id: rating.id,
      userId: rating.userId,
      eventId: rating.eventId,
      eventMode: rating.eventMode,
      participationId: rating.participationId,
      text: rating.text,
      score: rating.score,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
      user: rating.user,
    };
  }
}
