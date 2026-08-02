import { Body, Controller, Post } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixRequestDto } from './dtos/pix-request.dto';

@Controller('pix')
export class PixController {
  constructor(private readonly pixService: PixService) {}

  @Post('transfer')
  async transfer(@Body() body: PixRequestDto) {
    return await this.pixService.transfer(body);
  }

  @Post('transfer-external')
  async transferExternal(@Body() body: PixRequestDto) {
    return await this.pixService.pixExternal(body);
  }
}
