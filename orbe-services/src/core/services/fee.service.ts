import { Injectable } from '@nestjs/common';
import { TaxType } from 'src/infra/database/common/enums/tax.enum';
import { Service } from 'src/infra/database/entities/service.entity';

@Injectable()
export class FeeService {
  constructor() {}

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
