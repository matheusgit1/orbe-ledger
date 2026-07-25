import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from '../../infra/database/entities/audit.entity';
import {
  AuditEntity,
  AuditAction,
} from '../../infra/database/common/enums/audit.enum';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  /**
   * Creates an audit log entry
   */
  async createAudit(
    aggregate: AuditEntity,
    aggregateId: string,
    action: AuditAction,
    userId: string,
    traceId?: string,
    before?: any,
    after?: any,
    metadata?: any,
  ): Promise<Audit> {
    this.logger.log(`Creating audit: ${action} on ${aggregate}:${aggregateId}`);

    const audit = Audit.create(
      aggregate,
      aggregateId,
      action,
      userId,
      before,
      after,
      metadata,
    );
    if (traceId !== undefined) audit.traceId = traceId;

    const savedAudit = await this.auditRepository.save(audit);

    this.logger.log(`Audit created: ${savedAudit.id}`);
    return savedAudit;
  }

  async findByAggregate(
    aggregate: AuditEntity,
    aggregateId: string,
  ): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { aggregate, aggregateId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByTraceId(traceId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { traceId },
      order: { createdAt: 'DESC' },
    });
  }
}
