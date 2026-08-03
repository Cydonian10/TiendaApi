import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductAttributeItemDto } from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiPropertyOptional({
    example: 10,
    description: 'Stock del producto (mayor a 0)',
  })
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiPropertyOptional({
    example: 1.5,
    description: 'Precio del producto (mayor a 0)',
  })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({ example: 1, description: 'ID del producto base' })
  baseProductId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeItemDto)
  @ApiPropertyOptional({
    type: () => [ProductAttributeItemDto],
    description: 'Reemplazo completo de los atributos del producto',
  })
  productAttributes?: ProductAttributeItemDto[];
}
