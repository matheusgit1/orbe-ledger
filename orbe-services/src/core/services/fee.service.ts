import { Injectable } from '@nestjs/common';
import { TaxType } from 'src/infra/database/common/enums/tax.enum';
import { Service } from 'src/infra/database/entities/service.entity';

@Injectable()
export class FeeService {
  constructor() {}

  private calculateFee(service: Service, amount: number): number {
    if (!service.taxes || !service.taxes[0].isActive) {
      return 0;
    }

    switch (service.taxes[0].type) {
      case TaxType.FIXED:
        return service.taxes[0].amount;
      case TaxType.PERCENTAGE:
        const percentage = service.taxes[0].percentage || 0;
        return (amount * percentage) / 100;
      default:
        return 0;
    }
  }

  calculateNetAmount(service: Service, amount: number): number {
    return this.calculateFee(service, amount);
  }
}
