import { Controller, Post } from '@nestjs/common';
import { HoldService } from './hold.service';

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
}
