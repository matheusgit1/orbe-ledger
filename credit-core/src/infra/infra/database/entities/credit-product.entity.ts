import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditProductStatus } from '../common/enums/credit-products.enum';
import { CreditAccount } from './credit-account.entity';
import { CreditLimit } from './credit-limit.entity';

@Entity('credit_products')
@Index(['code'], { unique: true })
@Index(['currencyCode'])
export class CreditProduct {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  @Column('varchar', { length: 50, unique: true })
  code: string;

  @Column('varchar', { length: 100 })
  name: string;

  //description
  @Column('text')
  description: string;

  @Column({ name: 'currency_code', length: 5 })
  currencyCode: string;

  //decimal -> min limite (default 0)
  @Column({
    name: 'min_limit',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  minLimit: number;

  //decimal -> max limite (default 0)
  @Column({
    name: 'max_limit',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  maxLimit: number;

  //billing_cycle_days
  @Column({ name: 'billing_cycle_days', type: 'int', default: 30 })
  billingCycleDays: number;

  //payment_term_days
  @Column({ name: 'payment_term_days', type: 'int', default: 30 })
  paymentTermDays: number;

  //status
  @Column({
    name: 'status',
    type: 'enum',
    enum: CreditProductStatus,
    default: CreditProductStatus.ACTIVE,
  })
  status: CreditProductStatus;

  //metadata (jsonb)
  @Column('jsonb', { nullable: true, name: 'metadata', default: {} })
  metadata?: Record<string, any>;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  //relations
  @ManyToMany(() => CreditAccount, (account) => account.creditProducts)
  accounts: CreditAccount[];

  @OneToMany(() => CreditLimit, (limit) => limit.creditProduct)
  creditLimits: CreditLimit[];
}
