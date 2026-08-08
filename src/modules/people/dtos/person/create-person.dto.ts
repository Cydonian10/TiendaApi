import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Juan', description: 'Nombres' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pérez', description: 'Apellidos' })
  lastName: string;

  @IsDateString()
  @ApiProperty({ example: '1990-05-15', description: 'Fecha de nacimiento' })
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Av. Los Clavos 123', description: 'Dirección' })
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '12345678', description: 'DNI' })
  dni: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  @ApiPropertyOptional({
    example: [1, 2],
    description: 'IDs de roles a asignar',
  })
  roleIds?: number[];

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    example: 'juan@correo.com',
    description: 'Email (obligatorio si el rol es TRABAJADOR o ADMINISTRADOR)',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @ApiPropertyOptional({
    example: 'secret123',
    description:
      'Password (obligatorio si el rol es TRABAJADOR o ADMINISTRADOR)',
  })
  password?: string;
}
