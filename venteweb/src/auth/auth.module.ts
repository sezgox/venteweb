import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { UserRepository } from 'src/user/user.repository';
import { ActivationMailService } from './activation-mail.service';
import { ActivationTokenRepository } from './activation-token.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    JwtService,
    PrismaService,
    ActivationTokenRepository,
    ActivationMailService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
