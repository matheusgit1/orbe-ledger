import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class PixRequestDto {
  @IsString()
  @IsUUID()
  @ApiProperty({
    description: 'ID da conta de origem',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  originAccountId: string;

  @IsString()
  @IsUUID()
  @ApiProperty({
    description: 'ID da conta de destino',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  destinationAccountId: string;

  @IsNumber()
  @ApiProperty({
    description: 'Valor da transferência',
    example: 100.00,
  })
  amount: number;

  @IsString()
  @ApiProperty({
    description: 'Chave de idempotência',
    example: 'pix-123456',
  })
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Chave PIX (opcional)',
    example: '12345678901',
  })
  pixKey?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Descrição da transferência (opcional)',
    example: 'Transferência via PIX',
  })
  description?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Metadados adicionais (opcional)',
    example: { key: 'pix-key' },
  })
  metadata?: Record<string, any>;
}
