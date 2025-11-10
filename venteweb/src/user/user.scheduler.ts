import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventRepository } from 'src/event/event.repository';
import { NotificationRepository } from 'src/notifications/notifications.repository';
import { UserRepository } from 'src/user/user.repository';
import { User } from './entities/user.entity';

@Injectable()
export class UserScheduler {
    private readonly logger = new Logger(UserScheduler.name);

    constructor(
        private readonly eventsRepository: EventRepository,
        private readonly UserRepository: UserRepository,
        private readonly notificationRepository: NotificationRepository,
        private readonly eventEmitter: EventEmitter2
    ) {}
    /**
     * Ejecuta una vez al día (a medianoche UTC)
     * para comprobar los usuarios que pueden ser upgradeados
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkUpgradeLevelUsers(): Promise<void> {
        this.logger.log('⏰ Ejecutando verificación de upgrades de usuarios...');

        try {
            const finishedEvents = await this.eventsRepository.findFinishedEventLast24Hours();
            this.logger.log(`🔍 Se encontraron ${finishedEvents.length} eventos finalizados en las últimas 24h.`);

            // Mostrar IDs de eventos encontrados
            for (const event of finishedEvents) {
                this.logger.debug(`- Evento finalizado: ${event.id} (${event.name})`);
            }

            // Procesar cada evento secuencialmente
            for (const finishedEvent of finishedEvents) {
                //NECESITAMOS PARTICIPACIONES (con evento incluido) Y EVENTOS PARA HACER CHECKS DE UPGRADE EN ENTIDAD
                const include = { participations: {include: {event: true}}, events: true };

                // --- Creador ---
                const creatorData = await this.UserRepository.findOne(finishedEvent.organizerId, include);
                const creator = new User(creatorData);

                if (creator.canGetUpgraded()) {
                    creator.upgradeLevel();
                    await this.UserRepository.upgradeUserLevel(creator.id, creator.level);
                    this.logger.log(`✅ Creador del evento ${finishedEvent.name} (${creator.username}) puede ser upgraded`);
                } else {
                    this.logger.log(`❌ Creador del evento ${finishedEvent.name} (${creator.username}) no puede ser upgraded`);
                }

                // --- Participantes en paralelo ---
                const participantPromises = finishedEvent.participations.map(async (p) => {
                    const participantData = await this.UserRepository.findOne(p.userId, include);
                    const participant = new User(participantData);

                    if (participant.canGetUpgraded()) {
                        participant.upgradeLevel();
                        await this.UserRepository.upgradeUserLevel(participant.id, participant.level);
                        this.logger.log(`✅ Participante del evento ${finishedEvent.name} (${participant.username}) puede ser upgraded`);
                    } else {
                        this.logger.log(`❌ Participante del evento ${finishedEvent.name} (${participant.username}) no puede ser upgraded`);
                    }
                });

                await Promise.all(participantPromises); // esperar a que todos los participantes se procesen
            }
        } catch (error) {
            this.logger.error('❌ Error al procesar upgrades:', error.message);
        }
    }

// ...existing code...

    @Cron(CronExpression.EVERY_WEEK) // Cambiado a semanal
    async removeExpiredNotifications() {
        this.logger.log('⏰ Ejecutando limpieza de notificaciones caducadas...');
        
        try {
            const now = new Date();
            
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(now.getFullYear() - 1);

            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);

            await this.notificationRepository.deleteExpiredNotifications(oneYearAgo, sevenDaysAgo);

            this.logger.log('✅ Limpieza de notificaciones completada');
        } catch (error) {
            this.logger.error('❌ Error al limpiar notificaciones:', error.message);
        }
    }



    @Cron(CronExpression.EVERY_12_HOURS)
    async sendEventStartRemindersDaily() {
        this.logger.log('⏰ Enviando recordatorios (24h) de eventos próximos...');

        try {
            // Eventos que empiezan entre 24h y 25h desde ahora (evita solapamiento con el job horario)
            const oneDayEvents = await this.eventsRepository.findEventsStartingBetween(1,12);
            for (const event of oneDayEvents) {
                this.eventEmitter.emit('reminder.created', {
                    eventId: event.id,
                    userId: event.organizerId,
                    eventName: event.name,
                    text: `Get ready! Your is upcoming`
                });

                event.participations.forEach(participation => {
                    this.eventEmitter.emit('reminder.created', {
                        eventId: event.id,
                        userId: participation.userId,
                        eventName: event.name,
                        text: `Don't forget! The event is upcoming`
                    });
                });
            }

            this.logger.log('✅ Recordatorios (24h) enviados correctamente');
        } catch (error) {
            this.logger.error('❌ Error al enviar recordatorios (24h):', error.message);
        }
    }

    // Recordatorios 1h antes — se ejecuta cada hora
    @Cron(CronExpression.EVERY_HOUR)
    async sendEventStartRemindersHourly() {
        this.logger.log('⏰ Enviando recordatorios (1h) de eventos próximos...');

        try {
            // Eventos que empiezan entre 0 y 1 hora desde ahora
            const oneHourEvents = await this.eventsRepository.findEventsStartingBetween(0, 1);
            for (const event of oneHourEvents) {
                this.eventEmitter.emit('reminder.created', {
                    eventId: event.id,
                    userId: event.organizerId,
                    eventName: event.name,
                    text: `Final preparations! Your event starts soon at ${event.startDate.toLocaleTimeString()}`
                });

                event.participations.forEach(participation => {
                    this.eventEmitter.emit('reminder.created', {
                        eventId: event.id,
                        userId: participation.userId,
                        eventName: event.name,
                        text: `Hurry up! The event is starting soon at ${event.startDate.toLocaleTimeString()}`
                    });
                });
            }

            this.logger.log('✅ Recordatorios (1h) enviados correctamente');
        } catch (error) {
            this.logger.error('❌ Error al enviar recordatorios (1h):', error.message);
        }
    }


}
