import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from '../../filters/global-execeptions.filters';
import { OrmModule } from '../../infra/database/orm/orm.module';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { TracingMiddleware } from '../../middlewares/tracing.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MovementsModule } from '../transfer/movments.module';
import { HealthModule } from '../health/health.module';
import { CoreModule } from 'src/core/core.module';
import { PixModule } from '../pix/pix.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({}),
    OrmModule,
    HealthModule,
    // MovementsModule,
    PixModule
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

