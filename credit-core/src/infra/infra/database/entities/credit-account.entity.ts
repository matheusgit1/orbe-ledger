import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditAccountStatus } from '../common/enums/credit-account.enum';
import { CreditProduct } from './credit-product.entity';
import { CreditLimit } from './credit-limit.entity';

@Entity('credit_accounts')
export class CreditAccount {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  //customer_id
  @Column({
    type: 'uuid',
    name: 'customer_id',
  })
  customerId: string;

  //account_id
  @Column({
    type: 'uuid',
    name: 'account_id',
  })
  accountId: string;

  //productId
  @Column({
    type: 'uuid',
    name: 'product_id',
  })
  productId: string;

  @Column({
    type: 'enum',
    enum: CreditAccountStatus,
    default: CreditAccountStatus.ACTIVE,
    name: 'status',
  })
  status: CreditAccountStatus;

  @Column({
    type: 'timestamp',
    name: 'opened_at',
  })
  openedAt: Date;

  @Column({
    type: 'json',
    name: 'metadata',
  })
  metadata: Record<string, any>;

  @Column({
    type: 'timestamp',
    name: 'closed_at',
    nullable: true,
  })
  closedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //relations
  @ManyToOne(() => CreditProduct, (product) => product.accounts)
  @JoinColumn({ name: 'product_id' })
  creditProduct: CreditProduct;

  @OneToMany(() => CreditLimit, (limit) => limit.creditAccount)
  creditLimits: CreditLimit[];
}
