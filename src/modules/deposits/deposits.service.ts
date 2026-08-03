import { Inject, Injectable, Logger } from '@nestjs/common';
import { TicketDepositDto } from './dtos/ticket-deposit.dto';
import { OrmService } from 'src/infra/database/orm/orm.service';
import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { AccountsService } from 'src/core/services/accounts.service';
import { LedgerService } from 'src/core/services/ledger.service';
import { TicketUsecase } from 'src/core/orchestrator/services/deposits/usecases/ticket.usecase';
import { LedgerCode } from 'src/infra/database/common/enums/ledger.enum';
import { ServiceService } from 'src/core/services/service.service';
import { FeeService } from 'src/core/services/fee.service';

@Injectable()
export class DepositsService {
  private logger = new Logger(DepositsService.name);
  constructor(
    @Inject(REQUEST)
    private request: Request,
    private readonly ormService: OrmService,
    private readonly accountService: AccountsService,
    private readonly ledgerService: LedgerService,
    private readonly ticketUsecase: TicketUsecase,
    private readonly serviceService: ServiceService,
    private readonly feeService: FeeService,
  ) {}

  async createTicket(dto: TicketDepositDto) {
    const { hash } = this.request;
    try {
      const [
        account,
        ticketTechnicalAccount,
        ledger,
        service,
        ticketRevenueAccount,
      ] = await Promise.all([
        this.accountService.findByNumber(dto.account),
        this.accountService.findByCode('BOLETO-SETTLEMENT'),
        this.ledgerService.getLedgerByCode(LedgerCode.MAIN),
        this.serviceService.getServiceByCode('SRV-TED'),
        this.accountService.findByCode('REVENUE-BOLETO'),
      ]);

      if (!account) {
        throw new Error('Conta não encontrada');
      }

      if (!ticketTechnicalAccount) {
        throw new Error('Conta técnica não encontrada');
      }

      const technicalAccountRevenue = this.feeService.calculateNetAmount(
        service,
        dto.amount,
      );
      console.log(
        'service: ',
        service,
        'technicalAccountRevenue: ',
        technicalAccountRevenue,
      );

      console.log(
        dto.amount,
        technicalAccountRevenue,
      );
      const response = await this.ticketUsecase.handler({
        receiverAccount: account,
        payerAccount: ticketTechnicalAccount,
        revenueAccount: ticketRevenueAccount,
        ledger,
        service,
        idempotencyKey: dto.idempotencyKey,
        requestId: hash,
        amount: dto.amount,
        tax: technicalAccountRevenue,
      });
      return response;
    } catch (err) {
      this.logger.error(
        `[${hash}] Erro na transferência PIX: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }
}
