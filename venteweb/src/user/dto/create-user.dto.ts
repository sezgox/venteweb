import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Level, Permission } from 'generated/prisma';

export class CreateUserDto {
    @IsString()
    @Length(3, 20)
    @Matches(/^[a-zA-Z0-9_-]+$/, { 
        message: 'El username solo puede contener letras, números, guiones y guiones bajos' 
    })
    @Transform(({ value }) => value?.trim().toLowerCase())
    username: string;

    @IsString()
    @Length(2, 50)
    name: string;

    @IsString()
    @Length(8, 50)
    @Matches(/^\S+$/, { 
        message: 'La contraseña no puede contener espacios' 
    })
    password: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    photo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    @Transform(({ value }) => value?.trim())
    bio?: string;

    @IsOptional()
    @IsEnum(Permission)
    permission?: Permission;

    @IsOptional()
    @IsEnum(Level)
    level?: Level;

    @IsOptional()
    @IsString()
    locale?: string;
}
