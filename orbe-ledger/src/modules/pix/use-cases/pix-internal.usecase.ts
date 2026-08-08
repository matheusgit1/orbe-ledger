// import { Body, Inject, Injectable } from '@nestjs/common';
// import { PixRequestDto } from '../dtos/pix-request.dto';
// import { PixResponseDto } from '../dtos/pix-response.dto';
// import { REQUEST } from '@nestjs/core';
// import { IdempotencyService } from 'src/core/services/idempotency.service';
// import { AccountsRepository } from 'src/infra/database/repositories/accounts.repository';
// import { BalanceService } from 'src/core/services/balance.service';
// import { JournalService } from 'src/core/services/journal.service';
// import { LedgerService } from 'src/core/services/ledger.service';
// import { AuditService } from 'src/core/services/audit.service';
// import { TransactionService } from 'src/core/services/transaction.service';
// import { DataSource } from 'typeorm';
// import type { Request } from 'express';
// import { Logger } from '@nestjs/common';
// import { TransactionType } from 'src/infra/database/common/enums/transaction.enum';
// import { LedgerCode } from 'src/infra/database/common/enums/ledger.enum';
// import {
//   EntrySide,
//   JournalStatus,
//   JournalType,
// } from 'src/infra/database/common/enums/journal.enum';
// import {
//   AuditAction,
//   AuditEntity,
// } from 'src/infra/database/common/enums/audit.enum';
// import { QueryRunner } from 'typeorm/browser';
// import { Account } from 'src/infra/database/entities/account.entity';

// @Injectable()
// export class PixInternalUsecase {
//   private readonly logger = new Logger(PixInternalUsecase.name);

//   public constructor(
//     @Inject(REQUEST) private readonly request: Request,
//     private readonly idempotencyService: IdempotencyService,
//     private readonly accountRepository: AccountsRepository,
//     private readonly balanceService: BalanceService,
//     private readonly journalService: JournalService,
//     private readonly ledgerService: LedgerService,
//     private readonly auditService: AuditService,
//     private readonly transactionService: TransactionService,
//     private readonly dataSource: DataSource,
//   ) {}

//   private async getQueryRunner() {
//     const { hash } = this.request;
//     const queryRunner = this.dataSource.createQueryRunner();
//     await queryRunner.connect();
//     await queryRunner.startTransaction();
//     return { hash, queryRunner };
//   }

//   async handle(dto: PixRequestDto): Promise<PixResponseDto> {
//     const { hash, queryRunner } = await this.getQueryRunner();
//     try {
//       this.logger.log(`[${hash}] Iniciando PIX (mesma instituição)`);

//       this.logger.log(`[${hash}] Passo 1: Validando idempotência`);

//       const idempotency = await this.idempotencyService.findByKey(
//         dto.idempotencyKey,
//       );

//       if (idempotency) {
//         this.logger.log(
//           `[${hash}] Idempotência já processada: ${dto.idempotencyKey}`,
//         );

//         return {
//           status: 'already_processed',
//           transactionId: idempotency.entityId || undefined,
//           idempotency: true,
//         };
//       }

//       const [payerAccount, receiverAccount] = await Promise.all([
//         this.accountRepository.findById(queryRunner, dto.originAccountId),
//         this.accountRepository.findById(queryRunner, dto.destinationAccountId),
//       ]);

//       if (!payerAccount) {
//         throw new Error(`Conta origem ${dto.originAccountId} não encontrada`);
//       }

//       if (!receiverAccount) {
//         throw new Error(
//           `Conta destino ${dto.destinationAccountId} não encontrada`,
//         );
//       }

//       await this.accountRepository.lockAccountsByIds(queryRunner, [
//         payerAccount.id,
//         receiverAccount.id,
//       ]);

//       await this.validateRules(
//         queryRunner,
//         payerAccount,
//         receiverAccount,
//         dto.amount,
//         dto.pixKey,
//       );

//       const savedTransaction = await this.transactionService.createTransaction(
//         queryRunner,
//         {
//           type: TransactionType.PIX,
//           amount: dto.amount,
//           currencyId: payerAccount.currencyId,
//           originAccountId: payerAccount.id,
//           destinationAccountId: receiverAccount.id,
//           correlationId: dto.idempotencyKey,
//           externalId: dto.pixKey,
//           metadata: {
//             pixKey: dto.pixKey,
//             description: dto.description,
//             institutionType: 'SAME_INSTITUTION',
//           },
//         },
//       );

//       const ledger = await this.ledgerService.getLedgerByCode(LedgerCode.PIX);

//       const journal = await this.journalService.registerJournal(
//         {
//           ledgerId: ledger.id,
//           type: JournalType.PIX,
//           status: JournalStatus.PENDING,
//           description: dto.description,
//           reference: dto.pixKey,
//           externalReference: dto.pixKey,
//           correlationId: savedTransaction.id,
//           causationId: dto.idempotencyKey,
//           idempotencyKey: dto.idempotencyKey,
//           source: 'PIX_SAME_INSTITUTION',
//           createdBy: 'SYSTEM',
//           metadata: {},
//           postedAt: new Date(),
//           entries: [
//             {
//               accountId: payerAccount.id,
//               side: EntrySide.DEBIT,
//               amount: dto.amount,
//               currencyId: payerAccount.currencyId,
//             },
//             {
//               accountId: receiverAccount.id,
//               side: EntrySide.CREDIT,
//               amount: dto.amount,
//               currencyId: receiverAccount.currencyId,
//             },
//           ],
//         },
//         hash,
//         queryRunner,
//       );

//       await this.transactionService.updateStatus(queryRunner, savedTransaction);

//       await this.auditService.createAudit(
//         AuditEntity.TRANSACTION,
//         savedTransaction.id,
//         AuditAction.UPDATE,
//         'SYSTEM',
//         hash,
//         {
//           amount: dto.amount,
//           payer: payerAccount.id,
//           receiver: receiverAccount.id,
//           idempotencyKey: dto.idempotencyKey,
//         },
//         {
//           transactionId: savedTransaction.id,
//           status: savedTransaction.status,
//           debitJournalId: journal
//             .getDebitEntry()
//             .map((e) => e.id)
//             .join(','),
//           creditJournalId: journal
//             .getCreditEntry()
//             .map((e) => e.id)
//             .join(','),
//         },
//       );

//       this.logger.log(
//         `[${hash}] PIX (mesma instituição) concluído com sucesso`,
//       );

//       return {
//         status: 'completed',
//         transactionId: savedTransaction.id,
//         debitJournalId: journal
//           .getDebitEntry()
//           .map((e) => e.id)
//           .join(','),
//         creditJournalId: journal
//           .getCreditEntry()
//           .map((e) => e.id)
//           .join(','),
//         amount: dto.amount,
//         payerAccount: payerAccount.id,
//         receiverAccount: receiverAccount.id,
//         institutionType: 'SAME_INSTITUTION',
//         completedAt: savedTransaction.completedAt,
//       };
//     } catch (err) {
//       await queryRunner.rollbackTransaction();
//       this.logger.error(`[${hash}] Erro na transferência PIX: ${err.message}`);
//       throw err;
//     } finally {
//       await queryRunner.release();
//     }
//   }

//   async validateRules(
//     queryRunner: QueryRunner,
//     payerAccount: Account,
//     receiverAccount: Account,
//     amount: number,
//     pixKey?: string,
//   ) {
//     this.validatePayerAccount(payerAccount);

//     this.validateReceiverAccount(receiverAccount);

//     this.validateTransfer(payerAccount, receiverAccount, amount);

//     const availableBalance = await this.balanceService.getAvailableBalance(
//       queryRunner,
//       payerAccount.id,
//       payerAccount.currencyId,
//     );

//     if (availableBalance < amount) {
//       throw new Error(
//         `Saldo insuficiente. Disponível: ${availableBalance}, Necessário: ${amount}`,
//       );
//     }

//     await this.validateLimits(payerAccount.id, amount, queryRunner);

//     if (pixKey) {
//       this.validatePixKey(pixKey, receiverAccount);
//     }
//   }

//   private validatePayerAccount(account: Account): void {
//     if (!account.isActive()) {
//       throw new Error(`Conta do pagador não está ativa: ${account.id}`);
//     }

//     if (!account.canDebit()) {
//       throw new Error(`Conta do pagador não permite débito: ${account.id}`);
//     }

//     if (account.isBlocked()) {
//       throw new Error(`Conta do pagador está bloqueada: ${account.id}`);
//     }
//   }

//   private validateReceiverAccount(account: Account): void {
//     if (!account.isActive()) {
//       throw new Error(`Conta do recebedor não está ativa: ${account.id}`);
//     }

//     if (!account.canCredit()) {
//       throw new Error(`Conta do recebedor não permite crédito: ${account.id}`);
//     }

//     if (account.isBlocked()) {
//       throw new Error(`Conta do recebedor está bloqueada: ${account.id}`);
//     }
//   }

//   private validateTransfer(
//     payerAccount: Account,
//     receiverAccount: Account,
//     amount: number,
//   ): void {
//     if (payerAccount.id === receiverAccount.id) {
//       throw new Error('Não é possível transferir para a mesma conta');
//     }

//     if (amount <= 0) {
//       throw new Error('O valor da transferência deve ser maior que zero');
//     }

//     if (payerAccount.currencyId !== receiverAccount.currencyId) {
//       throw new Error(
//         `Moedas diferentes: Pagador (${payerAccount.currencyId}) x Recebedor (${receiverAccount.currencyId})`,
//       );
//     }

//     if (amount < 0.01) {
//       throw new Error('Valor mínimo para PIX é R$ 0,01');
//     }

//     if (amount > 10000000) {
//       throw new Error('Valor máximo para PIX é R$ 10.000.000,00');
//     }
//   }

//   private async validateLimits(
//     accountId: string,
//     amount: number,
//     queryRunner: any,
//   ): Promise<void> {
//     const limits = await queryRunner.manager.findOne('Limit', {
//       where: { accountId },
//     });

//     if (!limits) {
//       return; // Sem limites configurados
//     }

//     // Verificar limite diário
//     if (limits.dailyDebit) {
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       const dailyTotal = await this.journalService.getAccountTotals(
//         accountId,
//         today,
//         new Date(),
//       );

//       if (dailyTotal.totalDebit + amount > limits.dailyDebit) {
//         throw new Error(
//           `Limite diário excedido. Disponível: ${limits.dailyDebit - dailyTotal.totalDebit}, Necessário: ${amount}`,
//         );
//       }
//     }

//     if (limits.monthlyDebit) {
//       const firstDayOfMonth = new Date();
//       firstDayOfMonth.setDate(1);
//       firstDayOfMonth.setHours(0, 0, 0, 0);

//       const monthlyTotal = await this.journalService.getAccountTotals(
//         accountId,
//         firstDayOfMonth,
//         new Date(),
//       );

//       if (monthlyTotal.totalDebit + amount > limits.monthlyDebit) {
//         throw new Error(
//           `Limite mensal excedido. Disponível: ${limits.monthlyDebit - monthlyTotal.totalDebit}, Necessário: ${amount}`,
//         );
//       }
//     }

//     // Verificar valor máximo por transação
//     if (limits.maxTransaction && amount > limits.maxTransaction) {
//       throw new Error(
//         `Valor da transação excede o limite. Máximo: ${limits.maxTransaction}, Solicitado: ${amount}`,
//       );
//     }
//   }

//   /**
//    * Valida chave PIX
//    */
//   private validatePixKey(pixKey: string, receiverAccount: Account): void {
//     // Verificar se a chave PIX está associada à conta destino
//     if (receiverAccount.metadata?.pixKeys) {
//       const pixKeys = receiverAccount.metadata.pixKeys;
//       if (!pixKeys.includes(pixKey)) {
//         throw new Error(
//           `Chave PIX ${pixKey} não está associada à conta destino`,
//         );
//       }
//     } else {
//       // Se a conta não tiver chaves PIX registradas, validar formato
//       this.validatePixKeyFormat(pixKey);
//     }
//   }

//   /**
//    * Valida formato da chave PIX
//    */
//   private validatePixKeyFormat(pixKey: string): void {
//     // CPF: 000.000.000-00 ou 00000000000
//     const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;

//     // CNPJ: 00.000.000/0000-00 ou 00000000000000
//     const cnpjRegex = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/;

//     // Email: usuario@dominio.com
//     const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

//     // Telefone: (00) 00000-0000 ou 00000000000
//     const phoneRegex = /^(\(\d{2}\)\s?\d{5}-\d{4}|\d{11})$/;

//     // Chave aleatória (UUID)
//     const uuidRegex =
//       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

//     if (
//       !cpfRegex.test(pixKey) &&
//       !cnpjRegex.test(pixKey) &&
//       !emailRegex.test(pixKey) &&
//       !phoneRegex.test(pixKey) &&
//       !uuidRegex.test(pixKey)
//     ) {
//       throw new Error(`Chave PIX inválida: ${pixKey}`);
//     }
//   }
// }
