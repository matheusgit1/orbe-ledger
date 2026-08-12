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
import {
  CreditTransactionType,
  CreditTransactionStatus,
} from '../common/enums/credit-transaction.enum';

@Entity('credit_transactions')
@Index(['credit_account_id'])
@Index(['utilization_id'])
export class CreditTransaction {
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

  // utilization_id (nullable)
  @Column({
    type: 'uuid',
    name: 'utilization_id',
    nullable: true,
  })
  utilizationId?: string;

  // type
  @Column({
    type: 'enum',
    enum: CreditTransactionType,
    name: 'type',
  })
  type: CreditTransactionType;

  // status
  @Column({
    type: 'enum',
    enum: CreditTransactionStatus,
    default: CreditTransactionStatus.PENDING,
    name: 'status',
  })
  status: CreditTransactionStatus;

  // amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'amount',
  })
  amount: number;

  // principal_amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'principal_amount',
    nullable: true,
  })
  principalAmount?: number;

  // interest_amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'interest_amount',
    nullable: true,
  })
  interestAmount?: number;

  // fee_amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'fee_amount',
    nullable: true,
  })
  feeAmount?: number;

  // penalty_amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'penalty_amount',
    nullable: true,
  })
  penaltyAmount?: number;

  // description
  @Column({
    type: 'varchar',
    name: 'description',
    nullable: true,
  })
  description?: string;

  // reference_type
  @Column({
    type: 'varchar',
    name: 'reference_type',
    nullable: true,
  })
  referenceType?: string;

  // reference_id
  @Column({
    type: 'varchar',
    name: 'reference_id',
    nullable: true,
  })
  referenceId?: string;

  // occurred_at
  @Column({
    type: 'timestamp',
    name: 'occurred_at',
    nullable: true,
  })
  occurredAt?: Date;

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

  @ManyToOne(() => CreditUtilization, (utilization) => utilization.id)
  @JoinColumn({ name: 'utilization_id' })
  creditUtilization?: CreditUtilization;
}
