import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['consultation', 'examination', 'procedure', 'telemedicine', 'waiting'])
  type: 'consultation' | 'examination' | 'procedure' | 'telemedicine' | 'waiting';

  @IsOptional()
  @IsEnum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved'])
  status?: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(['consultation', 'examination', 'procedure', 'telemedicine', 'waiting'])
  type?: 'consultation' | 'examination' | 'procedure' | 'telemedicine' | 'waiting';

  @IsOptional()
  @IsEnum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved'])
  status?: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignPatientDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  appointmentId: string;
}
