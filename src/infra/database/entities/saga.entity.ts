import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { SagaStep } from './saga-step.entity';
import {
  SagaStatus,
  SagaStepStatus,
  SagaStepType,
} from '../common/enums/saga.enum';
import { Transaction } from './transaction.entity';

@Entity('sagas')
@Index(['transactionId'], { unique: true })
@Index(['workflowId'])
@Index(['status'])
@Index(['createdAt'])
export class Saga {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'transaction_id', unique: true })
  transactionId: string;

  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({
    type: 'enum',
    enum: SagaStatus,
    default: SagaStatus.INITIATED,
  })
  status: SagaStatus;

  @Column({ type: 'int', default: 0, name: 'current_step' })
  currentStep: number;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'int', default: 3, name: 'max_retries' })
  maxRetries: number;

  @Column({ type: 'jsonb', nullable: true, name: 'context_data' })
  contextData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'timeout_at' })
  timeoutAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Transaction, (transaction) => transaction.saga)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @OneToMany(() => SagaStep, (step) => step.saga, { cascade: true })
  steps: SagaStep[];

  // Métodos de domínio
  isExecuting(): boolean {
    return this.status === SagaStatus.EXECUTING;
  }

  isCompleted(): boolean {
    return this.status === SagaStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === SagaStatus.FAILED;
  }

  isCompensating(): boolean {
    return this.status === SagaStatus.COMPENSATING;
  }

  isCompensated(): boolean {
    return this.status === SagaStatus.COMPENSATED;
  }

  canRetry(): boolean {
    return (
      (this.isFailed() || this.status === SagaStatus.TIMEOUT) &&
      this.retryCount < this.maxRetries
    );
  }

  start(): void {
    if (this.status !== SagaStatus.INITIATED) {
      throw new Error(`Cannot start saga in status ${this.status}`);
    }
    this.status = SagaStatus.EXECUTING;
    this.startedAt = new Date();
  }

  complete(): void {
    if (!this.isExecuting()) {
      throw new Error(`Cannot complete saga in status ${this.status}`);
    }
    this.status = SagaStatus.COMPLETED;
    this.completedAt = new Date();
  }

  fail(error: string, details?: Record<string, any>): void {
    if (this.isCompleted()) {
      throw new Error('Cannot fail a completed saga');
    }
    this.status = SagaStatus.FAILED;
    this.errorDetails = {
      error,
      ...details,
      timestamp: new Date().toISOString(),
    };
    this.retryCount += 1;
  }

  startCompensation(): void {
    if (!this.isFailed() && !this.isExecuting()) {
      throw new Error(`Cannot start compensation in status ${this.status}`);
    }
    this.status = SagaStatus.COMPENSATING;
  }

  completeCompensation(): void {
    if (!this.isCompensating()) {
      throw new Error(`Cannot complete compensation in status ${this.status}`);
    }
    this.status = SagaStatus.COMPENSATED;
    this.completedAt = new Date();
  }

  getCurrentStep(): SagaStep | undefined {
    return this.steps?.find((step) => step.step === this.currentStep);
  }

  getNextStep(): SagaStep | undefined {
    if (!this.steps) return undefined;
    const nextStepNumber = this.currentStep + 1;
    return this.steps.find((step) => step.step === nextStepNumber);
  }

  advanceStep(): void {
    this.currentStep += 1;
  }

  // Validação
  validate(): void {
    if (!this.transactionId) {
      throw new Error('Saga must have a transactionId');
    }

    if (!this.workflowId) {
      throw new Error('Saga must have a workflowId');
    }

    if (this.steps && this.steps.length === 0) {
      throw new Error('Saga must have at least one step');
    }
  }

  // Método para criar saga a partir de uma transação
  static createFromTransaction(
    transaction: Transaction,
    workflowId: string,
    steps: Partial<SagaStep>[],
    contextData?: Record<string, any>,
  ): Saga {
    const saga = new Saga();
    saga.transactionId = transaction.id;
    saga.workflowId = workflowId;
    saga.status = SagaStatus.INITIATED;
    saga.currentStep = 0;
    saga.contextData = contextData || {};
    saga.timeoutAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    saga.steps = steps.map((stepData, index) => {
      const step = new SagaStep();
      step.saga = saga;
      step.step = index + 1;
      step.type = stepData.type || SagaStepType.VALIDATION;
      step.status = SagaStepStatus.PENDING;
      step.maxRetries = stepData.maxRetries || 3;
      step.timeoutSeconds = stepData.timeoutSeconds || 30;
      step.compensation = stepData.compensation || {};
      step.inputData = stepData.inputData || {};
      return step;
    });

    saga.validate();
    return saga;
  }
}
