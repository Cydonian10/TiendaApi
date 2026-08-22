import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateBaseProductUnitDto } from './create-base-product.dto';
import { IsExactlyOneMain } from './validators/is-exactly-one-main.validator';
import { NoDuplicatedUnitIds } from './validators/no-duplicated-unit-ids.validator';

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
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateBaseProductUnitDto)
  @IsExactlyOneMain({
    message: 'Debe haber exactamente una unidad con isMain: true',
  })
  @NoDuplicatedUnitIds({
    message: 'No se puede repetir la misma unitId en el array',
  })
  @ApiPropertyOptional({
    type: () => [CreateBaseProductUnitDto],
    description: 'Unidades del base-product (reemplaza todas las actuales)',
  })
  units?: CreateBaseProductUnitDto[];

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
