import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EhrService } from './ehr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateAllergyDto,
  CreateConditionDto,
  CreateDecisionRuleDto,
  CreateEhrTemplateDto,
  CreateEncounterDto,
  CreateMedicationDto,
  EvaluateDecisionRulesDto,
  UpdateDecisionRuleDto,
  UpdateEhrTemplateDto,
  UpdateEncounterDto,
} from './ehr.dto';

@ApiTags('EHR')
@Controller('ehr')
@UseGuards(JwtAuthGuard)
export class EhrController {
  constructor(private readonly ehrService: EhrService) {}

  // --- Encounters (SOAP Notes) ---
  @Post('encounters')
  @ApiOperation({ summary: 'Create an encounter (SOAP note)' })
  async createEncounter(@Body() data: CreateEncounterDto, @Req() req: any) {
    return this.ehrService.createEncounter(data, req.user.tenantId, req.user.id);
  }

  @Get('patients/:patientId/encounters')
  @ApiOperation({ summary: 'Get all encounters for a patient' })
  async getEncounters(@Param('patientId') patientId: string, @Req() req: any) {
    return this.ehrService.findEncounters(patientId, req.user.tenantId);
  }

  @Get('encounters/:id')
  @ApiOperation({ summary: 'Get encounter by ID' })
  async getEncounter(@Param('id') id: string, @Req() req: any) {
    return this.ehrService.findEncounter(id, req.user.tenantId);
  }

  @Patch('encounters/:id')
  @ApiOperation({ summary: 'Update encounter (sign, edit notes)' })
  async updateEncounter(@Param('id') id: string, @Body() data: UpdateEncounterDto, @Req() req: any) {
    return this.ehrService.updateEncounter(id, data, req.user.tenantId, req.user.id);
  }

  // --- Medical Conditions ---
  @Post('conditions')
  @ApiOperation({ summary: 'Add a medical condition' })
  async createCondition(@Body() data: CreateConditionDto, @Req() req: any) {
    return this.ehrService.createMedicalCondition(data, req.user.tenantId, req.user.id);
  }

  @Get('patients/:patientId/conditions')
  @ApiOperation({ summary: 'Get all medical conditions for a patient' })
  async getConditions(@Param('patientId') patientId: string, @Req() req: any) {
    return this.ehrService.findAllConditions(patientId, req.user.tenantId);
  }

  // --- Allergies ---
  @Post('allergies')
  @ApiOperation({ summary: 'Add an allergy' })
  async createAllergy(@Body() data: CreateAllergyDto, @Req() req: any) {
    return this.ehrService.createAllergy(data, req.user.tenantId, req.user.id);
  }

  @Get('patients/:patientId/allergies')
  @ApiOperation({ summary: 'Get all allergies for a patient' })
  async getAllergies(@Param('patientId') patientId: string, @Req() req: any) {
    return this.ehrService.findAllAllergies(patientId, req.user.tenantId);
  }

  // --- Medications ---
  @Post('medications')
  @ApiOperation({ summary: 'Add a patient medication' })
  async createMedication(@Body() data: CreateMedicationDto, @Req() req: any) {
    return this.ehrService.createMedication(data, req.user.tenantId, req.user.id);
  }

  @Get('patients/:patientId/medications')
  @ApiOperation({ summary: 'Get all active medications for a patient' })
  async getMedications(@Param('patientId') patientId: string, @Req() req: any) {
    return this.ehrService.findAllMedications(patientId, req.user.tenantId);
  }

  // --- Timeline ---
  @Get('patients/:patientId/timeline')
  @ApiOperation({ summary: 'Get patient clinical timeline' })
  async getTimeline(@Param('patientId') patientId: string, @Req() req: any) {
    return this.ehrService.getPatientTimeline(patientId, req.user.tenantId);
  }

  // ===== EHR Templates =====
  @Post('templates')
  @ApiOperation({ summary: 'Create an EHR template' })
  async createTemplate(@Body() data: CreateEhrTemplateDto, @Req() req: any) {
    return this.ehrService.createTemplate(data, req.user.tenantId, req.user.id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get EHR templates' })
  async getTemplates(
    @Query('templateType') templateType: string,
    @Query('category') category: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.ehrService.getTemplates(req.user.tenantId, { templateType, category, page, pageSize });
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get EHR template by ID' })
  async getTemplate(@Param('id') id: string, @Req() req: any) {
    return this.ehrService.getTemplate(id, req.user.tenantId);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update an EHR template' })
  async updateTemplate(@Param('id') id: string, @Body() data: UpdateEhrTemplateDto, @Req() req: any) {
    return this.ehrService.updateTemplate(id, data, req.user.tenantId, req.user.id);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete an EHR template' })
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    return this.ehrService.deleteTemplate(id, req.user.tenantId, req.user.id);
  }

  // ===== Clinical Decision Support =====
  @Post('decision-rules')
  @ApiOperation({ summary: 'Create a decision support rule' })
  async createDecisionRule(@Body() data: CreateDecisionRuleDto, @Req() req: any) {
    return this.ehrService.createDecisionRule(data, req.user.tenantId, req.user.id);
  }

  @Get('decision-rules')
  @ApiOperation({ summary: 'Get decision support rules' })
  async getDecisionRules(
    @Query('category') category: string,
    @Query('isActive') isActive: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.ehrService.getDecisionRules(req.user.tenantId, {
      category, isActive: isActive ? isActive === 'true' : undefined, page, pageSize,
    });
  }

  @Post('decision-rules/evaluate/:patientId')
  @ApiOperation({ summary: 'Evaluate decision support rules for a patient' })
  async evaluateDecisionRules(@Param('patientId') patientId: string, @Body() context: EvaluateDecisionRulesDto, @Req() req: any) {
    return this.ehrService.evaluateDecisionRules(patientId, context, req.user.tenantId);
  }

  @Patch('decision-rules/:id')
  @ApiOperation({ summary: 'Update a decision support rule' })
  async updateDecisionRule(@Param('id') id: string, @Body() data: UpdateDecisionRuleDto, @Req() req: any) {
    return this.ehrService.updateDecisionRule(id, data, req.user.tenantId, req.user.id);
  }

  @Delete('decision-rules/:id')
  @ApiOperation({ summary: 'Delete a decision support rule' })
  async deleteDecisionRule(@Param('id') id: string, @Req() req: any) {
    return this.ehrService.deleteDecisionRule(id, req.user.tenantId, req.user.id);
  }
}
