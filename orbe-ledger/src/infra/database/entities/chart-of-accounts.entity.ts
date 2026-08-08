
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
import { Ledger } from './ledger.entity';
import { AccountType } from './account-type.entity';

@Entity('chart_of_accounts')
@Index(['ledgerId', 'code'], { unique: true })
@Index(['ledgerId', 'name'])
@Index(['parentId'])
export class ChartOfAccounts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'uuid', name: 'account_type_id' })
  accountTypeId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({ type: 'boolean', default: true, name: 'allow_posting' })
  allowPosting: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Ledger, (ledger) => ledger.chartOfAccounts)
  @JoinColumn({ name: 'ledger_id' })
  ledger: Ledger;

  @ManyToOne(() => AccountType, (accountType) => accountType.chartOfAccounts)
  @JoinColumn({ name: 'account_type_id' })
  accountType: AccountType;

  @ManyToOne(() => ChartOfAccounts, (chart) => chart.children)
  @JoinColumn({ name: 'parent_id' })
  parent: ChartOfAccounts;

  @OneToMany(() => ChartOfAccounts, (chart) => chart.parent)
  children: ChartOfAccounts[];

  // Métodos de domínio
  isRoot(): boolean {
    return !this.parentId;
  }

  hasChildren(): boolean {
    return this.children && this.children.length > 0;
  }

  getFullPath(): string {
    if (this.isRoot()) {
      return this.code;
    }
    return `${this.parent?.getFullPath()}.${this.code}`;
  }

  // Validação
  validate(): void {
    if (!this.ledgerId) {
      throw new Error('ChartOfAccounts must have a ledgerId');
    }

    if (!this.accountTypeId) {
      throw new Error('ChartOfAccounts must have an accountTypeId');
    }

    if (!this.code) {
      throw new Error('ChartOfAccounts must have a code');
    }

    if (!this.name) {
      throw new Error('ChartOfAccounts must have a name');
    }

    // Valida nível baseado no parent
    if (this.parentId && this.level <= 0) {
      throw new Error('Child ChartOfAccounts must have level > 0');
    }

    if (!this.parentId && this.level !== 0) {
      throw new Error('Root ChartOfAccounts must have level 0');
    }
  }

  // Método para criar estrutura hierárquica
  static createHierarchy(
    ledgerId: string,
    accountTypeId: string,
    code: string,
    name: string,
    parentId?: string,
    level?: number
  ): ChartOfAccounts {
    const chart = new ChartOfAccounts();
    chart.ledgerId = ledgerId;
    chart.accountTypeId = accountTypeId;
    chart.code = code;
    chart.name = name;
    chart.parentId = parentId || null;
    chart.level = level || 0;
    chart.isActive = true;
    chart.allowPosting = true;
    return chart;
  }
}