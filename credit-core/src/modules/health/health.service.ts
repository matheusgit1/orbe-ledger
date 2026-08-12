import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  health() {
    return {
      status: 'UP',
      message: 'Service is running',
      module: 'health',
      timestamp: new Date().toISOString(),
    };
  }
}
