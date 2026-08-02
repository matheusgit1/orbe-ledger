import { Injectable } from "@nestjs/common";
import { JournalService } from "../services/journal.service";

@Injectable()
export class LedgerHealth {
  constructor(
    private readonly journalService: JournalService
  ) {}
  
  async check() {
    // Check if journal service is working
    try {
      // await this.journalService.getJournalEntries(1, 10);
      // return { status: 'ok' };
    } catch (error) {
      // return { status: 'error', message: error.message };
    }
  }
}