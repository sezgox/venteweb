import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 🚫 elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // ❌ lanza error si llegan propiedades extra
      transform: true, // 🔄 transforma el body en una instancia del DTO
      transformOptions: {
        enableImplicitConversion: true, // ⚙️ convierte tipos automáticamente (string → number)
      },
    }),
  );
  const exactAllowedOrigins = new Set([
    'http://localhost:4200', // Angular web dev
    'http://localhost:8100', // Ionic dev server
    'https://localhost', // Capacitor Android
    'ionic://localhost', // Capacitor iOS (legacy)
    'capacitor://localhost', // Capacitor iOS
    'https://k239604w-4200.uks1.devtunnels.ms',
    'http://100.103.144.82:8101',
  ]);
  const dynamicAllowedOrigins = [
    /^http:\/\/192\.168\.\d+\.\d+:8100$/, // ionic serve on LAN for emulator/device
    /^http:\/\/10\.0\.2\.2:\d+$/, // Android emulator-hosted pages if needed
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        exactAllowedOrigins.has(origin) ||
        dynamicAllowedOrigins.some((regex) => regex.test(origin))
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    exposedHeaders: ['x-access-token'],
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app
    .listen(3000, '0.0.0.0')
    .then(() => console.log('Server is running on 0.0.0.0:3000'))
    .catch((err) => console.error('Server is not running', err));
}
bootstrap();
