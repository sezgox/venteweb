import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EventMode, ParticipationType } from 'generated/prisma';

export class CreateInvitationDto {
  @IsOptional()
  @IsString()
  userId: string;

  @IsString()
  eventId: string;

  @IsString()
  @MaxLength(150, { message: 'El texto no puede superar los 150 caracteres' })
  text: string;

  @IsOptional()
  @IsEnum(EventMode)
  eventMode?: EventMode;

  @IsEnum(ParticipationType)
  type: ParticipationType;
}
