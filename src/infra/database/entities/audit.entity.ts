import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditAction, AuditEntity } from '../common/enums/audit.enum';
import { Journal } from './journal.entity';

@Entity('audit_logs')
@Index(['aggregate', 'aggregateId'])
@Index(['userId'])
@Index(['createdAt'])
@Index(['traceId'])
@Index(['requestId'])
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuditEntity,
  })
  aggregate: AuditEntity;

  @Column({ type: 'uuid', name: 'aggregate_id' })
  aggregateId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'varchar', nullable: true, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', nullable: true, name: 'request_id' })
  requestId: string;

  @Column({ type: 'varchar', nullable: true, name: 'trace_id' })
  traceId: string;

  @Column({ type: 'varchar', nullable: true })
  ip: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>; // Diff entre before e after

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Journal, (journal) => journal.audits)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  // Métodos de domínio
  static create(
    aggregate: AuditEntity,
    aggregateId: string,
    action: AuditAction,
    userId: string,
    before?: any,
    after?: any,
    metadata?: any,
  ): Audit {
    const audit = new Audit();
    audit.aggregate = aggregate;
    audit.aggregateId = aggregateId;
    audit.action = action;
    audit.userId = userId;
    audit.before = before;
    audit.after = after;
    audit.metadata = metadata;

    if (before && after) {
      audit.changes = this.calculateDiff(before, after);
    }

    return audit;
  }

  private static calculateDiff(before: any, after: any): Record<string, any> {
    const diff: Record<string, any> = {};

    for (const key of Object.keys(after)) {
      if (before[key] !== after[key]) {
        diff[key] = {
          before: before[key],
          after: after[key],
        };
      }
    }

    return diff;
  }

  // Validação
  validate(): void {
    if (!this.aggregate || !this.aggregateId) {
      throw new Error('Audit must have aggregate and aggregateId');
    }

    if (!this.action) {
      throw new Error('Audit must have an action');
    }
  }
}
