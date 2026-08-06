import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMeasurementUnitDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Kilogramo', description: 'Nombre de la unidad' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  @ApiProperty({ example: 'kg', description: 'Abreviatura de la unidad' })
  value: string;
}
