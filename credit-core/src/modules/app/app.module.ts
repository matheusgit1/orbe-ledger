import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from '../../filters/global-execeptions.filters';
import { LoggingInterceptor } from 'src/interceptors/logging.interceptor';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrmModule } from 'src/infra/infra/database/orm/orm.module';
import { TracingMiddleware } from 'src/middlewares/tracing.middleware';
import { HealthModule } from '../health/health.module';
import { HoldModule } from '../hold/hold.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({}),
    OrmModule,
    HealthModule,
    HoldModule
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TracingMiddleware).forRoutes('*');
  }
}
