import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Param,
} from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
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

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  async create(@Body() body: CreateServiceDto) {
    console.log('body: ', body);
    return await this.servicesService.create(body);
  }

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return await this.servicesService.findAll(
      pagination.take || 10,
      pagination.offset || 0,
    );
  }

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    return await this.servicesService.findByCode(code);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return await this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.servicesService.remove(id);
  }
}
