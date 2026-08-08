// src/core/limits/entities/limit.entity.ts
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
import { Account } from './account.entity';


@Entity('limits')
@Index(['accountId'], { unique: true })
export class Limit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'account_id', unique: true })
  accountId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'daily_debit' })
  dailyDebit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'daily_credit' })
  dailyCredit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'monthly_debit' })
  monthlyDebit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'monthly_credit' })
  monthlyCredit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_balance' })
  maxBalance: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_negative' })
  maxNegative: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_transaction' })
  maxTransaction: number | null;

  @Column({ type: 'int', nullable: true, name: 'max_transactions_per_day' })
  maxTransactionsPerDay: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Account, (account) => account.limits)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  // Métodos de domínio
  hasDailyDebitLimit(): boolean {
    return this.dailyDebit !== null && this.dailyDebit > 0;
  }

  hasDailyCreditLimit(): boolean {
    return this.dailyCredit !== null && this.dailyCredit > 0;
  }

  hasMonthlyDebitLimit(): boolean {
    return this.monthlyDebit !== null && this.monthlyDebit > 0;
  }

  hasMonthlyCreditLimit(): boolean {
    return this.monthlyCredit !== null && this.monthlyCredit > 0;
  }

  hasMaxBalanceLimit(): boolean {
    return this.maxBalance !== null && this.maxBalance > 0;
  }

  hasMaxNegativeLimit(): boolean {
    return this.maxNegative !== null && this.maxNegative < 0;
  }

  hasMaxTransactionLimit(): boolean {
    return this.maxTransaction !== null && this.maxTransaction > 0;
  }

  // Validação
  validate(): void {
    if (!this.accountId) {
      throw new Error('Limit must have an accountId');
    }

    if (this.maxNegative !== null && this.maxNegative > 0) {
      throw new Error('Max negative must be less than 0');
    }

    if (this.maxBalance !== null && this.maxBalance < 0) {
      throw new Error('Max balance must be greater than 0');
    }
  }
}