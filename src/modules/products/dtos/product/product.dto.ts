import { ApiProperty } from '@nestjs/swagger';
import { ProductAttributeDto } from './product-attribute.dto';
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
    return dto;
  }
}
