
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { EntrySide, JournalStatus, JournalType } from '../common/enums/journal.enum';
import { Ledger } from './ledger.entity';
import { Entry } from './entry.entity';
import { Audit } from './audit.entity';
import { Outbox } from './outbox.entity';
import { Transaction } from './transaction.entity';


@Entity('journals')
@Index(['ledgerId', 'journalNumber'], { unique: true })
@Index(['correlationId'])
@Index(['causationId'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
@Index(['status', 'postedAt'])
@Index(['reference'])
export class Journal {
  @PrimaryGeneratedColumn('uuid')
  id: string;


  @Column({ type: 'uuid', name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'varchar', length: 50, name: 'journal_number', unique: true })
  journalNumber: string;

  @Column({
    type: 'enum',
    enum: JournalStatus,
    default: JournalStatus.PENDING,
  })
  status: JournalStatus;

  @Column({
    type: 'enum',
    enum: JournalType,
  })
  type: JournalType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'external_reference' })
  externalReference: string;

  @Column({ type: 'uuid', nullable: true, name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'uuid', nullable: true, name: 'causation_id' })
  causationId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 50, name: 'source' })
  source: string; // API, WEBHOOK, BATCH, SYSTEM, etc.

  @Column({ type: 'timestamp', nullable: true, name: 'posted_at' })
  postedAt: Date;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Ledger, (ledger) => ledger.journals)
  @JoinColumn({ name: 'ledger_id' })
  ledger: Ledger;

  @OneToMany(() => Entry, (entry) => entry.journal, { cascade: true })
  entries: Entry[];

  @OneToMany(() => Audit, (audit) => audit.journal)
  audits: Audit[];

  @OneToMany(() => Outbox, (outbox) => outbox.journal)
  outboxes: Outbox[];

  @ManyToOne(() => Transaction, (transaction) => transaction.journals)
  @JoinColumn({ name: 'correlation_id', referencedColumnName: 'id' })
  transaction: Transaction;

  // Métodos de domínio
  isPosted(): boolean {
    return this.status === JournalStatus.POSTED;
  }

  isPending(): boolean {
    return this.status === JournalStatus.PENDING;
  }

  isReversed(): boolean {
    return this.status === JournalStatus.REVERSED;
  }

  canBeReversed(): boolean {
    return this.isPosted() && !this.isReversed();
  }

  getTotalDebit(): number {
    return this.entries
      .filter(e => e.side === EntrySide.DEBIT)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  getTotalCredit(): number {
    return this.entries
      .filter(e => e.side === EntrySide.CREDIT)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  isBalanced(): boolean {
    return this.getTotalDebit() === this.getTotalCredit();
  }

  // Validação de domínio
  validate(): void {
    if (!this.isBalanced()) {
      throw new Error(`Journal ${this.journalNumber} is not balanced. Debit: ${this.getTotalDebit()}, Credit: ${this.getTotalCredit()}`);
    }

    if (this.entries.length < 2) {
      throw new Error(`Journal ${this.journalNumber} must have at least 2 entries (debit and credit)`);
    }
  }
}