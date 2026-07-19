import { 
  IsUUID, 
  IsEnum, 
  IsNumber, 
  IsPositive, 
  IsString, 
  IsOptional,
  IsDecimal,
  IsDateString
} from 'class-validator';
import { EntrySide } from '../../../infra/database/common/enums/journal.enum';

export class CreateEntryDto {
  @IsUUID()
  accountId: string;

  @IsEnum(EntrySide)
  side: EntrySide;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsUUID()
  currencyId: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  exchangeRate?: number = 1;

  @IsNumber()
  @IsOptional()
  amountOriginalCurrency?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}



export class GetBalanceDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  @IsOptional()
  asOfDate?: string;
}