import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class RecordAdministrationDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  vaccineCode: string;

  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  doseAmount?: number;

  @IsOptional()
  @IsString()
  doseUnit?: string;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @IsOptional()
  @IsObject()
  consentData?: Record<string, unknown>;
}

export class RecordAdverseEventDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsISO8601()
  onsetDate?: string;

  @IsOptional()
  @IsString()
  outcome?: string;
}

export class RecordColdChainBreachDto {
  @IsUUID()
  vaccineLotId: string;

  @IsISO8601()
  breachDate: string;

  @IsNumber()
  minTemp: number;

  @IsString()
  @IsNotEmpty()
  maxTemp: string;

  @IsNumber()
  @IsPositive()
  durationMinutes: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  actionTaken: string;
}
