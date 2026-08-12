import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditAccount } from './credit-account.entity';
import { CreditAuthorizationType } from '../common/enums/credit-authorization.enum';

@Entity('credit_authorizations')
@Index(['credit_account_id_idx'], { unique: true })
export class CreditAuthorization {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  // credit_account_id
  @Column('uuid', {
    name: 'credit_account_id',
    nullable: false,
  })
  creditAccountId: string;

  // amount
  @Column('numeric', {
    name: 'amount',
    nullable: false,
  })
  amount: number;

  @Column('enum', {
    name: 'type',
    nullable: false,
    enum: CreditAuthorizationType,
    default: CreditAuthorizationType.PURCHASE,
  })
  type: CreditAuthorizationType;

  @Column('varchar', {
    name: 'reference_type',
    nullable: false,
  })
  referenceType: string;

  @Column('varchar', {
    name: 'reference_id',
    nullable: false,
  })
  referenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  //relations
  @OneToOne(() => CreditAccount, (creditAccount) => creditAccount.id)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;
}
