import { Injectable, Logger } from '@nestjs/common';
import { OrmService } from 'src/infra/infra/database/orm/orm.service';

@Injectable()
export class PaymenteUsecase {
  private logger = new Logger(PaymenteUsecase.name);
  constructor(private ormService: OrmService) {}

  async handler(dto: { amount: number; accountId: string }) {
    const { amount, accountId } = dto;

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
