import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // entfernt Felder, die nicht im DTO stehen
      forbidNonWhitelisted: true, // wirft 400, wenn extra Felder gesendet werden
      transform: true,            // transformiert payloads in DTO Klassen (hilft später bei types)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();