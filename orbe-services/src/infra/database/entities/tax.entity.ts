import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
  VersionColumn,
} from 'typeorm';
import { Service } from './service.entity';
import { TaxType } from '../common/enums/tax.enum';

export interface CreateTaxOptions {
  code: string;
  name: string;
  description?: string;
  amount?: number;
  type?: TaxType;
  percentage?: number;
  minAmount?: number;
  maxAmount?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

@Entity('taxes')
@Index(['code'], { unique: true })
@Index(['isActive'])
export class Tax {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TaxType,
    default: TaxType.FIXED,
  })
  type: TaxType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  minAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  maxAmount: number | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToMany(() => Service, (service) => service.taxes)
  services: Service[];

  // Domain methods
  static create(data: CreateTaxOptions): Tax {
    const tax = new Tax();
    tax.code = data.code;
    tax.name = data.name;
    tax.description = data.description || null;
    tax.amount = data.amount ?? 0;
    tax.type = data.type ?? TaxType.FIXED;
    tax.percentage = data.percentage || null;
    tax.minAmount = data.minAmount ?? 0;
    tax.maxAmount = data.maxAmount || null;
    tax.isActive = data.isActive ?? true;
    tax.metadata = data.metadata || {};
    return tax;
  }

  validate(): void {
    if (!this.code) {
      throw new Error('Tax must have a code');
    }
    if (!this.name) {
      throw new Error('Tax must have a name');
    }
    if (this.type === 'PERCENTAGE' && this.percentage === null) {
      throw new Error('Percentage tax must have a percentage value');
    }
    if (
      this.type === 'PERCENTAGE' &&
      (this.percentage! < 0 || this.percentage! > 100)
    ) {
      throw new Error('Percentage must be between 0 and 100');
    }
  }
}
