import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';
import { TransactionType } from '../../../infra/database/common/enums/transaction.enum';


export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsUUID()
  currencyId: string;

  @IsUUID()
  originAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
