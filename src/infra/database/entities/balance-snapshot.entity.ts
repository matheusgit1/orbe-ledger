import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { Currency } from './currency.entity';
import { BalanceType } from '../common/enums/balance.enum';
import { EntrySide } from '../common/enums/journal.enum';
import { Entry } from './entry.entity';

@Entity('balance_snapshots')
@Index(['accountId', 'updatedAt'])
@Index(['accountId', 'version'])
@Index(['accountId'], { unique: true })
@Index(['lastEntryId'])
@Index(['lastJournalId'])
export class BalanceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  available: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  book: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pending: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  held: number;

  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @Column({ type: 'uuid', nullable: true, name: 'last_entry_id' })
  lastEntryId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'last_journal_id' })
  lastJournalId: string | null;

  @VersionColumn()
  version: number;

  @Column({
    type: 'timestamp',
    name: 'snapshot_date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Account, (account) => account.balanceSnapshots)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Currency, (currency) => currency.balanceSnapshots)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  // Métodos de domínio
  getBalanceByType(type: BalanceType): number {
    switch (type) {
      case BalanceType.AVAILABLE:
        return this.available;
      case BalanceType.BOOK:
        return this.book;
      case BalanceType.PENDING:
        return this.pending;
      case BalanceType.HELD:
        return this.held;
      default:
        throw new Error(`Unknown balance type: ${type}`);
    }
  }

  updateBalances(entry: Entry): void {
    const amount = entry.amount;

    // Atualiza baseado no tipo de entrada
    if (entry.side === EntrySide.DEBIT) {
      this.book -= amount;
      if (!entry.hold) {
        this.available -= amount;
      }
    } else {
      this.book += amount;
      if (!entry.hold) {
        this.available += amount;
      }
    }

    // Atualiza referências
    this.lastEntryId = entry.id;
    this.lastJournalId = entry.journalId;
    this.version += 1;
  }

  applyEntry(
    amount: number,
    side: EntrySide,
    entryId?: string,
    journalId?: string,
  ): void {
    const currentBook =
      typeof this.book === 'string' ? parseFloat(this.book) : this.book;
    const currentAvailable =
      typeof this.available === 'string'
        ? parseFloat(this.available)
        : this.available;

    if (side === EntrySide.DEBIT) {
      this.book = currentBook - parseFloat(amount.toString());
      this.available = currentAvailable - parseFloat(amount.toString());
    } else {
      this.book = currentBook + parseFloat(amount.toString());
      this.available = currentAvailable + parseFloat(amount.toString());
    }
    if (entryId) {
      this.lastEntryId = entryId;
    }
    if (journalId) {
      this.lastJournalId = journalId;
    }
  }

  // Validação de domínio
  validate(): void {
    if (this.available < 0) {
      throw new Error(
        `Negative available balance for account ${this.accountId}: ${this.available}`,
      );
    }

    if (this.book < 0) {
      throw new Error(
        `Negative book balance for account ${this.accountId}: ${this.book}`,
      );
    }
  }

  // Método para criar snapshot inicial
  static createInitial(accountId: string, currencyId: string): BalanceSnapshot {
    const snapshot = new BalanceSnapshot();
    snapshot.accountId = accountId;
    snapshot.currencyId = currencyId;
    snapshot.available = 0;
    snapshot.book = 0;
    snapshot.pending = 0;
    snapshot.held = 0;
    snapshot.version = 1;
    return snapshot;
  }

  // Método para clonar snapshot (para versionamento)
  clone(): BalanceSnapshot {
    const clone = new BalanceSnapshot();
    clone.accountId = this.accountId;
    clone.currencyId = this.currencyId;
    clone.available = this.available;
    clone.book = this.book;
    clone.pending = this.pending;
    clone.held = this.held;
    clone.lastEntryId = this.lastEntryId;
    clone.lastJournalId = this.lastJournalId;
    clone.version = this.version + 1;
    return clone;
  }
}
