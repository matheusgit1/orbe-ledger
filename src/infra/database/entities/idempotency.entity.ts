import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IdempotencyStatus } from '../common/enums/idempotency.status';

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

  @Column({ type: 'jsonb' })
  response: Record<string, any>;

  @Column({ type: 'varchar', length: 50, enum: IdempotencyStatus })
  status: IdempotencyStatus; // COMPLETED, PROCESSING, FAILED

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'entity_type' })
  entityType: string; // TRANSACTION, JOURNAL, etc.

  @Column({ type: 'uuid', nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

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

  isCompleted(): boolean {
    return this.status === IdempotencyStatus.COMPLETED;
  }

  isProcessing(): boolean {
    return this.status === IdempotencyStatus.PROCESSING;
  }

  isFailed(): boolean {
    return this.status === IdempotencyStatus.FAILED;
  }

  canRetry(): boolean {
    return this.isFailed() && !this.isExpired();
  }

  markAsCompleted(response: Record<string, any>): void {
    this.status = IdempotencyStatus.COMPLETED;
    this.response = response;
  }

  markAsProcessing(): void {
    this.status = IdempotencyStatus.PROCESSING;
  }

  markAsFailed(error: string): void {
    this.status = IdempotencyStatus.FAILED;
    this.metadata = {
      ...this.metadata,
      error,
      failedAt: new Date().toISOString(),
    };
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
  static create(
    key: string,
    hash: string,
    data: Record<string, any>,
    ttl: number,
    entityType: string,
    entityId: string,
  ): Idempotency {
    const idempotency = new Idempotency();
    idempotency.key = key;
    idempotency.requestHash = hash;
    idempotency.response = data;
    idempotency.status = IdempotencyStatus.COMPLETED;
    idempotency.metadata = data;
    idempotency.expiresAt = new Date(Date.now() + ttl * 1000);
    idempotency.entityType = entityType;
    idempotency.entityId = entityId;
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
