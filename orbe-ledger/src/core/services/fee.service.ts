import { Injectable } from '@nestjs/common';
import { TaxType } from 'src/infra/database/common/enums/tax.enum';
import { Service } from 'src/infra/database/entities/service.entity';

@Injectable()
export class FeeService {
  constructor() {}

  public calculateTaxes(
    taxes: {
      type: TaxType;
      value: number;
      name: string;
      description: string;
    }[],
  ) {
    return taxes.map((tax) => {
      return {
        value: this.calculateRevenueFromTax(tax),
        name: tax.name,
        description: tax.description,
        type: tax.type,
      };
    });
  }

  private calculateRevenueFromTax(tax: {
    type: TaxType;
    value: number;
    name: string;
    description: string;
  }): number {
    switch (tax.type) {
      case TaxType.FIXED:
        return tax.value;
      case TaxType.PERCENTAGE:
        return (tax.value * 100) / 100;
      default:
        return 0;
    }
  }

  private calculateFee(service: Service, amount: number): number {
    if (!service.tax || !service.tax.isActive) {
      return 0;
    }

    switch (service.tax.type) {
      case TaxType.FIXED:
        return service.tax.amount;
      case TaxType.PERCENTAGE:
        const percentage = service.tax.percentage || 0;
        return (amount * percentage) / 100;
      default:
        return 0;
    }
  }

  calculateNetAmount(service: Service, amount: number): number {
    return this.calculateFee(service, amount);
  }
}
