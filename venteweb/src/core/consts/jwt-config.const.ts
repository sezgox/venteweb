import { JwtSignOptions } from '@nestjs/jwt';

process.loadEnvFile('./.env');
export const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
} as JwtSignOptions;

export const mobileJwtConfig = {
  secret: process.env.JWT_MOBILE_SECRET || process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
} as JwtSignOptions;

export const refreshTokenConfig = {
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.JWT_REFRESH_EXPIRES,
} as JwtSignOptions;

export const jwtVerificationSecrets = Array.from(
  new Set([jwtConfig.secret, mobileJwtConfig.secret].filter(Boolean) as string[]),
);
