// src/core/saga/services/saga.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SagaStep } from '../../infra/database/entities/saga-step.entity';
import { Saga } from '../../infra/database/entities/saga.entity';
import { Repository, DataSource } from 'typeorm';
import { TransactionService } from '../transactions/transactions.service';
import { JournalService } from '../journal/journal.service';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { AccountsService } from '../acounts/accounts.service';
import { OutboxEventType } from '../../infra/database/common/enums/outbox.enum';
import { SagaStatus, SagaStepStatus, SagaStepType } from '../../infra/database/common/enums/saga.enum';
import { AuditAction, AuditEntity } from '../../infra/database/common/enums/audit.enum';
import { EntrySide, JournalType } from '../../infra/database/common/enums/journal.enum';
import { HoldService } from '../hold/hold.service';

@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);

  constructor(
    @InjectRepository(Saga)
    private sagaRepository: Repository<Saga>,
    @InjectRepository(SagaStep)
    private sagaStepRepository: Repository<SagaStep>,
    private transactionService: TransactionService,
    private journalService: JournalService,
    private accountService: AccountsService,
    private holdService: HoldService,
    private outboxService: OutboxService,
    private auditService: AuditService,
    private dataSource: DataSource,
  ) {}

  /**
   * Executa uma saga completa
   */
  async executeSaga(saga: Saga): Promise<Saga> {
    this.logger.log(`Executing saga ${saga.id} for transaction ${saga.transactionId}`);
    
    try {
      // Inicia a saga
      saga.start();
      await this.sagaRepository.save(saga);

      // Executa cada passo sequencialmente
      for (let i = 0; i < saga.steps.length; i++) {
        const step = saga.steps[i];
        saga.currentStep = step.step;
        
        this.logger.log(`Executing step ${step.step} (${step.type}) for saga ${saga.id}`);
        
        try {
          await this.executeStep(step, saga);
          await this.sagaStepRepository.save(step);
        } catch (error) {
          this.logger.error(`Step ${step.step} failed: ${error.message}`);
          
          // Se o passo falhou, inicia compensação
          await this.compensateSaga(saga, error);
          return saga;
        }
      }

      // Completa a saga
      saga.complete();
      await this.sagaRepository.save(saga);
      
      // Evento de saga completada
      await this.outboxService.createEvent(
        'SAGA',
        saga.id,
        OutboxEventType.TRANSACTION_COMPLETED,
        {
          sagaId: saga.id,
          transactionId: saga.transactionId,
          status: SagaStatus.COMPLETED,
        }
      );

      // Audit log
      await this.auditService.createLog(
        AuditEntity.SAGA,
        saga.id,
        AuditAction.POST,
        'SYSTEM',
        null,
        saga,
        { transactionId: saga.transactionId }
      );

      this.logger.log(`Saga ${saga.id} completed successfully`);
      return saga;

    } catch (error) {
      this.logger.error(`Saga execution failed: ${error.message}`);
      saga.fail(error.message);
      await this.sagaRepository.save(saga);

      // Evento de saga falhou
      await this.outboxService.createEvent(
        'SAGA',
        saga.id,
        OutboxEventType.TRANSACTION_FAILED,
        {
          sagaId: saga.id,
          transactionId: saga.transactionId,
          error: error.message,
        }
      );

      throw error;
    }
  }

  /**
   * Compensa uma saga (rollback)
   */
  private async compensateSaga(saga: Saga, error: Error): Promise<void> {
    this.logger.log(`Starting compensation for saga ${saga.id}`);
    
    saga.startCompensation();
    await this.sagaRepository.save(saga);

    // Pega os passos que já foram executados
    const executedSteps = saga.steps.filter(
      step => step.status === SagaStepStatus.COMPLETED || step.status === SagaStepStatus.EXECUTING
    );

    // Executa compensação em ordem reversa
    for (const step of executedSteps.reverse()) {
      try {
        this.logger.log(`Compensating step ${step.step} (${step.type})`);
        await this.compensateStep(step, saga);
        step.completeCompensation();
        await this.sagaStepRepository.save(step);
      } catch (compensationError) {
        this.logger.error(
          `Failed to compensate step ${step.step}: ${compensationError.message}`
        );
        // Continua tentando compensar os outros passos
      }
    }

    // Verifica se todos os passos foram compensados
    const allCompensated = saga.steps.every(
      step => step.status === SagaStepStatus.COMPENSATED || step.status === SagaStepStatus.PENDING
    );

    if (allCompensated) {
      saga.completeCompensation();
      await this.sagaRepository.save(saga);

      // Evento de compensação completada
      await this.outboxService.createEvent(
        'SAGA',
        saga.id,
        OutboxEventType.JOURNAL_REVERSED,
        {
          sagaId: saga.id,
          transactionId: saga.transactionId,
          error: error.message,
        }
      );
    } else {
      saga.status = SagaStatus.PARTIALLY_COMPENSATED;
      await this.sagaRepository.save(saga);
      
      this.logger.warn(`Saga ${saga.id} partially compensated`);
    }
  }

  /**
   * Compensa um passo específico
   */
  private async compensateStep(step: SagaStep, saga: Saga): Promise<void> {
    step.startCompensation();
    await this.sagaStepRepository.save(step);

    try {
      switch (step.type) {
        case SagaStepType.VALIDATION:
          // Validação não precisa de compensação
          break;
          
        case SagaStepType.LOCK_ACCOUNT:
          await this.compensateLockStep(step, saga);
          break;
          
        case SagaStepType.DEBIT:
          await this.compensateDebitStep(step, saga);
          break;
          
        case SagaStepType.CREDIT:
          await this.compensateCreditStep(step, saga);
          break;
          
        case SagaStepType.EXTERNAL_API:
          await this.compensateExternalApiStep(step, saga);
          break;
          
        case SagaStepType.NOTIFICATION:
          // Notificações não são compensadas
          break;
          
        case SagaStepType.SETTLEMENT:
          await this.compensateSettlementStep(step, saga);
          break;
          
        case SagaStepType.RELEASE_LOCK:
          // Não precisa compensar release lock
          break;
          
        default:
          throw new Error(`Unknown step type for compensation: ${step.type}`);
      }

      step.completeCompensation();
      await this.sagaStepRepository.save(step);

    } catch (error) {
      step.fail(error.message);
      await this.sagaStepRepository.save(step);
      throw error;
    }
  }

  /**
   * Compensa passo de lock (libera o hold)
   */
  private async compensateLockStep(step: SagaStep, saga: Saga): Promise<void> {
    const holdId = step.outputData?.holdId;
    if (holdId) {
      await this.holdService.releaseHold(holdId, 'Saga compensation');
      this.logger.log(`Released hold ${holdId} during compensation`);
    }
  }

  /**
   * Compensa passo de débito (cria crédito reverso)
   */
  private async compensateDebitStep(step: SagaStep, saga: Saga): Promise<void> {
    const { accountId, amount } = step.inputData;
    const journalId = step.outputData?.journalId;

    if (journalId) {
      await this.journalService.reverseJournal(journalId, 'Saga compensation');
      this.logger.log(`Reversed journal ${journalId} during compensation`);
    } else {
      // Se não tem journal, cria um crédito reverso
      const account = await this.accountService.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      await this.journalService.createJournal({
        ledgerId: account.ledgerId,
        type: JournalType.REVERSAL,
        description: `Compensation for saga ${saga.id}`,
        correlationId: saga.transactionId,
        source: 'SAGA_COMPENSATION',
        createdBy: 'SYSTEM',
        entries: [
          {
            accountId,
            side: EntrySide.CREDIT,
            amount,
            currencyId: account.currencyId,
            description: 'Compensation credit',
          },
        ],
        metadata: { sagaId: saga.id },
      });
    }
  }

  /**
   * Compensa passo de crédito (cria débito reverso)
   */
  private async compensateCreditStep(step: SagaStep, saga: Saga): Promise<void> {
    const { accountId, amount } = step.inputData;
    const journalId = step.outputData?.journalId;

    if (journalId) {
      await this.journalService.reverseJournal(journalId, 'Saga compensation');
      this.logger.log(`Reversed journal ${journalId} during compensation`);
    } else {
      const account = await this.accountService.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      await this.journalService.createJournal({
        ledgerId: account.ledgerId,
        type: JournalType.REVERSAL,
        description: `Compensation for saga ${saga.id}`,
        correlationId: saga.transactionId,
        source: 'SAGA_COMPENSATION',
        createdBy: 'SYSTEM',
        entries: [
          {
            accountId,
            side: EntrySide.DEBIT,
            amount,
            currencyId: account.currencyId,
            description: 'Compensation debit',
          },
        ],
        metadata: { sagaId: saga.id },
      });
    }
  }

  /**
   * Compensa passo de API externa
   */
  private async compensateExternalApiStep(step: SagaStep, saga: Saga): Promise<void> {
    const compensation = step.compensation;
    if (compensation?.url) {
      // Chama a API de compensação
      this.logger.log(`Calling compensation API: ${compensation.url}`);
      // Implementar chamada HTTP para compensação
    }
  }

  /**
   * Compensa passo de settlement
   */
  private async compensateSettlementStep(step: SagaStep, saga: Saga): Promise<void> {
    const settlementId = step.outputData?.settlementId;
    if (settlementId) {
      this.logger.log(`Cancelling settlement ${settlementId}`);
      // Implementar cancelamento do settlement
    }
  }

  /**
   * Executa um passo específico
   */
  private async executeStep(step: SagaStep, saga: Saga): Promise<void> {
    step.start();
    await this.sagaStepRepository.save(step);

    try {
      let output: Record<string, any> = {};

      switch (step.type) {
        case SagaStepType.VALIDATION:
          output = await this.executeValidationStep(step, saga);
          break;
          
        case SagaStepType.LOCK_ACCOUNT:
          output = await this.executeLockStep(step, saga);
          break;
          
        case SagaStepType.DEBIT:
          output = await this.executeDebitStep(step, saga);
          break;
          
        case SagaStepType.CREDIT:
          output = await this.executeCreditStep(step, saga);
          break;
          
        case SagaStepType.EXTERNAL_API:
          output = await this.executeExternalApiStep(step, saga);
          break;
          
        case SagaStepType.NOTIFICATION:
          output = await this.executeNotificationStep(step, saga);
          break;
          
        case SagaStepType.SETTLEMENT:
          output = await this.executeSettlementStep(step, saga);
          break;
          
        case SagaStepType.RELEASE_LOCK:
          output = await this.executeReleaseLockStep(step, saga);
          break;
          
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      step.complete(output);
      await this.sagaStepRepository.save(step);

    } catch (error) {
      step.fail(error.message);
      await this.sagaStepRepository.save(step);
      throw error;
    }
  }

  /**
   * Executa passo de validação
   */
  private async executeValidationStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { accountId, amount } = step.inputData;
    
    // Valida se a conta existe
    const account = await this.accountService.findById(accountId);
    
    // Valida saldo disponível
    const balance = await this.journalService.getBalanceAtTime(accountId, new Date());
    const heldBalance = await this.holdService.getHeldBalance(accountId);
    const availableBalance = balance - heldBalance;

    if (availableBalance < amount) {
      throw new Error(
        `Insufficient balance. Available: ${availableBalance}, Required: ${amount}, Held: ${heldBalance}`
      );
    }

    // Valida limites
    await this.validateAccountLimits(accountId, amount);

    return {
      validated: true,
      balance,
      heldBalance,
      availableBalance,
      account,
    };
  }

  /**
   * Executa passo de lock
   */
  private async executeLockStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { accountId, amount, reason } = step.inputData;
    
    // Cria um hold para bloquear o valor
    const hold = await this.holdService.createHold(
      {
        accountId,
        amount,
        reason: reason || 'SAGA_LOCK',
      }
    );

    return {
      holdId: hold.id,
      locked: true,
      expiresAt: hold.expiresAt,
    };
  }

  /**
   * Executa passo de débito
   */
  private async executeDebitStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { accountId, amount, description } = step.inputData;
    
    const account = await this.accountService.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Cria um journal de débito
    const journal = await this.journalService.createJournal({
      ledgerId: account.ledgerId,
      type: JournalType.TRANSFER,
      description: description || `Debit from account ${accountId}`,
      correlationId: saga.transactionId,
      source: 'SAGA',
      createdBy: 'SYSTEM',
      entries: [
        {
          accountId,
          side: EntrySide.DEBIT,
          amount,
          currencyId: account.currencyId,
          description: 'SAGA debit',
        },
      ],
      metadata: { sagaId: saga.id, step: step.step },
    });

    return {
      journalId: journal.id,
      debited: true,
      amount,
      accountId,
    };
  }

  /**
   * Executa passo de crédito
   */
  private async executeCreditStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { accountId, amount, description } = step.inputData;
    
    const account = await this.accountService.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Cria um journal de crédito
    const journal = await this.journalService.createJournal({
      ledgerId: account.ledgerId,
      type: JournalType.TRANSFER,
      description: description || `Credit to account ${accountId}`,
      correlationId: saga.transactionId,
      source: 'SAGA',
      createdBy: 'SYSTEM',
      entries: [
        {
          accountId,
          side: EntrySide.CREDIT,
          amount,
          currencyId: account.currencyId,
          description: 'SAGA credit',
        },
      ],
      metadata: { sagaId: saga.id, step: step.step },
    });

    return {
      journalId: journal.id,
      credited: true,
      amount,
      accountId,
    };
  }

  /**
   * Executa passo de API externa
   */
  private async executeExternalApiStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { url, method, headers, body } = step.inputData;
    
    // Simula chamada para API externa
    this.logger.log(`Calling external API: ${method} ${url}`);
    
    // Implementar chamada HTTP real aqui
    // const response = await axios({ method, url, headers, data: body });
    
    // Simula resposta
    const response = {
      status: 200,
      data: { success: true, externalId: `ext_${Date.now()}` },
    };

    if (response.status !== 200) {
      throw new Error(`External API call failed: ${response.status}`);
    }

    return {
      externalCallSuccess: true,
      externalId: response.data.externalId,
      response: response.data,
    };
  }

  /**
   * Executa passo de notificação
   */
  private async executeNotificationStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { recipient, subject, message } = step.inputData;
    
    // Simula envio de notificação
    this.logger.log(`Sending notification to ${recipient}: ${subject}`);
    
    // Implementar envio real aqui (email, SMS, push)
    // await this.notificationService.send(recipient, subject, message);

    return {
      notificationSent: true,
      recipient,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Executa passo de settlement
   */
  private async executeSettlementStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { amount, currency, description } = step.inputData;
    
    // Simula settlement
    const settlementId = `stl_${Date.now()}`;
    this.logger.log(`Processing settlement ${settlementId}: ${amount} ${currency}`);

    return {
      settlementId,
      settled: true,
      amount,
      currency,
      settledAt: new Date().toISOString(),
    };
  }

  /**
   * Executa passo de release lock
   */
  private async executeReleaseLockStep(step: SagaStep, saga: Saga): Promise<Record<string, any>> {
    const { holdId } = step.inputData;
    
    if (holdId) {
      await this.holdService.releaseHold(holdId, 'Saga completion');
      this.logger.log(`Released hold ${holdId}`);
    }

    return {
      lockReleased: true,
      holdId,
      releasedAt: new Date().toISOString(),
    };
  }

  /**
   * Valida limites da conta
   */
  private async validateAccountLimits(accountId: string, amount: number): Promise<void> {
    // Implementar validação de limites
    // Buscar limites da conta e verificar
    this.logger.log(`Validating limits for account ${accountId}, amount ${amount}`);
    
    // Exemplo de validação
    // const limits = await this.limitService.findByAccountId(accountId);
    // if (limits?.maxTransaction && amount > limits.maxTransaction) {
    //   throw new Error(`Transaction amount exceeds limit: ${limits.maxTransaction}`);
    // }
  }

  /**
   * Cria uma nova saga
   */
  async createSaga(
    transactionId: string,
    workflowId: string,
    steps: Array<{
      type: SagaStepType;
      inputData: Record<string, any>;
      compensation?: Record<string, any>;
      maxRetries?: number;
      timeoutSeconds?: number;
    }>,
    contextData?: Record<string, any>
  ): Promise<Saga> {
    const transaction = await this.transactionService.findById(transactionId);
    
    if (!transaction) {
      throw new BadRequestException(`Transaction ${transactionId} not found`);
    }

    const saga = Saga.createFromTransaction(
      transaction,
      workflowId,
      steps,
      contextData
    );

    await this.sagaRepository.save(saga);
    await this.sagaStepRepository.save(saga.steps);

    this.logger.log(`Saga ${saga.id} created for transaction ${transactionId}`);
    return saga;
  }

  /**
   * Busca saga por ID
   */
  async findById(id: string): Promise<Saga> {
    const saga = await this.sagaRepository.findOne({
      where: { id },
      relations: { steps: true, transaction: true },
    });

    if (!saga) {
      throw new BadRequestException(`Saga ${id} not found`);
    }

    return saga;
  }

  /**
   * Busca saga por transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<Saga | null> {
    return this.sagaRepository.findOne({
      where: { transactionId },
      relations: { steps: true },
    });
  }

  /**
   * Lista sagas por status
   */
  async findByStatus(status: SagaStatus): Promise<Saga[]> {
    return this.sagaRepository.find({
      where: { status },
      relations: { steps: true, transaction: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retenta sagas falhas
   */
  async retryFailedSagas(): Promise<void> {
    const failedSagas = await this.sagaRepository.find({
      where: { status: SagaStatus.FAILED },
      relations: { steps: true, transaction: true },
    });

    for (const saga of failedSagas) {
      if (saga.canRetry()) {
        this.logger.log(`Retrying saga ${saga.id} (attempt ${saga.retryCount + 1})`);
        saga.retryCount += 1;
        saga.status = SagaStatus.INITIATED;
        await this.sagaRepository.save(saga);
        
        // Reinicia a execução
        await this.executeSaga(saga);
      } else {
        this.logger.warn(`Saga ${saga.id} exceeded max retries`);
        saga.status = SagaStatus.ABORTED;
        await this.sagaRepository.save(saga);
      }
    }
  }

  /**
   * Limpa sagas antigas
   */
  async cleanOldSagas(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.sagaRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [SagaStatus.COMPLETED, SagaStatus.COMPENSATED, SagaStatus.ABORTED],
      })
      .andWhere('completed_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned sagas older than ${daysToKeep} days`);
  }
}