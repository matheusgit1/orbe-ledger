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

export interface HoldCapturePostingArgs {
  description: string;
  originalAccount: Account;
  payerAccount: Account;
  receiverAccount: Account;
  revenueAccount: Account;
  ledger: Ledger;
  idempotencyKey: string;
  requestId: string;
  amount: number;
  tax: number;
  hold: Hold;
  transaction: Transaction;
}

@Injectable()
export class HoldCapturePostingStrategy {
  private queryRunner: QueryRunner;
  private args: HoldCapturePostingArgs;

  constructor(
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  build(queryRunner: QueryRunner, args: HoldCapturePostingArgs) {
    this.queryRunner = queryRunner;
    this.args = args;
    return this;
  }

  async execute() {
    const { queryRunner, args } = this;
    const {
      originalAccount,
      payerAccount,
      transaction,
      receiverAccount,
      revenueAccount,
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
        type: JournalType.CAPTURE,
        description: description,
        reference: idempotencyKey,
        externalReference: idempotencyKey,
        correlationId: transaction.id,
        causationId: idempotencyKey,
        source: 'HOLD_CAPTURE',
        createdBy: 'SYSTEM',
        status: JournalStatus.POSTED,
        metadata: {},
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
            holdId: undefined,
            description: description,
            currencyId: receiverAccount.currencyId,
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
        payer: payerAccount.id,
        receiver: receiverAccount.id,
        holdId: hold.id,
        idempotencyKey: idempotencyKey,
      },
      {
        transactionId: transaction.id,
        status: transaction.status,
        debitEntryId: createdJournal
          .getDebitEntry()
          .map((e) => e.id)
          .join(','),
        creditEntryId: createdJournal
          .getCreditEntry()
          .map((e) => e.id)
          .join(','),
      },
    );

    const originalBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        originalAccount.id,
      );

    await this.balanceSnapshot.updateBalanceForCaptureHold(
      queryRunner,
      originalBalance,
      amount,
      undefined,
      createdJournal.id,
    );

    // atualiza conta pagadora (conta tecnica de reserva) - transferência normal
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

    // atualiza conta recebedora (conta tecnica de liquidação) - captura do hold
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

    // atualiza conta de receita - transferência normal
    const revenueBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        revenueAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === revenueAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          revenueBalance,
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
