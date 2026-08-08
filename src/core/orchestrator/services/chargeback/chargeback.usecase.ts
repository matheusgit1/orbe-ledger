import { Injectable } from '@nestjs/common';
import { HoldChargebackUsecase } from 'src/core/chargeback/usecases/hold-chargeback.usecase';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { Transaction } from 'src/infra/database/entities/transaction.entity';

@Injectable()
export class ChargebackUsecase {
  constructor(private readonly holdChargebackUsecase: HoldChargebackUsecase) {}

  async handler(data: { originalTransaction: Transaction }) {
    const { originalTransaction } = data;
    ///fazer chargback pelo tipo de transação
    const strategy: Record<TransactionType, any> = {
      [TransactionType.TRANSFER]: () => {
        // fazer chargeback de transferência
      },
      [TransactionType.PIX]: () => {
        // fazer chargeback de pix
      },
      [TransactionType.PIX_EXTERNAL]: () => {
        // fazer chargeback de pix externo
      },
      [TransactionType.TED]: () => {
        // fazer chargeback de ted
      },
      [TransactionType.DOC]: () => {
        // fazer chargeback de doc
      },
      [TransactionType.BOLETO]: () => {
        // fazer chargeback de boleto
      },
      [TransactionType.CARD]: () => {
        // fazer chargeback de cartão
      },
      [TransactionType.INVESTMENT]: () => {
        // fazer chargeback de investimento
      },
      [TransactionType.FEE]: () => {
        // fazer chargeback de taxa
      },
      [TransactionType.REFUND]: () => {
        // fazer chargeback de reembolso
      },
      [TransactionType.REVERSAL]: () => {
        // fazer chargeback de reversão
      },
      [TransactionType.ADJUSTMENT]: () => {
        // fazer chargeback de ajuste
      },
      [TransactionType.CASHBACK]: () => {
        // fazer chargeback de cashback
      },
      [TransactionType.SETTLEMENT]: () => {
        // fazer chargeback de liquidação
      },
      [TransactionType.TICKET]: () => {
        // fazer chargeback de ticket
      },
      [TransactionType.HOLD]: () => {
        // fazer chargeback de hold
      },
      [TransactionType.HOLD_RELEASE]: () => {
        // fazer chargeback de liberação de hold
      },
      [TransactionType.HOLD_CAPTURE]: () => {
        // fazer chargeback de captura de hold
      },
    };

    await strategy[originalTransaction.type]();
    return data;
  }
}
