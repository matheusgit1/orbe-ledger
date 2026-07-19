import { Module } from "@nestjs/common";
import { LedgerService } from "./services/ledger.service";
import { TransferService } from "./services/transfer.service";
import { OrmModule } from "src/infra/database/orm/orm.module";

@Module({
    imports: [OrmModule],
    providers: [LedgerService, TransferService],
    exports: [LedgerService, TransferService]
})
export class CoreModule {

}