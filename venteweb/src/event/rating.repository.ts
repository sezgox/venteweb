import { Injectable } from '@nestjs/common';
import { EventMode, Prisma, Rating } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRegisteredParticipation(eventId: string, userId: string, eventMode: EventMode) {
    return this.prisma.participation.findFirst({
      where: { eventId, userId, eventMode },
      include: { rating: true },
    });
  }

  async upsertRating(data: {
    eventId: string;
    userId: string;
    eventMode: EventMode;
    participationId: string;
    score: number;
    text?: string;
  }) {
    return await this.prisma.$transaction(async (tx) => {
      const text = data.text ?? null;
      const existing = await tx.rating.findUnique({
        where: { participationId: data.participationId },
      });

      const rating = existing
        ? await tx.rating.update({
            where: { participationId: data.participationId },
            data: { score: data.score, text, eventMode: data.eventMode },
            include: this.ratingInclude(),
          })
        : await tx.rating.create({
            data: {
              eventId: data.eventId,
              userId: data.userId,
              eventMode: data.eventMode,
              participationId: data.participationId,
              onSiteEventId:
                data.eventMode === EventMode.OnSite ? data.eventId : null,
              virtualEventId:
                data.eventMode === EventMode.Virtual ? data.eventId : null,
              score: data.score,
              text,
            },
            include: this.ratingInclude(),
          });

      const aggregate = await tx.rating.aggregate({
        where: { eventId: data.eventId, eventMode: data.eventMode },
        _avg: { score: true },
        _count: { _all: true },
      });

      const eventAggregate =
        data.eventMode === EventMode.OnSite
          ? await tx.onSiteEvent.update({
              where: { eventId: data.eventId },
              data: {
                totalRate: aggregate._avg.score ?? null,
                ratingCount: aggregate._count._all,
              },
            })
          : await tx.virtualEvent.update({
              where: { eventId: data.eventId },
              data: {
                totalRate: aggregate._avg.score ?? null,
                ratingCount: aggregate._count._all,
              },
            });

      return {
        rating,
        event: eventAggregate,
        previousScore: existing?.score ?? null,
        created: !existing,
      };
    });
  }

  findManyByEvent(eventId: string, eventMode: EventMode, skip: number, take: number) {
    return this.prisma.rating.findMany({
      where: { eventId, eventMode },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: this.ratingInclude(),
    });
  }

  countByEvent(eventId: string, eventMode: EventMode) {
    return this.prisma.rating.count({ where: { eventId, eventMode } });
  }

  async getSummary(eventId: string, eventMode: EventMode) {
    const grouped = await this.prisma.rating.groupBy({
      by: ['score'],
      where: { eventId, eventMode },
      _count: { _all: true },
      orderBy: { score: 'asc' },
    });

    const total = grouped.reduce((sum, bucket) => sum + bucket._count._all, 0);
    const histogram: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    grouped.forEach((bucket) => {
      if (bucket.score >= 1 && bucket.score <= 5) {
        histogram[bucket.score as 1 | 2 | 3 | 4 | 5] = bucket._count._all;
      }
    });

    const aggregate = await this.prisma.rating.aggregate({
      where: { eventId, eventMode },
      _avg: { score: true },
    });

    return {
      total,
      average: aggregate._avg.score ?? null,
      histogram,
    };
  }

  private ratingInclude(): Prisma.RatingInclude {
    return {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          photo: true,
        },
      },
    };
  }
}

export type RatingWithUser = Rating & {
  user?: {
    id: string;
    username: string;
    name: string;
    photo?: string | null;
  };
};
