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
      holdId: '6c6c5c60-cd4d-4852-8e31-5622a9842c8e',
      idempotencyKey: crypto.randomUUID(),
    });
  }
}
