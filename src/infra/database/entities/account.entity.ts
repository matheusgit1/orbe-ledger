import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { AccountOwnerType, AccountStatus } from '../common/enums/account.enum';
import { Ledger } from './ledger.entity';
import { AccountType } from './account-type.entity';
import { Currency } from './currency.entity';
import { Entry } from './entry.entity';
import { BalanceSnapshot } from './balance-snapshot.entity';
import { Hold } from './hold.entity';
import { Limit } from './limit.entity';

@Entity('accounts')
@Index(['ledgerId', 'code'], { unique: true })
@Index(['ownerId', 'ownerType'])
@Index(['status'])
@Index(['parentAccountId'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'uuid', name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'uuid', name: 'account_type_id' })
  accountTypeId: string;

  @Column({ type: 'uuid', nullable: true, name: 'parent_account_id' })
  parentAccountId: string | null;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @Column({
    type: 'enum',
    enum: AccountOwnerType,
    name: 'owner_type',
  })
  ownerType: AccountOwnerType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', name: 'currency_id' })
  currencyId: string;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @Column({ type: 'boolean', default: true, name: 'allow_debit' })
  allowDebit: boolean;

  @Column({ type: 'boolean', default: true, name: 'allow_credit' })
  allowCredit: boolean;

  @Column({ type: 'boolean', default: false, name: 'allow_negative' })
  allowNegative: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_control_account' })
  isControlAccount: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_leaf' })
  isLeaf: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Ledger, (ledger) => ledger.accounts)
  @JoinColumn({ name: 'ledger_id' })
  ledger: Ledger;

  @ManyToOne(() => AccountType, (accountType) => accountType.accounts)
  @JoinColumn({ name: 'account_type_id' })
  accountType: AccountType;

  @ManyToOne(() => Currency, (currency) => currency.accounts)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @ManyToOne(() => Account, (account) => account.children)
  @JoinColumn({ name: 'parent_account_id' })
  parentAccount: Account;

  @OneToMany(() => Account, (account) => account.parentAccount)
  children: Account[];

  @OneToMany(() => Entry, (entry) => entry.account)
  entries: Entry[];

  @OneToMany(() => BalanceSnapshot, (balance) => balance.account)
  balanceSnapshots: BalanceSnapshot[];

  @OneToMany(() => Hold, (hold) => hold.account)
  holds: Hold[];

  @OneToMany(() => Limit, (limit) => limit.account)
  limits: Limit[];

  // Métodos de domínio
  isActive(): boolean {
    return this.status === AccountStatus.ACTIVE;
  }

  isBlocked(): boolean {
    return this.status === AccountStatus.BLOCKED;
  }

  canDebit(): boolean {
    return this.isActive() && this.allowDebit;
  }

  canCredit(): boolean {
    return this.isActive() && this.allowCredit;
  }

  canHaveNegativeBalance(): boolean {
    return this.allowNegative;
  }

  // Validação
  validate(): void {
    if (!this.ledgerId) {
      throw new Error('Account must have a ledgerId');
    }

    if (!this.accountTypeId) {
      throw new Error('Account must have an accountTypeId');
    }

    if (!this.ownerId) {
      throw new Error('Account must have an ownerId');
    }

    if (!this.currencyId) {
      throw new Error('Account must have a currencyId');
    }

    if (!this.code) {
      throw new Error('Account must have a code');
    }

    if (!this.name) {
      throw new Error('Account must have a name');
    }
  }
}
