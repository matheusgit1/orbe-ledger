import { TransactionStatus, TransactionType } from "../../../infra/database/common/enums/transaction.enum";

export class TransactionResponseDto {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currencyId: string;
  originAccountId: string;
  destinationAccountId: string;
  correlationId?: string;
  externalId?: string;
  metadata?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// src/core/transactions/dto/transaction-stats.dto.ts
export class TransactionStatsDto {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  totalAmount: number;
}