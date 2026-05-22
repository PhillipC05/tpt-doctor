import { IsEmail, IsNotEmpty, IsString, IsUUID, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'doctor@clinic.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class PasswordResetRequestDto {
  @ApiProperty({ example: 'doctor@clinic.com' })
  @IsEmail()
  email: string;
}

export class MfaVerifyDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'TOTP or SMS code (6–8 digits)' })
  @IsString()
  @Length(6, 8)
  code: string;
}
