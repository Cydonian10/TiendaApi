import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class ProductAttributeOrderItemDto {
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 2, description: 'ID del atributo' })
  attributeId: number;

  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1.5, description: 'Nuevo orden del atributo' })
  order: number;
}

export class UpdateProductAttributeOrdersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeOrderItemDto)
  @ApiProperty({
    type: () => [ProductAttributeOrderItemDto],
    description: 'Órdenes de atributos a actualizar',
  })
  orders: ProductAttributeOrderItemDto[];
}
