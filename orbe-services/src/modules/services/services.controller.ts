import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @MessagePattern('createService')
  create(@Payload() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @MessagePattern('findAllServices')
  findAll() {
    return this.servicesService.findAll();
  }

  @MessagePattern('findOneService')
  findOne(@Payload() id: number) {
    return this.servicesService.findOne(id);
  }

  @MessagePattern('updateService')
  update(@Payload() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(updateServiceDto.id, updateServiceDto);
  }

  @MessagePattern('removeService')
  remove(@Payload() id: number) {
    return this.servicesService.remove(id);
  }
}
