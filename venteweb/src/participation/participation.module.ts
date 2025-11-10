import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ParticipationRepository } from './participation.repository';

@Module({
  providers: [ PrismaService, ParticipationRepository],
})
export class ParticipationModule {}
