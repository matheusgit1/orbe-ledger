import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { TaxType } from 'src/infra/database/common/enums/tax.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxDto {
  @IsString()
  @ApiProperty({ example: 'TAX_001' })
  code: string;

  @IsString()
  @ApiProperty({ example: 'Service Tax' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Tax description', required: false })
  description?: string;

  @IsNumber()
  @ApiProperty({ example: 10.5 })
  amount: number;

  @IsEnum(TaxType)
  @ApiProperty({ example: TaxType.FIXED })
  type: TaxType;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 15, required: false })
  percentage?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 0, required: false })
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 1000, required: false })
  maxAmount?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  @ApiProperty({ example: { category: 'service' }, required: false })
  metadata?: Record<string, any>;
}
