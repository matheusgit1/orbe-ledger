import { Controller, Post } from '@nestjs/common';
import { HoldService } from './hold.service';
import * as crypto from 'crypto';

@Controller('hold')
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Post()
  async createHold() {
    return await this.holdService.createHold({
      accountNumber: '000002',
      amount: 500,
    });
  }

  @Post('/release')
  async releaseHold() {
    return await this.holdService.releaseHold({
      holdId: 'c9a471a3-c8fe-4b22-950e-8b6c72f482b5',
      idempotencyKey: crypto.randomUUID(),
    });
  }
}
