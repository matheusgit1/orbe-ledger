// src/core/holds/entities/hold.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { HoldReason, HoldStatus } from '../common/enums/hold.enum';
import { Account } from './account.entity';
import { Currency } from './currency.entity';
import { Transaction } from './transaction.entity';
import { Journal } from './journal.entity';
import { Entry } from './entry.entity';

export interface CreateHoldOptions {
  accountId: string;
  amount: number;
  currencyId: string;
  reason: HoldReason;
  expiresInSeconds?: number;
  metadata?: Record<string, any>;
}

@Entity('holds')
@Index(['accountId', 'status'])
@Index(['transactionId'])
@Index(['journalId'])
@Index(['expiresAt'])
@Index(['status', 'expiresAt'])
export class Hold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'uuid', name: 'transaction_id', nullable: true })
  transactionId: string | null;

  @Column({ type: 'uuid', name: 'journal_id', nullable: true })
  journalId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @Column({
    type: 'enum',
    enum: HoldReason,
  })
  reason: HoldReason;

  @Column({
    type: 'enum',
    enum: HoldStatus,
    default: HoldStatus.ACTIVE,
  })
  status: HoldStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'captured_at' })
  capturedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'released_at' })
  releasedAt: Date | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'captured_amount',
  })
  capturedAmount: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'release_reason' })
  releaseReason: Record<string, any> | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 1,
    name: 'exchange_rate',
  })
  exchangeRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Account, (account) => account.holds)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @ManyToOne(() => Transaction, (transaction) => transaction.holds)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @ManyToOne(() => Journal)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  @OneToMany(() => Entry, (entry) => entry.hold)
  entries: Entry[];

  // Métodos de domínio
  isActive(): boolean {
    return this.status === HoldStatus.ACTIVE;
  }

  isCaptured(): boolean {
    return this.status === HoldStatus.CAPTURED;
  }

  isReleased(): boolean {
    return this.status === HoldStatus.RELEASED;
  }

  isExpired(): boolean {
    return this.status === HoldStatus.EXPIRED;
  }

  isExpiredByDate(): boolean {
    return this.isActive() && new Date() > this.expiresAt;
  }

  canCapture(): boolean {
    return this.isActive() && !this.isExpiredByDate();
  }

  canRelease(): boolean {
    return this.isActive() && !this.isExpiredByDate();
  }

  capture(amount: number): void {
    if (!this.canCapture()) {
      throw new Error(`Cannot capture hold in status ${this.status}`);
    }

    this.status = HoldStatus.CAPTURED;
    this.capturedAt = new Date();
    this.capturedAmount = amount

    if (this.capturedAmount !== this.amount) {
      this.status = HoldStatus.PARTIALLY_CAPTURED;
    }
  }

  release(reason?: string): void {
    if (!this.canRelease()) {
      throw new Error(`Cannot release hold in status ${this.status}`);
    }

    this.status = HoldStatus.RELEASED;
    this.releasedAt = new Date();
    this.releaseReason = {
      reason: reason || 'Released',
      timestamp: new Date().toISOString(),
    };
  }

  expire(): void {
    if (!this.isActive()) {
      throw new Error(`Cannot expire hold in status ${this.status}`);
    }

    this.status = HoldStatus.EXPIRED;
    this.releaseReason = {
      reason: 'Expired',
      timestamp: new Date().toISOString(),
    };
  }

  getRemainingTimeInSeconds(): number {
    if (!this.isActive()) return 0;
    const diff = this.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }

  // Validação
  validate(): void {
    if (!this.accountId) {
      throw new Error('Hold must have an accountId');
    }

    if (this.amount <= 0) {
      throw new Error(
        `Hold amount must be greater than 0, received ${this.amount}`,
      );
    }

    if (!this.expiresAt) {
      throw new Error('Hold must have an expiresAt');
    }

    if (this.expiresAt <= new Date()) {
      throw new Error('ExpiresAt must be in the future');
    }

    if (this.capturedAmount && this.capturedAmount > this.amount) {
      throw new Error(
        `Captured amount (${this.capturedAmount}) cannot exceed hold amount (${this.amount})`,
      );
    }
  }

  static create(options: CreateHoldOptions): Hold {
    const hold = new Hold();
    hold.accountId = options.accountId;
    hold.amount = options.amount;
    hold.currencyId = options.currencyId;
    hold.reason = options.reason;
    hold.status = HoldStatus.ACTIVE;
    hold.expiresAt = new Date(
      Date.now() + (options.expiresInSeconds || 300) * 1000,
    );
    hold.metadata = options.metadata;

    hold.validate();
    return hold;
  }

  toDto() {
    return Object.assign(this);
  }
}
