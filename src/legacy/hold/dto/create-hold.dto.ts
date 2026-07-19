import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsObject,
} from 'class-validator';
import { HoldReason } from '../../../infra/database/common/enums/hold.enum';

export class CreateHoldDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(HoldReason)
  reason: HoldReason;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  expiresInSeconds?: number = 300;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  exchangeRate?: number = 1;

  @IsUUID()
  @IsOptional()
  transactionId?: string;

  @IsUUID()
  @IsOptional()
  journalId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}