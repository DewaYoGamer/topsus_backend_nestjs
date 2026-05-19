import { IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMahasiswaDto {
  @IsString() @MinLength(1) @MaxLength(100)
  nama: string;

  @IsString() @MinLength(1) @MaxLength(20)
  nim: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(6) @MaxLength(128)
  password: string;

  @IsOptional() @IsInt() @Type(() => Number)
  dosen_pembimbing_id?: number | null;
}

export class UpdateMahasiswaDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  nama?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(20)
  nim?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(128)
  password?: string;
}

export class AssignPembimbingDto {
  @IsOptional() @IsInt() @Type(() => Number)
  dosen_id?: number | null;
}
