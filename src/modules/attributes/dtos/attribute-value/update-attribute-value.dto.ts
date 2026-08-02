import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAttributeValueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ example: 'Rojo', description: 'Valor del atributo' })
  value?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del atributo al que pertenece (permite mover el valor)',
  })
  attributeId?: number;
}
