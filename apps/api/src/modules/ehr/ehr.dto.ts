import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateEncounterDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;

  @IsOptional()
  @IsString()
  encounterType?: string;

  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsObject()
  vitals?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  diagnosisCodes?: string[];
}

export class UpdateEncounterDto extends PartialType(CreateEncounterDto) {
  @IsOptional()
  @IsBoolean()
  isSigned?: boolean;
}

export class CreateConditionDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  conditionName: string;

  @IsOptional()
  @IsString()
  icd10Code?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsISO8601()
  onsetDate?: string;
}

export class CreateAllergyDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  allergen: string;

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsString()
  severity?: string;
}

export class CreateMedicationDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class CreateEhrTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  templateType?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsObject()
  content: Record<string, unknown>;
}

export class UpdateEhrTemplateDto extends PartialType(CreateEhrTemplateDto) {}

export class CreateDecisionRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsObject()
  conditions: Record<string, unknown>;

  @IsObject()
  actions: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDecisionRuleDto extends PartialType(CreateDecisionRuleDto) {}

export class EvaluateDecisionRulesDto {
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
