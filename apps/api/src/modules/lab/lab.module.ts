import { Module } from '@nestjs/common';
import { LabController } from './lab.controller';
import { LabExtendedController } from './lab-extended.controller';
import { LabService } from './lab.service';
import { LabExtendedService } from './lab-extended.service';

@Module({
  controllers: [LabController, LabExtendedController],
  providers: [LabService, LabExtendedService],
  exports: [LabService, LabExtendedService],
})
export class LabModule {}