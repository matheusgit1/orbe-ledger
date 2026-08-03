import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Outbox } from '../../infra/database/entities/outbox.entity';
import {
  OutboxEventType,
  OutboxStatus,
} from '../../infra/database/common/enums/outbox.enum';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
  ) {}

  /**
   * Creates an outbox event for async publication
   */
  async createOutbox(
    aggregate: string,
    aggregateId: string,
    eventType: OutboxEventType,
    payload: Record<string, any>,
    queryRunner?: any,
  ): Promise<Outbox> {
    this.logger.log(
      `Creating outbox event: ${eventType} for ${aggregate}:${aggregateId}`,
    );

    const outbox = Outbox.create({
      aggregate,
      aggregateId,
      eventType,
      payload,
    });

    const repository = queryRunner
      ? queryRunner.manager
      : this.outboxRepository;
    const savedOutbox = await repository.save(outbox);

    this.logger.log(`Outbox event created: ${savedOutbox.id}`);
    return savedOutbox;
  }

  /**
   * Marks an outbox event as published
   */
  async markAsPublished(id: string): Promise<void> {
    const outbox = await this.outboxRepository.findOne({ where: { id } });
    if (!outbox) {
      throw new Error(`Outbox ${id} not found`);
    }

    outbox.markAsPublished();
    await this.outboxRepository.save(outbox);
  }

  /**
   * Marks an outbox event as failed
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    const outbox = await this.outboxRepository.findOne({ where: { id } });
    if (!outbox) {
      throw new Error(`Outbox ${id} not found`);
    }

    outbox.markAsFailed(error);
    await this.outboxRepository.save(outbox);
  }

  /**
   * Gets pending outbox events for processing
   */
  async getPendingEvents(limit: number = 100): Promise<Outbox[]> {
    return this.outboxRepository.find({
      where: { status: OutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Gets retry events for processing
   */
  async getRetryEvents(limit: number = 100): Promise<Outbox[]> {
    return this.outboxRepository.find({
      where: { status: OutboxStatus.RETRY },
      order: { nextRetry: 'ASC' as const },
      take: limit,
    });
  }

  async countPending(): Promise<number> {
    return this.outboxRepository.count({
      where: { status: OutboxStatus.PENDING },
    });
  }
}
