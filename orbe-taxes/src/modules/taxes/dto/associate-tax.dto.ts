import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssociateTaxDto {
  @IsString()
  @IsUUID()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Service ID' })
  serviceId: string;

  @IsString()
  @IsUUID()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Tax ID' })
  taxId: string;
}
