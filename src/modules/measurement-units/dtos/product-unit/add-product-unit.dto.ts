import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class AddProductUnitDto {
  @IsInt()
  @Type(() => Number)
  @ApiProperty({ example: 2, description: 'ID de la unidad de medida' })
  unitId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiPropertyOptional({ example: 12.5, description: 'Factor de conversión' })
  factor?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    description: 'Marca la unidad como principal del base-product',
  })
  isMain?: boolean;
}
