import { Injectable } from '@nestjs/common';
import { LedgerPosting } from 'src/core/posting/ledger.posting';
import { IdempotencyRules } from 'src/core/rules/business/idempotency.rules';
import { TransferRules } from 'src/core/rules/business/transfer.rules';
import { AccountsService } from 'src/core/services/accounts.service';
import { AuditService } from 'src/core/services/audit.service';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { TransactionService } from 'src/core/services/transaction.service';
import { DataSource } from 'typeorm';

@Injectable()
export class PixExternalUsecase {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly accountService: AccountsService,
    private readonly auditService: AuditService,
    private readonly transactionService: TransactionService,
    private readonly dataSource: DataSource,
    private readonly transferRules: TransferRules,
    private readonly idempotencyRules: IdempotencyRules,
    private readonly ledgerPostingSerive: LedgerPosting,
  ) {}

  async handler() {
    return {
      msg: "pix external runnig"
    }
  }
}
