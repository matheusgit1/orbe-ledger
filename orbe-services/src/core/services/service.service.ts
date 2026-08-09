import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateServiceOptions,
  Service,
} from 'src/infra/database/entities/service.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async createService(options: CreateServiceOptions): Promise<Service> {
    const service = Service.create(options);
    return await this.serviceRepository.save(service);
  }

  async getServiceByCode(code: string) {
    return await this.serviceRepository.findOneOrFail({
      where: {
        code,
      },
      relations: {
        taxes: true,
      },
    });
  }

  async findAllWithPagination(take: number = 10, offset: number = 0) {
    return await this.serviceRepository.find({
      relations: {
        taxes: true,
      },
      take,
      skip: offset,
    });
  }

  async updateService(
    id: string,
    options: Partial<CreateServiceOptions>,
  ): Promise<Service> {
    const service = await this.serviceRepository.findOneOrFail({
      where: { id },
      relations: { taxes: true },
    });

    if (options.code !== undefined) service.code = options.code;
    if (options.name !== undefined) service.name = options.name;
    if (options.description !== undefined)
      service.description = options.description;
    if (options.type !== undefined) service.type = options.type;
    if (options.taxes !== undefined) service.taxes = options.taxes;
    if (options.isActive !== undefined) service.isActive = options.isActive;
    if (options.metadata !== undefined) service.metadata = options.metadata;

    return await this.serviceRepository.save(service);
  }
}
