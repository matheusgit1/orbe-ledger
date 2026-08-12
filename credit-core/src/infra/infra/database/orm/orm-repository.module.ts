import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../entities/payment.entity';
import { Statement } from '../entities/statement.entity';
import { CreditUtilization } from '../entities/credit-ultilization.entity';
import { CreditTransaction } from '../entities/credit-transaction.entity';
import { CreditProduct } from '../entities/credit-product.entity';
import { CreditLimit } from '../entities/credit-limit.entity';
import { CreditHold } from '../entities/credit-hold.entity';
import { CreditAuthorization } from '../entities/credit-authorization.entity';
import { CreditAccount } from '../entities/credit-account.entity';
import { BillingCycle } from '../entities/billing-cycle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Statement,
      CreditUtilization,
      CreditTransaction,
      CreditProduct,
      CreditLimit,
      CreditHold,
      CreditAuthorization,
      CreditAuthorization,
      CreditAccount,
      BillingCycle,
    ]),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class OrmRepositoryModule {}
