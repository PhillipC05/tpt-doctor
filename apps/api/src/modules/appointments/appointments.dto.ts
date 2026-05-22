import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;

  @IsISO8601()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  encounterType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;
}

import { IsInt } from 'class-validator';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

export class CreateRecurringAppointmentDto extends CreateAppointmentDto {
  @IsString()
  frequency: string;

  @IsOptional()
  @IsInt()
  occurrences?: number;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class AddToWaitlistDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  encounterType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBlockTimeDto {
  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ScheduleReminderDto {
  @IsUUID()
  appointmentId: string;

  @IsEnum(['EMAIL', 'SMS', 'PUSH'])
  channel: string;

  @IsISO8601()
  sendAt: string;
}

export class CheckInDto {
  @IsUUID()
  appointmentId: string;

  @IsOptional()
  @IsObject()
  vitals?: Record<string, unknown>;
}

export class CheckOutDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  billing?: Record<string, unknown>;
}
