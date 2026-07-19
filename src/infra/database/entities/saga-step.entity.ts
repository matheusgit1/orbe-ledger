// src/core/saga/entities/saga-step.entity.ts
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
import { SagaStepStatus, SagaStepType } from '../common/enums/saga.enum';
import { Saga } from './saga.entity';


@Entity('saga_steps')
@Index(['sagaId', 'step'], { unique: true })
@Index(['status'])
@Index(['startedAt'])
export class SagaStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'saga_id' })
  sagaId: string;

  @Column({ type: 'int' })
  step: number;

  @Column({
    type: 'enum',
    enum: SagaStepType,
  })
  type: SagaStepType;

  @Column({
    type: 'enum',
    enum: SagaStepStatus,
    default: SagaStepStatus.PENDING,
  })
  status: SagaStepStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'input_data' })
  inputData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'output_data' })
  outputData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  compensation: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails: Record<string, any>;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'int', default: 3, name: 'max_retries' })
  maxRetries: number;

  @Column({ type: 'int', default: 30, name: 'timeout_seconds' })
  timeoutSeconds: number;

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
  @ManyToOne(() => Saga, (saga) => saga.steps)
  @JoinColumn({ name: 'saga_id' })
  saga: Saga;

  // Métodos de domínio
  isPending(): boolean {
    return this.status === SagaStepStatus.PENDING;
  }

  isExecuting(): boolean {
    return this.status === SagaStepStatus.EXECUTING;
  }

  isCompleted(): boolean {
    return this.status === SagaStepStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === SagaStepStatus.FAILED;
  }

  isCompensating(): boolean {
    return this.status === SagaStepStatus.COMPENSATING;
  }

  isCompensated(): boolean {
    return this.status === SagaStepStatus.COMPENSATED;
  }

  canRetry(): boolean {
    return (
      (this.isFailed() || this.status === SagaStepStatus.TIMEOUT) &&
      this.retryCount < this.maxRetries
    );
  }

  start(): void {
    if (!this.isPending()) {
      throw new Error(`Cannot start step in status ${this.status}`);
    }
    this.status = SagaStepStatus.EXECUTING;
    this.startedAt = new Date();
    this.timeoutAt = new Date(Date.now() + this.timeoutSeconds * 1000);
  }

  complete(outputData?: Record<string, any>): void {
    if (!this.isExecuting()) {
      throw new Error(`Cannot complete step in status ${this.status}`);
    }
    this.status = SagaStepStatus.COMPLETED;
    this.completedAt = new Date();
    if (outputData) {
      this.outputData = { ...this.outputData, ...outputData };
    }
  }

  fail(error: string, details?: Record<string, any>): void {
    if (this.isCompleted()) {
      throw new Error('Cannot fail a completed step');
    }
    this.status = SagaStepStatus.FAILED;
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
    this.status = SagaStepStatus.COMPENSATING;
  }

  completeCompensation(): void {
    if (!this.isCompensating()) {
      throw new Error(`Cannot complete compensation in status ${this.status}`);
    }
    this.status = SagaStepStatus.COMPENSATED;
    this.completedAt = new Date();
  }

  isTimeout(): boolean {
    return this.isExecuting() && this.timeoutAt && new Date() > this.timeoutAt;
  }

  // Validação
  validate(): void {
    if (!this.sagaId) {
      throw new Error('SagaStep must have a sagaId');
    }

    if (this.step <= 0) {
      throw new Error('Step number must be greater than 0');
    }

    if (this.timeoutSeconds <= 0) {
      throw new Error('Timeout seconds must be greater than 0');
    }
  }
}