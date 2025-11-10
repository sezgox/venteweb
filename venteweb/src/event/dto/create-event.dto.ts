import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsDate,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    registerDecorator,
    Validate,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { Category, Visibility } from 'generated/prisma';

// --- VALIDACIONES PERSONALIZADAS ---

export function IsNull(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
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
@ValidatorConstraint({ name: 'StartDateAtLeastOneHourAhead', async: false })
class StartDateAtLeastOneHoursAheadConstraint implements ValidatorConstraintInterface {
validate(value: Date) {
    if (!value) return true;
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    return value.getTime() >= oneHourLater.getTime();
}

defaultMessage() {
    return 'Start date must be at least one hour ahead of the current time.';
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
class EventDurationWithin30DaysConstraint implements ValidatorConstraintInterface {
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
class EventDurationAtLeastOneHourConstraint implements ValidatorConstraintInterface {
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


// --- DTO FINAL ---
export class CreateEventDto {
    @IsOptional()
    @IsString()
    id: string;

    @IsOptional()
    @IsString()
    organizerId: string;

    @IsOptional()
    @IsString()
    poster?: string;

    @IsString()
    name: string;

    @IsArray()
    @ArrayMaxSize(3, { message: 'You can only have up to 3 categories.' })
    categories: Category[];

    @IsString()
    description: string;

    @IsEnum(Visibility)
    visibility: Visibility;

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
    location: string;

    @Type(() => Date)
    @IsDate()
    @Validate(StartDateWithinOneYearConstraint)
    @Validate(StartDateAtLeastOneHoursAheadConstraint)
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

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsNull({ message: 'Invitation must be null' })
    invitation?: string;

}
