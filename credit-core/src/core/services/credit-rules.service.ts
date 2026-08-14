import { Injectable } from "@nestjs/common";
import { CreditAccount } from "src/infra/infra/database/entities/credit-account.entity";

@Injectable()
export class CreditRulesService {
  constructor() {}

  validate(account: CreditAccount){
    
  }
}

