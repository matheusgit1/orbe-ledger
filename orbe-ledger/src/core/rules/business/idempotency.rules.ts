import { Injectable, Logger } from '@nestjs/common';
import { IdempotencyService } from 'src/core/services/idempotency.service';
import { TransactionService } from 'src/core/services/transaction.service';
import { Idempotency } from 'src/infra/database/entities/idempotency.entity';

@Injectable()
export class IdempotencyRules {
  private readonly logger = new Logger(IdempotencyRules.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly transactionService: TransactionService,
  ) {}

  async validate(dto: {
    key: string;
    requestId: string;
  }): Promise<Idempotency | null> {
    const idempotency = await this.idempotencyService.findByKey(dto.key);

    if (!idempotency) {
      return null;
    }

    this.logger.log(
      `[${dto.requestId}] idempotency already processed: ${dto.key}`,
    );

    if (!idempotency.canRetry()) {
      throw new Error('Idempotency cannot be retried');
    }

    this.validateIdempotencyStatus(idempotency);

    if (idempotency.isPending() || idempotency.isFailed()) {
      await this.ensureTransactionExists(dto.key);
      return idempotency;
    }

    return idempotency;
  }

  private validateIdempotencyStatus(idempotency: Idempotency): void {
    if (idempotency.isProcessing()) {
      throw new Error('Request is being processed!');
    }

    if (idempotency.isExpired()) {
      throw new Error('Request expired!');
    }

    if (idempotency.isCompleted()) {
      throw new Error('Request already completed!');
    }
  }

  private async ensureTransactionExists(correlationId: string): Promise<void> {
    const transaction = await this.transactionService.findTransactionByFilter({
      correlationId,
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }
  }
}
