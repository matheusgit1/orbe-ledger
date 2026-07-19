import { 
  IsUUID, 
  IsEnum, 
  IsString, 
  IsOptional, 
  IsArray, 
  ValidateNested,
  IsNumber,
  IsPositive,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { JournalType } from '../../../infra/database/common/enums/journal.enum';
import { CreateEntryDto } from '../../entry/dto/create-entry.dto';

export class CreateJournalDto {
  @IsUUID()
  ledgerId: string;

  @IsEnum(JournalType)
  type: JournalType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  externalReference?: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsUUID()
  @IsOptional()
  causationId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  source: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEntryDto)
  entries: CreateEntryDto[];

  @IsOptional()
  metadata?: Record<string, any>;
}