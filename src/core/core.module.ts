import { Module } from "@nestjs/common";
import { LedgerService } from "./services/ledger.service";
import { TransferService } from "./services/transfer.service";
import { JournalService } from "./services/journal.service";
import { BalanceSnapshotService } from "./services/balance-snapshot.service";
import { OutboxService } from "./services/outbox.service";
import { AuditService } from "./services/audit.service";
import { SagaService } from "./services/saga.service";
import { OrmModule } from "src/infra/database/orm/orm.module";
import { BalanceService } from "./services/balance.service";
import { InstitutionIdentifierService } from "./services/institution-identifier.service";
import { FeeCalculatorService } from "./services/fee-calculator.service";
import { IdempotencyService } from "./services/idempotency.service";
import { AccountsService } from "./services/accounts.service";
import { TransactionService } from "./services/transaction.service";

@Module({
    imports: [OrmModule],
    providers: [
        LedgerService,
        TransferService,
        JournalService,
        BalanceSnapshotService,
        OutboxService,
        AuditService,
        SagaService,
        BalanceService,
        InstitutionIdentifierService,
        FeeCalculatorService,
        IdempotencyService,
        AccountsService,
        TransactionService
    ],
    exports: [
        LedgerService,
        TransferService,
        JournalService,
        BalanceSnapshotService,
        OutboxService,
        AuditService,
        SagaService,
        BalanceService,
        InstitutionIdentifierService,
        FeeCalculatorService,
        IdempotencyService,
        AccountsService,
        TransactionService
    ]
})
export class CoreModule {

}