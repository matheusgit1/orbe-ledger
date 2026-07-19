// src/core/audit/services/audit.service.ts
import { Injectable, Logger, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThan, MoreThan } from 'typeorm';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Audit } from '../../infra/database/entities/audit.entity';
import { AuditAction, AuditEntity } from '../../infra/database/common/enums/audit.enum';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private currentRequest: Request | null = null;

  constructor(
    @InjectRepository(Audit)
    private auditRepository: Repository<Audit>,
    private dataSource: DataSource,
  ) {}

  /**
   * Define a requisição atual para capturar contexto
   */
  setRequest(request: Request): void {
    this.currentRequest = request;
  }

  /**
   * Cria um log de auditoria
   */
  async createLog(
    aggregate: AuditEntity,
    aggregateId: string,
    action: AuditAction,
    userId: string,
    before?: any,
    after?: any,
    metadata?: Record<string, any>
  ): Promise<Audit | null> {
    try {
      const audit = Audit.create(
        aggregate,
        aggregateId,
        action,
        userId,
        before,
        after,
        metadata
      );

      // Adiciona contexto da requisição
      if (this.currentRequest) {
        audit.requestId = this.currentRequest.headers['x-request-id'] as string || uuidv4();
        audit.traceId = this.currentRequest.headers['x-trace-id'] as string || uuidv4();
        audit.ip = this.getClientIp(this.currentRequest);
        audit.userAgent = this.currentRequest.headers['user-agent'] as string || 'Unknown';
      }

      audit.validate();

      // Salva o log de forma assíncrona para não bloquear a operação principal
      setImmediate(async () => {
        try {
          await this.auditRepository.save(audit);
        } catch (error) {
          this.logger.error(`Failed to save audit log: ${error.message}`);
        }
      });

      return audit;

    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Não lança erro para não interromper a operação principal
      return null;
    }
  }

  /**
   * Cria logs em lote
   */
  async createLogsBatch(logs: Array<{
    aggregate: AuditEntity;
    aggregateId: string;
    action: AuditAction;
    userId: string;
    before?: any;
    after?: any;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    try {
      const auditLogs = logs.map(log => {
        const audit = Audit.create(
          log.aggregate,
          log.aggregateId,
          log.action,
          log.userId,
          log.before,
          log.after,
          log.metadata
        );
        audit.validate();
        return audit;
      });

      await this.auditRepository.save(auditLogs);
      this.logger.log(`Created ${auditLogs.length} audit logs in batch`);

    } catch (error) {
      this.logger.error(`Failed to create audit logs batch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca logs por entidade
   */
  async findByEntity(
    aggregate: AuditEntity,
    aggregateId: string,
    options?: {
      limit?: number;
      offset?: number;
      actions?: AuditAction[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<[Audit[], number]> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.aggregate = :aggregate', { aggregate })
      .andWhere('audit.aggregateId = :aggregateId', { aggregateId })
      .orderBy('audit.createdAt', 'DESC');

    if (options?.actions && options.actions.length > 0) {
      queryBuilder.andWhere('audit.action IN (:...actions)', { actions: options.actions });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
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
   * Busca logs por usuário
   */
  async findByUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<[Audit[], number]> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.userId = :userId', { userId })
      .orderBy('audit.createdAt', 'DESC');

    if (options?.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
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
   * Busca logs por ação
   */
  async findByAction(
    action: AuditAction,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<[Audit[], number]> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.action = :action', { action })
      .orderBy('audit.createdAt', 'DESC');

    if (options?.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
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
   * Busca logs por período
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      limit?: number;
      offset?: number;
      aggregate?: AuditEntity;
      action?: AuditAction;
    }
  ): Promise<[Audit[], number]> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('audit.createdAt', 'DESC');

    if (options?.aggregate) {
      queryBuilder.andWhere('audit.aggregate = :aggregate', { aggregate: options.aggregate });
    }

    if (options?.action) {
      queryBuilder.andWhere('audit.action = :action', { action: options.action });
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
   * Busca logs por trace ID
   */
  async findByTraceId(traceId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { traceId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Busca logs por request ID
   */
  async findByRequestId(requestId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { requestId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Obtém histórico de alterações de uma entidade
   */
  async getEntityHistory(
    aggregate: AuditEntity,
    aggregateId: string,
    fields?: string[]
  ): Promise<any[]> {
    const logs = await this.auditRepository.find({
      where: {
        aggregate,
        aggregateId,
      },
      order: { createdAt: 'DESC' },
    });

    if (!fields || fields.length === 0) {
      return logs;
    }

    // Filtra apenas os campos solicitados
    return logs.map(log => {
      const filtered: any = {
        id: log.id,
        action: log.action,
        userId: log.userId,
        createdAt: log.createdAt,
      };

      if (log.changes) {
        filtered.changes = {};
        for (const field of fields) {
          if (log.changes[field]) {
            filtered.changes[field] = log.changes[field];
          }
        }
      }

      return filtered;
    });
  }

  /**
   * Obtém estatísticas de auditoria
   */
  async getAuditStats(options?: {
    startDate?: Date;
    endDate?: Date;
    aggregate?: AuditEntity;
  }): Promise<any> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(DISTINCT userId)', 'uniqueUsers')
      .addSelect('COUNT(DISTINCT aggregateId)', 'uniqueEntities');

    if (options?.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
    }

    if (options?.aggregate) {
      queryBuilder.andWhere('audit.aggregate = :aggregate', { aggregate: options.aggregate });
    }

    const result = await queryBuilder.getRawOne();

    // Busca ações mais comuns
    const topActions = await this.auditRepository
      .createQueryBuilder('audit')
      .select('action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('action')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      total: parseInt(result?.total || '0'),
      uniqueUsers: parseInt(result?.uniqueUsers || '0'),
      uniqueEntities: parseInt(result?.uniqueEntities || '0'),
      topActions: topActions.map(item => ({
        action: item.action,
        count: parseInt(item.count || '0'),
      })),
    };
  }

  /**
   * Limpa logs antigos
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned ${result.affected || 0} old audit logs`);
    return result.affected || 0;
  }

  /**
   * Obtém IP do cliente
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || 'Unknown';
  }

  /**
   * Log de operação com detalhes
   */
  async logOperation(
    entityType: AuditEntity,
    entityId: string,
    operation: string,
    userId: string,
    details?: any
  ): Promise<void> {
    await this.createLog(
      entityType,
      entityId,
      operation as AuditAction,
      userId,
      null,
      details,
      { timestamp: new Date().toISOString() }
    );
  }

  /**
   * Log de erro
   */
  async logError(
    entityType: AuditEntity,
    entityId: string,
    error: Error,
    userId: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.createLog(
      entityType,
      entityId,
      AuditAction.UPDATE,
      userId,
      null,
      { error: error.message, stack: error.stack },
      { ...context, errorType: 'ERROR' }
    );
  }

  /**
   * Log de acesso
   */
  async logAccess(
    entityType: AuditEntity,
    entityId: string,
    userId: string,
    action: string
  ): Promise<void> {
    await this.createLog(
      entityType,
      entityId,
      AuditAction.CREATE,
      userId,
      null,
      { access: true },
      { action, accessedAt: new Date().toISOString() }
    );
  }
}