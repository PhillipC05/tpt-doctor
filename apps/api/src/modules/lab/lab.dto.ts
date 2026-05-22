import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabOrderDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  testName: string;

  @IsOptional()
  @IsString()
  loincCode?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  labName?: string;
}

export class UpdateLabResultDto {
  @IsObject()
  result: Record<string, unknown>;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateLabStatusDto {
  @IsEnum(['ORDERED', 'COLLECTED', 'IN_TRANSIT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status: string;
}
