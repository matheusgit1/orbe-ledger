import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CaptureHoldDto {
  @IsString()
  @IsUUID()
  @ApiProperty({
    description: 'ID do hold',
    example: 'b5bfd0c5-3ea6-4967-9317-5f2cf92c6dc1',
  })
  holdId: string;

  @IsString()
  @ApiProperty({
    description: 'Chave de idempotência',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  idempotencyKey: string;
}
