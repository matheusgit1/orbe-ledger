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
import { CreditHold } from './credit-hold.entity';
import {
  CreditUtilizationType,
  CreditUtilizationStatus,
} from '../common/enums/credit-utilization.enum';

@Entity('credit_utilizations')
@Index(['creditAccountId', 'holdId'])
export class CreditUtilization {
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

  // hold_id
  @Column({
    type: 'uuid',
    name: 'hold_id',
    nullable: true,
  })
  holdId?: string;

  // amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'amount',
  })
  amount: number;

  // type
  @Column({
    type: 'enum',
    enum: CreditUtilizationType,
    default: CreditUtilizationType.ACTIVE,
    name: 'type',
  })
  type: CreditUtilizationType;

  // status
  @Column({
    type: 'enum',
    enum: CreditUtilizationStatus,
    default: CreditUtilizationStatus.ACTIVE,
    name: 'status',
  })
  status: CreditUtilizationStatus;

  // captured_at
  @Column({
    type: 'timestamp',
    name: 'captured_at',
    nullable: true,
  })
  capturedAt?: Date;

  // metadata
  @Column({
    type: 'json',
    name: 'metadata',
  })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // relations
  @ManyToOne(() => CreditAccount, (account) => account.id)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;

  @ManyToOne(() => CreditHold, (hold) => hold.id)
  @JoinColumn({ name: 'hold_id' })
  creditHold: CreditHold;
}
