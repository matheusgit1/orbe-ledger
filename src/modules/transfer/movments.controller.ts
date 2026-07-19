import { Body, Controller, Get, Post } from '@nestjs/common';
import { MovementsService } from './movments.service';
import { MovementsObjectDto } from './dto/transfer-object.dto';
import { TransferService } from 'src/core/services/transfer.service';

@Controller('transfer')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) { }

  @Post('create')
  async create(@Body() body: MovementsObjectDto) {
    return await this.movementsService.create(body);
  }
}
