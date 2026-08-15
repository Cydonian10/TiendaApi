import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateBaseProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: 'Clavo',
    description: 'Nombre del producto base',
  })
  name?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({
    example: 1,
    description: 'Marca del base-product (null para limpiar)',
    nullable: true,
  })
  brandId?: number | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @Type(() => Number)
  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Categorías del base-product ([] para limpiar)',
  })
  categoryIds?: number[];
}
