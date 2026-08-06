import { ApiProperty } from '@nestjs/swagger';
import { ProductAttributeDto } from './product-attribute.dto';
import { ProductUnitDto } from '../../../measurement-units/dtos/product-unit/product-unit.dto';
import { Product } from '../../entities/producto.entity';

export class ProductDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  id: number;

  @ApiProperty({
    example: 'Tornillo - Color: Rojo, Tamaño: Grande',
    description: 'Nombre computado del producto',
  })
  name: string;

  @ApiProperty({ example: 10, description: 'Stock del producto' })
  stock: number;

  @ApiProperty({ example: 1.5, description: 'Precio del producto' })
  price: number;

  @ApiProperty({ example: 1, description: 'ID del producto base' })
  baseProductId: number;

  @ApiProperty({ example: 'Tornillo', description: 'Nombre del producto base' })
  baseProductName: string;

  @ApiProperty({ type: () => [ProductAttributeDto] })
  productAttributes: ProductAttributeDto[];

  @ApiProperty({
    example: '10 kg',
    nullable: true,
    description:
      'Stock formateado con la abreviatura de la unidad principal del base-product (null si no hay principal)',
  })
  stockLabel: string | null;

  @ApiProperty({
    type: () => [ProductUnitDto],
    description: 'Unidades del base-product del producto',
  })
  units: ProductUnitDto[];

  static fromEntity(product: Product): ProductDto {
    const dto = new ProductDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.stock = parseFloat(product.stock);
    dto.price = parseFloat(product.price);
    dto.baseProductId = product.baseProduct.id;
    dto.baseProductName = product.baseProduct.name;
    dto.productAttributes = product.productAttributes.map((pa) =>
      ProductAttributeDto.fromEntity(pa),
    );
    const units = product.baseProduct.units ?? [];
    const main = units.find((u) => u.isMain);
    dto.stockLabel = main
      ? `${parseFloat(product.stock)} ${main.unit.value}`
      : null;
    dto.units = units.map((u) => ProductUnitDto.fromEntity(u));
    return dto;
  }
}
