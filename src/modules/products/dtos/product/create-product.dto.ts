import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProductAttributeItemDto {
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID del atributo' })
  attributeId: number;

  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 5, description: 'ID del valor del atributo' })
  attributeValueId: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Tornillo', description: 'Nombre del producto' })
  name: string;

  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 10, description: 'Stock del producto' })
  stock: number;

  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID del producto base' })
  baseProductId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeItemDto)
  @ApiProperty({
    type: () => [ProductAttributeItemDto],
    description: 'Atributos del producto',
  })
  productAttributes: ProductAttributeItemDto[];
}
