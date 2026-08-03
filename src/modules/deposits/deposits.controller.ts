import { Body, Controller, Post } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { TicketDepositDto } from './dtos/ticket-deposit.dto';

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post('/ticket')
  async createTed(@Body() dto: TicketDepositDto) {
    return await this.depositsService.createTicket(dto);
  }
}
