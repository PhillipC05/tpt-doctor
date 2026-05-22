import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class FhirResourceDto {
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
