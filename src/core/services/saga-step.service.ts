import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateStepsSagaOptions,
  SagaStep,
} from 'src/infra/database/entities/saga-step.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SagaStepService {
  constructor(
    @InjectRepository(SagaStep)
    private sagaStepRepository: Repository<SagaStep>,
  ) {}

  async create(options: CreateStepsSagaOptions[]) {
    const steps = this.sagaStepRepository.create(options);
    return await this.sagaStepRepository.save(steps);
  }
}
