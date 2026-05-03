import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UuidService } from 'nestjs-uuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventInvitationsService } from 'src/core/services/event-invitations.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { PrismaService } from 'src/prisma.service';
import { UserRepository } from 'src/user/user.repository';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { EventController } from './event.controller';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';
import { RatingRepository } from './rating.repository';
import { RatingService } from './rating.service';

@Module({
  imports: [NotificationsModule],
  controllers: [EventController],
  providers: [
    EventService,
    RatingService,
    PrismaService,
    EventRepository,
    RatingRepository,
    ParticipationRepository,
    CloudinaryService,
    UuidService,
    UserRepository,
    JwtService,
    InvitationsService,
    EventInvitationsService,
  ],
  exports: [EventService],
})
export class EventModule {}
