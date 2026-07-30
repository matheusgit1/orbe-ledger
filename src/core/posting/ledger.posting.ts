import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { JournalService } from '../services/journal.service';
import {
  EntrySide,
  JournalType,
} from 'src/infra/database/common/enums/journal.enum';
import { Account } from 'src/infra/database/entities/account.entity';
import { Ledger } from 'src/infra/database/entities/ledger.entity';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { AuditService } from '../services/audit.service';
import {
  AuditAction,
  AuditEntity,
} from 'src/infra/database/common/enums/audit.enum';

@Injectable()
export class LedgerPosting {
  constructor(
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
  ) {}

  async postPixInternal(
    queryRunner: QueryRunner,
    dto: {
      ledger: Ledger;
      body: {
        description: string;
        amount: number;
        pixKey: string;
        idempotencyKey: string;
      };
      payerAccount: Account;
      receiverAccount: Account;
      transaction: Transaction;
      requestId: string;
    },
  ) {
    const {
      ledger,
      body,
      payerAccount,
      receiverAccount,
      transaction,
      requestId,
    } = dto;
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
          },
          {
            accountId: receiverAccount.id,
            amount: body.amount,
            side: EntrySide.CREDIT,
            description: body.description,
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
        amount: body.amount,
        payer: payerAccount.id,
        receiver: receiverAccount.id,
        idempotencyKey: body.idempotencyKey,
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

    return await this.journalService.registerJournal(
      queryRunner,
      requestId,
      createdJournal,
    );
  }
}
