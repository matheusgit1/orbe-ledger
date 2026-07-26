import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
  OneToOne,
  ForeignKey,
} from 'typeorm';
import { OrganizationStatus } from '../common/enums/organization.enum';
import { Ledger } from './ledger.entity';
import { Currency } from './currency.entity';
// import { OrganizationStatus } from '../../../common/enums/organization.enum';
// import { Ledger } from '../../ledgers/entities/ledger.entity';

export interface CreateOrganizationProps {
  name: string;
  legalName: string;
  document: string;
  status: OrganizationStatus;
  baseCurrencyId: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

@Entity('organizations')
@Index(['document'], { unique: true })
@Index(['status'])
export class Organization {
  protected constructor() {}
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, name: 'legal_name' })
  legalName: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  document: string; // CPF/CNPJ

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.PENDING_VERIFICATION,
  })
  status: OrganizationStatus;

  @Column({ type: 'varchar', length: 50, default: 'America/Sao_Paulo' })
  timezone: string;

  @Column({ type: 'uuid', name: 'base_currency_id' })
  baseCurrencyId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Ledger, (ledger) => ledger.organization)
  ledgers: Ledger[];

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'base_currency_id' })
  baseCurrency: Currency;

  static create(props: CreateOrganizationProps): Organization {
    const organization = new Organization();
    organization.name = props.name;
    organization.legalName = props.legalName;
    organization.document = props.document;
    organization.status = props.status;
    organization.baseCurrencyId = props.baseCurrencyId;
    organization.timezone = props.timezone || 'America/Sao_Paulo';
    organization.metadata = props.metadata || {};
    return organization;
  }
}
