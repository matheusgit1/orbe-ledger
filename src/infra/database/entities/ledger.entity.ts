// src/core/ledgers/entities/ledger.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Account } from './account.entity';
import { Journal } from './journal.entity';
import { ChartOfAccounts } from './chart-of-accounts.entity';
import { LedgerCode, LedgerStatus } from '../common/enums/ledger.enum';


@Entity('ledgers')
@Index(['organizationId', 'code'], { unique: true })
@Index(['status'])
export class Ledger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: LedgerCode,
  })
  code: LedgerCode;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: LedgerStatus,
    default: LedgerStatus.ACTIVE,
  })
  status: LedgerStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Organization, (organization) => organization.ledgers)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Account, (account) => account.ledger)
  accounts: Account[];

  @OneToMany(() => Journal, (journal) => journal.ledger)
  journals: Journal[];

  @OneToMany(() => ChartOfAccounts, (chart) => chart.ledger)
  chartOfAccounts: ChartOfAccounts[];

  // Métodos de domínio
  isActive(): boolean {
    return this.status === LedgerStatus.ACTIVE;
  }

  isInactive(): boolean {
    return this.status === LedgerStatus.INACTIVE;
  }

  isUnderMaintenance(): boolean {
    return this.status === LedgerStatus.MAINTENANCE;
  }

  // Validação
  validate(): void {
    if (!this.organizationId) {
      throw new Error('Ledger must have an organizationId');
    }

    if (!this.code) {
      throw new Error('Ledger must have a code');
    }

    if (!this.name) {
      throw new Error('Ledger must have a name');
    }
  }
}