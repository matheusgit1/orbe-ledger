import { Controller, Post } from '@nestjs/common';
import { ChargebackService } from './chargeback.service';

@Controller()
export class ChargebackController {
  constructor(private readonly chargebackService: ChargebackService) {}

  @Post('/')
  async chargeBack() {
    return await this.chargebackService.rollback({
      type: 'HOLD',
      transactionId: 'ff6597a2-37cb-4e47-97c9-73f022f86f2c',
      idempotencyKey: crypto.randomUUID(),
    });
  }
}
