import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EventMode, ParticipationType } from 'generated/prisma';

export class PrepareInvitationDto {
  @IsString()
  eventId: string;

  @IsString()
  @MaxLength(150, { message: 'Invitation text cannot exceed 150 characters' })
  text: string;

  @IsEnum(ParticipationType)
  type: ParticipationType;

  @IsOptional()
  @IsEnum(EventMode)
  eventMode?: EventMode;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
