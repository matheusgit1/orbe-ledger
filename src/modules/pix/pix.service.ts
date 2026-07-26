import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { PixRequestDto } from './dtos/pix-request.dto';
import { AccountsRepository } from 'src/infra/database/repositories/accounts.repository';
import { BalanceService } from 'src/core/services/balance.service';
import { Account } from 'src/infra/database/entities/account.entity';
import { QueryRunner } from 'typeorm/browser';
import { JournalService } from 'src/core/services/journal.service';
import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
import { LedgerService } from 'src/core/services/ledger.service';
import { LedgerCode } from 'src/infra/database/common/enums/ledger.enum';
import {
  EntrySide,
  JournalStatus,
  JournalType,
} from 'src/infra/database/common/enums/journal.enum';
import { AuditService } from 'src/core/services/audit.service';
import {
  AuditAction,
  AuditEntity,
} from 'src/infra/database/common/enums/audit.enum';
import { TransactionService } from 'src/core/services/transaction.service';
import { EntityType } from 'src/infra/database/common/enums/idempotency.status';
import { LimiteService } from 'src/core/services/limite.service';
import { EntryService } from 'src/core/services/entry.service';

@Injectable()
export class PixService {
  private readonly logger = new Logger(PixService.name);
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly idempotencyService: IdempotencyService,
    private readonly accountRepository: AccountsRepository,
    private readonly balanceService: BalanceService,
    private readonly journalService: JournalService,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
    private readonly transactionService: TransactionService,
    private readonly dataSource: DataSource,
    private readonly limiteService: LimiteService,
    private readonly entryService: EntryService,
  ) {}

  private async getQueryRunner() {
    const { hash } = this.request;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return { hash, queryRunner };
  }

  async transfer(body: PixRequestDto) {
    /**exemplo
     * {
        "originAccountId": "6b4fff22-0642-42a0-9444-25d1836caa41",
        "destinationAccountId": "256c3003-9aba-4f75-9b10-8ebb4eaea424",
        "amount": 100,
        "idempotencyKey": "5408f7b8-a21e-471f-ad48-dc6d88647b15",
        "pixKey": "12345678901",
        "description": "Transferência via PIX",
        "metadata": {
          "key": "pix-key"
        }
      }
     */
    const { hash, queryRunner } = await this.getQueryRunner();

    try {
      const idempotency = await this.idempotencyService.findByKey(
        body.idempotencyKey,
      );

      if (idempotency) {
        this.logger.log(
          `[${hash}] idepotency already processed: ${body.idempotencyKey}`,
        );

        const transaction =
          await this.transactionService.findTransactionByFilter({
            correlationId: body.idempotencyKey,
          });

        if (!transaction) {
          throw new Error('Transaction not found');
        }

        return {
          status: transaction.status,
          transactionId: transaction.id,
          debitEntryId: transaction.journals
            .map((j) => j.getDebitEntry().map((e) => e.id))
            .join(','),
          creditEntryId: transaction.journals
            .map((j) => j.getCreditEntry().map((e) => e.id))
            .join(','),
          amount: transaction.amount,
          payerAccount: transaction.originAccount.id,
          receiverAccount: transaction.destinationAccount.id,
          institutionType: 'SAME_INSTITUTION',
          completedAt: transaction.completedAt,
          idempotency: true,
        };
      }

      const [payerAccount, receiverAccount] = await Promise.all([
        this.accountRepository.findById(queryRunner, body.originAccountId),
        this.accountRepository.findById(queryRunner, body.destinationAccountId),
      ]);

      if (!receiverAccount) {
        throw new Error(
          `Conta destino ${body.destinationAccountId} não encontrada`,
        );
      }
      if (!payerAccount) {
        throw new Error(`Conta origem ${body.originAccountId} não encontrada`);
      }

      await this.accountRepository.lockAccountsByIds(queryRunner, [
        payerAccount.id,
        receiverAccount.id,
      ]);

      console.log('payerAccount', payerAccount);
      console.log('receiverAccount', receiverAccount);

      await this.validateRules(
        queryRunner,
        payerAccount,
        receiverAccount,
        body.amount,
        body.pixKey,
      );

      const [savedTransaction, ledger] = await Promise.all([
        this.transactionService.createTransaction({
          type: TransactionType.PIX,
          amount: body.amount,
          currencyId: payerAccount.currencyId,
          originAccountId: payerAccount.id,
          destinationAccountId: receiverAccount.id,
          correlationId: body.idempotencyKey,
          externalId: body.pixKey,
          metadata: {
            pixKey: body.pixKey,
            description: body.description,
            institutionType: 'SAME_INSTITUTION',
            startedAt: new Date().toISOString(),
            data: body,
          },
        }),
        this.ledgerService.getLedgerByCode(LedgerCode.PIX),
      ]);

      const createdJournal = await this.journalService.createJournal(
        queryRunner,
        {
          ledgerId: ledger.id,
          type: JournalType.PIX,
          description: body.description,
          reference: body.pixKey,
          externalReference: body.pixKey,
          correlationId: savedTransaction.id,
          causationId: body.idempotencyKey,
          source: 'PIX_SAME_INSTITUTION',
          createdBy: 'SYSTEM',
          metadata: {},
        },
      );

      createdJournal.setEntries([
        this.entryService.createEntry({
          journalId: createdJournal.id,
          accountId: payerAccount.id,
          amount: body.amount,
          side: EntrySide.DEBIT,
          description: body.description,
          sequence: 1,
          currencyId: payerAccount.currencyId,
          metadata: {},
        }),
        this.entryService.createEntry({
          journalId: createdJournal.id,
          accountId: receiverAccount.id,
          amount: body.amount,
          side: EntrySide.CREDIT,
          description: body.description,
          sequence: 2,
          currencyId: receiverAccount.currencyId,
          metadata: {},
        }),
      ]);

      const registeredJournal = await this.journalService.registerJournal(
        queryRunner,
        hash,
        createdJournal,
      );

      await this.auditService.createAudit(
        AuditEntity.TRANSACTION,
        savedTransaction.id,
        AuditAction.UPDATE,
        'SYSTEM',
        hash,
        {
          amount: body.amount,
          payer: payerAccount.id,
          receiver: receiverAccount.id,
          idempotencyKey: body.idempotencyKey,
        },
        {
          transactionId: savedTransaction.id,
          status: savedTransaction.status,
          debitEntryId: registeredJournal
            .getDebitEntry()
            .map((e) => e.id)
            .join(','),
          creditEntryId: registeredJournal
            .getCreditEntry()
            .map((e) => e.id)
            .join(','),
        },
      );

      await this.transactionService.complete(queryRunner, savedTransaction);
      await this.idempotencyService.create(queryRunner, {
        key: body.idempotencyKey,
        hash: hash,
        data: { ...body },
        ttl: 86400,
        entityType: EntityType.TRANSACTION,
        entityId: savedTransaction.id,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `[${hash}] PIX (mesma instituição) concluído com sucesso`,
      );

      return {
        status: 'completed',
        transactionId: savedTransaction.id,
        debitEntryId: registeredJournal
          .getDebitEntry()
          .map((e) => e.id)
          .join(','),
        creditEntryId: registeredJournal
          .getCreditEntry()
          .map((e) => e.id)
          .join(','),
        amount: body.amount,
        payerAccount: payerAccount.id,
        receiverAccount: receiverAccount.id,
        institutionType: 'SAME_INSTITUTION',
        completedAt: savedTransaction.completedAt,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[${hash}] Erro na transferência PIX: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async validateRules(
    queryRunner: QueryRunner,
    payerAccount: Account,
    receiverAccount: Account,
    amount: number,
    pixKey?: string,
  ) {
    //metodo ok
    this.validatePayerAccount(payerAccount);

    //metodo ok
    this.validateReceiverAccount(receiverAccount);

    //metodo ok
    this.validateTransfer(payerAccount, receiverAccount, amount);

    //metodo ok
    const availableBalance = await this.balanceService.getAvailableBalance(
      queryRunner,
      payerAccount.id,
      payerAccount.currencyId,
    );

    if (availableBalance < amount) {
      throw new Error(
        `Saldo insuficiente. Disponível: ${availableBalance}, Necessário: ${amount}`,
      );
    }

    //metodo ok
    await this.validateLimits(payerAccount.id, amount, queryRunner);

    if (pixKey) {
      this.validatePixKey(pixKey, receiverAccount);
    }
  }

  private validatePayerAccount(account: Account): void {
    if (!account.isActive()) {
      throw new Error(`Conta do pagador não está ativa: ${account.id}`);
    }

    if (!account.canDebit()) {
      throw new Error(`Conta do pagador não permite débito: ${account.id}`);
    }

    if (account.isBlocked()) {
      throw new Error(`Conta do pagador está bloqueada: ${account.id}`);
    }
  }

  /**
   * Valida conta do recebedor
   */
  private validateReceiverAccount(account: Account): void {
    if (!account.isActive()) {
      throw new Error(`Conta do recebedor não está ativa: ${account.id}`);
    }

    if (!account.canCredit()) {
      throw new Error(`Conta do recebedor não permite crédito: ${account.id}`);
    }

    if (account.isBlocked()) {
      throw new Error(`Conta do recebedor está bloqueada: ${account.id}`);
    }
  }

  /**
   * Validações da transferência
   */
  private validateTransfer(
    payerAccount: Account,
    receiverAccount: Account,
    amount: number,
  ): void {
    // Mesma conta
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

  /**
   * Valida limites da conta
   */
  private async validateLimits(
    accountId: string,
    amount: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Buscar limites da conta
    const limits = await this.limiteService.findByFilters(queryRunner, {
      accountId,
    });

    if (!limits) {
      return; // Sem limites configurados
    }

    // Verificar limite diário
    if (limits.dailyDebit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyTotal = await this.journalService.getAccountTotals(
        accountId,
        today,
        new Date(),
      );

      if (dailyTotal.totalDebit + amount > limits.dailyDebit) {
        throw new Error(
          `Limite diário excedido. Disponível: ${limits.dailyDebit - dailyTotal.totalDebit}, Necessário: ${amount}`,
        );
      }
    }

    // Verificar limite mensal
    if (limits.monthlyDebit) {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const monthlyTotal = await this.journalService.getAccountTotals(
        accountId,
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

  /**
   * Valida chave PIX
   */
  private validatePixKey(pixKey: string, receiverAccount: Account): void {
    // Verificar se a chave PIX está associada à conta destino
    if (receiverAccount.metadata?.pixKeys) {
      const pixKeys = receiverAccount.metadata.pixKeys;
      if (!pixKeys.includes(pixKey)) {
        throw new Error(
          `Chave PIX ${pixKey} não está associada à conta destino`,
        );
      }
    } else {
      // Se a conta não tiver chaves PIX registradas, validar formato
      this.validatePixKeyFormat(pixKey);
    }
  }

  /**
   * Valida formato da chave PIX
   */
  private validatePixKeyFormat(pixKey: string): void {
    // CPF: 000.000.000-00 ou 00000000000
    const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;

    // CNPJ: 00.000.000/0000-00 ou 00000000000000
    const cnpjRegex = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/;

    // Email: usuario@dominio.com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Telefone: (00) 00000-0000 ou 00000000000
    const phoneRegex = /^(\(\d{2}\)\s?\d{5}-\d{4}|\d{11})$/;

    // Chave aleatória (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      !cpfRegex.test(pixKey) &&
      !cnpjRegex.test(pixKey) &&
      !emailRegex.test(pixKey) &&
      !phoneRegex.test(pixKey) &&
      !uuidRegex.test(pixKey)
    ) {
      throw new Error(`Chave PIX inválida: ${pixKey}`);
    }
  }
}
