import { Module } from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineController } from './telemedicine.controller';
import { TelemedicineGateway } from './telemedicine.gateway';

@Module({
  controllers: [TelemedicineController],
  providers: [TelemedicineService, TelemedicineGateway],
  exports: [TelemedicineService],
})
export class TelemedicineModule {}