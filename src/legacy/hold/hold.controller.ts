// src/core/holds/controllers/hold.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { HoldService } from './hold.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { CaptureHoldDto } from './dto/capture-hold.dto';
import { ReleaseHoldDto } from './dto/release-hold.dto';

@ApiTags('Holds')
@Controller('holds')
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hold' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Hold created' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createHoldDto: CreateHoldDto) {
    return this.holdService.createHold(createHoldDto);
  }

  @Post(':id/capture')
  @ApiOperation({ summary: 'Capture a hold' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hold captured' })
  async capture(@Param('id') id: string, @Body() captureDto: CaptureHoldDto) {
    return this.holdService.captureHold(id, captureDto.amount);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release a hold' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hold released' })
  async release(@Param('id') id: string, @Body() releaseDto: ReleaseHoldDto) {
    return this.holdService.releaseHold(id, releaseDto.reason);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a hold' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hold cancelled' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.holdService.cancelHold(id, reason);
  }

  @Post(':id/extend')
  @ApiOperation({ summary: 'Extend hold expiration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hold extended' })
  async extend(
    @Param('id') id: string,
    @Body('additionalSeconds') additionalSeconds: number
  ) {
    return this.holdService.extendHoldExpiration(id, additionalSeconds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hold by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hold found' })
  async findOne(@Param('id') id: string) {
    return this.holdService.findById(id);
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get holds by account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Holds found' })
  async findByAccount(
    @Param('accountId') accountId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.holdService.findByAccountId(accountId, {
      status: status as any,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('account/:accountId/active')
  @ApiOperation({ summary: 'Get active holds by account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active holds found' })
  async findActive(@Param('accountId') accountId: string) {
    return this.holdService.findActiveHoldsByAccount(accountId);
  }

  @Get('account/:accountId/balance')
  @ApiOperation({ summary: 'Get held balance by account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Balance found' })
  async getHeldBalance(
    @Param('accountId') accountId: string,
    @Query('currencyId') currencyId?: string
  ) {
    return {
      accountId,
      heldBalance: await this.holdService.getHeldBalance(accountId, currencyId),
      currencyId: currencyId || 'all',
    };
  }

  @Get('account/:accountId/summary')
  @ApiOperation({ summary: 'Get hold summary by account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary found' })
  async getSummary(@Param('accountId') accountId: string) {
    return this.holdService.getHoldSummary(accountId);
  }

  @Get('account/:accountId/stats')
  @ApiOperation({ summary: 'Get hold statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics found' })
  async getStats(@Param('accountId') accountId: string) {
    return this.holdService.getHoldStats(accountId);
  }

  @Post('process-expired')
  @ApiOperation({ summary: 'Process expired holds' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expired holds processed' })
  async processExpired() {
    const processed = await this.holdService.processExpiredHolds();
    return { processed };
  }

  @Delete('clean')
  @ApiOperation({ summary: 'Clean old holds' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Old holds cleaned' })
  async clean(@Query('daysToKeep') daysToKeep?: number) {
    const cleaned = await this.holdService.cleanOldHolds(daysToKeep || 30);
    return { cleaned };
  }
}