import { ApiProperty } from '@nestjs/swagger';
import { BaseProductUnit } from '../../entities/baseProduct-unit.entity';

export class ProductUnitDto {
  @ApiProperty({ example: 2, description: 'ID de la unidad de medida' })
  unitId: number;

  @ApiProperty({ example: 'Kilogramo', description: 'Nombre de la unidad' })
  unitName: string;

  @ApiProperty({ example: 'kg', description: 'Abreviatura de la unidad' })
  unitValue: string;

  @ApiProperty({ example: true, description: 'Es la unidad principal' })
  isMain: boolean;

  @ApiProperty({ example: 1, description: 'Factor de conversión' })
  factor: number;

  static fromEntity(pu: BaseProductUnit): ProductUnitDto {
    const dto = new ProductUnitDto();
    dto.unitId = pu.unit.id;
    dto.unitName = pu.unit.name;
    dto.unitValue = pu.unit.value;
    dto.isMain = pu.isMain;
    dto.factor = parseFloat(pu.factor);
    return dto;
  }
}
