import { ApiProperty } from '@nestjs/swagger';
import { AttributeValue } from '../../entities/attribute-value.entity';

export class AttributeValueDto {
  @ApiProperty({ example: 1, description: 'ID del valor del atributo' })
  id: number;

  @ApiProperty({ example: 'Rojo', description: 'Valor del atributo' })
  value: string;

  @ApiProperty({ example: 1, description: 'ID del atributo al que pertenece' })
  attributeId: number;

  static fromEntity(av: AttributeValue): AttributeValueDto {
    const dto = new AttributeValueDto();
    dto.id = av.id;
    dto.value = av.value;
    dto.attributeId = av.attribute?.id ?? av.attributeId;
    return dto;
  }
}
