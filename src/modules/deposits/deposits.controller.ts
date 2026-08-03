import { Body, Controller, Post } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { TicketDepositDto } from './dtos/ticket-deposit.dto';
import { TedDepositDto } from './dtos/ted-deposit.dto';

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post('/ticket')
  async createTicket(@Body() dto: TicketDepositDto) {
    return await this.depositsService.createTicket(dto);
  }

    @Post('/ted')
  async createTed(@Body() dto: TedDepositDto) {
    return await this.depositsService.createTed(dto);
  }
}
