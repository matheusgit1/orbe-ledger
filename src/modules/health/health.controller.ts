import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('check')
  async check() {
    return await this.healthService.check();
  }
}
