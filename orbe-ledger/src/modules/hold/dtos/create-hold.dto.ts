import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateHoldDto {
  @IsString()
  @ApiProperty({
    description: 'Número da conta',
    example: '000002',
  })
  accountNumber: string;

  @IsNumber()
  @ApiProperty({
    description: 'Valor do hold',
    example: 1000,
  })
  amount: number;
}
