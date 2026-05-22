import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsInt()
  @Min(0)
  currentStock: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitCost?: number;
}

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}

export class RecordTransactionDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  itemId: string;

  @IsEnum(['IN', 'OUT', 'ADJUSTMENT'])
  transactionType: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @IsOptional()
  @IsObject()
  lineItems?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePOStatusDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsEnum(['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'])
  status: string;
}

export class CreateVaccineLotDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsISO8601()
  expiryDate: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsNumber()
  storageTemperatureMin?: number;

  @IsOptional()
  @IsNumber()
  storageTemperatureMax?: number;
}

export class RecordVaccineAdministrationDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  lotId: string;

  @IsUUID()
  patientId: string;

  @IsInt()
  @IsPositive()
  dosesUsed: number;
}

export class CreateMedicationSampleDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;
}

export class DistributeSampleDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  sampleId: string;

  @IsUUID()
  patientId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateRetailProductDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}

export class CreatePosSaleDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsObject()
  lineItems: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
