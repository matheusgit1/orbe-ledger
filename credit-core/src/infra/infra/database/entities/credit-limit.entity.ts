import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditAccount } from './credit-account.entity';
import { CreditLimitStatus } from '../common/enums/credit-limits.enum';

@Entity('credit_limits')
@Index(['credit_account_id'])
export class CreditLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //credit_account_id
  @Column({ name: 'credit_account_id' })
  creditAccountId: string;

  //limit_amount
  @Column({ name: 'limit_amount', type: 'decimal', precision: 15, scale: 2 })
  limitAmount: number;

  //used_amount
  @Column({ name: 'used_amount', type: 'decimal', precision: 15, scale: 2 })
  usedAmount: number;

  //available_amount
  @Column({
    name: 'available_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  availableAmount: number;

  @Column({ name: 'status', type: 'enum', enum: CreditLimitStatus })
  status: CreditLimitStatus;

  @Column({ name: 'valid_from' })
  validFrom: Date;

  @Column({ name: 'valid_to', nullable: true })
  validTo: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  //relationship
  @ManyToOne(() => CreditAccount, (creditAccount) => creditAccount.creditLimits)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;
}
