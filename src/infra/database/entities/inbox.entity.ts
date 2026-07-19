
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('inbox')
@Index(['messageId', 'consumer'], { unique: true })
@Index(['processedAt'])
export class Inbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'message_id', unique: true })
  messageId: string;

  @Column({ type: 'varchar' })
  consumer: string; // Nome do handler

  @Column({ type: 'timestamp', name: 'processed_at', default: () => 'CURRENT_TIMESTAMP' })
  processedAt: Date;

  @Column({ type: 'varchar', name: 'payload_hash' })
  payloadHash: string; // Para deduplicação

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Métodos de domínio
  static create(messageId: string, consumer: string, payload: any): Inbox {
    const inbox = new Inbox();
    inbox.messageId = messageId;
    inbox.consumer = consumer;
    inbox.payloadHash = this.generateHash(payload);
    inbox.processedAt = new Date();
    return inbox;
  }

  private static generateHash(payload: any): string {
    // Implementar hash consistente (ex: SHA256)
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  // Validação
  validate(): void {
    if (!this.messageId) {
      throw new Error('Inbox must have a messageId');
    }

    if (!this.consumer) {
      throw new Error('Inbox must have a consumer');
    }
  }
}