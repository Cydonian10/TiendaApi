import { ApiProperty } from '@nestjs/swagger';
import { BaseProduct } from '../../entities/base-product.entity';

export class BaseProductDto {
  @ApiProperty({ example: 1, description: 'ID del producto base' })
  id: number;

  @ApiProperty({ example: 'Clavo', description: 'Nombre del producto base' })
  name: string;

  @ApiProperty({
    example: 0,
    description: 'Cantidad de productos asociados',
  })
  productCount: number;

  static fromEntity(bp: BaseProduct): BaseProductDto {
    const dto = new BaseProductDto();
    dto.id = bp.id;
    dto.name = bp.name;
    dto.productCount = bp.productCount ?? 0;
    return dto;
  }
}
