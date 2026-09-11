import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleDetailDto {
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID del producto' })
  productId: number;

  @IsNumber()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @ApiProperty({ example: 2, description: 'Cantidad vendida' })
  quantity: number;
}

export class CreateSaleDto {
  @IsNumber()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'ID de la sesión de caja abierta' })
  cashOpeningId: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @ApiProperty({ example: 1, description: 'ID del cliente (Person)' })
  customerId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @ApiPropertyOptional({
    example: 2.5,
    description: 'Descuento en monto fijo a restar del subtotal',
  })
  discount?: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDetailDto)
  @ApiProperty({
    type: () => [CreateSaleDetailDto],
    description: 'Líneas de la venta',
  })
  details: CreateSaleDetailDto[];
}
