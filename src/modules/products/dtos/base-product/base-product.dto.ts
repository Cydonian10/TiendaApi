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

  @ApiProperty({
    example: 0,
    description: 'Cantidad de unidades asociados',
  })
  unitCount: number;

  @ApiProperty({
    example: { id: 1, name: 'Cerámica' },
    description: 'Marca del producto base (null si no tiene)',
    nullable: true,
  })
  brand: { id: number; name: string } | null;

  @ApiProperty({
    example: [{ id: 1, name: 'Ferretería' }],
    description: 'Categorías del producto base',
  })
  categories: { id: number; name: string }[];

  static fromEntity(bp: BaseProduct): BaseProductDto {
    const dto = new BaseProductDto();
    dto.id = bp.id;
    dto.name = bp.name;
    dto.productCount = bp.productCount ?? 0;
    dto.unitCount = bp.unitCount ?? 0;
    dto.brand = bp.brand ? { id: bp.brand.id, name: bp.brand.name } : null;
    dto.categories = (bp.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    }));
    return dto;
  }

  static fromRow(row: unknown): BaseProductDto {
    const r = row as {
      id?: unknown;
      name?: unknown;
      productCount?: unknown;
      unitCount?: unknown;
      brand?: { id?: unknown; name?: unknown } | null;
      categories?: { id?: unknown; name?: unknown }[] | null;
    };
    const dto = new BaseProductDto();
    dto.id = Number(r.id);
    dto.name = typeof r.name === 'string' ? r.name : '';
    dto.productCount = Number(r.productCount ?? 0);
    dto.unitCount = Number(r.unitCount ?? 0);
    dto.brand =
      r.brand && r.brand.id != null
        ? {
            id: Number(r.brand.id),
            name: typeof r.brand.name === 'string' ? r.brand.name : '',
          }
        : null;
    dto.categories = (r.categories ?? []).map((c) => ({
      id: Number(c.id),
      name: typeof c.name === 'string' ? c.name : '',
    }));
    return dto;
  }
}
