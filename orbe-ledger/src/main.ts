import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import cors from 'cors';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = 3000;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(
    cors({
      origin: 'http://localhost:3000',
    }),
  );

  app.setGlobalPrefix('orbe-ledger');
  app.enableVersioning({
    type: VersioningType.URI,
  });


  const config = new DocumentBuilder()
    .setTitle('Orbe Ledger API')
    .setDescription('the public ledger api')
    .setVersion('1.0')
    .addTag('financil ledger')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(port, '0.0.0.0', () => {
    console.log(`Orbe Ledger service rodando na porta ${port}`);
    console.log(`Documentação disponível em: http://localhost:${port}/api`);
  });
}

bootstrap();