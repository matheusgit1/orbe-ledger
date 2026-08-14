import { Injectable, Logger } from '@nestjs/common';
import { CreditRulesService } from 'src/core/services/credit-rules.service';
import { CreditAccount } from 'src/infra/infra/database/entities/credit-account.entity';
import { CreditProduct } from 'src/infra/infra/database/entities/credit-product.entity';
import { OrmService } from 'src/infra/infra/database/orm/orm.service';

@Injectable()
export class HoldUsecase {
  private logger = new Logger(HoldUsecase.name);
  constructor(
    private ormService: OrmService,
    private creditRulesService: CreditRulesService,
  ) {}

  async handler(dto: {
    amount: number;
    creditAccount: CreditAccount;
    creditProduct: CreditProduct;
  }) {
    const { amount, creditAccount, creditProduct } = dto;

    const { queryRunner } = await this.ormService.getQueryRunner();

    

    try {
    } catch (error) {
      this;
      await this.ormService.rollback(queryRunner);
      throw error;
    } finally {
      await this.ormService.release(queryRunner);
    }
  }
}
