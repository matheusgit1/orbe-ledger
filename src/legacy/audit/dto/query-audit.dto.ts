import { IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, IsPositive } from 'class-validator';
import { AuditAction, AuditEntity } from '../../../infra/database/common/enums/audit.enum';

export class QueryAuditDto {
  @IsEnum(AuditEntity)
  @IsOptional()
  aggregate?: AuditEntity;

  @IsUUID()
  @IsOptional()
  aggregateId?: string;

  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  offset?: number;

  @IsUUID()
  @IsOptional()
  traceId?: string;

  @IsUUID()
  @IsOptional()
  requestId?: string;
}