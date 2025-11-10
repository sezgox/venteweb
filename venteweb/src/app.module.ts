import { MiddlewareConsumer, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { UuidModule } from 'nestjs-uuid';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthMiddleware } from './core/middlewares/auth/auth.middleware';
import { InvitationsService } from './core/services/invitations.service';
import { EventController } from './event/event.controller';
import { EventModule } from './event/event.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParticipationModule } from './participation/participation.module';
import { PrismaService } from './prisma.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';

@Module({
  imports: [UserModule, EventModule, ParticipationModule, AuthModule, CloudinaryModule, UuidModule, ScheduleModule.forRoot(), EventEmitterModule.forRoot(), NotificationsModule,],
  controllers: [AppController],
  providers: [AppService, PrismaService, JwtService, InvitationsService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware para rutas HTTP
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        UserController,
        EventController
      );
  }
}
