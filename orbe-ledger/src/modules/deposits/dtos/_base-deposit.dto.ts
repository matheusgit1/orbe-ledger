import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DepositSource } from 'src/infra/database/common/enums/deposit.enum';

export class BaseDepositRequest {
  @IsNumber()
  @ApiProperty({
    description: 'Amount to deposit',
    example: 100.0,
  })
  amount: number;

  @IsString()
  @ApiProperty({
    description: 'Currency code',
    example: 'BRL',
  })
  currency: string;

  @IsEnum(DepositSource)
  @ApiProperty({
    description: 'Deposit source',
    example: DepositSource.INTERNAL_TRANSFER,
    enum: DepositSource,
  })
  source: DepositSource;

  @IsString()
  @ApiProperty({
    description: 'Idempotency key',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  idempotencyKey: string;

  @IsString()
  @ApiProperty({
    description: 'Service code',
    example: 'SRV-BOLETO-PAYMENT',
  })
  serviceCode: string;
}
