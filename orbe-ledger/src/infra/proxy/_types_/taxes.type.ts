export enum TaxType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export interface Taxes {
  code: string;
  name: string;
  description: string;
  amount: number;
  type: TaxType;
  percentage: number;
  minAmount: number;
  maxAmount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}