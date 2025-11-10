import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "generated/prisma";
import { PrismaService } from "src/prisma.service";
import { Event } from "./entities/event.entity";

@Injectable()
export class EventRepository{

    constructor(private prisma: PrismaService){}

    async create(event: Event) {

        const data: Prisma.EventCreateInput = {
            id: event.id,
            name: event.name,
            description: event.description,
            visibility: event.visibility,
            lat: event.lat,
            lng: event.lng,
            poster: event.poster,
            location: event.location,
            startDate: event.startDate,
            endDate: event.endDate,
            requiresRequest: event.requiresRequest,
            maxAttendees: event.maxAttendees,
            categories: event.categories,
            maxCollaborators: event.maxCollaborators,
            invitation: event.invitation,
            language: event.language,
            allowPosts: event.allowPosts,
            organizer: { connect: { id: event.organizerId } }, // ✅ transformación aquí
        };
        
        return await this.prisma.event.create({data});
    }

    async findMany(where: Prisma.EventWhereInput) {
        return await this.prisma.event.findMany({
            where,
            include: {
                participations: true,
                organizer: true
            },
        });
    }

    async findOne(id: string) {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: {
                participations: {include: {user: true}},
                requests:  {include: {user: true}},
                invitations:  {include: {user: true}},
                organizer: true
            },
        });
        if (!event) {
            throw new BadRequestException('Event not found');
        }
        return event;
    }

    async findFinishedEventLast24Hours() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000); // últimas 24h
        console.log(yesterday);
        console.log(now);

        return await this.prisma.event.findMany({
            where: {
            endDate: {
                gte: yesterday,
                lt: now,
            },
            },
            include: {
                participations: true,
            },
            orderBy: {
            endDate: 'desc',
            },
        });
    }

    async remove(id: string){
        return await this.prisma.event.delete({where: {id}});
    }

    async findEventIdsByDistance(params: {
        centerLat: number,
        centerLng: number,
        date: Date,
        endDate?: Date,
        language?: string,
        search?: string,
        category?: string,
        latMin?: number,
        latMax?: number,
        lngMin?: number,
        lngMax?: number,
        friendsIds?: string[],
        hasUser?: boolean,
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
        } = params;

        const searchLower = search ? search.toLowerCase() : null;

        const rows = await this.prisma.$queryRaw<{ id: string; distance_km: number }[]>`
            SELECT e."id",
                2 * 6371 * ASIN(
                    SQRT(
                        POWER(SIN(RADIANS((e."lat" - ${centerLat}) / 2)), 2) +
                        COS(RADIANS(${centerLat})) * COS(RADIANS(e."lat")) *
                        POWER(SIN(RADIANS((e."lng" - ${centerLng}) / 2)), 2)
                    )
                ) AS distance_km
            FROM "Event" e
            WHERE
                e."startDate" >= ${date}
                AND (${endDate} IS NULL OR e."startDate" <= ${endDate})
                AND (${language} IS NULL OR e."language" = ${language})
                AND (
                    ${searchLower} IS NULL OR (
                        LOWER(e."name") LIKE ('%' || ${searchLower} || '%') OR
                        EXISTS (
                            SELECT 1 FROM UNNEST(e."tags") AS t WHERE LOWER(t) = ${searchLower}
                        )
                    )
                )
                AND (${category} IS NULL OR ${category}::"Category" = ANY(e."categories"))
                AND (${latMin} IS NULL OR e."lat" BETWEEN ${latMin} AND ${latMax})
                AND (${lngMin} IS NULL OR e."lng" BETWEEN ${lngMin} AND ${lngMax})
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
                startDate: {
                    gt: now,
                    lte: target
                },
            },
            include: {
                participations: {
                    include: {
                        user: true
                    }
                }
            }
        });
    }
}