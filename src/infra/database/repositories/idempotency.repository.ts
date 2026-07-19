import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Idempotency } from "../entities/idempotency.entity";
import { Repository } from "typeorm";

@Injectable()
export class IdempotencyRepository {
    constructor(
        @InjectRepository(Idempotency)
        private readonly repository: Repository<Idempotency>
    ) { }

    async findByKey(key: string): Promise<Idempotency | null> {
        return await this.repository.findOne({ where: { key } });
    }
}