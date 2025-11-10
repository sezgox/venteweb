import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { EventRepository } from 'src/event/event.repository';
import { NotificationRepository } from 'src/notifications/notifications.repository';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { PrismaService } from 'src/prisma.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserScheduler } from './user.scheduler';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, UserRepository, UserScheduler, EventRepository, JwtService, InvitationsService, ParticipationRepository, CloudinaryService, NotificationRepository],
})
export class UserModule {}
