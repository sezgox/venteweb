import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ParticipationType } from "generated/prisma";

export class CreateParticipationDto {
    @IsOptional()
    @IsString()
    userId: string;
    
    @IsOptional()
    @IsString()
    eventId: string

    @IsEnum(ParticipationType)
    type: ParticipationType;

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
