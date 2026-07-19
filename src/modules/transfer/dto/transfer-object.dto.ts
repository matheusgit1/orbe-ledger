import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { TransactionType } from "src/infra/database/common/enums/transaction.enum";

export class MovementsObjectDto {
  @IsString()
  @ApiProperty({
    name: 'idempotencyKey',
    type: 'string',
    example: 'f912d534-9edd-4fff-acc2-bf2998070084'
  })
  idempotencyKey: string;

  @IsEnum(TransactionType)
  @ApiProperty({
    example: TransactionType.TRANSFER
  })
  type: TransactionType;

  @IsString()
  @ApiProperty({
    example: 'uuid'
  })
  originAccountId: string;

  @IsString()
  @ApiProperty({
    example: 'uuid'
  })
  destinationAccountId: string;

  @IsNumber()
  @ApiProperty({
    example: 100.00
  })
  amount: number;

  @IsString()
  @ApiProperty({
    example: 'BRL'
  })
  currency: string;

  @IsString()
  @ApiProperty({
    example: 'Pagamento pedido #100'
  })
  description: string;

  @ApiProperty({
    example: {
      pixKey: '11999999999'
    }
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
