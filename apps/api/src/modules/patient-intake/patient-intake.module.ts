import { Module } from '@nestjs/common';
import { PatientIntakeController } from './patient-intake.controller';
import { PatientIntakeService } from './patient-intake.service';

@Module({
  controllers: [PatientIntakeController],
  providers: [PatientIntakeService],
  exports: [PatientIntakeService],
})
export class PatientIntakeModule {}