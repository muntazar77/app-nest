import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Logger } from 'nestjs-pino/Logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet()); // this will set various HTTP headers to help protect your app

   // DTO validation hardening
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // entfernt Felder, die nicht im DTO stehen
      forbidNonWhitelisted: true, // wirft 400, wenn extra Felder gesendet werden
      transform: true,            // transformiert payloads in DTO Klassen (hilft später bei types)
    }),
  );
    // Global error formatting
 app.useGlobalFilters(new HttpExceptionFilter()); // global error handling
  
 // Logging mit pino
 app.useLogger(app.get(Logger));
 
 await app.listen(process.env.PORT ?? 3000);
}
bootstrap();