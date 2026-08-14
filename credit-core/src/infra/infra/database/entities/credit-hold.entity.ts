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
import { CreditAuthorization } from './credit-authorization.entity';
import { CreditHoldStatus } from '../common/enums/credit-hold.enum';

@Entity('credit_holds')
@Index(['creditAccountId', 'authorizationId'])
export class CreditHold {
  @PrimaryColumn({
    type: 'uuid',
    generated: 'uuid',
  })
  id: string;

  // authorization_id
  @Column({
    type: 'uuid',
    name: 'authorization_id',
  })
  authorizationId: string;

  // credit_account_id
  @Column({
    type: 'uuid',
    name: 'credit_account_id',
  })
  creditAccountId: string;

  // amount
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'amount',
  })
  amount: number;

  // status
  @Column({
    type: 'enum',
    enum: CreditHoldStatus,
    default: CreditHoldStatus.ACTIVE,
    name: 'status',
  })
  status: CreditHoldStatus;

  // reason
  @Column({
    type: 'varchar',
    name: 'reason',
  })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // released_at
  @Column({
    type: 'timestamp',
    name: 'released_at',
    nullable: true,
  })
  releasedAt?: Date;

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

  // relations
  @ManyToOne(() => CreditAuthorization, (authorization) => authorization.id)
  @JoinColumn({ name: 'authorization_id' })
  creditAuthorization: CreditAuthorization;

  @ManyToOne(() => CreditAccount, (account) => account.id)
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: CreditAccount;
}
