import { Module } from '@nestjs/common';
import { PhiAnomalyService } from './phi-anomaly.service';
import { PhiAnomalyController } from './phi-anomaly.controller';

@Module({
  controllers: [PhiAnomalyController],
  providers: [PhiAnomalyService],
  exports: [PhiAnomalyService],
})
export class AuditlogModule {}
