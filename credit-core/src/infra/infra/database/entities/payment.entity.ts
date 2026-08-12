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
import { Statement } from './statement.entity';
import { PaymentType, PaymentStatus } from '../common/enums/payment.enum';

@Entity('payments')
@Index(['credit_account_id'])
@Index(['statement_id'])
export class Payment {
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

  // statement_id
  @Column({
    type: 'uuid',
    name: 'statement_id',
    nullable: true,
  })
  statementId?: string;

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
    enum: PaymentType,
    name: 'type',
  })
  type: PaymentType;

  // status
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    name: 'status',
  })
  status: PaymentStatus;

  // payment_date
  @Column({
    type: 'timestamp',
    name: 'payment_date',
    nullable: true,
  })
  paymentDate?: Date;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // relations
  @ManyToOne(() => CreditAccount, (account) => account.id)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;

  @ManyToOne(() => Statement, (statement) => statement.id)
  @JoinColumn({ name: 'statement_id' })
  statement?: Statement;
}
