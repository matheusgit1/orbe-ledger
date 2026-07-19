// src/core/journals/controllers/journal.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Patch, 
  Query,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { GetBalanceDto } from '../entry/dto/create-entry.dto';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalService } from './journal.service';

@ApiTags('Journals')
@Controller('journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journal with entries' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Journal created' })
  async create(@Body() createJournalDto: CreateJournalDto) {
    return this.journalService.createJournal(createJournalDto);
  }

  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Reverse a posted journal' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal reversed' })
  async reverse(
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.journalService.reverseJournal(id, reason);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get account balance at specific time' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Balance retrieved' })
  async getBalance(@Query() getBalanceDto: GetBalanceDto) {
    const asOfDate = getBalanceDto.asOfDate 
      ? new Date(getBalanceDto.asOfDate) 
      : new Date();
    return this.journalService.getBalanceAtTime(
      getBalanceDto.accountId,
      asOfDate
    );
  }
}