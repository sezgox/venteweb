import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EventMode } from 'generated/prisma';

export class UpsertRatingDto {
  @IsOptional()
  @IsEnum(EventMode)
  eventMode?: EventMode;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;
}
