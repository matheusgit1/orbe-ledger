import { IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CaptureHoldDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;
}