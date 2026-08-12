import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxDto } from './create-tax.dto';
import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaxDto extends PartialType(CreateTaxDto) {
  // @IsString()
  // @IsUUID()
  // @ApiProperty()
  // id: string;
}
