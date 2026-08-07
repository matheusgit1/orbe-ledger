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
      holdId: '407b9ef8-834c-4ead-ac49-02aa416a4761',
      idempotencyKey: crypto.randomUUID(),
    });
  }

  @Post('/capture')
  async captureHold() {
    return await this.holdService.captureHold({
      holdId: '52f05dad-961a-49fd-b04a-e1b1cdbce28f',
      idempotencyKey: crypto.randomUUID(),
    });
  }
}
