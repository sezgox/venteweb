import { Injectable } from '@nestjs/common';
import { NotificationType } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';


@Injectable()
export class NotificationRepository {
    constructor(private prisma: PrismaService) {}

    async create(data: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        relatedId?: string;
    }) {
        return this.prisma.notification.create({ data });
    }

    async findByUser(userId: string) {
        return this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(id: string) {
        return this.prisma.notification.update({
        where: { id },
        data: { read: true },
        });
    }

    async findMany(userId: string) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    async deleteExpiredNotifications(oneYearAgo: Date, sevenDaysAgo: Date) {
    // Borrar notificaciones Follow antiguas
    await this.prisma.notification.deleteMany({
        where: {
            type: 'Follow',
            createdAt: {
                lt: oneYearAgo
            }
        }
    });

    // Borrar notificaciones de eventos antiguos
    await this.prisma.notification.deleteMany({
        where: {
            NOT: {
                type: NotificationType.Follow
            },
            relatedId: {
                in: await this.prisma.event.findMany({
                    where: {
                        endDate: {
                            lt: sevenDaysAgo
                        }
                    },
                    select: {
                        id: true
                    }
                }).then(events => events.map(e => e.id))
            }
        }
    });
}
}
