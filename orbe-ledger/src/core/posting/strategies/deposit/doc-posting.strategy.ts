import { Injectable } from '@nestjs/common';
import { JournalService } from 'src/core/services/journal.service';
import { Account } from 'src/infra/database/entities/account.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Service } from 'src/infra/database/entities/service.entity';
import { QueryRunner } from 'typeorm';
import {
  EntrySide,
  JournalType,
} from 'src/infra/database/common/enums/journal.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { BalanceSnapshotService } from 'src/core/services/balance-snapshot.service';

export interface DocPostingArgs {
  description: string;
  payerAccount: Account;
  receiverAccount: Account;
  revenueAccount: Account;
  ledger: Ledger;
  service: Service;
  idempotencyKey: string;
  requestId: string;
  amount: number;
  tax: number;
  transaction: Transaction;
}

@Injectable()
export class DocPostingStrategy {
  private queryRunner: QueryRunner;
  private args: DocPostingArgs;

  constructor(
    private readonly journalService: JournalService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  build(queryRunner: QueryRunner, args: DocPostingArgs) {
    this.queryRunner = queryRunner;
    this.args = args;
    return this;
  }

  async execute() {
    const { queryRunner, args } = this;
    const {
      payerAccount,
      transaction,
      receiverAccount,
      revenueAccount,
      ledger,
      idempotencyKey,
      requestId,
      amount,
      tax,
    } = args;
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: ledger.id,
        type: JournalType.DOC,
        description: 'DOC deposit',
        reference: undefined,
        externalReference: undefined,
        correlationId: transaction.id,
        causationId: idempotencyKey,
        source: 'DOC',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: payerAccount.id,
            amount: amount,
            side: EntrySide.DEBIT,
            description: 'liquidação via doc',
            currencyId: payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: receiverAccount.id,
            amount: amount - tax,
            side: EntrySide.CREDIT,
            description: 'deposito via doc',
            currencyId: receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: revenueAccount.id,
            amount: parseFloat(Number(tax).toFixed(10)),
            side: EntrySide.CREDIT,
            description: 'taxa via doc',
            currencyId: revenueAccount.currencyId,
            metadata: {},
          },
        ],
      },
    );

    for (const entry of createdJournal.entries) {
      if (entry.accountId === payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          payerAccount.balanceSnapshots,
          amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    for (const entry of createdJournal.entries) {
      if (entry.accountId === receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          receiverAccount.balanceSnapshots,
          amount - tax,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    for (const entry of createdJournal.entries) {
      if (entry.accountId === revenueAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          revenueAccount.balanceSnapshots,
          tax,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    return await this.journalService.registerJournal(
      queryRunner,
      requestId,
      createdJournal,
    );
  }
}
