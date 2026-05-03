import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EventMode } from 'generated/prisma';

export class CreateRequestParticipationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  eventId: string;

  @IsOptional()
  @IsEnum(EventMode)
  eventMode?: EventMode;

  @IsString()
  @MaxLength(150, { message: 'El texto no puede superar los 150 caracteres' })
  text: string;

  @IsOptional()
  @IsString()
  invitationToken?: string;
}
