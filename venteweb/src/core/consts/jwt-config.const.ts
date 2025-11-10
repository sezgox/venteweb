import { JwtSignOptions } from '@nestjs/jwt';

process.loadEnvFile("./.env")
export const jwtConfig = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
} as JwtSignOptions;
