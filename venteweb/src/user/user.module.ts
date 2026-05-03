import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventInvitationsService } from 'src/core/services/event-invitations.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { EventModule } from 'src/event/event.module';
import { EventRepository } from 'src/event/event.repository';
import { NotificationRepository } from 'src/notifications/notifications.repository';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { PrismaService } from 'src/prisma.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserScheduler } from './user.scheduler';
import { UserService } from './user.service';

@Module({
  imports: [EventModule, AuthModule],
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    UserRepository,
    UserScheduler,
    EventRepository,
    JwtService,
    InvitationsService,
    ParticipationRepository,
    CloudinaryService,
    NotificationRepository,
    EventInvitationsService,
  ],
})
export class UserModule {}
