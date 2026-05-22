import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitIntakeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsObject()
  medicalHistory?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  consents?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  insurance?: Record<string, unknown>;
}

export class RejectIntakeDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
