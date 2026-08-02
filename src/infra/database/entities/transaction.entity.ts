import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  TransactionStatus,
  TransactionType,
} from '../common/enums/transaction.enum';
import { Account } from './account.entity';
import { Currency } from './currency.entity';
import { Journal } from './journal.entity';
import { Hold } from './hold.entity';
import { Saga } from './saga.entity';

@Entity('transactions')
@Index(['correlationId'])
@Index(['externalId'])
@Index(['originAccountId', 'status'])
@Index(['destinationAccountId', 'status'])
@Index(['workflowId'])
export class Transaction {
  protected constructor() {}

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.INITIATED,
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @Column({ type: 'uuid', name: 'origin_account_id' })
  originAccountId: string;

  @Column({ type: 'uuid', nullable: true, name: 'destination_account_id' })
  destinationAccountId?: string;

  @Column({ type: 'varchar', nullable: true, name: 'correlation_id' })
  correlationId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'external_id' })
  externalId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'workflow_id' })
  workflowId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({
    type: 'timestamp',
    name: 'started_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails?: Record<string, any> | null | undefined;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Account)
  @JoinColumn({ name: 'origin_account_id' })
  originAccount: Account;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'destination_account_id' })
  destinationAccount: Account;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @OneToOne(() => Saga, (saga) => saga.transaction)
  saga: Saga;

  @OneToMany(() => Journal, (journal) => journal.transaction)
  journals: Journal[];

  @OneToMany(() => Hold, (hold) => hold.transaction)
  holds: Hold[];

  // Métodos de domínio
  isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }

  isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  canRetry(): boolean {
    return this.isFailed() && this.retryCount < 3;
  }

  complete(): void {
    if (this.isCompleted()) {
      throw new Error('Transaction already completed');
    }
    this.status = TransactionStatus.COMPLETED;
    this.completedAt = new Date();
  }

  fail(error: string, details?: Record<string, any>): void {
    if (this.isCompleted()) {
      throw new Error('Cannot fail a completed transaction');
    }
    this.status = TransactionStatus.FAILED;
    this.errorDetails = {
      error,
      ...details,
      timestamp: new Date().toISOString(),
    };
    this.retryCount += 1;
  }

  retry(): void {
    if (!this.canRetry()) {
      throw new Error(
        `Transaction cannot be retried. Retry count: ${this.retryCount}`,
      );
    }
    this.status = TransactionStatus.PENDING;
    this.errorDetails = null;
  }

  // Validação
  validate(): void {
    if (this.amount <= 0) {
      throw new Error(
        `Transaction amount must be greater than 0, received ${this.amount}`,
      );
    }

    if (this.originAccountId === this.destinationAccountId) {
      throw new Error('Origin and destination accounts must be different');
    }
  }

  static create(props: {
    type: TransactionType;
    amount: number;
    currencyId: string;
    originAccountId: string;
    destinationAccountId?: string;
    correlationId?: string;
    externalId?: string;
    workflowId?: string;
    metadata?: Record<string, any>;
  }): Transaction {
    const transaction = new Transaction();
    transaction.type = props.type;
    transaction.status = TransactionStatus.INITIATED;
    transaction.amount = props.amount;
    transaction.currencyId = props.currencyId;
    transaction.originAccountId = props.originAccountId;
    transaction.destinationAccountId = props.destinationAccountId;
    transaction.correlationId = props.correlationId || undefined;
    transaction.externalId = props.externalId;
    transaction.workflowId = props.workflowId || undefined;
    transaction.metadata = props.metadata || {};
    transaction.completedAt = undefined;
    transaction.retryCount = 0;
    transaction.errorDetails = undefined;

    transaction.validate();
    return transaction;
  }
}
