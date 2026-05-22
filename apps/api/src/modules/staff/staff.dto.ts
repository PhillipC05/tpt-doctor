import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(['SUPER_ADMIN', 'PRACTICE_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'])
  role: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  providerNumber?: string;
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ScheduleSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class SetScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule: ScheduleSlotDto[];
}

export class CreateTimeOffDto {
  @IsUUID()
  staffId: string;

  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class ApproveTimeOffDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCredentialDto {
  @IsUUID()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  credentialType: string;

  @IsString()
  @IsNotEmpty()
  credentialNumber: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  issuingBody?: string;
}

export class UpdateCredentialDto extends PartialType(CreateCredentialDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
