import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { InvitationMailService } from './invitation-mail.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationListener } from './notifications.listener';
import { NotificationRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    PrismaService,
    NotificationListener,
    NotificationsGateway,
    JwtService,
    InvitationMailService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
