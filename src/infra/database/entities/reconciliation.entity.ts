
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
import { Currency } from './currency.entity';

@Entity('reconciliations')
@Index(['externalSystem', 'reference'], { unique: true })
@Index(['accountId', 'status'])
@Index(['executedAt'])
@Index(['currencyId'])
export class Reconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'external_system' })
  externalSystem: string;

  @Column({ type: 'varchar', length: 100, name: 'reference' })
  reference: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'expected_amount' })
  expectedAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'actual_amount' })
  actualAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  difference: number;

  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @Column({ type: 'varchar', length: 50 })
  status: string; // PENDING, MATCHED, MISMATCHED, ADJUSTED

  @Column({ type: 'jsonb', nullable: true, name: 'transaction_ids' })
  transactionIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ type: 'timestamp', name: 'executed_at' })
  executedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  // Métodos de domínio
  isMatched(): boolean {
    return this.status === 'MATCHED';
  }

  isMismatched(): boolean {
    return this.status === 'MISMATCHED';
  }

  isAdjusted(): boolean {
    return this.status === 'ADJUSTED';
  }

  isPending(): boolean {
    return this.status === 'PENDING';
  }

  match(): void {
    if (this.difference === 0) {
      this.status = 'MATCHED';
    } else {
      this.status = 'MISMATCHED';
    }
  }

  adjust(reason: string): void {
    if (!this.isMismatched()) {
      throw new Error('Only mismatched reconciliations can be adjusted');
    }
    this.status = 'ADJUSTED';
    this.details = {
      ...this.details,
      adjustedAt: new Date().toISOString(),
      adjustmentReason: reason,
    };
  }

  // Validação
  validate(): void {
    if (!this.externalSystem) {
      throw new Error('Reconciliation must have an externalSystem');
    }

    if (!this.reference) {
      throw new Error('Reconciliation must have a reference');
    }

    if (!this.accountId) {
      throw new Error('Reconciliation must have an accountId');
    }

    if (this.expectedAmount < 0 || this.actualAmount < 0) {
      throw new Error('Amounts cannot be negative');
    }

    this.difference = this.expectedAmount - this.actualAmount;
  }
}