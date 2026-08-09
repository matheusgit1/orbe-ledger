import { Inject, Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceService } from 'src/core/services/service.service';
import { Logger } from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);
  constructor(
    @Inject(REQUEST)
    private request: Request,
    private readonly serviceService: ServiceService,
  ) {}

  async create(dto: CreateServiceDto) {
    this.logger.log(`[${this.request.hash}] Creating service`);
    return await this.serviceService.createService({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      isActive: true,
      metadata: dto.metadata,
    });
  }

  async findAll(take?: number, offset?: number) {
    this.logger.log('Finding all services');
    return await this.serviceService.findAllWithPagination(take, offset);
  }

  async findOne(id: number) {
    return `This action returns a #${id} service`;
  }

  update(id: number, updateServiceDto: UpdateServiceDto) {
    return `This action updates a #${id} service`;
  }

  remove(id: number) {
    return `This action removes a #${id} service`;
  }
}
