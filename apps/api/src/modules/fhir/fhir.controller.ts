import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirResourceDto } from './fhir.dto';
import { ApiKeyGuard, RequireApiScope } from '../api-keys/api-key.guard';

@Controller('fhir')
@UseGuards(ApiKeyGuard)
@RequireApiScope('fhir:read')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  // ==========================================================================
  // Patient
  // ==========================================================================

  @Get('Patient')
  searchPatients(
    @Query('name') name?: string,
    @Query('identifier') identifier?: string,
    @Query('birthdate') birthDate?: string,
    @Query('gender') gender?: string,
  ) {
    const results = this.fhirService.searchPatients({ name, identifier, birthDate, gender });
    return this.fhirService.buildBundle(results);
  }

  @Get('Patient/:id')
  getPatient(@Param('id') id: string) {
    return this.fhirService.getPatient(id);
  }

  @Post('Patient')
  createPatient(@Body() body: FhirResourceDto) {
    return this.fhirService.createPatient(body as any);
  }

  @Put('Patient/:id')
  updatePatient(@Param('id') id: string, @Body() body: FhirResourceDto) {
    return this.fhirService.updatePatient(id, body as any);
  }

  @Delete('Patient/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePatient(@Param('id') id: string) {
    this.fhirService.deletePatient(id);
  }

  // ==========================================================================
  // Observation
  // ==========================================================================

  @Get('Observation')
  searchObservations(
    @Query('patient') patient?: string,
    @Query('code') code?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    const results = this.fhirService.searchObservations({ patient, code, date, status });
    return this.fhirService.buildBundle(results);
  }

  @Get('Observation/:id')
  getObservation(@Param('id') id: string) {
    return this.fhirService.getObservation(id);
  }

  @Post('Observation')
  createObservation(@Body() body: FhirResourceDto) {
    return this.fhirService.createObservation(body as any);
  }

  // ==========================================================================
  // MedicationRequest
  // ==========================================================================

  @Get('MedicationRequest')
  searchMedicationRequests(
    @Query('patient') patient?: string,
    @Query('status') status?: string,
  ) {
    const results = this.fhirService.searchMedicationRequests({ patient, status });
    return this.fhirService.buildBundle(results);
  }

  @Get('MedicationRequest/:id')
  getMedicationRequest(@Param('id') id: string) {
    return this.fhirService.getMedicationRequest(id);
  }

  @Post('MedicationRequest')
  createMedicationRequest(@Body() body: FhirResourceDto) {
    return this.fhirService.createMedicationRequest(body as any);
  }

  // ==========================================================================
  // Appointment
  // ==========================================================================

  @Get('Appointment')
  searchAppointments(
    @Query('patient') patient?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    const results = this.fhirService.searchAppointments({ patient, status, date });
    return this.fhirService.buildBundle(results);
  }

  @Get('Appointment/:id')
  getAppointment(@Param('id') id: string) {
    return this.fhirService.getAppointment(id);
  }

  @Post('Appointment')
  createAppointment(@Body() body: FhirResourceDto) {
    return this.fhirService.createAppointment(body as any);
  }

  // ==========================================================================
  // Encounter
  // ==========================================================================

  @Get('Encounter')
  searchEncounters(
    @Query('patient') patient?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    const results = this.fhirService.searchEncounters({ patient, status, date });
    return this.fhirService.buildBundle(results);
  }

  @Get('Encounter/:id')
  getEncounter(@Param('id') id: string) {
    return this.fhirService.getEncounter(id);
  }

  @Post('Encounter')
  createEncounter(@Body() body: FhirResourceDto) {
    return this.fhirService.createEncounter(body as any);
  }

  // ==========================================================================
  // Bulk Export ($export)
  // ==========================================================================

  @Get('$export')
  bulkExport() {
    return this.fhirService.exportAll();
  }
}
