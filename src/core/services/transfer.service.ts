import { Inject, Injectable, Logger } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { IdempotencyRepository } from "src/infra/database/repositories/idempotency.repository";
import type { Request } from 'express';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);
  constructor(@Inject(REQUEST) private readonly request: Request) { }

  /**
   * Realiza uma transferência interna entre contas na mesma instituição
   * @param dto Dados da transferência
   * @returns Dados da transferência realizada
   */
  async internalTransfer(dto: { idempotencyKey: string }) {
    const { hash } = this.request;
    this.logger.log(`[${hash}] Internal transfer`, dto);
    return dto
  }
}