import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  Min,
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
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiProperty({ example: 10, description: 'Stock del producto (mayor a 0)' })
  stock: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiProperty({ example: 1.5, description: 'Precio del producto (mayor a 0)' })
  price: number;

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
