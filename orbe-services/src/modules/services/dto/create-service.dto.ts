import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ServicesAvailable } from 'src/infra/database/common/enums/services.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceDto {
  @IsString()
  @ApiProperty({
    example: 'SERVICE_001',
  })
  code: string;

  @IsString()
  @ApiProperty({
    example: 'Service Name',
  })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Service Description',
    required: false,
  })
  description?: string;

  @IsEnum(ServicesAvailable)
  @ApiProperty({
    example: ServicesAvailable.INTERNAL_TRANSFER,
  })
  type: ServicesAvailable;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      causation: 'regulation',
    },
    required: false,
  })
  metadata?: Record<string, any>;
}
