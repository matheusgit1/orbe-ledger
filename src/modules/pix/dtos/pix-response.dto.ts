import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PixResponseDto {
  constructor(init?: Partial<PixResponseDto>) {
    Object.assign(this, init);
  }
  @IsString()
  @ApiProperty({
    description: 'Status da transação',
    enum: ['completed', 'already_processed', 'failed'],
    example: 'completed',
    required: true,
  })
  status: 'completed' | 'already_processed' | 'failed';
  @IsString()
  @ApiProperty({
    description: 'ID da transação',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  transactionId?: string;
  @IsString()
  @ApiProperty({
    description: 'ID do diário de débito',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  debitJournalId?: string;
  @IsString()
  @ApiProperty({
    description: 'ID do diário de crédito',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  creditJournalId?: string;
  @IsString()
  @ApiProperty({
    description: 'ID da saga',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  sagaId?: string;

  @ApiProperty({
    description: 'Valor da transação',
    example: 100.0,
  })
  amount?: number;

  @ApiProperty({
    description: 'Conta do pagador',
    example: '1234567890',
  })
  payerAccount?: string;

  @ApiProperty({
    description: 'Conta do recebedor',
    example: '0987654321',
  })
  receiverAccount?: string;

  @ApiProperty({
    description: 'Tipo de instituição',
    enum: ['SAME_INSTITUTION', 'CROSS_INSTITUTION'],
    example: 'SAME_INSTITUTION',
    required: false,
  })
  institutionType?: 'SAME_INSTITUTION' | 'CROSS_INSTITUTION';

  @ApiProperty({
    description: 'Data de conclusão',
    example: '2025-10-21T12:00:00.000Z',
    required: false,
  })
  completedAt?: Date | null;

  @ApiProperty({
    description: 'Idempotência',
    example: true,
    required: false,
  })
  idempotency?: boolean;

  @ApiProperty({
    description: 'Erro',
    example: 'Erro na transação',
    required: false,
  })
  error?: string;
}
