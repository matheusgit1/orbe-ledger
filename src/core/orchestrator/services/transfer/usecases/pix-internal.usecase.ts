import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { BalanceService } from 'src/core/services/balance.service';
import { Account } from 'src/infra/database/entities/account.entity';
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
import { AccountsService } from 'src/core/services/accounts.service';
import { TransferRules } from 'src/core/rules/business/transfer.rules';
import { IdempotencyRules } from 'src/core/rules/business/idempotency.rules';
import { Transaction } from 'src/infra/database/entities/transaction.entity';
import { Journal } from 'src/infra/database/entities/journal.entity';
import { LedgerPosting } from 'src/core/posting/ledger.posting';
import { QueryRunner } from 'typeorm/browser';
import { Ledger } from 'src/infra/database/entities/ledger.entity';

@Injectable()
export class PixInternalUsecase {
  private readonly logger = new Logger(PixInternalUsecase.name);
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly accountService: AccountsService,
    private readonly auditService: AuditService,
    private readonly transactionService: TransactionService,
    private readonly dataSource: DataSource,
    private readonly transferRules: TransferRules,
    private readonly idempotencyRules: IdempotencyRules,
    private readonly ledgerPostingSerive: LedgerPosting,
  ) {}

  private async getQueryRunner() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return { queryRunner };
  }

  async handler(body: {
    requestId: string;
    accountOrigin: Account;
    accountDestination: Account;
    ledger: Ledger;
    amount: number;
    idempotencyKey: string;
    pixKey: string;
    description: string;
    metadata: Record<string, any>;
  }) {
    const { queryRunner } = await this.getQueryRunner();
    try {
      await this.accountService.lockAccountsByIds(queryRunner, [
        body.accountOrigin.id,
        body.accountDestination.id,
      ]);

      const idempotencyResult = await this.idempotencyRules.validate({
        key: body.idempotencyKey,
        requestId: body.requestId,
      });

      console.log('idempotency result: ', idempotencyResult);

      //TODo - valdiar denpotencia  atualizar ou criar um noca
      // if (idempotencyResult && !idempotencyResult.isPending()) {
      //   return idempotencyResult?.response || null;
      // }

      const { payerAccount, receiverAccount } =
        await this.transferRules.validate({
          payerAccount: body.accountOrigin,
          receiverAccount: body.accountDestination,
          amount: body.amount,
        });

      console.log({ payerAccount, receiverAccount });

      const savedTransaction = await this.transactionService.createTransaction({
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
      });

      console.log('transação: ', savedTransaction);

      const idempotency =
        idempotencyResult ??
        (await this.idempotencyService.create({
          key: body.idempotencyKey,
          hash: body.requestId,
          request: { ...body },
          metadata: { created_by: 'SYTEM', type: 'PIX_INTERNAL' },
          ttl: 86400,
          entityType: EntityType.TRANSACTION,
          entityId: savedTransaction!.id,
        }));

      const journal = await this.ledgerPostingSerive.postPixInternal(
        queryRunner,
        {
          ledger: body.ledger,
          body: body,
          payerAccount: payerAccount,
          receiverAccount: receiverAccount,
          transaction: savedTransaction!,
          requestId: body.requestId,
        },
      );

      await this.auditService.createAudit(
        AuditEntity.TRANSACTION,
        savedTransaction!.id,
        AuditAction.UPDATE,
        'SYSTEM',
        body.requestId,
        {
          amount: body.amount,
          payer: payerAccount.id,
          receiver: receiverAccount.id,
          idempotencyKey: body.idempotencyKey,
        },
        {
          transactionId: savedTransaction!.id,
          status: savedTransaction!.status,
          debitEntryId: journal
            .getDebitEntry()
            .map((e) => e.id)
            .join(','),
          creditEntryId: journal
            .getCreditEntry()
            .map((e) => e.id)
            .join(','),
        },
      );

      await this.transactionService.complete(queryRunner, savedTransaction!);

      const resp = this.buildResponse(savedTransaction!, journal);

      await this.idempotencyService.updateWithQueryRunner(
        queryRunner,
        idempotency.setAsCompleted(resp),
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `[${body.requestId}] PIX (mesma instituição) concluído com sucesso`,
      );

      return resp;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[${body.requestId}] Erro na transferência PIX: ${err.message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private buildResponse(transaction: Transaction, journal: Journal) {
    return {
      status: 'completed',
      transactionId: transaction.id,
      debitEntryId: journal
        .getDebitEntry()
        .map((e) => e.id)
        .join(','),
      creditEntryId: journal
        .getCreditEntry()
        .map((e) => e.id)
        .join(','),
      amount: transaction.amount,
      payerAccount: transaction.originAccount.id,
      receiverAccount: transaction.destinationAccount.id,
      institutionType: 'SAME_INSTITUTION',
      completedAt: transaction.completedAt,
    };
  }

  /**
   * Valida chave PIX
   */
  // private validatePixKey(pixKey: string, receiverAccount: Account): void {
  //   // Verificar se a chave PIX está associada à conta destino
  //   if (receiverAccount.metadata?.pixKeys) {
  //     const pixKeys = receiverAccount.metadata.pixKeys;
  //     if (!pixKeys.includes(pixKey)) {
  //       throw new Error(
  //         `Chave PIX ${pixKey} não está associada à conta destino`,
  //       );
  //     }
  //   } else {
  //     // Se a conta não tiver chaves PIX registradas, validar formato
  //     this.validatePixKeyFormat(pixKey);
  //   }
  // }

  // /**
  //  * Valida formato da chave PIX
  //  */
  // private validatePixKeyFormat(pixKey: string): void {
  //   // CPF: 000.000.000-00 ou 00000000000
  //   const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;

  //   // CNPJ: 00.000.000/0000-00 ou 00000000000000
  //   const cnpjRegex = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/;

  //   // Email: usuario@dominio.com
  //   const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  //   // Telefone: (00) 00000-0000 ou 00000000000
  //   const phoneRegex = /^(\(\d{2}\)\s?\d{5}-\d{4}|\d{11})$/;

  //   // Chave aleatória (UUID)
  //   const uuidRegex =
  //     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  //   if (
  //     !cpfRegex.test(pixKey) &&
  //     !cnpjRegex.test(pixKey) &&
  //     !emailRegex.test(pixKey) &&
  //     !phoneRegex.test(pixKey) &&
  //     !uuidRegex.test(pixKey)
  //   ) {
  //     throw new Error(`Chave PIX inválida: ${pixKey}`);
  //   }
  // }
}
