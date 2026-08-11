import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IdempotencyStatus } from '../common/enums/idempotency.status';

export interface CreateIdempotencyOptions {
  key: string;
  hash: string;
  ttl: number;
  entityType: string;
  entityId: string;
  request: Record<string, any>;
  response?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Entity('idempotency')
@Index(['key'], { unique: true })
@Index(['expiresAt'])
export class Idempotency {
  protected constructor() {}
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ type: 'varchar', name: 'request_hash' })
  requestHash: string;

  @Column({ type: 'jsonb', nullable: true })
  response?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: false })
  request: Record<string, any>;

  @Column({ type: 'varchar', length: 50, enum: IdempotencyStatus })
  status: IdempotencyStatus; // COMPLETED, PROCESSING, FAILED

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'entity_type' })
  entityType: string; // TRANSACTION, JOURNAL, etc.

  @Column({ type: 'uuid', nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos de domínio
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === IdempotencyStatus.PENDING;
  }

  isCompleted(): boolean {
    return this.status === IdempotencyStatus.COMPLETED;
  }

  isProcessing(): boolean {
    return this.status === IdempotencyStatus.PROCESSING;
  }

  isFailed(): boolean {
    return this.status === IdempotencyStatus.FAILED;
  }

  isRetryable(): boolean {
    return this.isFailed() || this.isPending();
  }

  setAsCompleted(response: Record<string, any>): Idempotency {
    this.status = IdempotencyStatus.COMPLETED;
    this.response = response;
    return this;
  }

  setAsProcessing(): Idempotency {
    this.status = IdempotencyStatus.PROCESSING;
    return this;
  }

  setAsFailed(error: string): Idempotency {
    this.status = IdempotencyStatus.FAILED;
    this.metadata = {
      ...this.metadata,
      error,
      failedAt: new Date().toISOString(),
    };
    return this;
  }

  // Validação
  validate(): void {
    if (!this.key) {
      throw new Error('Idempotency must have a key');
    }

    if (!this.requestHash) {
      throw new Error('Idempotency must have a requestHash');
    }

    if (!this.expiresAt) {
      throw new Error('Idempotency must have an expiresAt');
    }

    if (this.expiresAt <= new Date()) {
      throw new Error('ExpiresAt must be in the future');
    }
  }

  // Método para criar chave de idempotência

  // Método para criar registro de idempotência com entity
  static create(options: CreateIdempotencyOptions): Idempotency {
    const idempotency = new Idempotency();
    idempotency.key = options.key;
    idempotency.requestHash = options.hash;
    idempotency.status = IdempotencyStatus.PENDING;
    idempotency.metadata = options.metadata;
    idempotency.expiresAt = new Date(Date.now() + options.ttl * 1000);
    idempotency.entityType = options.entityType;
    idempotency.entityId = options.entityId;
    idempotency.request = options.request;
    idempotency.response = options.response;
    return idempotency;
  }

  // Método para verificar duplicidade
  static isDuplicate(
    existing: Idempotency | null,
    requestHash: string,
  ): boolean {
    if (!existing) return false;
    return existing.requestHash === requestHash && !existing.isExpired();
  }
}
