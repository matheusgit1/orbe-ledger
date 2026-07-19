import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Account } from "../entities/account.entity";

@Injectable()
export class AccountsRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repository: Repository<Account>
  ) { }

  async findById(id: string): Promise<Account | null> {
    return await this.repository.findOne({ where: { id } });
  }
}