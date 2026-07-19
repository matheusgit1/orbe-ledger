import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from '../../filters/global-execeptions.filters';
import { OrmModule } from '../../infra/database/orm/orm.module';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { TracingMiddleware } from '../../middlewares/tracing.middleware';
import { AccountsModule } from '../../legacy/acounts/accounts.module';
import { AuditModule } from '../../legacy/audit/audit.module';
import { AcountTypesModule } from '../../legacy/acount-types/acount-types.module';
import { CurrenciesModule } from '../../legacy/currencies/currencies.module';
import { EntryModule } from '../../legacy/entry/entry.module';
import { HoldModule } from '../../legacy/hold/hold.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JournalsModule } from '../../legacy/journal/journal.module';
import { LedgersModule } from '../../legacy/ledgers/ledgers.module';
import { OrganizationsModule } from '../../legacy/organizations/organizations.module';
import { OutboxModule } from '../../legacy/outbox/outbox.module';
import { SagaModule } from '../../legacy/saga/saga.module';
import { TransactionsModule } from '../../legacy/transactions/transactions.module';
import { MovementsModule } from '../transfer/movments.module';
import { HealthModule } from '../health/health.module';
import { CoreModule } from 'src/core/core.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ }),
    OrmModule,
    HealthModule,
    MovementsModule
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

    