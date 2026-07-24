import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../infra/database/entities/account.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(Account)
        private accountsRepository: Repository<Account>
    ) {}

    async findById(id: string): Promise<Account | null> {
        return this.accountsRepository.findOneBy({ id });
    }

    async findAll(): Promise<Account[]> {
        return this.accountsRepository.find();
    }
}
