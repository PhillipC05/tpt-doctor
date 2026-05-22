import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsExtendedController } from './prescriptions-extended.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsExtendedService } from './prescriptions-extended.service';

@Module({
  controllers: [PrescriptionsController, PrescriptionsExtendedController],
  providers: [PrescriptionsService, PrescriptionsExtendedService],
  exports: [PrescriptionsService, PrescriptionsExtendedService],
})
export class PrescriptionsModule {}