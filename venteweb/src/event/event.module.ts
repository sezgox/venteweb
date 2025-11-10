import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UuidService } from 'nestjs-uuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { PrismaService } from 'src/prisma.service';
import { UserRepository } from 'src/user/user.repository';
import { EventController } from './event.controller';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';

@Module({
  controllers: [EventController],
  providers: [EventService, PrismaService, EventRepository, ParticipationRepository, CloudinaryService, UuidService, UserRepository, EventEmitter2, JwtService, InvitationsService],
})
export class EventModule {}
