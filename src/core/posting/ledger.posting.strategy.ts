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
import {
  HoldPostingArgs,
  HoldPostingStrategy,
} from './strategies/hold/hold-posting.strategy';
import {
  HoldReleasePostingArgs,
  HoldReleasePostingStrategy,
} from './strategies/hold/hold-release-posting.strategy';

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

export interface LedgerPostingArgsForHoldStrategy extends LedgerPostingStrategyTypes {
  type: 'HOLD';
  data: HoldPostingArgs;
}

export interface LedgerPostingArgsForHoldReleaseStrategy extends LedgerPostingStrategyTypes {
  type: 'HOLD_RELEASE';
  data: HoldReleasePostingArgs;
}

@Injectable()
export class LedgerPostingStrategy {
  constructor(
    private readonly pixPostingUsecase: PixPostingUsecase,
    private readonly ticketPostingStrategy: TicketPostingStrategy,
    private readonly tedPostingStrategy: TedPostingStrategy,
    private readonly docPostingStrategy: DocPostingStrategy,
    private readonly holdPostingStrategy: HoldPostingStrategy,
    private readonly holdReleasePostingStrategy: HoldReleasePostingStrategy,
  ) {}

  async runEstategy(
    args:
      | LedgerPostingArgsForPixStrategy
      | LedgerPostingArgsForTicketStrategy
      | LedgerPostingArgsForTedStrategy
      | LedgerPostingArgsForDocStrategy
      | LedgerPostingArgsForHoldStrategy
      | LedgerPostingArgsForHoldReleaseStrategy,
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
      case 'HOLD':
        return await this.holdPostingStrategy
          .build(args.queryRunner, args.data)
          .execute();
      case 'HOLD_RELEASE':
        return await this.holdReleasePostingStrategy
          .build(args.queryRunner, args.data)
          .execute();
    }
  }
}
