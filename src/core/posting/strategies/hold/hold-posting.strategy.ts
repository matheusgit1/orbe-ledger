import { Injectable } from '@nestjs/common';
import { JournalService } from 'src/core/services/journal.service';
import { BalanceSnapshotService } from 'src/core/services/balance-snapshot.service';
import { Account } from 'src/infra/database/entities/account.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Hold } from 'src/infra/database/entities/hold.entity';
import { QueryRunner } from 'typeorm';
import {
  EntrySide,
  JournalType,
  JournalStatus,
} from 'src/infra/database/common/enums/journal.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';

export interface HoldPostingArgs {
  description: string;
  payerAccount: Account;
  receiverAccount: Account;
  ledger: Ledger;
  idempotencyKey: string;
  requestId: string;
  amount: number;
  hold: Hold;
  transaction: Transaction;
}

@Injectable()
export class HoldPostingStrategy {
  private queryRunner: QueryRunner;
  private args: HoldPostingArgs;

  constructor(
    private readonly journalService: JournalService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  build(queryRunner: QueryRunner, args: HoldPostingArgs) {
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
      ledger,
      idempotencyKey,
      requestId,
      amount,
      hold,
      description,
    } = args;
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: ledger.id,
        type: JournalType.HOLD,
        description: description,
        reference: idempotencyKey,
        externalReference: idempotencyKey,
        correlationId: transaction.id,
        causationId: idempotencyKey,
        source: 'HOLD',
        createdBy: 'SYSTEM',
        metadata: {},
        status: JournalStatus.PENDING,
        entries: [
          {
            accountId: payerAccount.id,
            amount: amount,
            side: EntrySide.DEBIT,
            holdId: hold.id,
            description: description,
            currencyId: payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: receiverAccount.id,
            amount: amount,
            side: EntrySide.CREDIT,
            holdId: hold.id,
            description: description,
            currencyId: receiverAccount.currencyId,
            metadata: {},
          },
        ],
      },
    );

    // atualiza conta pagadora
    const payerBalance = await this.balanceSnapshot.getAvailableBalanceAndLock(
      queryRunner,
      payerAccount.id,
    );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForHold(
          queryRunner,
          payerBalance,
          amount,
          entry.id,
          createdJournal.id,
        );
      }
    }

    // atualiza conta recebedora
    const receiverBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        receiverAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          receiverBalance,
          amount,
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
