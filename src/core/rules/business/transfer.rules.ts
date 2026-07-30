import { Injectable, Logger } from '@nestjs/common';
import { JournalService } from 'src/core/services/journal.service';
import { Account } from 'src/infra/database/entities/account.entity';

@Injectable()
export class TransferRules {
  private readonly logger = new Logger(TransferRules.name);
  constructor(private readonly journalService: JournalService) {}

  private async validatePayerAccount(payerAccount: Account) {
    if (!payerAccount.isActive()) {
      throw new Error(`Conta do pagador não está ativa: ${payerAccount.id}`);
    }

    if (!payerAccount.canDebit()) {
      throw new Error(
        `Conta do pagador não permite débito: ${payerAccount.id}`,
      );
    }

    if (payerAccount.isBlocked()) {
      throw new Error(`Conta do pagador está bloqueada: ${payerAccount.id}`);
    }
  }

  //metodo ok
  private async validateReceiverAccount(receiverAccount: Account) {
    if (!receiverAccount.isActive()) {
      throw new Error(
        `Conta do recebedor não está ativa: ${receiverAccount.id}`,
      );
    }

    if (!receiverAccount.canCredit()) {
      throw new Error(
        `Conta do recebedor não permite crédito: ${receiverAccount.id}`,
      );
    }

    if (receiverAccount.isBlocked()) {
      throw new Error(
        `Conta do recebedor está bloqueada: ${receiverAccount.id}`,
      );
    }
  }

  //metodo ok
  private async validateTransfer(dto: {
    payerAccount: Account;
    receiverAccount: Account;
    amount: number;
  }) {
    const { payerAccount, receiverAccount, amount } = dto;

    if (payerAccount.id === receiverAccount.id) {
      throw new Error('Não é possível transferir para a mesma conta');
    }

    // Valor positivo
    if (amount <= 0) {
      throw new Error('O valor da transferência deve ser maior que zero');
    }

    // Mesma moeda (para PIX dentro da mesma instituição)
    if (payerAccount.currencyId !== receiverAccount.currencyId) {
      throw new Error(
        `Moedas diferentes: Pagador (${payerAccount.currencyId}) x Recebedor (${receiverAccount.currencyId})`,
      );
    }

    // Valor mínimo (exemplo: R$ 0,01)
    if (amount < 0.01) {
      throw new Error('Valor mínimo para PIX é R$ 0,01');
    }

    // Valor máximo (exemplo: R$ 10.000.000,00)
    if (amount > 10000000) {
      throw new Error('Valor máximo para PIX é R$ 10.000.000,00');
    }
  }

  private async validateLimits(
    payerAccount: Account,
    amount: number,
  ): Promise<void> {
    const limits = payerAccount.limits;

    if (!limits) {
      return;
    }

    // Verificar limite diário
    if (limits.dailyDebit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyTotal = await this.journalService.getAccountTotals(
        payerAccount.id,
        today,
        new Date(),
      );

      if (dailyTotal.totalDebit + amount > limits.dailyDebit) {
        throw new Error(
          `Limite diário excedido. Disponível: ${limits.dailyDebit - dailyTotal.totalDebit}, Necessário: ${amount}`,
        );
      }
    }

    if (limits.monthlyDebit) {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const monthlyTotal = await this.journalService.getAccountTotals(
        payerAccount.id,
        firstDayOfMonth,
        new Date(),
      );

      if (monthlyTotal.totalDebit + amount > limits.monthlyDebit) {
        throw new Error(
          `Limite mensal excedido. Disponível: ${limits.monthlyDebit - monthlyTotal.totalDebit}, Necessário: ${amount}`,
        );
      }
    }

    // Verificar valor máximo por transação
    if (limits.maxTransaction && amount > limits.maxTransaction) {
      throw new Error(
        `Valor da transação excede o limite. Máximo: ${limits.maxTransaction}, Solicitado: ${amount}`,
      );
    }
  }

  async validate(dto: {
    payerAccount: Account;
    receiverAccount: Account;
    amount: number;
  }) {
    if (!dto.receiverAccount) {
      throw new Error(`Conta destino não encontrada`);
    }
    if (!dto.payerAccount) {
      throw new Error(`Conta origem não encontrada`);
    }

    await Promise.all([
      this.validatePayerAccount(dto.payerAccount),
      this.validateReceiverAccount(dto.receiverAccount),
      this.validateTransfer({
        payerAccount: dto.payerAccount,
        receiverAccount: dto.receiverAccount,
        amount: dto.amount,
      }),
    ]);

    const availableBalance = dto.payerAccount.balanceSnapshots.available;

    if (availableBalance < dto.amount) {
      throw new Error(
        `Saldo insuficiente. Disponível: ${availableBalance}, Necessário: ${dto.amount}`,
      );
    }

    await this.validateLimits(dto.payerAccount, dto.amount);

    return {
      payerAccount: dto.payerAccount,
      receiverAccount: dto.receiverAccount,
    };
  }
}
