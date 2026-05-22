import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsOptional()
  @IsString()
  cptCode?: string;

  @IsOptional()
  @IsString()
  icd10Code?: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessPaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateClaimDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  invoiceId: string;

  @IsOptional()
  @IsString()
  insuranceProviderId?: string;

  @IsOptional()
  @IsString()
  membershipNumber?: string;
}
