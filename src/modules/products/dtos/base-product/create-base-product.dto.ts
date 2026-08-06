import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsExactlyOneMain } from './validators/is-exactly-one-main.validator';
import { NoDuplicatedUnitIds } from './validators/no-duplicated-unit-ids.validator';

export class CreateBaseProductUnitDto {
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID de la unidad de medida' })
  unitId: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiProperty({ example: 1, description: 'Factor de conversión (> 0)' })
  factor: number;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Es la unidad principal' })
  isMain: boolean;
}

export class CreateBaseProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Clavo', description: 'Nombre del producto base' })
  name: string;

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
  @ApiProperty({
    type: () => [CreateBaseProductUnitDto],
    example: [
      { unitId: 1, factor: 1, isMain: true },
      { unitId: 2, factor: 12.5, isMain: false },
    ],
    description: 'Unidades del producto base (obligatorio, al menos una)',
  })
  units: CreateBaseProductUnitDto[];
}
