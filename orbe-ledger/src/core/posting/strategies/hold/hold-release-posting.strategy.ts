import { Injectable } from '@nestjs/common';
import { JournalService } from 'src/core/services/journal.service';
import { AuditService } from 'src/core/services/audit.service';
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
import {
  AuditAction,
  AuditEntity,
} from 'src/infra/database/common/enums/audit.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';

export interface HoldReleasePostingArgs {
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
export class HoldReleasePostingStrategy {
  private queryRunner: QueryRunner;
  private args: HoldReleasePostingArgs;

  constructor(
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  build(queryRunner: QueryRunner, args: HoldReleasePostingArgs) {
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
        type: JournalType.RELEASE,
        description: description,
        reference: idempotencyKey,
        externalReference: idempotencyKey,
        correlationId: transaction.id,
        causationId: idempotencyKey,
        source: 'HOLD_RELEASE',
        createdBy: 'SYSTEM',
        status: JournalStatus.POSTED,
        metadata: {},
        entries: [
          {
            accountId: receiverAccount.id,
            amount: amount,
            side: EntrySide.CREDIT,
            holdId: hold.id,
            description: description,
            currencyId: receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: payerAccount.id,
            amount: amount,
            side: EntrySide.DEBIT,
            holdId: hold.id,
            description: description,
            currencyId: payerAccount.currencyId,
            metadata: {},
          },
        ],
      },
    );

    await this.auditService.createAudit(
      AuditEntity.TRANSACTION,
      transaction.id,
      AuditAction.UPDATE,
      'SYSTEM',
      requestId,
      {
        amount: amount,
        payerAccountId: payerAccount.id,
        receiverAccountId: receiverAccount.id,
        holdId: hold.id,
        idempotencyKey: idempotencyKey,
      },
      {
        transactionId: transaction.id,
        status: transaction.status,
        creditEntryId: createdJournal
          .getCreditEntry()
          .map((e) => e.id)
          .join(','),
      },
    );

    // atualiza conta recebedora
    const receiverBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        receiverAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForHoldRelease(
          queryRunner,
          receiverBalance,
          amount,
          entry.id,
          createdJournal.id,
        );
      }
    }

    // atualiza conta pagadora
    const payerBalance = await this.balanceSnapshot.getAvailableBalanceAndLock(
      queryRunner,
      payerAccount.id,
    );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          payerBalance,
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
