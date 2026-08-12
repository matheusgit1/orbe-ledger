import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditAccount } from './credit-account.entity';
import { BillingCycle } from './billing-cycle.entity';
import { BillingCycleStatus } from '../common/enums/billing-cycle.enum';

@Entity('statements')
@Index(['billing_cycle_id'])
@Index(['credit_account_id'])
export class Statement {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  // billing_cycle_id
  @Column({
    type: 'uuid',
    name: 'billing_cycle_id',
  })
  billingCycleId: string;

  // credit_account_id
  @Column({
    type: 'uuid',
    name: 'credit_account_id',
  })
  creditAccountId: string;

  // total_principal
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_principal',
  })
  totalPrincipal: number;

  // total_interest
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_interest',
  })
  totalInterest: number;

  // total_fees
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_fees',
  })
  totalFees: number;

  // total_penalties
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_penalties',
  })
  totalPenalties: number;

  // total_amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_amount',
  })
  totalAmount: number;

  // minimum_payment
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'minimum_payment',
  })
  minimumPayment: number;

  // status
  @Column({
    type: 'enum',
    enum: BillingCycleStatus,
    default: BillingCycleStatus.OPEN,
    name: 'status',
  })
  status: BillingCycleStatus;

  // issued_at
  @Column({
    type: 'timestamp',
    name: 'issued_at',
  })
  issuedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // relations
  @ManyToOne(() => BillingCycle, (billingCycle) => billingCycle.id)
  @JoinColumn({ name: 'billing_cycle_id' })
  billingCycle: BillingCycle;

  @ManyToOne(() => CreditAccount, (account) => account.id)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;
}
