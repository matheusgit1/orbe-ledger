import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TransactionStatus } from "src/infra/database/common/enums/transaction.enum";
import { Transaction } from "src/infra/database/entities/transaction.entity";
import { Repository } from "typeorm";
import { QueryRunner } from "typeorm/browser";

@Injectable()
export class TransactionService {
    constructor(
     @InjectRepository(Transaction) private readonly transactionRepository: Repository<Transaction>
    ) {}
    
    async createTransaction(transaction: Transaction) {
        return await this.transactionRepository.save(transaction);
    }

    async findTransactionById(id: string) {
        return await this.transactionRepository.findOne({ where: { id } });
    }

    async complete(queryRunner: QueryRunner, transactionId: string) {
        const transaction = await queryRunner.manager.findOne(Transaction, { where: { id: transactionId } });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        transaction.status = TransactionStatus.COMPLETED;
        return await queryRunner.manager.save(transaction);
    }
}
