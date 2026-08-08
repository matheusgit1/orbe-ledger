// src/core/account-types/entities/account-type.entity.ts
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
} from 'typeorm';
import { AccountNature, NormalBalance } from '../common/enums/account.enum';
import { Account } from './account.entity';
import { ChartOfAccounts } from './chart-of-accounts.entity';

@Entity('account_types')
@Index(['code'], { unique: true })
@Index(['parentId'])
export class AccountType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: AccountNature,
  })
  nature: AccountNature;

  @Column({
    type: 'enum',
    enum: NormalBalance,
    name: 'normal_balance',
  })
  normalBalance: NormalBalance;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  @Column({ type: 'boolean', default: true, name: 'allow_posting' })
  allowPosting: boolean;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => AccountType, (accountType) => accountType.children)
  @JoinColumn({ name: 'parent_id' })
  parent: AccountType;

  @OneToMany(() => AccountType, (accountType) => accountType.parent)
  children: AccountType[];

  @OneToMany(() => Account, (account) => account.accountType)
  accounts: Account[];

  @OneToMany(() => ChartOfAccounts, (chart) => chart.accountType)
  chartOfAccounts: ChartOfAccounts[];

  isRoot(): boolean {
    return !this.parentId;
  }

  hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }

  getFullCode(): string {
    if (this.isRoot()) {
      return this.code;
    }
    return `${this.parent?.getFullCode()}.${this.code}`;
  }

  getNature(): AccountNature {
    return this.nature;
  }

  isAsset(): boolean {
    return this.nature === AccountNature.ASSET;
  }

  isLiability(): boolean {
    return this.nature === AccountNature.LIABILITY;
  }

  isEquity(): boolean {
    return this.nature === AccountNature.EQUITY;
  }

  isRevenue(): boolean {
    return this.nature === AccountNature.REVENUE;
  }

  isExpense(): boolean {
    return this.nature === AccountNature.EXPENSE;
  }

  // Validação
  validate(): void {
    if (!this.code) {
      throw new Error('AccountType must have a code');
    }

    if (!this.name) {
      throw new Error('AccountType must have a name');
    }

    if (!this.nature) {
      throw new Error('AccountType must have a nature');
    }

    if (!this.normalBalance) {
      throw new Error('AccountType must have a normalBalance');
    }

    // Valida nível baseado no parent
    if (this.parentId && this.level <= 0) {
      throw new Error('Child AccountType must have level > 0');
    }

    if (!this.parentId && this.level !== 0) {
      throw new Error('Root AccountType must have level 0');
    }
  }

  // Método para criar estrutura hierárquica
  static create(
    code: string,
    name: string,
    nature: AccountNature,
    normalBalance: NormalBalance,
    parentId?: string,
    level?: number,
  ): AccountType {
    const accountType = new AccountType();
    accountType.code = code;
    accountType.name = name;
    accountType.nature = nature;
    accountType.normalBalance = normalBalance;
    accountType.parentId = parentId || null;
    accountType.level = level || 0;
    accountType.allowPosting = true;
    return accountType;
  }
}
