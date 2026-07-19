// src/core/audit/controllers/audit.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditEntity } from '../../infra/database/common/enums/audit.enum';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('entity/:entity/:id')
  @ApiOperation({ summary: 'Get audit logs by entity' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logs found' })
  async findByEntity(
    @Param('entity') entity: AuditEntity,
    @Param('id') id: string,
    @Query() query: QueryAuditDto,
  ) {
    return this.auditService.findByEntity(entity, id, {
      limit: query.limit,
      offset: query.offset,
      actions: query.action ? [query.action] : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs by user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logs found' })
  async findByUser(
    @Param('userId') userId: string,
    @Query() query: QueryAuditDto,
  ) {
    return this.auditService.findByUser(userId, {
      limit: query.limit,
      offset: query.offset,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('trace/:traceId')
  @ApiOperation({ summary: 'Get audit logs by trace ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logs found' })
  async findByTraceId(@Param('traceId') traceId: string) {
    return this.auditService.findByTraceId(traceId);
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'Get audit logs by request ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logs found' })
  async findByRequestId(@Param('requestId') requestId: string) {
    return this.auditService.findByRequestId(requestId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics found' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('aggregate') aggregate?: AuditEntity,
  ) {
    return this.auditService.getAuditStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      aggregate,
    });
  }

  @Post('clean')
  @ApiOperation({ summary: 'Clean old audit logs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Old logs cleaned' })
  @HttpCode(HttpStatus.OK)
  async clean(@Body('daysToKeep') daysToKeep?: number) {
    const cleaned = await this.auditService.cleanOldLogs(daysToKeep || 90);
    return { cleaned };
  }

  @Get('history/:entity/:id')
  @ApiOperation({ summary: 'Get entity history' })
  @ApiResponse({ status: HttpStatus.OK, description: 'History found' })
  async getHistory(
    @Param('entity') entity: AuditEntity,
    @Param('id') id: string,
    @Query('fields') fields?: string,
  ) {
    const fieldArray = fields ? fields.split(',') : undefined;
    return this.auditService.getEntityHistory(entity, id, fieldArray);
  }
}