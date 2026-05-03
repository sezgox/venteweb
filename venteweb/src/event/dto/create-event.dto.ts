import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  registerDecorator,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Category, Visibility } from 'generated/prisma';

// --- VALIDACIONES PERSONALIZADAS ---

export function IsNull(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNull',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return value === null; // solo pasa si es null
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be null`;
        },
      },
    });
  };
}

// 4️⃣ startDate debe ser al menos 4 horas posterior a la fecha actual
@ValidatorConstraint({ name: 'StartDateAtLeastFourHoursAhead', async: false })
class StartDateAtLeastFourHoursAheadConstraint
  implements ValidatorConstraintInterface
{
  validate(value: Date) {
    if (!value) return true;
    const now = new Date();
    const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    return value.getTime() >= fourHoursLater.getTime();
  }

  defaultMessage() {
    return 'Start date must be at least 4 hours ahead of the current time.';
  }
}
@ValidatorConstraint({ name: 'EndDateAfterStartDate', async: false })
class EndDateAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;

    if (!obj.startDate || !obj.endDate) return true; // si alguno falta, no validamos aún

    const start = new Date(obj.startDate);
    const end = new Date(obj.endDate);

    return end.getTime() > start.getTime();
  }

  defaultMessage() {
    return 'End date must be after start date.';
  }
}

// 2️⃣ startDate <= Date.now() + 1 año
@ValidatorConstraint({ name: 'StartDateWithinOneYear', async: false })
class StartDateWithinOneYearConstraint implements ValidatorConstraintInterface {
  validate(value: Date) {
    if (!value) return true;
    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(now.getFullYear() + 1);
    return value <= oneYearLater;
  }

  defaultMessage() {
    return 'Start date cannot be more than 1 year from today.';
  }
}

// 3️⃣ endDate - startDate <= 30 días naturales
@ValidatorConstraint({ name: 'EventDurationWithin30Days', async: false })
class EventDurationWithin30DaysConstraint
  implements ValidatorConstraintInterface
{
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;
    if (!obj.startDate || !obj.endDate) return true;

    const diffMs = obj.endDate.getTime() - obj.startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays <= 30;
  }

  defaultMessage() {
    return 'Event duration cannot exceed 30 days.';
  }
}
// ⏰ endDate - startDate >= 1 hora
@ValidatorConstraint({ name: 'EventDurationAtLeastOneHour', async: false })
class EventDurationAtLeastOneHourConstraint
  implements ValidatorConstraintInterface
{
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;
    if (!obj.startDate || !obj.endDate) return true;

    const diffMs = obj.endDate.getTime() - obj.startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours >= 1;
  }

  defaultMessage() {
    return 'Event duration must be at least 1 hour.';
  }
}

function parseMultipartJson<T>(value: T | string | null | undefined): T | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

@ValidatorConstraint({ name: 'CreateEventModePayload', async: false })
class CreateEventModePayloadConstraint
  implements ValidatorConstraintInterface
{
  validate(_: unknown, args: ValidationArguments) {
    const dto = args.object as CreateEventDto;
    if (dto.onlyVirtual) {
      return Boolean(dto.virtual) && !dto.onSite;
    }
    return Boolean(dto.onSite);
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as CreateEventDto;
    if (dto.onlyVirtual) {
      return 'Virtual-only events require virtual data and must not include onSite data.';
    }
    return 'On-site data is required unless onlyVirtual is true.';
  }
}

export class PlatformInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  link: string;
}

export class OnSiteEventInputDto {
  @IsOptional()
  @IsNumber()
  maxAttendees?: number;

  @IsOptional()
  @IsNumber()
  maxCollaborators?: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsString()
  locationAlias?: string;

  @Type(() => Date)
  @IsDate()
  @Validate(StartDateWithinOneYearConstraint)
  @Validate(StartDateAtLeastFourHoursAheadConstraint)
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @Validate(EventDurationAtLeastOneHourConstraint)
  @Validate(EventDurationWithin30DaysConstraint)
  @Validate(EndDateAfterStartDateConstraint)
  endDate: Date;

  @IsOptional()
  @IsBoolean()
  requiresRequest?: boolean;
}

export class VirtualEventInputDto {
  @IsOptional()
  @IsNumber()
  maxAttendees?: number;

  @IsOptional()
  @IsNumber()
  maxCollaborators?: number;

  @IsOptional()
  @IsBoolean()
  requiresRequest?: boolean;

  @Type(() => Date)
  @IsDate()
  @Validate(StartDateWithinOneYearConstraint)
  @Validate(StartDateAtLeastFourHoursAheadConstraint)
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @Validate(EventDurationAtLeastOneHourConstraint)
  @Validate(EventDurationWithin30DaysConstraint)
  @Validate(EndDateAfterStartDateConstraint)
  endDate: Date;

  @Type(() => PlatformInputDto)
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  platforms: PlatformInputDto[];
}

// --- DTO FINAL ---
export class CreateEventDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  organizerId: string;

  @IsString()
  name: string;

  @IsArray()
  @Transform(({ value }) => parseMultipartJson<Category[]>(value) ?? value)
  @ArrayMaxSize(3, { message: 'You can only have up to 3 categories.' })
  categories: Category[];

  @IsString()
  description: string;

  @IsEnum(Visibility)
  visibility: Visibility;

  @Type(() => Boolean)
  @IsBoolean()
  onlyVirtual: boolean;

  @Type(() => OnSiteEventInputDto)
  @Transform(({ value }) => parseMultipartJson<OnSiteEventInputDto>(value) ?? value)
  @ValidateNested()
  @IsOptional()
  onSite?: OnSiteEventInputDto;

  @Type(() => VirtualEventInputDto)
  @Transform(({ value }) => parseMultipartJson<VirtualEventInputDto>(value) ?? value)
  @ValidateNested()
  @IsOptional()
  virtual?: VirtualEventInputDto;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseMultipartJson<string[]>(value) ?? value)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNull({ message: 'Invitation must be null' })
  invitation?: string;

  @Validate(CreateEventModePayloadConstraint)
  private readonly modePayloadGuard?: never;
}
