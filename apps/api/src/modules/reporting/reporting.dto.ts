import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeNestedDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class AdhocReportDto {
  @IsString()
  @IsNotEmpty()
  entity: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number;

  @IsOptional()
  @IsObject()
  @Type(() => DateRangeNestedDto)
  dateRange?: DateRangeNestedDto;
}

export class ExportReportDto extends AdhocReportDto {}
