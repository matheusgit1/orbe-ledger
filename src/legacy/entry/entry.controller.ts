import { Controller } from '@nestjs/common';
import { EntryService } from './entry.service';

@Controller()
export class EntryController {
  constructor(private readonly entryService: EntryService) {}
}
