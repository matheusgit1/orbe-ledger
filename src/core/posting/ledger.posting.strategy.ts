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
import {
  TedPostingArgs,
  TedPostingStrategy,
} from './strategies/deposit/ted-posting.strategy';
import {
  DocPostingArgs,
  DocPostingStrategy,
} from './strategies/deposit/doc-posting.strategy';

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

export interface LedgerPostingArgsForTedStrategy extends LedgerPostingStrategyTypes {
  type: 'TED';
  data: TedPostingArgs;
}

export interface LedgerPostingArgsForDocStrategy extends LedgerPostingStrategyTypes {
  type: 'DOC';
  data: DocPostingArgs;
}

@Injectable()
export class LedgerPostingStrategy {
  constructor(
    private readonly pixPostingUsecase: PixPostingUsecase,
    private readonly ticketPostingStrategy: TicketPostingStrategy,
    private readonly tedPostingStrategy: TedPostingStrategy,
    private readonly docPostingStrategy: DocPostingStrategy,
  ) {}

  async runEstategy(
    args:
      | LedgerPostingArgsForPixStrategy
      | LedgerPostingArgsForTicketStrategy
      | LedgerPostingArgsForTedStrategy
      | LedgerPostingArgsForDocStrategy,
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
      case 'TED':
        return await this.tedPostingStrategy
          .build(args.queryRunner, args.data)
          .execute();
      case 'DOC':
        return await this.docPostingStrategy
          .build(args.queryRunner, args.data)
          .execute();
    }
  }
}
