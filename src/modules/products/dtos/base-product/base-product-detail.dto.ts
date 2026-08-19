import { ApiProperty } from '@nestjs/swagger';
import { BaseProduct } from '../../entities/base-product.entity';

export class BaseProductDetailUnitDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Kilogramo' })
  name: string;

  @ApiProperty({ example: 'kg' })
  value: string;

  @ApiProperty({ example: 1 })
  factor: number;

  @ApiProperty({ example: true })
  isMain: boolean;
}

export class BaseProductDetailDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Clavo' })
  name: string;

  @ApiProperty({ example: 3 })
  productCount: number;

  @ApiProperty({
    example: { id: 1, name: 'Ferretería' },
    nullable: true,
  })
  brand: { id: number; name: string } | null;

  @ApiProperty({ example: [{ id: 1, name: 'Construcción' }] })
  categories: { id: number; name: string }[];

  @ApiProperty({ type: () => [BaseProductDetailUnitDto] })
  units: BaseProductDetailUnitDto[];

  static fromEntity(baseProduct: BaseProduct): BaseProductDetailDto {
    const dto = new BaseProductDetailDto();
    dto.id = baseProduct.id;
    dto.name = baseProduct.name;
    dto.productCount = baseProduct.productCount ?? 0;
    dto.brand = baseProduct.brand
      ? { id: baseProduct.brand.id, name: baseProduct.brand.name }
      : null;
    dto.categories = (baseProduct.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
    }));
    dto.units = (baseProduct.units ?? []).map((baseProductUnit) => ({
      id: baseProductUnit.unit.id,
      name: baseProductUnit.unit.name,
      value: baseProductUnit.unit.value,
      factor: Number(baseProductUnit.factor),
      isMain: baseProductUnit.isMain,
    }));
    return dto;
  }
}
