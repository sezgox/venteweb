import { IsString, MinLength } from 'class-validator';

export class ConfirmActivationDto {
  @IsString()
  @MinLength(8)
  token: string;
}
