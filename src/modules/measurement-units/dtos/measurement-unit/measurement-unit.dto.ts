import { ApiProperty } from '@nestjs/swagger';
import { MeasurementUnit } from '../../entities/measurement-unit.entity';

export class MeasurementUnitDto {
  @ApiProperty({ example: 1, description: 'ID de la unidad' })
  id: number;

  @ApiProperty({ example: 'Kilogramo', description: 'Nombre de la unidad' })
  name: string;

  @ApiProperty({ example: 'kg', description: 'Abreviatura de la unidad' })
  value: string;

  static fromEntity(u: MeasurementUnit): MeasurementUnitDto {
    const dto = new MeasurementUnitDto();
    dto.id = u.id;
    dto.name = u.name;
    dto.value = u.value;
    return dto;
  }
}
