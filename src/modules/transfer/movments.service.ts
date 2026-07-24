// src/core/services/pix-same-institution.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from '../../infra/database/entities/transaction.entity';
import {
  TransactionType,
  TransactionStatus,
} from '../../infra/database/common/enums/transaction.enum';
import {
  JournalType,
  EntrySide,
} from '../../infra/database/common/enums/journal.enum';
import {
  SagaStatus,
  SagaStepType,
} from '../../infra/database/common/enums/saga.enum';
import { AccountsRepository } from 'src/infra/database/repositories/accounts.repository';
import { BalanceService } from 'src/core/services/balance.service';
import { AuditService } from 'src/core/services/audit.service';
import { SagaService } from 'src/core/services/saga.service';
import { JournalService } from 'src/core/services/journal.service';
import { PixRequestDto } from './dto/pix-request.dto';
import { PixResponseDto } from './dto/pix-response.dto';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  AuditAction,
  AuditEntity,
} from 'src/infra/database/common/enums/audit.enum';
import { Account } from 'src/infra/database/entities/account.entity';
import { IdempotencyService } from 'src/core/services/idempotency.service';

@Injectable()
export class PixSameInstitutionService {
  private readonly logger = new Logger(PixSameInstitutionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly accountRepository: AccountsRepository,
    private readonly journalService: JournalService,
    private readonly sagaService: SagaService,
    private readonly balanceService: BalanceService,
    private readonly idempotencyService: IdempotencyService,
    private readonly auditService: AuditService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * ROTEIRO COMPLETO: PIX Mesma Instituição
   */
  async executePixSameInstitution(
    body: PixRequestDto,
  ): Promise<PixResponseDto> {
    const { hash } = this.request;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let transactionId: string | null = null;

    try {
      this.logger.log(`[${hash}] Iniciando PIX (mesma instituição)`);

      this.logger.log(`[${hash}] Passo 1: Validando idempotência`);

      const idempotency = await this.idempotencyService.findByKey(
        body.idempotencyKey,
      );
      if (idempotency) {
        this.logger.log(
          `[${hash}] Idempotência já processada: ${body.idempotencyKey}`,
        );
        return {
          status: 'already_processed',
          transactionId: idempotency.entityId || undefined,
          idempotency: true,
        };
      }

      const payerAccount = await this.accountRepository.findById(
        queryRunner,
        body.originAccountId,
      );

      if (!payerAccount) {
        throw new Error(`Conta origem ${body.originAccountId} não encontrada`);
      }

      const receiverAccount = await this.accountRepository.findById(
        queryRunner,
        body.destinationAccountId,
      );

      if (!receiverAccount) {
        throw new Error(
          `Conta destino ${body.destinationAccountId} não encontrada`,
        );
      }

      const transaction = new Transaction();
      transaction.type = TransactionType.PIX;
      transaction.status = TransactionStatus.INITIATED;
      transaction.amount = body.amount;
      transaction.currencyId = payerAccount.currencyId;
      transaction.originAccountId = payerAccount.id;
      transaction.destinationAccountId = receiverAccount.id;
      transaction.correlationId = body.idempotencyKey;
      transaction.externalId = body.pixKey;
      transaction.metadata = {
        pixKey: body.pixKey,
        description: body.description,
        institutionType: 'SAME_INSTITUTION',
        startedAt: new Date().toISOString(),
      };
      transaction.startedAt = new Date();
      transaction.validate();

      const savedTransaction = await queryRunner.manager.save(transaction);

      this.logger.log(`[${hash}] Passo 5: Validando regras de negócio`);

      // 5.1 - Validações da conta origem
      this.validatePayerAccount(payerAccount);

      // 5.2 - Validações da conta destino
      this.validateReceiverAccount(receiverAccount);

      // 5.3 - Validações da transferência
      this.validateTransfer(payerAccount, receiverAccount, body.amount);

      // 5.4 - Validação de saldo disponível
      const availableBalance = await this.balanceService.getAvailableBalance(
        queryRunner,
        payerAccount.id,
        payerAccount.currencyId,
      );

      if (availableBalance < body.amount) {
        throw new Error(
          `Saldo insuficiente. Disponível: ${availableBalance}, Necessário: ${body.amount}`,
        );
      }

      // 5.5 - Validação de limites
      await this.validateLimits(payerAccount.id, body.amount, queryRunner);

      // 5.6 - Validação de PIX Key (se fornecida)
      if (body.pixKey) {
        this.validatePixKey(body.pixKey, receiverAccount);
      }

      this.logger.log(`[${hash}] Passo 6: Buscando conta de settlement`);

      const settlementAccount = await this.accountRepository.findByCode(
        queryRunner,
        'RESERVE-PAYER',
      );

      if (!settlementAccount) {
        throw new Error('Conta de settlement não encontrada');
      }

      this.logger.log(`[${hash}] Passo 8: Criando Saga`);

      // const saga = await this.sagaService.createSaga(
      //   savedTransaction.id,
      //   `PIX-SAME-${savedTransaction.id}`,
      //   [
      //     {
      //       type: SagaStepType.DEBIT,
      //       inputData: {
      //         accountId: payerAccount.id,
      //         amount: body.amount,
      //         description: 'Débito PIX (mesma instituição)',
      //       },
      //       compensation: {
      //         type: 'REVERSAL',
      //         description: 'Reversão do débito PIX',
      //       },
      //     },
      //     {
      //       type: SagaStepType.CREDIT,
      //       inputData: {
      //         accountId: receiverAccount.id,
      //         amount: body.amount,
      //         description: 'Crédito PIX (mesma instituição)',
      //       },
      //       compensation: {
      //         type: 'REVERSAL',
      //         description: 'Reversão do crédito PIX',
      //       },
      //     },
      //   ],
      //   {
      //     payerAccountId: payerAccount.id,
      //     receiverAccountId: receiverAccount.id,
      //     settlementAccountId: settlementAccount.id,
      //     amount: body.amount,
      //     currencyId: payerAccount.currencyId,
      //     transactionId: savedTransaction.id,
      //   },
      //   queryRunner,
      // );

      const debitJournal = await this.journalService.createJournal(
        {
          ledgerId: payerAccount.ledgerId,
          type: JournalType.PIX,
          description: `PIX (mesma instituição) - Débito do pagador: ${body.description || ''}`,
          correlationId: savedTransaction.id,
          source: 'PIX_SAME_INSTITUTION',
          createdBy: 'SYSTEM',
          entries: [
            {
              accountId: payerAccount.id,
              side: EntrySide.DEBIT,
              amount: body.amount,
              currencyId: payerAccount.currencyId,
              description: `Débito PIX - Pagador: ${payerAccount.name}`,
              metadata: {
                transactionId: savedTransaction.id,
                step: 'DEBIT',
              },
            },
            {
              accountId: settlementAccount.id,
              side: EntrySide.CREDIT,
              amount: body.amount,
              currencyId: settlementAccount.currencyId,
              description: `Crédito em settlement - Agendado para ${receiverAccount.name}`,
              metadata: {
                transactionId: savedTransaction.id,
                step: 'DEBIT',
                destinationAccount: receiverAccount.id,
              },
            },
          ],
          metadata: {
            transactionId: savedTransaction.id,
            // sagaId: saga.id,
            step: 1,
            institutionType: 'SAME_INSTITUTION',
          },
        },
        hash,
        queryRunner,
      );

      return new PixResponseDto({
        status: 'completed',
        transactionId: savedTransaction.id,
        idempotency: false,
      });

      //   // ============================================
      //   // PASSO 9: CRIAR JOURNAL 1 - DÉBITO
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 9: Criando Journal de Débito`);

      //   // ============================================
      //   // PASSO 10: CRIAR JOURNAL 2 - CRÉDITO
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 10: Criando Journal de Crédito`);

      //   const creditJournal = await this.journalService.createJournal(
      //     {
      //       ledgerId: receiverAccount.ledgerId,
      //       type: JournalType.PIX,
      //       description: `PIX (mesma instituição) - Crédito ao recebedor: ${body.description || ''}`,
      //       correlationId: savedTransaction.id,
      //       causationId: debitJournal.id,
      //       source: 'PIX_SAME_INSTITUTION',
      //       createdBy: 'SYSTEM',
      //       entries: [
      //         {
      //           accountId: settlementAccount.id,
      //           side: EntrySide.DEBIT,
      //           amount: body.amount,
      //           currencyId: settlementAccount.currencyId,
      //           description: `Débito do settlement - Para crédito ao recebedor`,
      //           metadata: {
      //             transactionId: savedTransaction.id,
      //             step: 'CREDIT',
      //             originAccount: payerAccount.id,
      //           },
      //         },
      //         {
      //           accountId: receiverAccount.id,
      //           side: EntrySide.CREDIT,
      //           amount: body.amount,
      //           currencyId: receiverAccount.currencyId,
      //           description: `Crédito PIX - Recebedor: ${receiverAccount.name}`,
      //           metadata: {
      //             transactionId: savedTransaction.id,
      //             step: 'CREDIT',
      //           },
      //         },
      //       ],
      //       metadata: {
      //         transactionId: savedTransaction.id,
      //         sagaId: saga.id,
      //         step: 2,
      //         institutionType: 'SAME_INSTITUTION',
      //       },
      //     },
      //     hash,
      //     queryRunner,
      //   );

      //   // ============================================
      //   // PASSO 11: ATUALIZAR STATUS DA TRANSACTION
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 11: Atualizando status da Transaction`);

      //   savedTransaction.status = TransactionStatus.COMPLETED;
      //   savedTransaction.completedAt = new Date();
      //   savedTransaction.metadata = {
      //     ...savedTransaction.metadata,
      //     debitJournalId: debitJournal.id,
      //     creditJournalId: creditJournal.id,
      //     sagaId: saga.id,
      //     completedAt: new Date().toISOString(),
      //   };
      //   await queryRunner.manager.save(savedTransaction);

      //   // ============================================
      //   // PASSO 12: ATUALIZAR SAGA
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 12: Atualizando Saga`);

      //   saga.status = SagaStatus.COMPLETED;
      //   saga.completedAt = new Date();
      //   saga.metadata = {
      //     ...saga.metadata,
      //     debitJournalId: debitJournal.id,
      //     creditJournalId: creditJournal.id,
      //   };
      //   await queryRunner.manager.save(saga);

      //   // ============================================
      //   // PASSO 13: SALVAR IDEMPOTÊNCIA
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 13: Salvando idempotência`);

      //   await this.idempotencyService.create(
      //     queryRunner,
      //     body.idempotencyKey,
      //     hash || 'request-hash',
      //     {
      //       status: 'COMPLETED',
      //       transactionId: savedTransaction.id,
      //       debitJournalId: debitJournal.id,
      //       creditJournalId: creditJournal.id,
      //     },
      //     86400, // 24 horas
      //     'TRANSACTION',
      //     savedTransaction.id,
      //   );

      //   // ============================================
      //   // PASSO 14: AUDIT LOG
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 14: Criando Audit Log`);

      //   await this.auditService.createAudit(
      //     AuditEntity.TRANSACTION,
      //     savedTransaction.id,
      //     AuditAction.CREATE,
      //     'SYSTEM',
      //     hash,
      //     {
      //       amount: body.amount,
      //       payer: payerAccount.id,
      //       receiver: receiverAccount.id,
      //       idempotencyKey: body.idempotencyKey,
      //     },
      //     {
      //       transactionId: savedTransaction.id,
      //       status: savedTransaction.status,
      //       debitJournalId: debitJournal.id,
      //       creditJournalId: creditJournal.id,
      //     },
      //     queryRunner,
      //   );

      //   // ============================================
      //   // PASSO 15: COMMIT DA TRANSAÇÃO
      //   // ============================================
      //   this.logger.log(`[${hash}] Passo 15: Commit da transação`);

      //   await queryRunner.commitTransaction();

      //   // ============================================
      //   // PASSO 16: RETORNAR RESULTADO
      //   // ============================================
      //   this.logger.log(`[${hash}] PIX (mesma instituição) concluído com sucesso`);

      //   return {
      //     status: 'completed',
      //     transactionId: savedTransaction.id,
      //     debitJournalId: debitJournal.id,
      //     creditJournalId: creditJournal.id,
      //     sagaId: saga.id,
      //     amount: body.amount,
      //     payerAccount: payerAccount.id,
      //     receiverAccount: receiverAccount.id,
      //     institutionType: 'SAME_INSTITUTION',
      //     completedAt: savedTransaction.completedAt,
      //   };
    } catch (error: any) {
      // ============================================
      // ROLLBACK EM CASO DE ERRO
      // ============================================
      this.logger.error(`[${hash}] Erro no PIX: ${error.message}`);
      await queryRunner.rollbackTransaction();

      // Tentar criar audit de erro
      try {
        await this.auditService.createAudit(
          AuditEntity.TRANSACTION,
          transactionId || 'unknown',
          AuditAction.CREATE,
          'SYSTEM',
          hash,
          { error: error.message, stack: error.stack },
          null,
          null,
        );
      } catch (auditError: any) {
        this.logger.error(`Erro ao criar audit: ${auditError.message}`);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // MÉTODOS DE VALIDAÇÃO
  // ============================================

  /**
   * Valida conta do pagador
   */
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
    queryRunner: any,
  ): Promise<void> {
    // Buscar limites da conta
    const limits = await queryRunner.manager.findOne('Limit', {
      where: { accountId },
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
