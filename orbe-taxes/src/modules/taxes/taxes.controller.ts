import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { AssociateTaxDto } from './dto/associate-tax.dto';
import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ required: false, default: 10 })
  take?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ required: false, default: 0 })
  offset?: number;
}

@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post()
  async create(@Body() createTaxDto: CreateTaxDto) {
    return await this.taxesService.create(createTaxDto);
  }

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return await this.taxesService.findAll(
      pagination.take || 10,
      pagination.offset || 0,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.taxesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return await this.taxesService.update(id, updateTaxDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.taxesService.remove(id);
  }

  @Post('associate')
  async associateTaxWithService(@Body() associateTaxDto: AssociateTaxDto) {
    return await this.taxesService.associateTaxWithService(
      associateTaxDto.serviceId,
      associateTaxDto.taxId,
    );
  }

  @Post('dissociate')
  async dissociateTaxFromService(@Body() associateTaxDto: AssociateTaxDto) {
    return await this.taxesService.dissociateTaxFromService(
      associateTaxDto.serviceId,
      associateTaxDto.taxId,
    );
  }
}
