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
import { Hold } from 'src/infra/database/entities/hold.entity';
import { BalanceSnapshotService } from '../services/balance-snapshot.service';
import { BalanceSnapshot } from 'src/infra/database/entities/balance-snapshot.entity';

@Injectable()
export class LedgerPosting {
  constructor(
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
    private readonly balanceSnapshot: BalanceSnapshotService,
  ) {}

  async postHold(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
      payerAccount: Account;
      receiverAccount: Account;
      hold: Hold;
    },
  ) {
    const accounts = [dto.receiverAccount, dto.payerAccount];
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: dto.ledger.id,
        type: JournalType.HOLD,
        description: dto.description,
        reference: dto.idempotencyKey,
        externalReference: dto.idempotencyKey,
        correlationId: dto.transaction.id,
        causationId: dto.idempotencyKey,
        source: 'HOLD',
        createdBy: 'SYSTEM',
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

    //atualiza conta pagadora
    const payerBalance = await this.balanceSnapshot.getAvailableBalanceAndLock(
      queryRunner,
      dto.payerAccount.id,
    );
    await this.balanceSnapshot.updateBalanceForHold(
      queryRunner,
      payerBalance,
      dto.amount,
      createdJournal.entries
        .filter((e) => e.accountId === dto.payerAccount.id)
        .map((e) => e.id)
        .join(','),
      createdJournal.id,
    );

    //atualiza conta recebedora
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

    return await this.journalService.registerJournal(
      queryRunner,
      dto.requestId,
      createdJournal,
    );
  }

  async postHoldRelease(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
      payerAccount: Account;
      receiverAccount: Account;
      hold: Hold;
    },
  ) {
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: dto.ledger.id,
        type: JournalType.RELEASE,
        description: dto.description,
        reference: dto.idempotencyKey,
        externalReference: dto.idempotencyKey,
        correlationId: dto.transaction.id,
        causationId: dto.idempotencyKey,
        source: 'HOLD_RELEASE',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: dto.receiverAccount.id,
            amount: dto.amount,
            side: EntrySide.CREDIT,
            holdId: dto.hold.id,
            description: dto.description,
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.payerAccount.id,
            amount: dto.amount,
            side: EntrySide.DEBIT,
            holdId: dto.hold.id,
            description: dto.description,
            currencyId: dto.payerAccount.currencyId,
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
        payerAccountId: dto.payerAccount.id,
        receiverAccountId: dto.receiverAccount.id,
        holdId: dto.hold.id,
        idempotencyKey: dto.idempotencyKey,
      },
      {
        transactionId: dto.transaction.id,
        status: dto.transaction.status,
        creditEntryId: createdJournal
          .getCreditEntry()
          .map((e) => e.id)
          .join(','),
      },
    );

    //atualiza conta recebedora
    const receiverBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        dto.receiverAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForHoldRelease(
          queryRunner,
          receiverBalance,
          dto.amount,
          entry.id,
          createdJournal.id,
        );
      }
    }

    //atualiza conta pagadora
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

    return await this.journalService.registerJournal(
      queryRunner,
      dto.requestId,
      createdJournal,
    );
  }

  async postHoldCapture(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
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
            amount: dto.amount - dto.tax,
            side: EntrySide.CREDIT,
            holdId: undefined,
            description: dto.description,
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.revenueAccount.id,
            amount: parseFloat(Number(dto.tax).toFixed(2)),
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

    //atualiza conta pagadora (technical account) - transferência normal
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

    //atualiza conta recebedora (payer original) - captura do hold
    const receiverBalance =
      await this.balanceSnapshot.getAvailableBalanceAndLock(
        queryRunner,
        dto.receiverAccount.id,
      );
    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForCaptureHold(
          queryRunner,
          receiverBalance,
          dto.amount,
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
      if (entry.accountId === dto.receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          dto.receiverAccount.balanceSnapshots,
          dto.body.amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          dto.payerAccount.balanceSnapshots,
          dto.body.amount,
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

  async postTicket(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
      payerAccount: Account;
      receiverAccount: Account;
      revenueAccount: Account;
      tax: number;
    },
  ) {
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: dto.ledger.id,
        type: JournalType.SETTLEMENT,
        description: dto.description,
        reference: undefined,
        externalReference: undefined,
        correlationId: dto.transaction.id,
        causationId: dto.idempotencyKey,
        source: 'TICKET',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: dto.payerAccount.id,
            amount: dto.amount,
            side: EntrySide.DEBIT,
            description: 'liquidação via boleto',
            currencyId: dto.payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.receiverAccount.id,
            amount: dto.amount - dto.tax,
            side: EntrySide.CREDIT,
            description: 'deposito via boleto',
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.revenueAccount.id,
            amount: parseFloat(Number(dto.tax).toFixed(10)),
            side: EntrySide.CREDIT,
            description: 'taxa via boleto',
            currencyId: dto.receiverAccount.currencyId,
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
      dto.requestId,
      {
        amount: dto.amount,
        payer: dto.payerAccount.id,
        receiver: dto.receiverAccount.id,
        idempotencyKey: dto.idempotencyKey,
      },
      {
        transactionId: dto.transaction.id,
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
      if (entry.accountId === dto.payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          dto.payerAccount.balanceSnapshots,
          dto.amount,
          entry.isDebit(),
          entry.id,
          createdJournal.id,
        );
      }
    }

    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          dto.receiverAccount.balanceSnapshots,
          dto.amount - dto.tax,
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

  async postTed(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
      payerAccount: Account;
      receiverAccount: Account;
      revenueAccount: Account;
      tax: number;
    },
  ) {
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: dto.ledger.id,
        type: JournalType.SETTLEMENT,
        description: dto.description,
        reference: undefined,
        externalReference: undefined,
        correlationId: dto.transaction.id,
        causationId: dto.idempotencyKey,
        source: 'TED',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: dto.payerAccount.id,
            amount: dto.amount,
            side: EntrySide.DEBIT,
            description: 'liquidação via ted',
            currencyId: dto.payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.receiverAccount.id,
            amount: dto.amount - dto.tax,
            side: EntrySide.CREDIT,
            description: 'deposito via ted',
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.revenueAccount.id,
            amount: parseFloat(Number(dto.tax).toFixed(10)),
            side: EntrySide.CREDIT,
            description: 'taxa via ted',
            currencyId: dto.receiverAccount.currencyId,
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
      dto.requestId,
      {
        amount: dto.amount,
        payer: dto.payerAccount.id,
        receiver: dto.receiverAccount.id,
        idempotencyKey: dto.idempotencyKey,
      },
      {
        transactionId: dto.transaction.id,
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
      if (entry.accountId === dto.payerAccount.id) {
        await this.balanceSnapshot.updateBalanceForCaptureHold(
          queryRunner,
          dto.payerAccount.balanceSnapshots,
          dto.amount,
          entry.id,
          createdJournal.id,
        );
      }
    }

    for (const entry of createdJournal.entries) {
      if (entry.accountId === dto.receiverAccount.id) {
        await this.balanceSnapshot.updateBalanceForTransfer(
          queryRunner,
          dto.receiverAccount.balanceSnapshots,
          dto.amount - dto.tax,
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

  async postDoc(
    queryRunner: QueryRunner,
    dto: {
      requestId: string;
      ledger: Ledger;
      transaction: Transaction;
      description: string;
      idempotencyKey: string;
      amount: number;
      payerAccount: Account;
      receiverAccount: Account;
      revenueAccount: Account;
      tax: number;
    },
  ) {
    const createdJournal = await this.journalService.createJournal(
      queryRunner,
      {
        ledgerId: dto.ledger.id,
        type: JournalType.DOC,
        description: dto.description,
        reference: undefined,
        externalReference: undefined,
        correlationId: dto.transaction.id,
        causationId: dto.idempotencyKey,
        source: 'DOC',
        createdBy: 'SYSTEM',
        metadata: {},
        entries: [
          {
            accountId: dto.payerAccount.id,
            amount: dto.amount,
            side: EntrySide.DEBIT,
            description: 'liquidação via doc',
            currencyId: dto.payerAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.receiverAccount.id,
            amount: dto.amount - dto.tax,
            side: EntrySide.CREDIT,
            description: 'deposito via doc',
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
          {
            accountId: dto.revenueAccount.id,
            amount: parseFloat(Number(dto.tax).toFixed(10)),
            side: EntrySide.CREDIT,
            description: 'taxa via doc',
            currencyId: dto.receiverAccount.currencyId,
            metadata: {},
          },
        ],
      },
    );

    return await this.journalService.registerJournal(
      queryRunner,
      dto.requestId,
      createdJournal,
    );
  }
}
