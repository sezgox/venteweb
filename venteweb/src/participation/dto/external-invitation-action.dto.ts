import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventMode } from 'generated/prisma';

export class ExternalInvitationActionDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsEnum(EventMode)
  eventMode?: EventMode;

  @IsString()
  invitation: string;
}
