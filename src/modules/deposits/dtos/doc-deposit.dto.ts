import { IsString } from 'class-validator';
import { BaseDepositRequest } from './_base-deposit.dto';
import { ApiProperty } from '@nestjs/swagger';

export class DocDepositDto extends BaseDepositRequest {
  @IsString()
  @ApiProperty({
    description: 'Bank code',
    example: '001',
  })
  bankCode: string;

  @IsString()
  @ApiProperty({
    description: 'Agency',
    example: '1234',
  })
  agency: string;

  @IsString()
  @ApiProperty({
    description: 'Account',
    example: '987654',
  })
  account: string;

  @IsString()
  @ApiProperty({
    description: 'ISP code',
    example: '00000000',
  })
  ispb: string;

  @IsString()
  @ApiProperty({
    description: 'Protocol',
    example: 'TED-987654',
  })
  protocol: string;
}
