import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { JournalService } from '../services/journal.service';
import {
  EntrySide,
  JournalStatus,
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
import { Hold } from 'src/infra/database/entities/hold.entity';
import { BalanceSnapshotService } from '../services/balance-snapshot.service';
import { BalanceSnapshot } from 'src/infra/database/entities/balance-snapshot.entity';
import { LedgerPostingArgsForPixStrategy } from './ledger.posting.strategy';

@Injectable()
export class LedgerPosting {
  constructor(
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  

  async postHoldCapture(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
      originalAccount: Account;
      payerAccount: Account;
      receiverAccount: Account;
      revenueAccount: Account;
      tax: number;
      hold: Hold;
    },
  ) {
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: dto.ledger.id,
        type: JournalType.CAPTURE,
        description: dto.description,
        reference: dto.idempotencyKey,
        externalReference: dto.idempotencyKey,
        correlationId: dto.transaction.id,
        causationId: dto.idempotencyKey,
        source: 'HOLD_CAPTURE',
        createdBy: 'SYSTEM',
        status: JournalStatus.POSTED,
        metadata: {},
        entries: [
          {
            accountId: dto.payerAccount.id,
            amount: dto.amount,
            side: EntrySide.DEBIT,
            holdId: dto.hold.id,
            description: dto.description,
            currencyId: dto.payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.receiverAccount.id,
            amount: dto.amount,
            side: EntrySide.CREDIT,
            holdId: undefined,
            description: dto.description,
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
        ],
      },
    );

    await this.auditService.createAudit(
      AuditEntity.TRANSACTION,
      dto.transaction.id,
      AuditAction.UPDATE,
      'SYSTEM',
      dto.requestId,
      {
        amount: dto.amount,
        payer: dto.payerAccount.id,
        receiver: dto.receiverAccount.id,
        holdId: dto.hold.id,
        idempotencyKey: dto.idempotencyKey,
      },
      {
        transactionId: dto.transaction.id,
        status: dto.transaction.status,
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
        dto.originalAccount.id,
      );

    await this.balanceSnapshot.updateBalanceForCaptureHold(
      queryRunner,
      originalBalance,
      dto.amount,
      undefined,
      createdJournal.id,
    );

    //atualiza conta pagadora (conta tecnica de reserva) - transferência normal
    const payerBalance = await this.balanceSnapshot.getAvailableBalanceAndLock(
      queryRunner,
      dto.payerAccount.id,
    );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          payerBalance,
          dto.amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    //atualiza conta recebedora (conta tecnica de liquidação) - captura do hold
    const receiverBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        dto.receiverAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          receiverBalance,
          dto.amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    //atualiza conta de receita - transferência normal
    const revenueBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        dto.revenueAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.revenueAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          revenueBalance,
          dto.amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    return await this.journalService.registerJournal(
      queryRunner,
      dto.requestId,
      createdJournal,
    );
  }
}
