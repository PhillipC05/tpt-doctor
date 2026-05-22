// ============================================================================
// TPT Doctor — Immunisation Management Module
// ============================================================================

import { Module } from '@nestjs/common';
import { ImmunisationsService } from './immunisations.service';
import { ImmunisationsController } from './immunisations.controller';

@Module({
  controllers: [ImmunisationsController],
  providers: [ImmunisationsService],
  exports: [ImmunisationsService],
})
export class ImmunisationsModule {}