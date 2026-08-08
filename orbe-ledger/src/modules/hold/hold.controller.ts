import { Body, Controller, Post } from '@nestjs/common';
import { HoldService } from './hold.service';
import { CreateHoldDto } from './dtos/create-hold.dto';
import { ReleaseHoldDto } from './dtos/release-hold.dto';
import { CaptureHoldDto } from './dtos/capture-hold.dto';

@Controller('hold')
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Post()
  async createHold(@Body() dto: CreateHoldDto) {
    return await this.holdService.createHold(dto);
  }

  @Post('/release')
  async releaseHold(@Body() dto: ReleaseHoldDto) {
    return await this.holdService.releaseHold(dto);
  }

  @Post('/capture')
  async captureHold(@Body() dto: CaptureHoldDto) {
    return await this.holdService.captureHold(dto);
  }
}
