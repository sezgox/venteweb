import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RatingService } from './rating.service';

describe('RatingService', () => {
  const endedEvent = {
    id: 'event-1',
    organizerId: 'organizer-1',
    name: 'Finished event',
    visibility: 'Public',
    onSiteEvent: {
      endDate: new Date(Date.now() - 60_000),
      startDate: new Date(Date.now() - 120_000),
    },
  };

  let ratingRepository: {
    findRegisteredParticipation: jest.Mock;
    upsertRating: jest.Mock;
    findManyByEvent: jest.Mock;
    countByEvent: jest.Mock;
    getSummary: jest.Mock;
  };
  let eventRepository: { findOne: jest.Mock };
  let eventService: { findOne: jest.Mock };
  let notificationsService: { createNotification: jest.Mock };
  let service: RatingService;

  beforeEach(() => {
    ratingRepository = {
      findRegisteredParticipation: jest.fn(),
      upsertRating: jest.fn(),
      findManyByEvent: jest.fn(),
      countByEvent: jest.fn(),
      getSummary: jest.fn(),
    };
    eventRepository = { findOne: jest.fn().mockResolvedValue(endedEvent) };
    eventService = { findOne: jest.fn().mockResolvedValue(endedEvent) };
    notificationsService = { createNotification: jest.fn() };
    service = new RatingService(
      ratingRepository as any,
      eventRepository as any,
      eventService as any,
      notificationsService as any,
    );
  });

  it('rejects organizers rating their own event', async () => {
    await expect(
      service.upsertRating('event-1', 'organizer-1', { score: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects ratings before the event ends', async () => {
    eventRepository.findOne.mockResolvedValue({
      ...endedEvent,
      onSiteEvent: {
        startDate: new Date(Date.now() - 60_000),
        endDate: new Date(Date.now() + 60_000),
      },
    });

    await expect(
      service.upsertRating('event-1', 'user-1', { score: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects users without registered participation', async () => {
    ratingRepository.findRegisteredParticipation.mockResolvedValue(null);

    await expect(
      service.upsertRating('event-1', 'user-1', { score: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('saves rating and notifies organizer on create', async () => {
    ratingRepository.findRegisteredParticipation.mockResolvedValue({
      id: 'participation-1',
    });
    ratingRepository.upsertRating.mockResolvedValue({
      created: true,
      previousScore: null,
      event: { totalRate: 5, ratingCount: 1 },
      rating: {
        id: 'rating-1',
        userId: 'user-1',
        eventId: 'event-1',
        eventMode: 'OnSite',
        participationId: 'participation-1',
        score: 5,
        text: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const result = await service.upsertRating('event-1', 'user-1', {
      score: 5,
    });

    expect(result.event.ratingCount).toBe(1);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      'organizer-1',
      'Rating',
      'New rating for Finished event',
      'Your OnSite event experience received 5 stars.',
      'event-1',
    );
  });

  it('does not notify when updating with the same score', async () => {
    ratingRepository.findRegisteredParticipation.mockResolvedValue({
      id: 'participation-1',
    });
    ratingRepository.upsertRating.mockResolvedValue({
      created: false,
      previousScore: 4,
      event: { totalRate: 4, ratingCount: 1 },
      rating: {
        id: 'rating-1',
        userId: 'user-1',
        eventId: 'event-1',
        eventMode: 'OnSite',
        participationId: 'participation-1',
        score: 4,
        text: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await service.upsertRating('event-1', 'user-1', { score: 4 });

    expect(notificationsService.createNotification).not.toHaveBeenCalled();
  });

  it('uses event visibility rules with invitations when listing ratings', async () => {
    ratingRepository.findManyByEvent.mockResolvedValue([]);
    ratingRepository.countByEvent.mockResolvedValue(0);

    await service.listRatings(
      'event-1',
      'user-1',
      undefined,
      1,
      20,
      'invite-token',
    );

    expect(eventService.findOne).toHaveBeenCalledWith(
      'event-1',
      'user-1',
      'invite-token',
    );
  });
});
