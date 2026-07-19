export enum AccountOwnerType {
  CUSTOMER = 'CUSTOMER',
  COMPANY = 'COMPANY',
  SYSTEM = 'SYSTEM',
  MERCHANT = 'MERCHANT',
  BANK = 'BANK',
  ESCROW = 'ESCROW',
  TREASURY = 'TREASURY'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED'
}

export enum AccountNature {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}