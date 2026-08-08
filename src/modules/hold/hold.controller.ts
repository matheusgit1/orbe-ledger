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
      amount: 1000,
    });
  }

  @Post('/release')
  async releaseHold() {
    return await this.holdService.releaseHold({
      holdId: '6a9e835e-4bea-406a-bc7d-b5f1580e3ffb',
      idempotencyKey: crypto.randomUUID(),
    });
  }

  @Post('/capture')
  async captureHold() {
    return await this.holdService.captureHold({
      holdId: 'b5bfd0c5-3ea6-4967-9317-5f2cf92c6dc1',
      idempotencyKey: crypto.randomUUID(),
    });
  }
}
