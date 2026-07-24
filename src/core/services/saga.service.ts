// src/core/services/saga.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Saga } from '../../infra/database/entities/saga.entity';
import { SagaStep } from '../../infra/database/entities/saga-step.entity';
import {
  SagaStatus,
  SagaStepStatus,
  SagaStepType,
} from '../../infra/database/common/enums/saga.enum';
import { Transaction } from '../../infra/database/entities/transaction.entity';
import { JournalService } from './journal.service';
import {
  JournalType,
  EntrySide,
} from '../../infra/database/common/enums/journal.enum';
import { AuditService } from './audit.service';
import {
  AuditEntity,
  AuditAction,
} from '../../infra/database/common/enums/audit.enum';
import { v4 as uuidv4 } from 'uuid';

export interface SagaStepConfig {
  type: SagaStepType;
  name: string;
  execute: (context: any) => Promise<any>;
  compensate: (context: any) => Promise<any>;
  maxRetries?: number;
  timeoutSeconds?: number;
  inputData?: Record<string, any>;
  compensation?: Record<string, any>;
}

export interface SagaContext {
  [key: string]: any;
}

@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);

  constructor(
    @InjectRepository(Saga)
    private readonly sagaRepository: Repository<Saga>,
    @InjectRepository(SagaStep)
    private readonly sagaStepRepository: Repository<SagaStep>,
    private readonly dataSource: DataSource,
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
  ) {}

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
    contextData?: Record<string, any>,
    queryRunner?: QueryRunner,
  ): Promise<Saga> {
    const qr = queryRunner || this.dataSource.createQueryRunner();

    try {
      this.logger.log(`Criando saga para transação ${transactionId}`);

      // Busca a transação
      const transaction = await qr.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error(`Transação ${transactionId} não encontrada`);
      }

      // // Cria a saga
      const saga = Saga.createFromTransaction(
        transaction,
        workflowId,
        steps.map((step, index) => ({
          type: step.type,
          maxRetries: step.maxRetries || 3,
          timeoutSeconds: step.timeoutSeconds || 30,
          compensation: step.compensation || {},
          inputData: {
            ...step.inputData,
            stepNumber: index + 1,
          },
        })),
        contextData,
      );

      const savedSaga = await qr.manager.save(saga);

      // // Cria os steps
      // for (let i = 0; i < steps.length; i++) {
      //   const stepData = steps[i];
      //   const stepEntity = savedSaga.steps[i];
      //   stepEntity.sagaId = savedSaga.id;
      //   stepEntity.step = i + 1;
      //   stepEntity.type = stepData.type;
      //   stepEntity.inputData = {
      //     ...stepData.inputData,
      //     stepNumber: i + 1,
      //   };
      //   stepEntity.compensation = stepData.compensation || {};
      //   stepEntity.maxRetries = stepData.maxRetries || 3;
      //   stepEntity.timeoutSeconds = stepData.timeoutSeconds || 30;
      //   stepEntity.status = SagaStepStatus.PENDING;
      //   await qr.manager.save(stepEntity);
      // }

      // Audit log
      await this.auditService.createAudit(
        AuditEntity.SAGA,
        savedSaga.id,
        AuditAction.CREATE,
        'SYSTEM',
        workflowId,
        {
          transactionId,
          steps: steps.length,
          workflowId,
        },
        {
          sagaId: savedSaga.id,
          status: savedSaga.status,
        },
        qr,
      );

      this.logger.log(`Saga ${savedSaga.id} criada com sucesso`);
      return savedSaga;
    } catch (error: any) {
      this.logger.error(`Erro ao criar saga: ${error.message}`);
      throw error;
    }
  }

  /**
   * Executa uma saga completa
   */
  async executeSaga(
    sagaId: string,
    steps: SagaStepConfig[],
    context: SagaContext = {},
    traceId?: string,
    queryRunner?: any,
  ): Promise<Saga> {
    const shouldManageTransaction = !queryRunner;
    const qr = queryRunner || this.dataSource.createQueryRunner();

    if (shouldManageTransaction) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      this.logger.log(`[${traceId}] Executando saga ${sagaId}`);

      // Busca a saga
      const saga = await qr.manager.findOne(Saga, {
        where: { id: sagaId },
        relations: { steps: true },
      });

      if (!saga) {
        throw new Error(`Saga ${sagaId} não encontrada`);
      }

      // Inicia a saga
      saga.start();
      saga.status = SagaStatus.EXECUTING;
      await qr.manager.save(saga);

      // Executa os steps
      for (let i = 0; i < steps.length; i++) {
        const stepConfig = steps[i];
        const stepEntity = saga.steps[i];

        if (!stepEntity) {
          throw new Error(`Step ${i + 1} não encontrado na saga`);
        }

        this.logger.log(
          `[${traceId}] Executando step ${i + 1}: ${stepConfig.name}`,
        );

        try {
          // Marca como executando
          stepEntity.status = SagaStepStatus.EXECUTING;
          stepEntity.startedAt = new Date();
          stepEntity.timeoutAt = new Date(
            Date.now() + (stepConfig.timeoutSeconds || 30) * 1000,
          );
          await qr.manager.save(stepEntity);

          // Executa o step
          const result = await stepConfig.execute(context);

          // Marca como concluído
          stepEntity.status = SagaStepStatus.COMPLETED;
          stepEntity.completedAt = new Date();
          stepEntity.outputData = {
            ...stepEntity.outputData,
            ...result,
          };
          await qr.manager.save(stepEntity);

          // Atualiza contexto
          context[`step${i + 1}Result`] = result;
          context[`step${i + 1}Status`] = 'COMPLETED';

          // Avança a saga
          saga.currentStep = i + 1;
          await qr.manager.save(saga);

          this.logger.log(`[${traceId}] Step ${i + 1} concluído com sucesso`);
        } catch (error: any) {
          this.logger.error(
            `[${traceId}] Step ${i + 1} falhou: ${error.message}`,
          );

          // Marca como falha
          stepEntity.status = SagaStepStatus.FAILED;
          stepEntity.errorDetails = {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          };
          await qr.manager.save(stepEntity);

          // Atualiza contexto
          context[`step${i + 1}Status`] = 'FAILED';
          context[`step${i + 1}Error`] = error.message;

          // Inicia compensação
          await this.compensateSaga(saga, steps, i, context, traceId, qr);

          // Marca saga como falha
          saga.status = SagaStatus.FAILED;
          saga.errorDetails = {
            failedStep: i + 1,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
          await qr.manager.save(saga);

          if (shouldManageTransaction) {
            await qr.commitTransaction();
          }

          throw error;
        }
      }

      // Completa a saga
      saga.status = SagaStatus.COMPLETED;
      saga.completedAt = new Date();
      await qr.manager.save(saga);

      // Audit log
      await this.auditService.createAudit(
        AuditEntity.SAGA,
        saga.id,
        AuditAction.POST,
        'SYSTEM',
        traceId,
        {
          status: SagaStatus.COMPLETED,
          stepsCompleted: steps.length,
        },
        {
          sagaId: saga.id,
          status: saga.status,
          completedAt: saga.completedAt,
        },
        qr,
      );

      if (shouldManageTransaction) {
        await qr.commitTransaction();
      }

      this.logger.log(`[${traceId}] Saga ${sagaId} concluída com sucesso`);
      return saga;
    } catch (error: any) {
      if (shouldManageTransaction) {
        await qr.rollbackTransaction();
      }
      this.logger.error(`[${traceId}] Erro na saga: ${error.message}`);
      throw error;
    } finally {
      if (shouldManageTransaction) {
        await qr.release();
      }
    }
  }

  /**
   * Executa compensação da saga
   */
  private async compensateSaga(
    saga: Saga,
    steps: SagaStepConfig[],
    failedStepIndex: number,
    context: SagaContext,
    traceId?: string,
    queryRunner?: any,
  ): Promise<void> {
    const qr = queryRunner || this.dataSource.createQueryRunner();

    try {
      this.logger.log(`[${traceId}] Iniciando compensação da saga ${saga.id}`);

      // Marca saga como compensando
      saga.status = SagaStatus.COMPENSATING;
      await qr.manager.save(saga);

      // Compensa em ordem reversa (do step anterior ao falho até o primeiro)
      for (let i = failedStepIndex - 1; i >= 0; i--) {
        const stepConfig = steps[i];
        const stepEntity = saga.steps[i];

        if (!stepEntity) {
          this.logger.warn(
            `[${traceId}] Step ${i + 1} não encontrado para compensação`,
          );
          continue;
        }

        // Verifica se o step foi executado com sucesso
        if (stepEntity.status !== SagaStepStatus.COMPLETED) {
          this.logger.log(
            `[${traceId}] Step ${i + 1} não foi executado, pulando compensação`,
          );
          continue;
        }

        try {
          this.logger.log(
            `[${traceId}] Compensando step ${i + 1}: ${stepConfig.name}`,
          );

          // Marca como compensando
          stepEntity.status = SagaStepStatus.COMPENSATING;
          await qr.manager.save(stepEntity);

          // Executa compensação
          await stepConfig.compensate(context);

          // Marca como compensado
          stepEntity.status = SagaStepStatus.COMPENSATED;
          stepEntity.completedAt = new Date();
          await qr.manager.save(stepEntity);

          // Atualiza contexto
          context[`step${i + 1}Compensated`] = true;

          this.logger.log(`[${traceId}] Step ${i + 1} compensado com sucesso`);
        } catch (compensationError: any) {
          this.logger.error(
            `[${traceId}] Erro na compensação do step ${i + 1}: ${compensationError.message}`,
          );

          // Marca erro na compensação
          stepEntity.status = SagaStepStatus.FAILED;
          stepEntity.errorDetails = {
            ...stepEntity.errorDetails,
            compensationError: compensationError.message,
            compensationTimestamp: new Date().toISOString(),
          };
          await qr.manager.save(stepEntity);

          // Continua tentando compensar os outros steps
          continue;
        }
      }

      // Verifica se todos os steps foram compensados
      const allCompensated = saga.steps.every(
        (step) =>
          step.status === SagaStepStatus.COMPENSATED ||
          step.status === SagaStepStatus.PENDING ||
          step.status === SagaStepStatus.COMPLETED,
      );

      if (allCompensated) {
        saga.status = SagaStatus.COMPENSATED;
      } else {
        saga.status = SagaStatus.PARTIALLY_COMPENSATED;
      }

      saga.completedAt = new Date();
      await qr.manager.save(saga);

      // Audit log
      await this.auditService.createAudit(
        AuditEntity.SAGA,
        saga.id,
        AuditAction.UPDATE,
        'SYSTEM',
        traceId,
        {
          compensationStatus: saga.status,
          failedStep: failedStepIndex + 1,
        },
        {
          sagaId: saga.id,
          status: saga.status,
          compensatedAt: saga.completedAt,
        },
        qr,
      );

      this.logger.log(`[${traceId}] Compensação da saga ${saga.id} concluída`);
    } catch (error: any) {
      this.logger.error(
        `[${traceId}] Erro na compensação da saga: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Executa PIX para mesma instituição (2 steps)
   */
  async executePixSameInstitution(
    transactionId: string,
    payerAccountId: string,
    receiverAccountId: string,
    settlementAccountId: string,
    amount: number,
    currencyId: string,
    ledgerId: string,
    traceId: string,
    queryRunner: any,
  ): Promise<Saga> {
    const qr = queryRunner || this.dataSource.createQueryRunner();

    try {
      this.logger.log(`[${traceId}] Executando PIX mesma instituição`);

      // Define os steps da saga
      const steps: SagaStepConfig[] = [
        {
          type: SagaStepType.DEBIT,
          name: 'Débito do Pagador',
          execute: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Step 1: Débito do pagador`);

            const journal = await this.journalService.createJournal(
              {
                ledgerId,
                type: JournalType.PIX,
                description: `PIX (mesma instituição) - Débito do pagador`,
                correlationId: transactionId,
                source: 'PIX_SAGA',
                createdBy: 'SYSTEM',
                entries: [
                  {
                    accountId: payerAccountId,
                    side: EntrySide.DEBIT,
                    amount,
                    currencyId,
                    description: `Débito PIX - Pagador`,
                  },
                  {
                    accountId: settlementAccountId,
                    side: EntrySide.CREDIT,
                    amount,
                    currencyId,
                    description: `Crédito em settlement`,
                  },
                ],
                metadata: {
                  transactionId,
                  step: 1,
                  institutionType: 'SAME_INSTITUTION',
                },
              },
              traceId,
              qr,
            );

            return {
              debitJournalId: journal.id,
              debitAmount: amount,
              payerAccount: payerAccountId,
            };
          },
          compensate: async (context: SagaContext) => {
            this.logger.log(
              `[${traceId}] Compensando Step 1: Débito do pagador`,
            );

            const journalId = context.step1Result?.debitJournalId;
            if (journalId) {
              await this.journalService.createReversalJournal(
                journalId,
                'Compensação PIX - Step 1 falhou',
                traceId,
                qr,
              );
              this.logger.log(`[${traceId}] Journal ${journalId} revertido`);
            }
          },
          maxRetries: 3,
          timeoutSeconds: 30,
        },
        {
          type: SagaStepType.CREDIT,
          name: 'Crédito do Recebedor',
          execute: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Step 2: Crédito do recebedor`);

            const journal = await this.journalService.createJournal(
              {
                ledgerId,
                type: JournalType.PIX,
                description: `PIX (mesma instituição) - Crédito ao recebedor`,
                correlationId: transactionId,
                causationId: context.step1Result?.debitJournalId,
                source: 'PIX_SAGA',
                createdBy: 'SYSTEM',
                entries: [
                  {
                    accountId: settlementAccountId,
                    side: EntrySide.DEBIT,
                    amount,
                    currencyId,
                    description: `Débito do settlement`,
                  },
                  {
                    accountId: receiverAccountId,
                    side: EntrySide.CREDIT,
                    amount,
                    currencyId,
                    description: `Crédito PIX - Recebedor`,
                  },
                ],
                metadata: {
                  transactionId,
                  step: 2,
                  institutionType: 'SAME_INSTITUTION',
                },
              },
              traceId,
              qr,
            );

            return {
              creditJournalId: journal.id,
              creditAmount: amount,
              receiverAccount: receiverAccountId,
            };
          },
          compensate: async (context: SagaContext) => {
            this.logger.log(
              `[${traceId}] Compensando Step 2: Crédito do recebedor`,
            );

            const journalId = context.step2Result?.creditJournalId;
            if (journalId) {
              await this.journalService.createReversalJournal(
                journalId,
                'Compensação PIX - Step 2 falhou',
                traceId,
                qr,
              );
              this.logger.log(`[${traceId}] Journal ${journalId} revertido`);
            }
          },
          maxRetries: 3,
          timeoutSeconds: 30,
        },
      ];

      // Cria a saga
      const saga = await this.createSaga(
        transactionId,
        `PIX-SAME-${Date.now()}`,
        steps.map((step) => ({
          type: step.type,
          inputData: {
            ...step.inputData,
            name: step.name,
          },
          compensation: step.compensation ? { name: step.name } : undefined,
          maxRetries: step.maxRetries,
          timeoutSeconds: step.timeoutSeconds,
        })),
        {
          payerAccountId,
          receiverAccountId,
          settlementAccountId,
          amount,
          currencyId,
          institutionType: 'SAME_INSTITUTION',
        },
        qr,
      );

      // Executa a saga
      const context: SagaContext = {};
      const executedSaga = await this.executeSaga(
        saga.id,
        steps,
        context,
        traceId,
        qr,
      );

      return executedSaga;
    } catch (error: any) {
      this.logger.error(
        `[${traceId}] Erro no PIX mesma instituição: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Executa PIX para instituições diferentes (4 steps)
   */
  async executePixCrossInstitution(
    transactionId: string,
    payerAccountId: string,
    receiverAccountId: string,
    payerReserveAccountId: string,
    spiReserveAccountId: string,
    receiverReserveAccountId: string,
    amount: number,
    currencyId: string,
    ledgerId: string,
    traceId: string,
    queryRunner: any,
  ): Promise<Saga> {
    const qr = queryRunner || this.dataSource.createQueryRunner();

    try {
      this.logger.log(`[${traceId}] Executando PIX instituições diferentes`);

      // Define os steps da saga (4 steps)
      const steps: SagaStepConfig[] = [
        {
          type: SagaStepType.DEBIT,
          name: 'Débito do Pagador',
          execute: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Step 1: Débito do pagador`);

            const journal = await this.journalService.createJournal(
              {
                ledgerId,
                type: JournalType.TRANSFER_DEBIT,
                description: `PIX (cross) - Débito do pagador`,
                correlationId: transactionId,
                source: 'PIX_SAGA_CROSS',
                createdBy: 'SYSTEM',
                entries: [
                  {
                    accountId: payerAccountId,
                    side: EntrySide.DEBIT,
                    amount,
                    currencyId,
                    description: `Débito PIX - Pagador`,
                  },
                  {
                    accountId: payerReserveAccountId,
                    side: EntrySide.CREDIT,
                    amount,
                    currencyId,
                    description: `Reserva para liquidação SPI`,
                  },
                ],
                metadata: {
                  transactionId,
                  step: 1,
                  institutionType: 'CROSS_INSTITUTION',
                },
              },
              traceId,
              qr,
            );

            return {
              debitJournalId: journal.id,
              debitAmount: amount,
              payerAccount: payerAccountId,
            };
          },
          compensate: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Compensando Step 1`);

            const journalId = context.step1Result?.debitJournalId;
            if (journalId) {
              await this.journalService.createReversalJournal(
                journalId,
                'Compensação PIX - Step 1 falhou',
                traceId,
                qr,
              );
            }
          },
          maxRetries: 3,
          timeoutSeconds: 30,
        },
        {
          type: SagaStepType.SETTLEMENT,
          name: 'Liquidação SPI (Saída)',
          execute: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Step 2: Liquidação SPI saída`);

            const journal = await this.journalService.createJournal(
              {
                ledgerId,
                type: JournalType.LIQUIDACAO_SAIDA,
                description: `PIX (cross) - Liquidação SPI saída`,
                correlationId: transactionId,
                causationId: context.step1Result?.debitJournalId,
                source: 'PIX_SAGA_CROSS',
                createdBy: 'SYSTEM',
                entries: [
                  {
                    accountId: payerReserveAccountId,
                    side: EntrySide.DEBIT,
                    amount,
                    currencyId,
                    description: `Liquidação SPI - Débito`,
                  },
                  {
                    accountId: spiReserveAccountId,
                    side: EntrySide.CREDIT,
                    amount,
                    currencyId,
                    description: `Conta transitória SPI`,
                  },
                ],
                metadata: {
                  transactionId,
                  step: 2,
                  institutionType: 'CROSS_INSTITUTION',
                },
              },
              traceId,
              qr,
            );

            return {
              spiOutJournalId: journal.id,
            };
          },
          compensate: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Compensando Step 2`);

            const journalId = context.step2Result?.spiOutJournalId;
            if (journalId) {
              await this.journalService.createReversalJournal(
                journalId,
                'Compensação PIX - Step 2 falhou',
                traceId,
                qr,
              );
            }
          },
          maxRetries: 3,
          timeoutSeconds: 30,
        },
        {
          type: SagaStepType.SETTLEMENT,
          name: 'Liquidação SPI (Entrada)',
          execute: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Step 3: Liquidação SPI entrada`);

            const journal = await this.journalService.createJournal(
              {
                ledgerId,
                type: JournalType.LIQUIDACAO_ENTRADA,
                description: `PIX (cross) - Liquidação SPI entrada`,
                correlationId: transactionId,
                causationId: context.step2Result?.spiOutJournalId,
                source: 'PIX_SAGA_CROSS',
                createdBy: 'SYSTEM',
                entries: [
                  {
                    accountId: spiReserveAccountId,
                    side: EntrySide.DEBIT,
                    amount,
                    currencyId,
                    description: `Conta transitória SPI`,
                  },
                  {
                    accountId: receiverReserveAccountId,
                    side: EntrySide.CREDIT,
                    amount,
                    currencyId,
                    description: `Reserva do recebedor`,
                  },
                ],
                metadata: {
                  transactionId,
                  step: 3,
                  institutionType: 'CROSS_INSTITUTION',
                },
              },
              traceId,
              qr,
            );

            return {
              spiInJournalId: journal.id,
            };
          },
          compensate: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Compensando Step 3`);

            const journalId = context.step3Result?.spiInJournalId;
            if (journalId) {
              await this.journalService.createReversalJournal(
                journalId,
                'Compensação PIX - Step 3 falhou',
                traceId,
                qr,
              );
            }
          },
          maxRetries: 3,
          timeoutSeconds: 30,
        },
        {
          type: SagaStepType.CREDIT,
          name: 'Crédito do Recebedor',
          execute: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Step 4: Crédito do recebedor`);

            const journal = await this.journalService.createJournal(
              {
                ledgerId,
                type: JournalType.TRANSFER_CREDIT,
                description: `PIX (cross) - Crédito ao recebedor`,
                correlationId: transactionId,
                causationId: context.step3Result?.spiInJournalId,
                source: 'PIX_SAGA_CROSS',
                createdBy: 'SYSTEM',
                entries: [
                  {
                    accountId: receiverReserveAccountId,
                    side: EntrySide.DEBIT,
                    amount,
                    currencyId,
                    description: `Reserva do recebedor`,
                  },
                  {
                    accountId: receiverAccountId,
                    side: EntrySide.CREDIT,
                    amount,
                    currencyId,
                    description: `Crédito PIX - Recebedor`,
                  },
                ],
                metadata: {
                  transactionId,
                  step: 4,
                  institutionType: 'CROSS_INSTITUTION',
                },
              },
              traceId,
              qr,
            );

            return {
              creditJournalId: journal.id,
              creditAmount: amount,
              receiverAccount: receiverAccountId,
            };
          },
          compensate: async (context: SagaContext) => {
            this.logger.log(`[${traceId}] Compensando Step 4`);

            const journalId = context.step4Result?.creditJournalId;
            if (journalId) {
              await this.journalService.createReversalJournal(
                journalId,
                'Compensação PIX - Step 4 falhou',
                traceId,
                qr,
              );
            }
          },
          maxRetries: 3,
          timeoutSeconds: 30,
        },
      ];

      // Cria a saga
      const saga = await this.createSaga(
        transactionId,
        `PIX-CROSS-${Date.now()}`,
        steps.map((step) => ({
          type: step.type,
          inputData: {
            ...step.inputData,
            name: step.name,
          },
          compensation: step.compensation ? { name: step.name } : undefined,
          maxRetries: step.maxRetries,
          timeoutSeconds: step.timeoutSeconds,
        })),
        {
          payerAccountId,
          receiverAccountId,
          payerReserveAccountId,
          spiReserveAccountId,
          receiverReserveAccountId,
          amount,
          currencyId,
          institutionType: 'CROSS_INSTITUTION',
        },
        qr,
      );

      // Executa a saga
      const context: SagaContext = {};
      const executedSaga = await this.executeSaga(
        saga.id,
        steps,
        context,
        traceId,
        qr,
      );

      return executedSaga;
    } catch (error: any) {
      this.logger.error(`[${traceId}] Erro no PIX cross: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca saga por ID
   */
  async findById(id: string): Promise<Saga | null> {
    return this.sagaRepository.findOne({
      where: { id },
      relations: { steps: true, transaction: true },
    });
  }

  /**
   * Busca saga por transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<Saga | null> {
    return this.sagaRepository.findOne({
      where: { transactionId },
      relations: { steps: true, transaction: true },
    });
  }

  /**
   * Busca sagas por status
   */
  async findByStatus(status: SagaStatus): Promise<Saga[]> {
    return this.sagaRepository.find({
      where: { status },
      relations: { steps: true, transaction: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca sagas por período
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      status?: SagaStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<[Saga[], number]> {
    const queryBuilder = this.sagaRepository
      .createQueryBuilder('saga')
      .where('saga.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .leftJoinAndSelect('saga.steps', 'steps')
      .leftJoinAndSelect('saga.transaction', 'transaction')
      .orderBy('saga.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('saga.status = :status', {
        status: options.status,
      });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  /**
   * Retenta sagas com falha
   */
  async retryFailedSagas(): Promise<number> {
    const failedSagas = await this.sagaRepository.find({
      where: {
        status: SagaStatus.FAILED,
      },
      relations: { steps: true, transaction: true },
      order: { createdAt: 'ASC' },
    });

    let retriedCount = 0;

    for (const saga of failedSagas) {
      if (saga.canRetry()) {
        this.logger.log(`Retentando saga ${saga.id}`);

        // Incrementa contagem
        saga.retryCount += 1;
        saga.status = SagaStatus.INITIATED;
        saga.errorDetails = undefined;

        // Reseta steps
        for (const step of saga.steps) {
          if (step.status === SagaStepStatus.FAILED) {
            step.status = SagaStepStatus.PENDING;
            step.errorDetails = undefined;
            step.retryCount = 0;
          }
        }

        await this.sagaRepository.save(saga);
        await this.sagaStepRepository.save(saga.steps);

        // Executa novamente
        // Nota: A execução deve ser feita pelo serviço que orquestra a saga
        retriedCount++;
      } else {
        this.logger.warn(
          `Saga ${saga.id} excedeu o número máximo de retentativas`,
        );
        saga.status = SagaStatus.ABORTED;
        await this.sagaRepository.save(saga);
      }
    }

    return retriedCount;
  }

  /**
   * Limpa sagas antigas
   */
  async cleanOldSagas(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.sagaRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [
          SagaStatus.COMPLETED,
          SagaStatus.COMPENSATED,
          SagaStatus.ABORTED,
        ],
      })
      .andWhere('completedAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Removidas ${result.affected || 0} sagas antigas`);
    return result.affected || 0;
  }

  /**
   * Obtém estatísticas de sagas
   */
  async getSagaStats(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const queryBuilder = this.sagaRepository
      .createQueryBuilder('saga')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN status = :completed THEN 1 END)', 'completed')
      .addSelect('COUNT(CASE WHEN status = :failed THEN 1 END)', 'failed')
      .addSelect(
        'COUNT(CASE WHEN status = :compensating THEN 1 END)',
        'compensating',
      )
      .addSelect(
        'COUNT(CASE WHEN status = :compensated THEN 1 END)',
        'compensated',
      )
      .addSelect('COUNT(CASE WHEN status = :timeout THEN 1 END)', 'timeout')
      .addSelect('AVG(retryCount)', 'avgRetries')
      .setParameters({
        completed: SagaStatus.COMPLETED,
        failed: SagaStatus.FAILED,
        compensating: SagaStatus.COMPENSATING,
        compensated: SagaStatus.COMPENSATED,
        timeout: SagaStatus.TIMEOUT,
      });

    if (options?.startDate) {
      queryBuilder.andWhere('saga.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('saga.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    const result = await queryBuilder.getRawOne();

    // Tempo médio de execução
    const avgDuration = await this.sagaRepository
      .createQueryBuilder('saga')
      .select(
        'AVG(EXTRACT(EPOCH FROM (completedAt - startedAt)))',
        'avgDuration',
      )
      .where('status = :status', { status: SagaStatus.COMPLETED })
      .getRawOne();

    return {
      total: parseInt(result?.total || '0'),
      completed: parseInt(result?.completed || '0'),
      failed: parseInt(result?.failed || '0'),
      compensating: parseInt(result?.compensating || '0'),
      compensated: parseInt(result?.compensated || '0'),
      timeout: parseInt(result?.timeout || '0'),
      avgRetries: parseFloat(result?.avgRetries || '0'),
      avgDurationSeconds: parseFloat(avgDuration?.avgDuration || '0'),
    };
  }
}
