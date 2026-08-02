import { ApiProperty } from '@nestjs/swagger';
import { Attribute } from '../../entities/attribute.entity';

export class AttributeDto {
  @ApiProperty({ example: 1, description: 'ID del atributo' })
  id: number;

  @ApiProperty({ example: 'Color', description: 'Nombre del atributo' })
  name: string;

  static fromEntity(a: Attribute): AttributeDto {
    const dto = new AttributeDto();
    dto.id = a.id;
    dto.name = a.name;
    return dto;
  }
}
