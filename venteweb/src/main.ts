import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // 🚫 elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // ❌ lanza error si llegan propiedades extra
      transform: true,           // 🔄 transforma el body en una instancia del DTO
      transformOptions: {
        enableImplicitConversion: true, // ⚙️ convierte tipos automáticamente (string → number)
      },
    }),
  );
  app.enableCors({
    origin: 'http://localhost:4200', // tu frontend exacto
    credentials: true,
    exposedHeaders: ['x-access-token'],
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.listen(3000)
  .then(() => console.log('Server is running on port 3000'))
  .catch((err) => console.error('Server is not running', err));
}
bootstrap();
