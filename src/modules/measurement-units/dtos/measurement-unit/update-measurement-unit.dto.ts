import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeasurementUnitDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: 'Kilogramo',
    description: 'Nombre de la unidad',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  @ApiPropertyOptional({
    example: 'kg',
    description: 'Abreviatura de la unidad',
  })
  value?: string;
}
