import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePatientDto, MergePatientsDto, UpdateConsentDto, UpdatePatientDto, UploadDocumentDto } from './patients.dto';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  async create(@Body() data: CreatePatientDto, @Req() req: any) {
    return this.patientsService.create(data, req.user.tenantId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all patients' })
  async findAll(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('search') search: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc',
    @Req() req: any,
  ) {
    return this.patientsService.findAll(req.user.tenantId, { page, pageSize, search, sortBy, sortOrder });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.patientsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient' })
  async update(@Param('id') id: string, @Body() data: UpdatePatientDto, @Req() req: any) {
    return this.patientsService.update(id, data, req.user.tenantId, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete patient' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.patientsService.remove(id, req.user.tenantId, req.user.id);
  }

  // ===== Consent Management =====
  @Get(':id/consents')
  @ApiOperation({ summary: 'Get patient consents' })
  async getConsents(@Param('id') id: string, @Req() req: any) {
    return this.patientsService.getConsents(id, req.user.tenantId);
  }

  @Patch(':id/consents/:consentType')
  @ApiOperation({ summary: 'Update patient consent' })
  async updateConsent(
    @Param('id') id: string,
    @Param('consentType') consentType: string,
    @Body() data: UpdateConsentDto,
    @Req() req: any,
  ) {
    return this.patientsService.updateConsent(id, consentType, data, req.user.tenantId, req.user.id);
  }

  // ===== Patient Merge / Deduplication =====
  @Get('duplicates/search')
  @ApiOperation({ summary: 'Search for duplicate patients' })
  async searchDuplicates(
    @Query('firstName') firstName: string,
    @Query('lastName') lastName: string,
    @Query('email') email: string,
    @Query('phone') phone: string,
    @Req() req: any,
  ) {
    return this.patientsService.searchDuplicates(req.user.tenantId, { firstName, lastName, email, phone });
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge two patient records' })
  async mergePatients(@Body() data: MergePatientsDto, @Req() req: any) {
    return this.patientsService.mergePatients(data, req.user.tenantId, req.user.id);
  }

  // ===== Document Management =====
  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload document for patient' })
  async uploadDocument(@Param('id') id: string, @Body() data: UploadDocumentDto, @Req() req: any) {
    return this.patientsService.uploadDocument({ ...data, patientId: id }, req.user.tenantId, req.user.id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List patient documents' })
  async getDocuments(@Param('id') id: string, @Req() req: any) {
    return this.patientsService.getDocuments(id, req.user.tenantId);
  }

  @Delete('documents/:documentId')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(@Param('documentId') documentId: string, @Req() req: any) {
    return this.patientsService.deleteDocument(documentId, req.user.tenantId, req.user.id);
  }
}
