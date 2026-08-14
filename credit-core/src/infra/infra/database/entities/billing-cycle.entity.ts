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
import { CreditUtilization } from './credit-ultilization.entity';
import { BillingCycleStatus } from '../common/enums/billing-cycle.enum';

@Entity('billing_cycles')
@Index(['creditAccountId', 'creditUtilizationId'])
export class BillingCycle {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  // credit_account_id
  @Column({
    type: 'uuid',
    name: 'credit_account_id',
  })
  creditAccountId: string;

  // credit_utilization_id
  @Column({
    type: 'uuid',
    name: 'credit_utilization_id',
    nullable: true,
  })
  creditUtilizationId?: string;

  // cycle_number
  @Column({
    type: 'int',
    name: 'cycle_number',
  })
  cycleNumber: number;

  // period_start
  @Column({
    type: 'timestamp',
    name: 'period_start',
  })
  periodStart: Date;

  // period_end
  @Column({
    type: 'timestamp',
    name: 'period_end',
  })
  periodEnd: Date;

  // due_date
  @Column({
    type: 'timestamp',
    name: 'due_date',
  })
  dueDate: Date;

  // status
  @Column({
    type: 'enum',
    enum: BillingCycleStatus,
    default: BillingCycleStatus.OPEN,
    name: 'status',
  })
  status: BillingCycleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // relations
  @ManyToOne(() => CreditAccount, (account) => account.id)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;

  @ManyToOne(() => CreditUtilization, (utilization) => utilization.id)
  @JoinColumn({ name: 'credit_utilization_id' })
  creditUtilization?: CreditUtilization;
}
