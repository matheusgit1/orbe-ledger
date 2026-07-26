// src/core/entries/entities/entry.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { EntrySide } from '../common/enums/journal.enum';
import { Journal } from './journal.entity';
import { Account } from './account.entity';
import { Currency } from './currency.entity';
import { Hold } from './hold.entity';

export interface CreateEntryProps {
  journalId: string;
  accountId: string;
  side: EntrySide;
  amount: number;
  currencyId: string;
  exchangeRate?: number;
  amountOriginalCurrency?: number;
  description?: string;
  sequence: number;
  holdId?: string;
  metadata?: Record<string, any>;
}

@Entity('entries')
@Index(['journalId', 'sequence'], { unique: true })
@Index(['accountId', 'createdAt'])
@Index(['journalId'])
@Check(`"amount" > 0`)
export class Entry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'journal_id' })
  journalId: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({
    type: 'enum',
    enum: EntrySide,
  })
  side: EntrySide;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 1,
    name: 'exchange_rate',
  })
  exchangeRate: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'amount_original_currency',
  })
  amountOriginalCurrency: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', name: 'sequence' })
  sequence: number;

  @Column({ type: 'uuid', nullable: true, name: 'hold_id' })
  holdId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Journal, (journal) => journal.entries)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  @ManyToOne(() => Account, (account) => account.entries)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Currency, (currency) => currency.entries)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @ManyToOne(() => Hold, (hold) => hold.entries)
  @JoinColumn({ name: 'hold_id' })
  hold: Hold | null;

  // Métodos de domínio
  isDebit(): boolean {
    return this.side === EntrySide.DEBIT;
  }

  isCredit(): boolean {
    return this.side === EntrySide.CREDIT;
  }

  isHoldRelated(): boolean {
    return this.holdId !== null || this.hold !== null;
  }

  getAmountInBaseCurrency(): number {
    return this.amount / this.exchangeRate;
  }

  // Validação de domínio
  validate(): void {
    if (this.amount <= 0) {
      throw new Error(
        `Entry amount must be greater than 0, received ${this.amount}`,
      );
    }

    if (this.exchangeRate <= 0) {
      throw new Error(
        `Exchange rate must be greater than 0, received ${this.exchangeRate}`,
      );
    }
  }

  static create(props: CreateEntryProps): Entry {
    const entry = new Entry();
    entry.journalId = props.journalId;
    entry.accountId = props.accountId;
    entry.side = props.side;
    entry.amount = props.amount;
    entry.currencyId = props.currencyId;
    entry.exchangeRate = props.exchangeRate || 1;
    if (props.amountOriginalCurrency !== undefined) {
      entry.amountOriginalCurrency = props.amountOriginalCurrency;
    }
    entry.description = props.description;
    entry.sequence = props.sequence;
    entry.holdId = props.holdId;
    entry.metadata = props.metadata;

    entry.validate();
    return entry;
  }

  static validateDebitAndCredits(entries: Entry[]): void {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.isDebit()) {
        totalDebit += entry.amount;
      } else if (entry.isCredit()) {
        totalCredit += entry.amount;
      } else {
        throw new Error(`Lado inválido: ${entry.side}`);
      }
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Débitos e créditos não batem: débitos=${totalDebit}, créditos=${totalCredit}`,
      );
    }
  }
}
