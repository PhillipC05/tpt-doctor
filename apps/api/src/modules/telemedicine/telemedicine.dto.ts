import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class EndConsultationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelSessionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['STAFF', 'PATIENT'])
  senderType: 'STAFF' | 'PATIENT';
}

export class UpdateSessionStatsDto {
  @IsOptional()
  @IsString()
  bandwidthScore?: string;

  @IsOptional()
  @IsString()
  qualityScore?: string;
}

export class ToggleRecordingDto {
  @IsBoolean()
  isRecorded: boolean;
}
