import { EventEmitter2 } from '@nestjs/event-emitter';
import { Category, ParticipationType, Visibility } from 'generated/prisma';
import { UuidService } from 'nestjs-uuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventInvitationsService } from 'src/core/services/event-invitations.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { UserRepository } from 'src/user/user.repository';
import { FilterEventDto } from './dto/filter-event.dto';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';

const FIXED_DATE = new Date('2026-06-01T00:00:00.000Z');

function makeEvent(overrides: Partial<any> = {}): any {
  return {
    id: 'event-1',
    organizerId: 'organizer-1',
    name: 'Sample event',
    description: 'Sample description',
    visibility: Visibility.Public,
    categories: [Category.Meetup],
    tags: ['meetup'],
    onSiteEvent: {
      location: 'Madrid',
      lat: 40.4168,
      lng: -3.7038,
      startDate: new Date('2026-06-10T18:00:00.000Z'),
      endDate: new Date('2026-06-10T21:00:00.000Z'),
      maxCollaborators: null,
    },
    participations: [],
    ...overrides,
  };
}

describe('EventService.findAll', () => {
  let service: EventService;
  let eventRepository: jest.Mocked<
    Pick<
      EventRepository,
      | 'count'
      | 'findManyPaginated'
      | 'findManyOrdered'
      | 'findMany'
      | 'findEventIdsByDistance'
    >
  >;
  let userRepository: jest.Mocked<Pick<UserRepository, 'findOne' | 'getFriends'>>;

  beforeEach(() => {
    eventRepository = {
      count: jest.fn().mockResolvedValue(0),
      findManyPaginated: jest.fn().mockResolvedValue([]),
      findManyOrdered: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
      findEventIdsByDistance: jest.fn().mockResolvedValue([]),
    };
    userRepository = {
      findOne: jest.fn().mockResolvedValue(null as any),
      getFriends: jest.fn().mockResolvedValue([]),
    };

    service = new EventService(
      eventRepository as unknown as EventRepository,
      {} as ParticipationRepository,
      {} as CloudinaryService,
      userRepository as unknown as UserRepository,
      {} as UuidService,
      {} as InvitationsService,
      {} as EventEmitter2,
      {} as EventInvitationsService,
    );
  });

  it('limits guests to public events when no user is authenticated', async () => {
    const publicEvent = makeEvent({ id: 'public-1' });
    eventRepository.count.mockResolvedValue(1);
    eventRepository.findManyPaginated.mockResolvedValue([publicEvent] as any);

    const out = await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
      } as FilterEventDto,
      '',
    );

    const args = eventRepository.findManyPaginated.mock.calls[0][0];

    expect(args.where).toMatchObject({
      visibility: Visibility.Public,
    });
    expect(args.where.OR).toBeUndefined();
    expect(userRepository.getFriends).not.toHaveBeenCalled();
    expect(out.total).toBe(1);
    expect(out.events.map((event) => event.id)).toEqual(['public-1']);
  });

  it('includes public events plus private events from friends and self by default for authenticated users', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'me' } as any);
    userRepository.getFriends.mockResolvedValue(['friend-1']);
    eventRepository.count.mockResolvedValue(3);

    await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
      } as FilterEventDto,
      'me',
    );

    const args = eventRepository.findManyPaginated.mock.calls[0][0];

    expect(args.where.OR).toEqual([
      { visibility: Visibility.Public },
      {
        visibility: Visibility.Private,
        organizerId: { in: ['friend-1', 'me'] },
      },
    ]);
  });

  it('restricts explicit private visibility to private events from friends and self', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'me' } as any);
    userRepository.getFriends.mockResolvedValue(['friend-1']);

    await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
        visibility: Visibility.Private,
      } as FilterEventDto,
      'me',
    );

    const args = eventRepository.findManyPaginated.mock.calls[0][0];

    expect(args.where).toMatchObject({
      visibility: Visibility.Private,
      organizerId: { in: ['friend-1', 'me'] },
    });
  });

  it('restricts explicit public visibility to public events only', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'me' } as any);
    userRepository.getFriends.mockResolvedValue(['friend-1']);

    await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
        visibility: Visibility.Public,
      } as FilterEventDto,
      'me',
    );

    const args = eventRepository.findManyPaginated.mock.calls[0][0];

    expect(args.where).toMatchObject({
      visibility: Visibility.Public,
    });
    expect(args.where.organizerId).toBeUndefined();
    expect(args.where.OR).toBeUndefined();
  });

  it('uses the provided map bounds to filter events inside the visible box', async () => {
    await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
        visibility: Visibility.Public,
        latMin: 40,
        latMax: 41,
        lngMin: -4,
        lngMax: -3,
      } as FilterEventDto,
      '',
    );

    const args = eventRepository.findManyPaginated.mock.calls[0][0];

    expect(args.where).toMatchObject({
      visibility: Visibility.Public,
      onSiteEvent: {
        is: {
          lat: { gte: 40, lte: 41 },
          lng: { gte: -4, lte: -3 },
        },
      },
    });
  });

  it('computes a radius bounding box when filtering around a center point', async () => {
    const lat = 40;
    const lng = -3;
    const radius = 15;
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

    await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
        visibility: Visibility.Public,
        lat,
        lng,
        radius,
      } as FilterEventDto,
      '',
    );

    const args = eventRepository.findManyPaginated.mock.calls[0][0];
    const latFilter = args.where.onSiteEvent.is.lat as {
      gte: number;
      lte: number;
    };
    const lngFilter = args.where.onSiteEvent.is.lng as {
      gte: number;
      lte: number;
    };

    expect(latFilter.gte).toBeCloseTo(lat - latDelta, 6);
    expect(latFilter.lte).toBeCloseTo(lat + latDelta, 6);
    expect(lngFilter.gte).toBeCloseTo(lng - lngDelta, 6);
    expect(lngFilter.lte).toBeCloseTo(lng + lngDelta, 6);
  });

  it('returns only events that still need volunteers when collaboration filter is enabled', async () => {
    const needsVolunteers = makeEvent({
      id: 'needs-volunteers',
      onSiteEvent: {
        location: 'Madrid',
        lat: 40.4168,
        lng: -3.7038,
        startDate: new Date('2026-06-10T18:00:00.000Z'),
        endDate: new Date('2026-06-10T21:00:00.000Z'),
        maxCollaborators: 2,
      },
      participations: [{ type: ParticipationType.Volunteer }],
    });
    const fullEvent = makeEvent({
      id: 'full-event',
      onSiteEvent: {
        location: 'Madrid',
        lat: 40.4168,
        lng: -3.7038,
        startDate: new Date('2026-06-10T18:00:00.000Z'),
        endDate: new Date('2026-06-10T21:00:00.000Z'),
        maxCollaborators: 1,
      },
      participations: [{ type: ParticipationType.Volunteer }],
    });
    const noVolunteerYet = makeEvent({
      id: 'no-volunteer-yet',
      onSiteEvent: {
        location: 'Madrid',
        lat: 40.4168,
        lng: -3.7038,
        startDate: new Date('2026-06-10T18:00:00.000Z'),
        endDate: new Date('2026-06-10T21:00:00.000Z'),
        maxCollaborators: 3,
      },
      participations: [{ type: ParticipationType.Attendance }],
    });
    eventRepository.findManyOrdered.mockResolvedValue(
      [needsVolunteers, fullEvent, noVolunteerYet] as any,
    );

    const out = await service.findAll(
      {
        page: 1,
        limit: 10,
        date: FIXED_DATE,
        collaboration: true,
      } as FilterEventDto,
      '',
    );

    expect(eventRepository.count).not.toHaveBeenCalled();
    expect(eventRepository.findManyOrdered).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: Visibility.Public }),
      { onSiteEvent: { startDate: 'asc' } },
    );
    expect(out.total).toBe(2);
    expect(out.events.map((event) => event.id)).toEqual([
      'needs-volunteers',
      'no-volunteer-yet',
    ]);
  });

  it('passes friends and self into distance queries and preserves the repository distance order', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'me' } as any);
    userRepository.getFriends.mockResolvedValue(['friend-1']);
    eventRepository.findEventIdsByDistance.mockResolvedValue([
      { id: 'friend-private', distance_km: 0.7 },
      { id: 'public-near', distance_km: 1.2 },
    ]);
    eventRepository.findMany.mockResolvedValue([
      makeEvent({ id: 'public-near', name: 'Public near' }),
      makeEvent({
        id: 'friend-private',
        organizerId: 'friend-1',
        visibility: Visibility.Private,
        name: 'Friend private',
      }),
    ] as any);

    const out = await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
        sortBy: 'distance',
        lat: 40,
        lng: -3,
        radius: 15,
      } as FilterEventDto,
      'me',
    );

    expect(eventRepository.findEventIdsByDistance).toHaveBeenCalledWith(
      expect.objectContaining({
        centerLat: 40,
        centerLng: -3,
        friendsIds: ['friend-1', 'me'],
        hasUser: true,
      }),
    );
    expect(out.events.map((event) => event.id)).toEqual([
      'friend-private',
      'public-near',
    ]);
  });

  it('keeps guests on public-only distance queries and post-filters search using full event fields', async () => {
    eventRepository.findEventIdsByDistance.mockResolvedValue([
      { id: 'description-match', distance_km: 0.5 },
      { id: 'not-a-match', distance_km: 0.8 },
    ]);
    eventRepository.findMany.mockResolvedValue([
      makeEvent({
        id: 'not-a-match',
        name: 'Concert',
        description: 'Night concert with DJs',
        onSiteEvent: {
          location: 'Madrid',
          lat: 40.4168,
          lng: -3.7038,
          startDate: new Date('2026-06-10T18:00:00.000Z'),
          endDate: new Date('2026-06-10T21:00:00.000Z'),
          maxCollaborators: null,
        },
      }),
      makeEvent({
        id: 'description-match',
        name: 'Concert',
        description: 'Gallery opening with live music',
        onSiteEvent: {
          location: 'Madrid',
          lat: 40.4168,
          lng: -3.7038,
          startDate: new Date('2026-06-10T18:00:00.000Z'),
          endDate: new Date('2026-06-10T21:00:00.000Z'),
          maxCollaborators: null,
        },
      }),
    ] as any);

    const out = await service.findAll(
      {
        page: 1,
        limit: 20,
        date: FIXED_DATE,
        sortBy: 'distance',
        search: 'gallery',
        latMin: 40,
        latMax: 41,
        lngMin: -4,
        lngMax: -3,
      } as FilterEventDto,
      '',
    );

    expect(eventRepository.findEventIdsByDistance).toHaveBeenCalledWith(
      expect.objectContaining({
        hasUser: false,
        friendsIds: [],
        latMin: 40,
        latMax: 41,
        lngMin: -4,
        lngMax: -3,
      }),
    );
    expect(out.total).toBe(1);
    expect(out.events.map((event) => event.id)).toEqual(['description-match']);
  });
});
