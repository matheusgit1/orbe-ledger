// src/core/currencies/entities/currency.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CurrencyCode } from '../common/enums/currency.enum';
import { Account } from './account.entity';
import { BalanceSnapshot } from './balance-snapshot.entity';
import { Entry } from './entry.entity';


@Entity('currencies')
@Index(['code'], { unique: true })
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CurrencyCode,
    unique: true,
  })
  code: CurrencyCode;

  @Column({ type: 'varchar', length: 3, name: 'numeric_code' })
  numericCode: string;

  @Column({ type: 'varchar', length: 5 })
  symbol: string;

  @Column({ type: 'int', default: 2, name: 'decimal_places' })
  decimalPlaces: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Account, (account) => account.currency)
  accounts: Account[];

  @OneToMany(() => BalanceSnapshot, (balanceSnapshot) => balanceSnapshot.currency)
  balanceSnapshots: BalanceSnapshot[];

  @OneToMany(() => Entry, (entry) => entry.currency)
  entries: Entry[];
}