import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabPanelDto {
  @IsString()
  @IsNotEmpty()
  panelName: string;

  @IsOptional()
  @IsString()
  labName?: string;

  @IsArray()
  @IsString({ each: true })
  tests: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateOrderFromPanelDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;
}

export class CreateExternalLabConfigDto {
  @IsString()
  @IsNotEmpty()
  labName: string;

  @IsString()
  @IsNotEmpty()
  apiEndpoint: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class ImportFhirResultsDto {
  @IsString()
  @IsNotEmpty()
  source: string;

  @IsArray()
  entries: Record<string, unknown>[];
}
