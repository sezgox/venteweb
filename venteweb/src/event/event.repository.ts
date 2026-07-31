import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';
import { Event } from './entities/event.entity';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventRepository {
  constructor(private prisma: PrismaService) {}

  private readonly listInclude = {
    participations: true,
    organizer: true,
    onSiteEvent: true,
    virtualEvent: {
      include: {
        platforms: true,
      },
    },
  } satisfies Prisma.EventInclude;

  private readonly detailInclude = {
    participations: { include: { user: true, rating: true } },
    organizer: true,
    onSiteEvent: {
      include: {
        requests: { include: { user: true } },
        invitations: { include: { user: true, externalUser: true } },
        ratings: { include: { user: true } },
      },
    },
    virtualEvent: {
      include: {
        platforms: true,
        requests: { include: { user: true } },
        invitations: { include: { user: true, externalUser: true } },
        ratings: { include: { user: true } },
      },
    },
  } satisfies Prisma.EventInclude;

  async create(event: Event) {
    const data: Prisma.EventCreateInput = {
      id: event.id,
      name: event.name,
      description: event.description,
      visibility: event.visibility,
      poster: event.poster ?? null,
      categories: event.categories,
      language: event.language,
      allowPosts: event.allowPosts,
      tags: event.tags ?? [],
      onlyVirtual: event.onlyVirtual,
      organizer: { connect: { id: event.organizerId } },
      onSiteEvent: event.onSiteEvent
        ? {
            create: {
              maxAttendees: event.onSiteEvent.maxAttendees ?? null,
              maxCollaborators: event.onSiteEvent.maxCollaborators ?? null,
              lat: event.onSiteEvent.lat,
              lng: event.onSiteEvent.lng,
              location: event.onSiteEvent.location,
              locationAlias: event.onSiteEvent.locationAlias ?? null,
              startDate: event.onSiteEvent.startDate,
              endDate: event.onSiteEvent.endDate,
              requiresRequest: event.onSiteEvent.requiresRequest,
              invitation: event.onSiteEvent.invitation ?? null,
              totalRate: event.onSiteEvent.totalRate ?? null,
              ratingCount: event.onSiteEvent.ratingCount ?? 0,
            },
          }
        : undefined,
      virtualEvent: event.virtualEvent
        ? {
            create: {
              maxAttendees: event.virtualEvent.maxAttendees ?? null,
              maxCollaborators: event.virtualEvent.maxCollaborators ?? null,
              requiresRequest: event.virtualEvent.requiresRequest,
              invitation: event.virtualEvent.invitation ?? null,
              totalRate: event.virtualEvent.totalRate ?? null,
              ratingCount: event.virtualEvent.ratingCount ?? 0,
              startDate: event.virtualEvent.startDate,
              endDate: event.virtualEvent.endDate,
              platforms: {
                create: event.virtualEvent.platforms.map((platform) => ({
                  name: platform.name,
                  link: platform.link,
                })),
              },
            },
          }
        : undefined,
    };

    return await this.prisma.event.create({
      data,
      include: this.detailInclude,
    });
  }

  async findMany(where: Prisma.EventWhereInput) {
    return await this.prisma.event.findMany({
      where,
      include: this.listInclude,
    });
  }

  async findManyOrdered(
    where: Prisma.EventWhereInput,
    orderBy:
      | Prisma.EventOrderByWithRelationInput
      | Prisma.EventOrderByWithRelationInput[],
  ) {
    return await this.prisma.event.findMany({
      where,
      orderBy,
      include: this.listInclude,
    });
  }

  async count(where: Prisma.EventWhereInput): Promise<number> {
    return await this.prisma.event.count({ where });
  }

  async findManyPaginated(args: {
    where: Prisma.EventWhereInput;
    orderBy:
      | Prisma.EventOrderByWithRelationInput
      | Prisma.EventOrderByWithRelationInput[];
    skip: number;
    take: number;
  }) {
    return await this.prisma.event.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      include: this.listInclude,
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.detailInclude,
    });
    if (!event) {
      throw new BadRequestException('Event not found');
    }
    return event;
  }

  async findFinishedEventLast24Hours() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return await this.prisma.event.findMany({
      where: {
        OR: [
          {
            onSiteEvent: {
              is: {
                endDate: {
                  gte: yesterday,
                  lt: now,
                },
              },
            },
          },
          {
            virtualEvent: {
              is: {
                endDate: {
                  gte: yesterday,
                  lt: now,
                },
              },
            },
          },
        ],
      },
      include: {
        participations: true,
        onSiteEvent: true,
        virtualEvent: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.event.delete({ where: { id } });
  }

  async cancel(id: string) {
    return await this.prisma.event.update({
      where: { id },
      data: { canceledAt: new Date() },
      include: this.detailInclude,
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    return await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.categories !== undefined && { categories: dto.categories }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.onSite && { onSiteEvent: { update: dto.onSite } }),
        ...(dto.virtual && {
          virtualEvent: {
            update: {
              maxAttendees: dto.virtual.maxAttendees,
              maxCollaborators: dto.virtual.maxCollaborators,
              requiresRequest: dto.virtual.requiresRequest,
              startDate: dto.virtual.startDate,
              endDate: dto.virtual.endDate,
              platforms: dto.virtual.platforms
                ? { deleteMany: {}, create: dto.virtual.platforms }
                : undefined,
            },
          },
        }),
      },
      include: this.detailInclude,
    });
  }

  async findEventIdsByDistance(params: {
    centerLat: number;
    centerLng: number;
    date: Date;
    endDate?: Date;
    language?: string;
    search?: string;
    category?: string;
    latMin?: number;
    latMax?: number;
    lngMin?: number;
    lngMax?: number;
    friendsIds?: string[];
    hasUser?: boolean;
    requireVirtual?: boolean;
  }): Promise<{ id: string; distance_km: number }[]> {
    const {
      centerLat,
      centerLng,
      date,
      endDate,
      language,
      search,
      category,
      latMin,
      latMax,
      lngMin,
      lngMax,
      friendsIds = [],
      hasUser = false,
      requireVirtual = false,
    } = params;

    const searchLower = search ? search.toLowerCase() : null;

    const rows = await this.prisma.$queryRaw<
      { id: string; distance_km: number }[]
    >`
      SELECT e."id",
        2 * 6371 * ASIN(
          SQRT(
            POWER(SIN(RADIANS((ose."lat" - ${centerLat}) / 2)), 2) +
            COS(RADIANS(${centerLat})) * COS(RADIANS(ose."lat")) *
            POWER(SIN(RADIANS((ose."lng" - ${centerLng}) / 2)), 2)
          )
        ) AS distance_km
      FROM "Event" e
      INNER JOIN "OnSiteEvent" ose ON ose."eventId" = e."id"
      WHERE
        ose."startDate" >= ${date}
        AND (${endDate} IS NULL OR ose."startDate" <= ${endDate})
        AND (${language} IS NULL OR e."language" = ${language})
        AND (${requireVirtual} = FALSE OR EXISTS (
          SELECT 1 FROM "VirtualEvent" ve WHERE ve."eventId" = e."id"
        ))
        AND (
          ${searchLower} IS NULL OR (
            LOWER(e."name") LIKE ('%' || ${searchLower} || '%') OR
            LOWER(e."description") LIKE ('%' || ${searchLower} || '%') OR
            LOWER(ose."location") LIKE ('%' || ${searchLower} || '%') OR
            LOWER(COALESCE(ose."locationAlias", '')) LIKE ('%' || ${searchLower} || '%') OR
            EXISTS (
              SELECT 1 FROM UNNEST(e."tags") AS t WHERE LOWER(t) = ${searchLower}
            )
          )
        )
        AND (${category} IS NULL OR ${category}::"Category" = ANY(e."categories"))
        AND (${latMin} IS NULL OR ose."lat" BETWEEN ${latMin} AND ${latMax})
        AND (${lngMin} IS NULL OR ose."lng" BETWEEN ${lngMin} AND ${lngMax})
        AND (
          ${hasUser} = FALSE AND e."visibility" = 'Public'::"Visibility"
          OR ${hasUser} = TRUE AND (
            e."visibility" = 'Public'::"Visibility" OR (
              e."visibility" = 'Private'::"Visibility" AND e."organizerId" = ANY(${friendsIds})
            )
          )
        )
      ORDER BY distance_km ASC
    `;

    return rows;
  }

  async findEventsStartingSoon(hours: number) {
    const now = new Date();
    const target = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.prisma.event.findMany({
      where: {
        OR: [
          {
            onSiteEvent: {
              is: {
                startDate: {
                  gt: now,
                  lte: target,
                },
              },
            },
          },
          {
            virtualEvent: {
              is: {
                startDate: {
                  gt: now,
                  lte: target,
                },
              },
            },
          },
        ],
      },
      include: {
        participations: {
          include: {
            user: true,
          },
        },
        onSiteEvent: true,
        virtualEvent: true,
      },
    });
  }

  async findEventsStartingBetween(minHours: number, maxHours: number) {
    const now = new Date();
    const min = new Date(now.getTime() + minHours * 60 * 60 * 1000);
    const max = new Date(now.getTime() + maxHours * 60 * 60 * 1000);

    return this.prisma.event.findMany({
      where: {
        OR: [
          {
            onSiteEvent: {
              is: {
                startDate: {
                  gt: min,
                  lte: max,
                },
              },
            },
          },
          {
            virtualEvent: {
              is: {
                startDate: {
                  gt: min,
                  lte: max,
                },
              },
            },
          },
        ],
      },
      include: {
        participations: {
          include: {
            user: true,
          },
        },
        onSiteEvent: true,
        virtualEvent: true,
      },
    });
  }
}
