import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventMode, ParticipationType } from 'generated/prisma';

export class CreateParticipationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  externalUserId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsEnum(EventMode)
  eventMode?: EventMode;

  @IsOptional()
  @IsEnum(ParticipationType)
  type?: ParticipationType;

  @IsOptional()
  @IsString()
  invitationId?: string;

  @IsOptional()
  @IsString()
  invitation?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}
