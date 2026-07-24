import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PixSameInstitutionService } from './movments.service';
import { MovementsObjectDto } from './dto/transfer-object.dto';
import { PixRequestDto } from './dto/pix-request.dto';

@Controller('transfer')
export class MovementsController {
  constructor(private readonly movementsService: PixSameInstitutionService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: PixRequestDto) {
    return await this.movementsService.executePixSameInstitution(body);
  }
}
