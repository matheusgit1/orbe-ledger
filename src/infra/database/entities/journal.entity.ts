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
import {
  EntrySide,
  JournalStatus,
  JournalType,
} from '../common/enums/journal.enum';
import { Ledger } from './ledger.entity';
import { Entry } from './entry.entity';
import { Audit } from './audit.entity';
import { Outbox } from './outbox.entity';
import { Transaction } from './transaction.entity';

@Entity('journals')
@Index(['journalNumber'])
@Index(['correlationId'])
@Index(['causationId'])
@Index(['idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
@Index(['status', 'postedAt'])
@Index(['reference'])
export class Journal {
  protected constructor() {}

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'varchar', length: 50, name: 'journal_number' })
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
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'external_reference',
  })
  externalReference?: string;

  @Column({
    type: 'uuid',
    // length: 150,
    nullable: true,
    name: 'correlation_id',
  })
  correlationId?: string;

  @Column({
    type: 'uuid',
    //  length: 150,
    nullable: true,
    name: 'causation_id',
  })
  causationId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'idempotency_key',
  })
  idempotencyKey?: string;

  @Column({ type: 'varchar', length: 50, name: 'source' })
  source: string; // API, WEBHOOK, BATCH, SYSTEM, etc.

  @Column({ type: 'timestamp', nullable: true, name: 'posted_at' })
  postedAt?: Date;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

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
      .filter((e) => e.side === EntrySide.DEBIT)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  getTotalCredit(): number {
    return this.entries
      .filter((e) => e.side === EntrySide.CREDIT)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  isBalanced(): boolean {
    return this.getTotalDebit() === this.getTotalCredit();
  }

  getDebitEntry(): Entry[] {
    return this.entries.filter((e) => e.side === EntrySide.DEBIT);
  }

  getCreditEntry(): Entry[] {
    return this.entries.filter((e) => e.side === EntrySide.CREDIT);
  }

  // Validação de domínio
  validate(): void {
    if (!this.isBalanced()) {
      throw new Error(
        `Journal ${this.journalNumber} is not balanced. Debit: ${this.getTotalDebit()}, Credit: ${this.getTotalCredit()}`,
      );
    }

    if (this.entries.length < 2) {
      throw new Error(
        `Journal ${this.journalNumber} must have at least 2 entries (debit and credit)`,
      );
    }
  }

  static create(props: {
    ledgerId: string;
    journalNumber: string;
    type: JournalType;
    description?: string;
    reference?: string;
    externalReference?: string;
    correlationId?: string;
    causationId?: string;
    idempotencyKey?: string;
    source: string;
    createdBy?: string;
    metadata?: Record<string, any>;
    postedAt?: Date;
    entries?: Entry[];
  }): Journal {
    const journal = new Journal();
    journal.ledgerId = props.ledgerId;
    journal.journalNumber = props.journalNumber;
    journal.status = JournalStatus.PENDING;
    journal.type = props.type;
    journal.description = props.description;
    journal.reference = props.reference;
    journal.externalReference = props.externalReference;
    journal.correlationId = props.correlationId;
    journal.causationId = props.causationId;
    journal.idempotencyKey = props.idempotencyKey;
    journal.source = props.source;
    journal.createdBy = props.createdBy;
    journal.metadata = props.metadata;
    journal.postedAt = props.postedAt;
    journal.entries = props.entries || [];

    return journal;
  }

  async setStatus(status: JournalStatus): Promise<void> {
    this.status = status;
    if (status === JournalStatus.POSTED) {
      this.postedAt = new Date();
    }
  }
}
