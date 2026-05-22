import { Module } from '@nestjs/common';
import { CountryProfilesController } from './country-profiles.controller';
import { CountryProfilesService } from './country-profiles.service';
import { AuService } from './services/au/au.service';
import { NzService } from './services/nz/nz.service';
import { UkService } from './services/uk/uk.service';
import { CaService } from './services/ca/ca.service';

@Module({
  controllers: [CountryProfilesController],
  providers: [
    CountryProfilesService,
    AuService,
    NzService,
    UkService,
    CaService,
  ],
  exports: [
    CountryProfilesService,
    AuService,
    NzService,
    UkService,
    CaService,
  ],
})
export class CountryProfilesModule {}