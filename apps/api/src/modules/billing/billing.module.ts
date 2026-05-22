import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingExtendedController } from './billing-extended.controller';
import { BillingService } from './billing.service';
import { BillingExtendedService } from './billing-extended.service';

@Module({
  controllers: [BillingController, BillingExtendedController],
  providers: [BillingService, BillingExtendedService],
  exports: [BillingService, BillingExtendedService],
})
export class BillingModule {}