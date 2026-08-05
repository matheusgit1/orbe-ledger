import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateHoldOptions,
  Hold,
} from 'src/infra/database/entities/hold.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HoldService {
  constructor(
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
  ) {}

  async createHold(options: CreateHoldOptions) {
    const hold = Hold.create(options);
    return await this.holdRepository.save(hold);
  }
}
