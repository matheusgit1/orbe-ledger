import { Injectable } from '@nestjs/common';
import { MovementsObjectDto } from './dto/transfer-object.dto';
import { TransferService } from 'src/core/services/transfer.service';
import { IdempotencyRepository } from 'src/infra/database/repositories/idempotency.repository';
import { AccountsRepository } from 'src/infra/database/repositories/accounts.repository';
import { DataSource } from 'typeorm'

@Injectable()
export class MovementsService {
  constructor(
    private readonly transferService: TransferService,
    private readonly idempotencyRepository: IdempotencyRepository,
    private readonly accountsRepository: AccountsRepository,
    private readonly dataSource: DataSource
  ) { }

  async create(body: MovementsObjectDto) {
    // Verifica Idempotência
    // Valida regras
    // Abre Transaction
    // Chama LedgerService
    // Commit
    // Retorna resposta

    const idempotency = await this.idempotencyRepository.findByKey(body.idempotencyKey);
    if (idempotency) {
      return { status: 'ok', originalBody: body };
    }

    // const destination = await this.accountsRepository.findById(body.destinationAccountId);
    // if (!destination) {
    //   throw new Error('Destination account not found');
    // }

    // if (destination.isBlocked() || !destination.isActive() || !destination.canDebit()) {
    //   throw new Error('Destination account is blocked, inactive or cannot debit');
    // }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Chamar transferService aqui
      await queryRunner.commitTransaction();
      return { status: 'ok', originalBody: body };
    } catch (error) {

      console.error(error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
