import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString, Min, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Category, Visibility } from "generated/prisma";

@ValidatorConstraint({ name: 'DistanceSortRequiresLocation', async: false })
class DistanceSortRequiresLocation implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments): boolean {
    const o = args.object as FilterEventDto;
    if (o.sortBy !== 'distance') return true;
    const hasCenter = o.lat !== undefined && o.lng !== undefined && o.radius !== undefined;
    const hasBBox = o.latMin !== undefined && o.latMax !== undefined && o.lngMin !== undefined && o.lngMax !== undefined;
    return hasCenter || hasBBox;
  }
  defaultMessage(): string {
    return 'When sortBy is distance, provide either (lat,lng,radius) or (latMin,latMax,lngMin,lngMax).';
  }
}

export class FilterEventDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    date?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;

    @IsOptional()
    @IsEnum(Category)
    category?: Category;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsEnum(Visibility)
    visibility?: Visibility;

    @IsOptional()
    @IsBoolean()
    collaboration?: boolean;

    // Centro + radio
    @IsOptional()
    @IsNumber()
    lat?: number;

    @IsOptional()
    @IsNumber()
    lng?: number;

    @IsOptional()
    @IsNumber()
    radius?: number;

    // Bounding box
    @IsOptional()
    @IsNumber()
    latMin?: number;

    @IsOptional()
    @IsNumber()
    latMax?: number;

    @IsOptional()
    @IsNumber()
    lngMin?: number;

    @IsOptional()
    @IsNumber()
    lngMax?: number;
    
    @IsNumber()
    @Min(1)
    page: number;

    @IsOptional()
    @IsEnum(['date', 'popularity', 'distance'])
    @Validate(DistanceSortRequiresLocation)
    sortBy?: 'date' | 'popularity' | 'distance' ;
}
