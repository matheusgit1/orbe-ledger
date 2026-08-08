import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { CreateTaxOptions, Tax } from './tax.entity';
import { ServicesAvailable } from '../common/enums/services.enum';

export interface CreateServiceOptions {
  code: string;
  name: string;
  description?: string;
  type: ServicesAvailable;
  taxId?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

@Entity('services')
@Index(['code'], { unique: true })
@Index(['isActive'])
@Index(['taxId'])
export class Service {
  protected constructor() {}

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ServicesAvailable,
    default: ServicesAvailable.DEFAULT,
  })
  type: ServicesAvailable;

  @Column({ type: 'uuid', name: 'tax_id', nullable: true })
  taxId: string | null;

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
  @ManyToOne(() => Tax, (tax) => tax.services, { nullable: true })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax | null;

  // Domain methods
  static create(options: CreateServiceOptions): Service {
    const service = new Service();
    service.code = options.code;
    service.name = options.name;
    service.description = options.description;
    service.type = options.type;
    service.taxId = options.taxId || null;
    service.isActive = options.isActive ?? true;
    service.metadata = options.metadata || {};
    return service;
  }

  validate(): void {
    if (!this.code) {
      throw new Error('Service must have a code');
    }
    if (!this.name) {
      throw new Error('Service must have a name');
    }
    if (!this.type) {
      throw new Error('Service must have a type');
    }
  }
}
