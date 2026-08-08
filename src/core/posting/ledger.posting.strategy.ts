import { Injectable, Scope } from '@nestjs/common';
import {
  PixPostingArgs,
  PixPostingUsecase,
} from './usecase/pix-posting.usecase';
import { QueryRunner } from 'typeorm';

interface LedgerPostingStrategyTypes {
  type: 'PIX';
  queryRunner: QueryRunner;
}

export interface LedgerPostingArgsForPixStrategy extends LedgerPostingStrategyTypes {
  data: PixPostingArgs;
}

@Injectable()
export class LedgerPostingStrategy {
  constructor(private readonly pixPostingUsecase: PixPostingUsecase) {}

  async runEstategy(args: LedgerPostingArgsForPixStrategy) {
    const service = {
      PIX: this.pixPostingUsecase.build(args.queryRunner, args.data),
    };

    return await service[args.type].execute();
  }
}
