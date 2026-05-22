import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class ConfigureProfileDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

// AU DTOs
export class SubmitMbsClaimDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  mbsItemNumber: string;

  @IsOptional()
  @IsString()
  dateOfService?: string;

  @IsOptional()
  @IsObject()
  claimData?: Record<string, unknown>;
}

export class SubmitPbsPrescriptionDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  pbsCode: string;

  @IsOptional()
  @IsObject()
  prescriptionData?: Record<string, unknown>;
}

export class SubmitMyHealthRecordDocumentDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsObject()
  documentContent: Record<string, unknown>;
}

export class SubmitAirRecordDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  vaccineCode: string;

  @IsOptional()
  @IsString()
  dateAdministered?: string;

  @IsOptional()
  @IsObject()
  vaccinationData?: Record<string, unknown>;
}

export class GeneratePipReportDto {
  @IsString()
  @IsNotEmpty()
  reportPeriod: string;

  @IsOptional()
  @IsObject()
  reportData?: Record<string, unknown>;
}

// NZ DTOs
export class SubmitNzClaimDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsObject()
  claimData?: Record<string, unknown>;
}

export class GeneratePhoReportDto {
  @IsString()
  @IsNotEmpty()
  reportPeriod: string;

  @IsOptional()
  @IsObject()
  reportData?: Record<string, unknown>;
}

export class ValidateNhiDto {
  @IsString()
  @IsNotEmpty()
  nhiNumber: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;
}

// UK DTOs
export class CreateGp2GpTransferDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  targetOdsCode: string;

  @IsOptional()
  @IsObject()
  transferData?: Record<string, unknown>;
}

export class GenerateQofReportDto {
  @IsString()
  @IsNotEmpty()
  reportPeriod: string;

  @IsOptional()
  @IsObject()
  reportData?: Record<string, unknown>;
}

export class CreateGpConnectInteractionDto {
  @IsString()
  @IsNotEmpty()
  interactionType: string;

  @IsString()
  @IsNotEmpty()
  odsCode: string;

  @IsOptional()
  @IsObject()
  requestData?: Record<string, unknown>;
}

export class CreateSpineInteractionDto {
  @IsEnum(['PDS', 'SCR'])
  interactionType: string;

  @IsOptional()
  @IsObject()
  requestData?: Record<string, unknown>;
}

export class SubmitEpsPrescriptionDto {
  @IsUUID()
  prescriptionId: string;

  @IsOptional()
  @IsObject()
  epsData?: Record<string, unknown>;
}

// CA DTOs
export class SubmitCaClaimDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  healthPlan: string;

  @IsOptional()
  @IsObject()
  claimData?: Record<string, unknown>;
}

export class SubmitCaImmunisationDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  vaccineCode: string;

  @IsOptional()
  @IsObject()
  immunisationData?: Record<string, unknown>;
}

export class CreateInfowayInteractionDto {
  @IsString()
  @IsNotEmpty()
  interactionType: string;

  @IsOptional()
  @IsObject()
  requestData?: Record<string, unknown>;
}
