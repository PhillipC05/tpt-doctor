import { Module } from '@nestjs/common';
import { ClinicalCodingController } from './clinical-coding.controller';
import { ClinicalCodingService } from './clinical-coding.service';

@Module({
  controllers: [ClinicalCodingController],
  providers: [ClinicalCodingService],
  exports: [ClinicalCodingService],
})
export class ClinicalCodingModule {}