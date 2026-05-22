import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCptCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  relativeValueUnit?: number;
}

export class CreateIcd10CodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class VerifyInsuranceDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  insuranceProviderId: string;

  @IsString()
  @IsNotEmpty()
  membershipNumber: string;

  @IsOptional()
  @IsString()
  serviceDate?: string;
}

export class SubmitClaimDto {
  @IsUUID()
  claimId: string;

  @IsOptional()
  @IsObject()
  claimData?: Record<string, unknown>;
}

export class ProcessEraDto {
  @IsUUID()
  claimId: string;

  @IsObject()
  eraData: Record<string, unknown>;
}

export class ProcessPaymentWithProviderDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(['STRIPE', 'AIRWALLEX'])
  provider: string;

  @IsObject()
  providerData: Record<string, unknown>;
}

export class RecordCopayDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class CreateHsaFsaDto {
  @IsUUID()
  patientId: string;

  @IsEnum(['HSA', 'FSA'])
  accountType: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  balance?: number;
}

export class CreateWriteOffDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ProcessRefundDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  refundMethod?: string;
}
