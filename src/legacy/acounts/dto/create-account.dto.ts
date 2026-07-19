import { IsString, IsNotEmpty, IsUUID, IsEnum, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { AccountOwnerType, AccountStatus } from 'src/infra/database/common/enums/account.enum';
// import { AccountOwnerType, AccountStatus } from '../../../common/enums/account.enum';

export class CreateAccountDto {
  @IsUUID()
  @IsNotEmpty()
  ledgerId: string;

  @IsUUID()
  @IsNotEmpty()
  accountTypeId: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId: string;

  @IsEnum(AccountOwnerType)
  @IsNotEmpty()
  ownerType: AccountOwnerType;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @IsBoolean()
  @IsOptional()
  allowDebit?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCredit?: boolean;

  @IsBoolean()
  @IsOptional()
  allowNegative?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsUUID()
  @IsOptional()
  parentAccountId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}