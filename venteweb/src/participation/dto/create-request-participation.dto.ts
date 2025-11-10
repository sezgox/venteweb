import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRequestParticipationDto {
    @IsString()
    userId: string;

    @IsOptional()
    @IsString()
    eventId: string;

    @IsString()
    @MaxLength(150, { message: 'El texto no puede superar los 150 caracteres' })
    text: string;

    @IsOptional()
    @IsString()
    invitationToken?: string;
}
