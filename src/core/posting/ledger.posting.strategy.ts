import { Injectable, Scope } from '@nestjs/common';
import {
  PixPostingArgs,
  PixPostingUsecase,
} from './strategies/pix/pix-posting.strategy';
import { QueryRunner } from 'typeorm';
import {
  TicketPostingArgs,
  TicketPostingStrategy,
} from './strategies/deposit/ticket-posting.strategy';

interface LedgerPostingStrategyTypes {
  queryRunner: QueryRunner;
}

export interface LedgerPostingArgsForPixStrategy extends LedgerPostingStrategyTypes {
  type: 'PIX';
  data: PixPostingArgs;
}

export interface LedgerPostingArgsForTicketStrategy extends LedgerPostingStrategyTypes {
  type: 'TICKET';
  data: TicketPostingArgs;
}

@Injectable()
export class LedgerPostingStrategy {
  constructor(
    private readonly pixPostingUsecase: PixPostingUsecase,
    private readonly ticketPostingStrategy: TicketPostingStrategy,
  ) {}

  async runEstategy(
    args: LedgerPostingArgsForPixStrategy | LedgerPostingArgsForTicketStrategy,
  ) {
    switch (args.type) {
      case 'PIX':
        return await this.pixPostingUsecase
          .build(args.queryRunner, args.data)
          .execute();
      case 'TICKET':
        return await this.ticketPostingStrategy
          .build(args.queryRunner, args.data)
          .execute();
    }
  }
}
