import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDosenDto {
  @IsString() @MinLength(1) @MaxLength(100)
  nama: string;

  @IsString() @MinLength(1) @MaxLength(20)
  nip: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(6) @MaxLength(128)
  password: string;

  @IsOptional() @IsIn(['admin', 'dosen'])
  role?: string = 'dosen';
}

export class UpdateDosenDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  nama?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(20)
  nip?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(128)
  password?: string;

  @IsOptional() @IsIn(['admin', 'dosen'])
  role?: string;
}
