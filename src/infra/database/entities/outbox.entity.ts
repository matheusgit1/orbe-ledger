
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OutboxEventType, OutboxStatus } from '../common/enums/outbox.enum';
import { Journal } from './journal.entity';
import { Transaction } from './transaction.entity';


@Entity('outbox')
@Index(['status', 'nextRetry'])
@Index(['aggregateId', 'aggregate'])
@Index(['eventType'])
@Index(['publishedAt'])
export class Outbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'aggregate' })
  aggregate: string; // Nome da entidade

  @Column({ type: 'uuid', name: 'aggregate_id' })
  aggregateId: string;

  @Column({
    type: 'enum',
    enum: OutboxEventType,
    name: 'event_type',
  })
  eventType: OutboxEventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
  })
  status: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', nullable: true, name: 'next_retry' })
  nextRetry: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'published_at' })
  publishedAt: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails: Record<string, any>;

  @Column({ type: 'uuid', nullable: true, name: 'journal_id' })
  journalId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'transaction_id' })
  transactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Journal)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  // Métodos de domínio
  markAsPublished(): void {
    this.status = OutboxStatus.PROCESSED;
    this.publishedAt = new Date();
  }

  markAsFailed(error: string): void {
    this.status = OutboxStatus.FAILED;
    this.attempts += 1;
    this.errorDetails = {
      error,
      attempts: this.attempts,
      lastAttempt: new Date().toISOString(),
    };
    this.calculateNextRetry();
  }

  markForRetry(): void {
    if (this.attempts >= 5) {
      this.status = OutboxStatus.DEAD;
      this.errorDetails = {
        ...this.errorDetails,
        deadReason: 'Max retry attempts exceeded',
        deadAt: new Date().toISOString(),
      };
    } else {
      this.status = OutboxStatus.RETRY;
      this.calculateNextRetry();
    }
  }

  private calculateNextRetry(): void {
    // Exponential backoff: 1min, 5min, 15min, 1h, 3h
    const backoffTimes = [1, 5, 15, 60, 180];
    const minutes = backoffTimes[Math.min(this.attempts - 1, backoffTimes.length - 1)] || 180;
    this.nextRetry = new Date(Date.now() + minutes * 60 * 1000);
  }

  // Validação
  validate(): void {
    if (!this.aggregate || !this.aggregateId) {
      throw new Error('Outbox must have aggregate and aggregateId');
    }

    if (!this.payload) {
      throw new Error('Outbox must have a payload');
    }
  }
}