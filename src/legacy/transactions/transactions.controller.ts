import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Query,
  HttpStatus,
  HttpCode,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { TransactionService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';


@ApiTags('Transactions')
@Controller('transactions')
// @UseInterceptors(IdempotencyInterceptor)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create and execute a transaction' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Transaction created' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    // return this.transactionService.createTransaction(createTransactionDto);
  }

  @Post('hold')
  @ApiOperation({ summary: 'Create a held transaction (pre-authorization)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Held transaction created' })
  @HttpCode(HttpStatus.CREATED)
  async createHeld(
    @Body() createTransactionDto: CreateTransactionDto,
    @Query('holdDuration') holdDuration?: number
  ) {
    // return this.transactionService.createHeldTransaction(
    //   createTransactionDto,
    //   holdDuration || 300
    // );
  }

  @Post(':id/capture')
  @ApiOperation({ summary: 'Capture a held transaction' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction captured' })
  async captureHold(@Param('id') id: string) {
    // return this.transactionService.captureHeldTransaction(id);
  }

  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Reverse a transaction' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction reversed' })
  async reverse(
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    // return this.transactionService.reverseTransaction(id, reason);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction found' })
  async findOne(@Param('id') id: string) {
    // return this.transactionService.findById(id);
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get transactions by account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transactions found' })
  async findByAccount(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string
  ) {
    // return this.transactionService.findByAccountId(accountId, {
    //   limit: limit ? Number(limit) : undefined,
    //   offset: offset ? Number(offset) : undefined,
    //   status: status as any,
    // });
  }

  @Get('stats/:accountId')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics found' })
  async getStats(
    @Param('accountId') accountId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'day'
  ) {
    // return this.transactionService.getTransactionStats(accountId, period);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get transactions by date range' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transactions found' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    // return this.transactionService.findByDateRange(
    //   new Date(startDate),
    //   new Date(endDate),
    //   {
    //     limit: limit ? Number(limit) : undefined,
    //     offset: offset ? Number(offset) : undefined,
    //   }
    // );
  }
}