import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isFloat16Array } from 'node:util/types';
import {
  CreateStepsSagaOptions,
  SagaStep,
} from 'src/infra/database/entities/saga-step.entity';
import { Saga } from 'src/infra/database/entities/saga.entity';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { Repository } from 'typeorm';
import { SagaStepService } from './saga-step.service';

@Injectable()
export class SagaService {
  constructor(
    @InjectRepository(Saga)
    private sagaRepository: Repository<Saga>,
    private readonly sagaStepService: SagaStepService,
  ) {}

  async createSaga(dto: {
    transaction: Transaction;
    steps: Omit<CreateStepsSagaOptions, 'sagaId'>[];
  }): Promise<Saga> {
    const saga = await this.sagaRepository.save(
      this.sagaRepository.create(
        Saga.createFromTransaction(
          dto.transaction,
          dto.transaction.id,
          dto.steps,
          {},
        ),
      ),
    );

    if (!saga) {
      throw new Error('Saga cannot be created');
    }
    await this.sagaStepService.create(
      dto.steps.map((s) => ({ ...s, sagaId: saga.id })),
    );
    return await this.sagaRepository.save(saga);
  }
}
