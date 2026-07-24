import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Idempotency } from "src/infra/database/entities/idempotency.entity";
import { QueryRunner, Repository } from "typeorm";

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(Idempotency)
    private readonly idempotencyRepository: Repository<Idempotency>,
  ) { }

  async findByKey(key: string): Promise<Idempotency | null> {
    return await this.idempotencyRepository.findOne({ where: { key } })
  }

  // queryRunner,
  //       body.idempotencyKey,
  //       hash || 'request-hash',
  //       {
  //         status: 'COMPLETED',
  //         transactionId: savedTransaction.id,
  //         debitJournalId: debitJournal.id,
  //         creditJournalId: creditJournal.id,
  //       },
  //       86400, // 24 horas
  //       'TRANSACTION',
  //       savedTransaction.id,

  async create(queryRunner: QueryRunner, key: string, hash: string, data: Record<string, any>, ttl: number, entityType: string, entityId: string) {
    const idempotency = new Idempotency();
    idempotency.key = key;
    idempotency.entityId = entityId;
    idempotency.metadata = data;
    idempotency.expiresAt = new Date(Date.now() + ttl * 1000);
    idempotency.entityType = entityType;
    idempotency.entityId = entityId;
    await queryRunner.manager.save(idempotency);
  }
}