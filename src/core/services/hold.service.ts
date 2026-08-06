import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateHoldOptions,
  Hold,
} from 'src/infra/database/entities/hold.entity';
import { Repository } from 'typeorm';
import { QueryRunner } from 'typeorm/browser';

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

  async findById(id: string): Promise<Hold> {
    return await this.holdRepository.findOneOrFail({
      where: { id },
      relations: {
        account: {
          currency: true,
          balanceSnapshots: true,
          holds: true,
        },
        currency: true,
        entries: true,
      },
    });
  }

  async update(queryRunner: QueryRunner, hold: Hold): Promise<Hold> {
    return await queryRunner.manager.save(hold);
  }
}
