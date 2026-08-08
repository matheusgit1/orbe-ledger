import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class ReleaseHoldDto {
  @IsString()
  @IsUUID()
  @ApiProperty({
    description: 'ID do hold',
    example: '6a9e835e-4bea-406a-bc7d-b5f1580e3ffb',
  })
  holdId: string;

  @IsString()
  @ApiProperty({
    description: 'Chave de idempotência',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  idempotencyKey: string;
}
