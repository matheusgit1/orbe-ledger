// src/core/holds/services/hold.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Hold } from '../../infra/database/entities/hold.entity';
import { Repository, DataSource, LessThan, MoreThan, Between } from 'typeorm';
import { AccountsService } from '../acounts/accounts.service';
import { JournalService } from '../journal/journal.service';
import { OutboxService } from '../outbox/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { AuditAction, AuditEntity } from '../../infra/database/common/enums/audit.enum';
import { OutboxEventType } from '../../infra/database/common/enums/outbox.enum';
import { HoldStatus } from '../../infra/database/common/enums/hold.enum';


@Injectable()
export class HoldService {
  private readonly logger = new Logger(HoldService.name);


  constructor(
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
    private accountService: AccountsService,
    private journalService: JournalService,
    private outboxService: OutboxService,
    private auditService: AuditService,
    private dataSource: DataSource,
  ) {}

  /**
   * Cria um novo hold (retenção de valor)
   */
  async createHold(createHoldDto: CreateHoldDto): Promise<Hold> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Valida conta
      const account = await this.accountService.findById(createHoldDto.accountId);
      if (!account) {
        throw new BadRequestException(`Account ${createHoldDto.accountId} not found`);
      }
      
      if (!account.isActive()) {
        throw new BadRequestException(`Account ${account.id} is not active`);
      }

      // 2. Verifica saldo disponível
      const availableBalance = await this.journalService.getBalanceAtTime(
        account.id,
        new Date()
      );
      const heldBalance = await this.getHeldBalance(account.id);
      const realAvailable = availableBalance - heldBalance;

      if (realAvailable < createHoldDto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${realAvailable}, Required: ${createHoldDto.amount}, Held: ${heldBalance}`
        );
      }

      // 3. Cria o hold
      const hold = Hold.create(
        createHoldDto.accountId,
        createHoldDto.amount,
        account.currencyId,
        createHoldDto.reason,
        createHoldDto.expiresInSeconds || 300,
        // createHoldDto.exchangeRate || 1,
        createHoldDto.metadata
      );

      // 4. Se tiver journalId, associa
      if (createHoldDto.journalId) {
        hold.journalId = createHoldDto.journalId;
      }

      // 5. Se tiver transactionId, associa
      if (createHoldDto.transactionId) {
        hold.transactionId = createHoldDto.transactionId;
      }

      await queryRunner.manager.save(hold);

      // 6. Audit log
      await this.auditService.createLog(
        AuditEntity.HOLD,
        hold.id,
        AuditAction.CREATE,
        'SYSTEM',
        null,
        hold,
        { accountId: account.id, amount: hold.amount }
      );

      // 7. Evento outbox
      await this.outboxService.createEvent(
        'HOLD',
        hold.id,
        OutboxEventType.HOLD_CREATED,
        {
          holdId: hold.id,
          accountId: hold.accountId,
          amount: hold.amount,
          currencyId: hold.currencyId,
          reason: hold.reason,
          expiresAt: hold.expiresAt,
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Hold ${hold.id} created for account ${account.id}`);
      return hold;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create hold: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Captura um hold (converte em transação real)
   */
  async captureHold(holdId: string, amount?: number): Promise<Hold> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await this.findById(holdId);

      if (!hold.canCapture()) {
        throw new BadRequestException(
          `Hold ${holdId} cannot be captured. Status: ${hold.status}, Expired: ${hold.isExpiredByDate()}`
        );
      }

      // Captura o hold
      hold.capture(amount || hold.amount);
      await queryRunner.manager.save(hold);

      // Audit log
      await this.auditService.createLog(
        AuditEntity.HOLD,
        hold.id,
        AuditAction.UPDATE,
        'SYSTEM',
        { status: HoldStatus.ACTIVE },
        { status: HoldStatus.CAPTURED },
        { capturedAmount: hold.capturedAmount }
      );

      // Evento outbox
      await this.outboxService.createEvent(
        'HOLD',
        hold.id,
        OutboxEventType.HOLD_CAPTURED,
        {
          holdId: hold.id,
          accountId: hold.accountId,
          amount: hold.capturedAmount,
          capturedAt: hold.capturedAt,
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Hold ${holdId} captured with amount ${hold.capturedAmount}`);
      return hold;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to capture hold: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Libera um hold (sem capturar)
   */
  async releaseHold(holdId: string, reason?: string): Promise<Hold> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await this.findById(holdId);

      if (!hold.canRelease()) {
        throw new BadRequestException(
          `Hold ${holdId} cannot be released. Status: ${hold.status}, Expired: ${hold.isExpiredByDate()}`
        );
      }

      // Libera o hold
      hold.release(reason || 'Released by user');
      await queryRunner.manager.save(hold);

      // Audit log
      await this.auditService.createLog(
        AuditEntity.HOLD,
        hold.id,
        AuditAction.UPDATE,
        'SYSTEM',
        { status: HoldStatus.ACTIVE },
        { status: HoldStatus.RELEASED },
        { reason: hold.releaseReason }
      );

      // Evento outbox
      await this.outboxService.createEvent(
        'HOLD',
        hold.id,
        OutboxEventType.HOLD_RELEASED,
        {
          holdId: hold.id,
          accountId: hold.accountId,
          amount: hold.amount,
          releasedAt: hold.releasedAt,
          reason: hold.releaseReason,
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Hold ${holdId} released`);
      return hold;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to release hold: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Busca hold por ID
   */
  async findById(id: string): Promise<Hold> {
    const hold = await this.holdRepository.findOne({
      where: { id },
      relations: {
        account: true,
        currency: true,
        transaction: true,
        journal: true,
        entries: true,
      },
    });

    if (!hold) {
      throw new NotFoundException(`Hold ${id} not found`);
    }

    return hold;
  }

  /**
   * Busca holds por conta
   */
  async findByAccountId(
    accountId: string,
    options?: {
      status?: HoldStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<[Hold[], number]> {
    const queryBuilder = this.holdRepository
      .createQueryBuilder('hold')
      .where('hold.accountId = :accountId', { accountId })
      .leftJoinAndSelect('hold.account', 'account')
      .leftJoinAndSelect('hold.currency', 'currency')
      .leftJoinAndSelect('hold.transaction', 'transaction')
      .orderBy('hold.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('hold.status = :status', { status: options.status });
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
   * Busca holds ativos por conta
   */
  async findActiveHoldsByAccount(accountId: string): Promise<Hold[]> {
    return this.holdRepository.find({
      where: {
        accountId,
        status: HoldStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      relations: {
        currency: true,
      },
      order: { expiresAt: 'ASC' },
    });
  }

  /**
   * Busca holds expirados
   */
  async findExpiredHolds(): Promise<Hold[]> {
    return this.holdRepository.find({
      where: {
        status: HoldStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
      relations: {
        account: true,
        currency: true,
      },
    });
  }

  /**
   * Processa holds expirados automaticamente
   */
  async processExpiredHolds(): Promise<number> {
    const expiredHolds = await this.findExpiredHolds();
    let processedCount = 0;

    for (const hold of expiredHolds) {
      try {
        hold.expire();
        await this.holdRepository.save(hold);

        // Audit log
        await this.auditService.createLog(
          AuditEntity.HOLD,
          hold.id,
          AuditAction.UPDATE,
          'SYSTEM',
          { status: HoldStatus.ACTIVE },
          { status: HoldStatus.EXPIRED },
          { reason: 'Auto-expired' }
        );

        // Evento outbox
        await this.outboxService.createEvent(
          'HOLD',
          hold.id,
          OutboxEventType.HOLD_EXPIRED,
          {
            holdId: hold.id,
            accountId: hold.accountId,
            amount: hold.amount,
            expiredAt: new Date().toISOString(),
          }
        );

        processedCount++;
        this.logger.log(`Hold ${hold.id} expired automatically`);
      } catch (error) {
        this.logger.error(`Failed to expire hold ${hold.id}: ${error.message}`);
      }
    }

    return processedCount;
  }

  /**
   * Obtém saldo total retido de uma conta
   */
  async getHeldBalance(accountId: string, currencyId?: string): Promise<number> {
    const queryBuilder = this.holdRepository
      .createQueryBuilder('hold')
      .select('COALESCE(SUM(hold.amount), 0)', 'total')
      .where('hold.accountId = :accountId', { accountId })
      .andWhere('hold.status = :status', { status: HoldStatus.ACTIVE })
      .andWhere('hold.expiresAt > :now', { now: new Date() });

    if (currencyId) {
      queryBuilder.andWhere('hold.currencyId = :currencyId', { currencyId });
    }

    const result = await queryBuilder.getRawOne();
    return parseFloat(result?.total || '0');
  }

  /**
   * Obtém resumo dos holds de uma conta
   */
  async getHoldSummary(accountId: string): Promise<any> {
    const holds = await this.findActiveHoldsByAccount(accountId);

    if (holds.length === 0) {
      return {
        totalHolds: 0,
        totalAmount: 0,
        currencies: [],
        oldestExpiresAt: null,
        nearestExpiresAt: null,
      };
    }

    const totalAmount = holds.reduce((sum, h) => sum + h.amount, 0);
    const oldestExpiresAt = holds.reduce((min, h) => 
      h.expiresAt < min ? h.expiresAt : min, holds[0].expiresAt
    );
    const nearestExpiresAt = holds.reduce((min, h) => 
      h.expiresAt < min ? h.expiresAt : min, holds[0].expiresAt
    );

    // Agrupa por moeda
    const currencyMap = new Map();
    for (const hold of holds) {
      const key = hold.currencyId;
      if (!currencyMap.has(key)) {
        currencyMap.set(key, {
          currencyId: hold.currencyId,
          currencyCode: hold.currency?.code || 'BRL',
          total: 0,
          count: 0,
        });
      }
      const entry = currencyMap.get(key);
      entry.total += hold.amount;
      entry.count += 1;
    }

    return {
      totalHolds: holds.length,
      totalAmount,
      currencies: Array.from(currencyMap.values()),
      oldestExpiresAt,
      nearestExpiresAt,
    };
  }

  /**
   * Cancela um hold
   */
  async cancelHold(holdId: string, reason: string): Promise<Hold> {
    const hold = await this.findById(holdId);

    if (hold.status !== HoldStatus.ACTIVE) {
      throw new BadRequestException(
        `Hold ${holdId} cannot be cancelled. Status: ${hold.status}`
      );
    }

    hold.status = HoldStatus.CANCELLED;
    hold.releaseReason = {
      reason: `Cancelled: ${reason}`,
      cancelledAt: new Date().toISOString(),
    };

    await this.holdRepository.save(hold);

    // Audit log
    await this.auditService.createLog(
      AuditEntity.HOLD,
      hold.id,
      AuditAction.UPDATE,
      'SYSTEM',
      { status: HoldStatus.ACTIVE },
      { status: HoldStatus.CANCELLED },
      { reason }
    );

    // Evento outbox
    await this.outboxService.createEvent(
      'HOLD',
      hold.id,
      OutboxEventType.HOLD_RELEASED,
      {
        holdId: hold.id,
        accountId: hold.accountId,
        amount: hold.amount,
        cancelledAt: new Date().toISOString(),
        reason,
      }
    );

    this.logger.log(`Hold ${holdId} cancelled: ${reason}`);
    return hold;
  }

  /**
   * Estende o prazo de expiração de um hold
   */
  async extendHoldExpiration(holdId: string, additionalSeconds: number): Promise<Hold> {
    const hold = await this.findById(holdId);

    if (hold.status !== HoldStatus.ACTIVE) {
      throw new BadRequestException(
        `Hold ${holdId} cannot be extended. Status: ${hold.status}`
      );
    }

    const newExpiresAt = new Date(hold.expiresAt.getTime() + additionalSeconds * 1000);
    
    if (newExpiresAt <= new Date()) {
      throw new BadRequestException('New expiration date must be in the future');
    }

    hold.expiresAt = newExpiresAt;
    await this.holdRepository.save(hold);

    // Audit log
    await this.auditService.createLog(
      AuditEntity.HOLD,
      hold.id,
      AuditAction.UPDATE,
      'SYSTEM',
      { expiresAt: hold.expiresAt },
      { expiresAt: newExpiresAt },
      { additionalSeconds }
    );

    this.logger.log(`Hold ${holdId} extended by ${additionalSeconds} seconds`);
    return hold;
  }

  /**
   * Obtém estatísticas de holds
   */
  async getHoldStats(accountId: string): Promise<any> {
    const result = await this.holdRepository
      .createQueryBuilder('hold')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN status = :active THEN 1 ELSE 0 END)', 'active')
      .addSelect('SUM(CASE WHEN status = :captured THEN 1 ELSE 0 END)', 'captured')
      .addSelect('SUM(CASE WHEN status = :released THEN 1 ELSE 0 END)', 'released')
      .addSelect('SUM(CASE WHEN status = :expired THEN 1 ELSE 0 END)', 'expired')
      .addSelect('SUM(CASE WHEN status = :cancelled THEN 1 ELSE 0 END)', 'cancelled')
      .addSelect('SUM(amount)', 'totalAmount')
      .addSelect('AVG(amount)', 'averageAmount')
      .where('hold.accountId = :accountId', { accountId })
      .setParameters({
        active: HoldStatus.ACTIVE,
        captured: HoldStatus.CAPTURED,
        released: HoldStatus.RELEASED,
        expired: HoldStatus.EXPIRED,
        cancelled: HoldStatus.CANCELLED,
      })
      .getRawOne();

    return {
      ...result,
      total: parseInt(result?.total || '0'),
      active: parseInt(result?.active || '0'),
      captured: parseInt(result?.captured || '0'),
      released: parseInt(result?.released || '0'),
      expired: parseInt(result?.expired || '0'),
      cancelled: parseInt(result?.cancelled || '0'),
      totalAmount: parseFloat(result?.totalAmount || '0'),
      averageAmount: parseFloat(result?.averageAmount || '0'),
    };
  }

  /**
   * Limpa holds antigos (já processados)
   */
  async cleanOldHolds(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.holdRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [HoldStatus.CAPTURED, HoldStatus.RELEASED, HoldStatus.EXPIRED, HoldStatus.CANCELLED],
      })
      .andWhere('updated_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned ${result.affected || 0} old holds`);
    return result.affected || 0;
  }
}