import { Injectable } from '@nestjs/common';
import { JournalService } from 'src/core/services/journal.service';
import { AuditService } from 'src/core/services/audit.service';
import { BalanceSnapshotService } from 'src/core/services/balance-snapshot.service';
import { Account } from 'src/infra/database/entities/account.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Service } from 'src/infra/database/entities/service.entity';
import { QueryRunner } from 'typeorm';
import {
  EntrySide,
  JournalType,
} from 'src/infra/database/common/enums/journal.enum';
import {
  AuditAction,
  AuditEntity,
} from 'src/infra/database/common/enums/audit.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';

export interface TicketPostingArgs {
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
export class TicketPostingStrategy {
  private queryRunner: QueryRunner;
  private args: TicketPostingArgs;

  constructor(
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  build(queryRunner: QueryRunner, args: TicketPostingArgs) {
    this.queryRunner = queryRunner;
    this.args = args;
    // TODO: Implement build method
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
      service,
      idempotencyKey,
      requestId,
      amount,
      tax,
    } = args;
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: ledger.id,
        type: JournalType.SETTLEMENT,
        description: 'Ticket deposit',
        reference: undefined,
        externalReference: undefined,
        correlationId: transaction.id,
        causationId: idempotencyKey,
        source: 'TICKET',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: payerAccount.id,
            amount: amount,
            side: EntrySide.DEBIT,
            description: 'liquidação via boleto',
            currencyId: payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: receiverAccount.id,
            amount: amount - tax,
            side: EntrySide.CREDIT,
            description: 'deposito via boleto',
            currencyId: receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: revenueAccount.id,
            amount: parseFloat(Number(tax).toFixed(10)),
            side: EntrySide.CREDIT,
            description: 'taxa via boleto',
            currencyId: revenueAccount.currencyId,
            metadata: {},
          },
        ],
      },
    );

    await this.auditService.createAudit(
      AuditEntity.JOURNAL,
      createdJournal.id,
      AuditAction.CREATE,
      'SYSTEM',
      requestId,
      {
        amount: amount,
        payer: payerAccount.id,
        receiver: receiverAccount.id,
        idempotencyKey: idempotencyKey,
      },
      {
        transactionId: transaction.id,
        status: 'PENDING',
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

    return await this.journalService.registerJournal(
      queryRunner,
      requestId,
      createdJournal,
    );
  }
}
