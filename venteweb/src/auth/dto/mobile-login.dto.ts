import { IsNotEmpty, IsString } from 'class-validator';

export class MobileLoginDto {
  @IsString()
  @IsNotEmpty()
  tokenId: string;
}
