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
        tax: true,
      },
    });
  }
}
