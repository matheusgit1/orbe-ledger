import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { OrganizationStatus } from 'src/infra/database/common/enums/organization.enum';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  legalName: string;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  baseCurrency?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}