
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Outbox } from '../../infra/database/entities/outbox.entity';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxEventType, OutboxStatus } from '../../infra/database/common/enums/outbox.enum';


@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(Outbox)
    private outboxRepository: Repository<Outbox>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cria um evento no outbox
   */
  async createEvent(
    aggregate: string,
    aggregateId: string,
    eventType: OutboxEventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Outbox> {
    const outbox = this.outboxRepository.create({
      aggregate,
      aggregateId,
      eventType,
      payload,
      status: OutboxStatus.PENDING,
      attempts: 0,
      // metadata,
    });

    outbox.validate();
    return await this.outboxRepository.save(outbox);
  }

  /**
   * Processa eventos pendentes
   */
  async processPendingEvents(batchSize: number = 100): Promise<void> {
    const events = await this.outboxRepository.find({
      where: [
        { status: OutboxStatus.PENDING },
        {
          status: OutboxStatus.RETRY,
          nextRetry: LessThan(new Date()),
        },
      ],
      order: { createdAt: 'ASC' },
      take: batchSize,
    });

    this.logger.log(`Processing ${events.length} outbox events`);

    for (const event of events) {
      try {
        await this.publishEvent(event);
        event.markAsPublished();
        await this.outboxRepository.save(event);
        this.logger.log(`Event ${event.id} published successfully`);
      } catch (error) {
        this.logger.error(`Failed to publish event ${event.id}: ${error.message}`);
        event.markAsFailed(error.message);
        await this.outboxRepository.save(event);
      }
    }
  }

  /**
   * Publica um evento específico
   */
  private async publishEvent(event: Outbox): Promise<void> {
    // Emite o evento para o EventEmitter
    this.eventEmitter.emit(event.eventType, {
      eventId: event.id,
      aggregate: event.aggregate,
      aggregateId: event.aggregateId,
      payload: event.payload,
      timestamp: new Date().toISOString(),
    });

    // Aqui você também pode:
    // - Publicar no Kafka/RabbitMQ
    // - Enviar para webhooks
    // - Publicar no Redis
  }

  /**
   * Reprocessa eventos falhos
   */
  async retryFailedEvents(): Promise<void> {
    const failedEvents = await this.outboxRepository.find({
      where: {
        status: OutboxStatus.FAILED,
        attempts: LessThan(5),
      },
    });

    for (const event of failedEvents) {
      event.markForRetry();
      await this.outboxRepository.save(event);
      this.logger.log(`Event ${event.id} marked for retry (attempt ${event.attempts})`);
    }
  }

  /**
   * Limpa eventos antigos processados
   */
  async cleanProcessedEvents(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.outboxRepository
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: OutboxStatus.PROCESSED })
      .andWhere('published_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned outbox events older than ${daysToKeep} days`);
  }
}