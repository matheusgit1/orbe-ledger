import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor(){}

  async check(){
    return { status: 'ok' };
  }
}
