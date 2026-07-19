import { IsString, IsOptional } from 'class-validator';

export class ReleaseHoldDto {
  @IsString()
  @IsOptional()
  reason?: string;
}