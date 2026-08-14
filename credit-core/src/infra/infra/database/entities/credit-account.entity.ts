import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditAccountStatus } from '../common/enums/credit-account.enum';
import { CreditProduct } from './credit-product.entity';
import { CreditLimit } from './credit-limit.entity';

@Entity('credit_accounts')
@Index(['accountId'])
export class CreditAccount {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  //customer_id
  // @Column({
  //   type: 'uuid',
  //   name: 'customer_id',
  // })
  // customerId: string;

  //account_id
  @Column({
    type: 'uuid',
    name: 'account_id',
  })
  accountId: string;

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
  @ManyToMany(() => CreditProduct, (product) => product.accounts)
  @JoinTable({
    name: 'account_products',
    joinColumn: { name: 'credit_account_id' },
    inverseJoinColumn: { name: 'credit_product_id' },
  })
  creditProducts: CreditProduct[];

  @OneToMany(() => CreditLimit, (limit) => limit.creditAccount)
  creditLimits: CreditLimit[];
}
