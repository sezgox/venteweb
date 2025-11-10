import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ParticipationType } from 'generated/prisma';

export class CreateInvitationDto {
    @IsOptional()
    @IsString()
    userId: string;

    @IsString()
    eventId: string;

    @IsString()
    @MaxLength(150, { message: 'El texto no puede superar los 150 caracteres' })
    text: string;

    @IsEnum(ParticipationType)
    type: ParticipationType;
}
