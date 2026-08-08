import { Injectable } from '@nestjs/common';
import { BalanceSnapshotService } from 'src/core/services/balance-snapshot.service';
import { JournalService } from 'src/core/services/journal.service';
import {
  EntrySide,
  JournalType,
} from 'src/infra/database/common/enums/journal.enum';
import { Account } from 'src/infra/database/entities/account.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { QueryRunner } from 'typeorm';

export class PixPostingData {
  requestId: string;
  accountOrigin: Account;
  accountDestination: Account;
  ledger: Ledger;
  amount: number;
  idempotencyKey: string;
  pixKey: string;
  description: string;
  metadata: Record<string, any>;
}

export interface PixPostingArgs {
  ledger: Ledger;
  body: PixPostingData;
  payerAccount: Account;
  receiverAccount: Account;
  transaction: Transaction;
  requestId: string;
}

@Injectable()
export class PixPostingUsecase {
  private args: PixPostingArgs;
  private queryRunner: QueryRunner;

  constructor(
    private readonly journalService: JournalService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  build(queryRunner: QueryRunner, args: PixPostingArgs): this {
    this.args = args;
    this.queryRunner = queryRunner;
    return this;
  }

  async execute() {
    const {
      ledger,
      body,
      payerAccount,
      receiverAccount,
      transaction,
      requestId,
    } = this.args;
    const { queryRunner } = this;
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: ledger.id,
        type: JournalType.PIX,
        description: body.description,
        reference: body.pixKey,
        externalReference: body.pixKey,
        correlationId: transaction.id,
        causationId: body.idempotencyKey,
        source: 'PIX_SAME_INSTITUTION',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: payerAccount.id,
            amount: body.amount,
            side: EntrySide.DEBIT,
            description: body.description,
            currencyId: payerAccount.currencyId,
            metadata: {},
            holdId: undefined,
          },
          {
            accountId: receiverAccount.id,
            amount: body.amount,
            side: EntrySide.CREDIT,
            description: body.description,
            currencyId: receiverAccount.currencyId,
            metadata: {},
            holdId: undefined,
          },
        ],
      },
    );

    // await this.auditService.createAudit(
    //   AuditEntity.TRANSACTION,
    //   transaction.id,
    //   AuditAction.UPDATE,
    //   'SYSTEM',
    //   requestId,
    //   {
    //     amount: body.amount,
    //     payer: payerAccount.id,
    //     receiver: receiverAccount.id,
    //     idempotencyKey: body.idempotencyKey,
    //   },
    //   {
    //     transactionId: transaction.id,
    //     status: transaction.status,
    //     debitEntryId: createdJournal
    //       .getDebitEntry()
    //       .map((e) => e.id)
    //       .join(','),
    //     creditEntryId: createdJournal
    //       .getCreditEntry()
    //       .map((e) => e.id)
    //       .join(','),
    //   },
    // );

    //atualiza conta recebedora
    for (const entry of createdJournal.entries) {
      if (entry.accountId === receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          receiverAccount.balanceSnapshots,
          body.amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    for (const entry of createdJournal.entries) {
      if (entry.accountId === payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          payerAccount.balanceSnapshots,
          body.amount,
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
