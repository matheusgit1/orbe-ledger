// src/core/transactions/services/fee-calculator.service.ts
import { Injectable } from '@nestjs/common';
import { InstitutionIdentifierService } from './institution-identifier.service';
// import { InstitutionIdentifierService } from '../../accounts/services/institution-identifier.service';

@Injectable()
export class FeeCalculatorService {
  constructor(
    private institutionIdentifier: InstitutionIdentifierService,
  ) { }

  async calculateFee(
    originId: string,
    destinationId: string,
    amount: number,
  ): Promise<{
    feeAmount: number;
    feeType: string;
    feeDescription: string;
  }> {
    const transferType = await this.institutionIdentifier.getTransferType(
      originId,
      destinationId,
    );

    switch (transferType.type) {
      case 'INTERNAL':
        return {
          feeAmount: 0,
          feeType: 'INTERNAL',
          feeDescription: 'Transferência interna - sem taxa',
        };

      case 'SAME_BANK':
        return {
          feeAmount: amount * 0.001, // 0.1%
          feeType: 'SAME_BANK',
          feeDescription: 'Transferência mesmo banco - taxa reduzida',
        };

      case 'DIFFERENT_BANK':
        if (amount <= 1000) {
          return {
            feeAmount: 2.50, // TED valor fixo
            feeType: 'TED',
            feeDescription: 'Transferência TED - até R$ 1.000',
          };
        } else if (amount <= 5000) {
          return {
            feeAmount: 5.00,
            feeType: 'TED',
            feeDescription: 'Transferência TED - até R$ 5.000',
          };
        } else {
          return {
            feeAmount: 10.00,
            feeType: 'TED',
            feeDescription: 'Transferência TED - acima de R$ 5.000',
          };
        }
    }
  }

  async shouldApplyPix(
    originId: string,
    destinationId: string,
  ): Promise<boolean> {
    const transferType = await this.institutionIdentifier.getTransferType(
      originId,
      destinationId,
    );

    // PIX pode ser usado para qualquer transferência, mas é instantâneo
    // e geralmente mais barato que TED
    return true;
  }
}