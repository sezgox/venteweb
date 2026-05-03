/**
 * Seeds a deterministic local development event catalog.
 *
 * Safe to run on every `npm run start:dev`: it only removes/recreates rows for
 * events with ids starting with `dev-mock-` and upserts users with dev-mock ids.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import {
  Category,
  EventMode,
  ParticipationType,
  Prisma,
  PrismaClient,
  Visibility,
} from '../generated/prisma';

function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const prisma = new PrismaClient();
const DEV_EVENT_PREFIX = 'dev-mock-';
const DEV_PASSWORD = 'DevMock_Seed_2026!';

const USERS = [
  {
    id: 'dev-mock-user-organizer',
    email: 'dev-mock.organizer@vente.test',
    username: 'dev_mock_organizer',
    name: 'Dev Mock Organizer',
  },
  {
    id: 'dev-mock-user-attendee',
    email: 'dev-mock.attendee@vente.test',
    username: 'dev_mock_attendee',
    name: 'Dev Mock Attendee',
  },
  {
    id: 'dev-mock-user-volunteer',
    email: 'dev-mock.volunteer@vente.test',
    username: 'dev_mock_volunteer',
    name: 'Dev Mock Volunteer',
  },
  {
    id: 'dev-mock-user-rater',
    email: 'dev-mock.rater@vente.test',
    username: 'dev_mock_rater',
    name: 'Dev Mock Rater',
  },
] as const;

type SeedUser = (typeof USERS)[number];

type DateRange = {
  startDate: Date;
  endDate: Date;
};

type DevEventDefinition = {
  id: string;
  name: string;
  description: string;
  categories: Category[];
  tags: string[];
  language?: string;
  onlyVirtual?: boolean;
  onSite?: DateRange & {
    location: string;
    locationAlias?: string;
    lat: number;
    lng: number;
    maxAttendees?: number;
    maxCollaborators?: number;
    requiresRequest?: boolean;
  };
  virtual?: DateRange & {
    maxAttendees?: number;
    maxCollaborators?: number;
    requiresRequest?: boolean;
    platforms: Array<{
      id: string;
      name: string;
      link: string;
    }>;
  };
  participations?: Array<{
    id: string;
    userId: string;
    eventMode: EventMode;
    type: ParticipationType;
  }>;
  ratings?: Array<{
    id: string;
    userId: string;
    participationId: string;
    eventMode: EventMode;
    score: number;
    text?: string;
  }>;
};

function hoursFrom(now: Date, hours: number): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function daysFrom(now: Date, days: number): Date {
  return hoursFrom(now, days * 24);
}

function madridPoint(offset: number) {
  return {
    lat: 40.4168 + offset,
    lng: -3.7038 + offset,
  };
}

function buildEvents(now: Date): DevEventDefinition[] {
  const attendee = USERS[1].id;
  const volunteer = USERS[2].id;
  const rater = USERS[3].id;

  return [
    {
      id: 'dev-mock-onsite-live-community-meetup',
      name: '[Dev] Live community meetup',
      description: 'Live on-site event for testing active event states.',
      categories: [Category.Meetup],
      tags: ['dev-mock', 'live', 'onsite'],
      language: 'en',
      onSite: {
        ...madridPoint(0.0001),
        location: 'Madrid dev seed',
        locationAlias: 'Centro',
        startDate: hoursFrom(now, -2),
        endDate: hoursFrom(now, 4),
        maxAttendees: 80,
        maxCollaborators: 5,
      },
      participations: [
        {
          id: 'dev-mock-part-live-attendee',
          userId: attendee,
          eventMode: EventMode.OnSite,
          type: ParticipationType.Attendance,
        },
      ],
    },
    {
      id: 'dev-mock-cluster-plaza-session',
      name: '[Dev] Plaza acoustic session',
      description: 'Clustered Madrid event for Explore map checks.',
      categories: [Category.Music],
      tags: ['dev-mock', 'cluster', 'music'],
      language: 'en',
      onSite: {
        ...madridPoint(0.00012),
        location: 'Madrid dev seed',
        locationAlias: 'Plaza Mayor',
        startDate: hoursFrom(now, 1),
        endDate: hoursFrom(now, 3),
        maxAttendees: 60,
      },
    },
    {
      id: 'dev-mock-cluster-street-food',
      name: '[Dev] Street food collab meetup',
      description: 'Clustered food event with nearby coordinates.',
      categories: [Category.Food, Category.Meetup],
      tags: ['dev-mock', 'cluster', 'food'],
      language: 'en',
      onSite: {
        ...madridPoint(0.00018),
        location: 'Madrid dev seed',
        locationAlias: 'Mercado de San Miguel',
        startDate: hoursFrom(now, 2),
        endDate: hoursFrom(now, 5),
        maxAttendees: 120,
      },
    },
    {
      id: 'dev-mock-volunteer-open-slots',
      name: '[Dev] Volunteer slots available',
      description: 'Upcoming on-site event with volunteer capacity still open.',
      categories: [Category.Workshop],
      tags: ['dev-mock', 'volunteer', 'onsite'],
      language: 'en',
      onSite: {
        ...madridPoint(0.00024),
        location: 'Madrid dev seed',
        locationAlias: 'Gran Via roof',
        startDate: daysFrom(now, 2),
        endDate: hoursFrom(daysFrom(now, 2), 3),
        maxAttendees: 50,
        maxCollaborators: 3,
        requiresRequest: false,
      },
      participations: [
        {
          id: 'dev-mock-part-volunteer-one',
          userId: volunteer,
          eventMode: EventMode.OnSite,
          type: ParticipationType.Volunteer,
        },
      ],
    },
    {
      id: 'dev-mock-virtual-product-lab',
      name: '[Dev] Virtual product lab',
      description: 'Virtual-only event with platforms for virtual Explore mode.',
      categories: [Category.Educational, Category.Workshop],
      tags: ['dev-mock', 'virtual', 'workshop'],
      language: 'en',
      onlyVirtual: true,
      virtual: {
        startDate: daysFrom(now, 3),
        endDate: hoursFrom(daysFrom(now, 3), 2),
        maxAttendees: 200,
        maxCollaborators: 4,
        platforms: [
          {
            id: 'dev-mock-platform-product-lab-meet',
            name: 'Google Meet',
            link: 'https://meet.google.com/dev-mock-product-lab',
          },
          {
            id: 'dev-mock-platform-product-lab-miro',
            name: 'Miro board',
            link: 'https://miro.com/app/board/dev-mock-product-lab',
          },
        ],
      },
    },
    {
      id: 'dev-mock-hybrid-design-jam',
      name: '[Dev] Hybrid design jam',
      description: 'Hybrid event for testing on-site and virtual mode selection.',
      categories: [Category.Art, Category.Meetup],
      tags: ['dev-mock', 'hybrid', 'virtual'],
      language: 'en',
      onSite: {
        ...madridPoint(0.0003),
        location: 'Madrid dev seed',
        locationAlias: 'Callao',
        startDate: daysFrom(now, 4),
        endDate: hoursFrom(daysFrom(now, 4), 4),
        maxAttendees: 75,
        maxCollaborators: 2,
      },
      virtual: {
        startDate: daysFrom(now, 4),
        endDate: hoursFrom(daysFrom(now, 4), 4),
        maxAttendees: 150,
        maxCollaborators: 2,
        platforms: [
          {
            id: 'dev-mock-platform-design-jam-discord',
            name: 'Discord stage',
            link: 'https://discord.gg/dev-mock-design-jam',
          },
        ],
      },
      participations: [
        {
          id: 'dev-mock-part-hybrid-onsite',
          userId: attendee,
          eventMode: EventMode.OnSite,
          type: ParticipationType.Attendance,
        },
        {
          id: 'dev-mock-part-hybrid-virtual',
          userId: volunteer,
          eventMode: EventMode.Virtual,
          type: ParticipationType.Attendance,
        },
      ],
    },
    {
      id: 'dev-mock-finished-rating-night',
      name: '[Dev] Finished rating night',
      description: 'Finished event with ratings for rating summary/list testing.',
      categories: [Category.Party, Category.Music],
      tags: ['dev-mock', 'finished', 'rating'],
      language: 'en',
      onSite: {
        ...madridPoint(0.00036),
        location: 'Madrid dev seed',
        locationAlias: 'Matadero',
        startDate: daysFrom(now, -8),
        endDate: daysFrom(now, -7),
        maxAttendees: 90,
        maxCollaborators: 6,
      },
      participations: [
        {
          id: 'dev-mock-part-finished-attendee',
          userId: attendee,
          eventMode: EventMode.OnSite,
          type: ParticipationType.Attendance,
        },
        {
          id: 'dev-mock-part-finished-rater',
          userId: rater,
          eventMode: EventMode.OnSite,
          type: ParticipationType.Attendance,
        },
      ],
      ratings: [
        {
          id: 'dev-mock-rating-finished-attendee',
          userId: attendee,
          participationId: 'dev-mock-part-finished-attendee',
          eventMode: EventMode.OnSite,
          score: 5,
          text: 'Great local dev seed event.',
        },
        {
          id: 'dev-mock-rating-finished-rater',
          userId: rater,
          participationId: 'dev-mock-part-finished-rater',
          eventMode: EventMode.OnSite,
          score: 4,
          text: 'Useful for rating UI checks.',
        },
      ],
    },
  ];
}

async function upsertSeedUser(user: SeedUser, passwordHash: string) {
  const data = {
    email: user.email,
    username: user.username,
    name: user.name,
    password: passwordHash,
    active: true,
    activatedAt: new Date(),
  };

  return await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, ...data },
    update: data,
  });
}

function eventCreateData(
  event: DevEventDefinition,
  organizerId: string,
): Prisma.EventCreateInput {
  return {
    id: event.id,
    organizer: { connect: { id: organizerId } },
    poster: null,
    name: event.name,
    description: event.description,
    categories: event.categories,
    visibility: Visibility.Public,
    tags: event.tags,
    language: event.language ?? 'en',
    allowPosts: true,
    onlyVirtual: event.onlyVirtual === true,
    onSiteEvent: event.onSite
      ? {
          create: {
            maxAttendees: event.onSite.maxAttendees ?? null,
            maxCollaborators: event.onSite.maxCollaborators ?? null,
            lat: event.onSite.lat,
            lng: event.onSite.lng,
            location: event.onSite.location,
            locationAlias: event.onSite.locationAlias ?? null,
            startDate: event.onSite.startDate,
            endDate: event.onSite.endDate,
            requiresRequest: event.onSite.requiresRequest ?? false,
            totalRate: null,
            ratingCount: 0,
          },
        }
      : undefined,
    virtualEvent: event.virtual
      ? {
          create: {
            maxAttendees: event.virtual.maxAttendees ?? null,
            maxCollaborators: event.virtual.maxCollaborators ?? null,
            requiresRequest: event.virtual.requiresRequest ?? false,
            totalRate: null,
            ratingCount: 0,
            startDate: event.virtual.startDate,
            endDate: event.virtual.endDate,
            platforms: {
              create: event.virtual.platforms,
            },
          },
        }
      : undefined,
  };
}

async function createParticipations(event: DevEventDefinition) {
  for (const participation of event.participations ?? []) {
    await prisma.participation.create({
      data: {
        id: participation.id,
        userId: participation.userId,
        eventId: event.id,
        eventMode: participation.eventMode,
        type: participation.type,
      },
    });
  }
}

async function createRatings(event: DevEventDefinition) {
  for (const rating of event.ratings ?? []) {
    await prisma.rating.create({
      data: {
        id: rating.id,
        userId: rating.userId,
        eventId: event.id,
        eventMode: rating.eventMode,
        onSiteEventId:
          rating.eventMode === EventMode.OnSite ? event.id : undefined,
        virtualEventId:
          rating.eventMode === EventMode.Virtual ? event.id : undefined,
        participationId: rating.participationId,
        score: rating.score,
        text: rating.text,
      },
    });
  }
}

async function updateRatingAggregates(event: DevEventDefinition) {
  const grouped = new Map<EventMode, number[]>();
  for (const rating of event.ratings ?? []) {
    const scores = grouped.get(rating.eventMode) ?? [];
    scores.push(rating.score);
    grouped.set(rating.eventMode, scores);
  }

  for (const [mode, scores] of grouped.entries()) {
    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (mode === EventMode.OnSite) {
      await prisma.onSiteEvent.update({
        where: { eventId: event.id },
        data: { totalRate: average, ratingCount: scores.length },
      });
    } else {
      await prisma.virtualEvent.update({
        where: { eventId: event.id },
        data: { totalRate: average, ratingCount: scores.length },
      });
    }
  }
}

async function clearDevEvents() {
  const where = { eventId: { startsWith: DEV_EVENT_PREFIX } };
  await prisma.rating.deleteMany({ where });
  await prisma.participation.deleteMany({ where });
  await prisma.request.deleteMany({ where });
  await prisma.invitation.deleteMany({ where });
  await prisma.event.deleteMany({
    where: { id: { startsWith: DEV_EVENT_PREFIX } },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const [organizer] = await Promise.all(
    USERS.map((user) => upsertSeedUser(user, passwordHash)),
  );

  const events = buildEvents(new Date());
  await clearDevEvents();

  for (const event of events) {
    await prisma.event.create({
      data: eventCreateData(event, organizer.id),
    });
    await createParticipations(event);
    await createRatings(event);
    await updateRatingAggregates(event);
  }

  console.log('--- seed-dev-events done ---');
  console.log(`Events: ${events.map((event) => event.id).join(', ')}`);
  console.log(`Dev users password: ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
