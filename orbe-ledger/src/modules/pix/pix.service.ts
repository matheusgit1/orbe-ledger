import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PixRequestDto } from './dtos/pix-request.dto';
import { LedgerService } from 'src/core/services/ledger.service';
import { LedgerCode } from 'src/infra/database/common/enums/ledger.enum';
import { AccountsService } from 'src/core/services/accounts.service';
import { PixInternalUsecase } from 'src/core/orchestrator/services/transfer/usecases/pix-internal.usecase';

@Injectable()
export class PixService {
  private readonly logger = new Logger(PixService.name);
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly accountService: AccountsService,
    private readonly ledgerService: LedgerService,
    private readonly dataSource: DataSource,
    private readonly pixInternalUsecase: PixInternalUsecase,
  ) {}

  private async getQueryRunner() {
    const { hash } = this.request;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return { hash, queryRunner };
  }

  async transfer(body: PixRequestDto) {
    const { hash, queryRunner } = await this.getQueryRunner();

    try {
      const [payerAccount, receiverAccount] = await Promise.all([
        this.accountService.findById(queryRunner, body.originAccountId),
        this.accountService.findById(queryRunner, body.destinationAccountId),
      ]);

      if (!receiverAccount) {
        throw new Error(
          `Conta destino ${body.destinationAccountId} não encontrada`,
        );
      }
      if (!payerAccount) {
        throw new Error(`Conta origem ${body.originAccountId} não encontrada`);
      }

      const response = await this.pixInternalUsecase.handler({
        requestId: body.idempotencyKey,
        accountOrigin: payerAccount,
        accountDestination: receiverAccount,
        ledger: await this.ledgerService.getLedgerByCode(LedgerCode.PIX),
        amount: body.amount,
        idempotencyKey: body.idempotencyKey,
        pixKey: body.pixKey,
        description: body.description,
        metadata: body.metadata || {},
      });

      this.logger.log(
        `[${hash}] PIX (mesma instituição) concluído com sucesso`,
      );

      return this.buildResponse(response);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[${hash}] Erro na transferência PIX: ${JSON.stringify(err)}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private buildResponse(data: any) {
    return {
      data,
    };
  }
}
