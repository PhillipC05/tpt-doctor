import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMappingDto {
  @IsEnum(['ICD10', 'SNOMED_CT', 'LOINC', 'ATC', 'READ_V2'])
  sourceSystem: string;

  @IsString()
  @IsNotEmpty()
  sourceCode: string;

  @IsEnum(['ICD10', 'SNOMED_CT', 'LOINC', 'ATC', 'READ_V2'])
  targetSystem: string;

  @IsString()
  @IsNotEmpty()
  targetCode: string;

  @IsOptional()
  @IsString()
  mappingType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportSnomedCodesDto {
  @IsArray()
  @IsObject({ each: true })
  codes: Record<string, unknown>[];
}
