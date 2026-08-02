import { ApiProperty } from '@nestjs/swagger';
import { Attribute } from '../../entities/attribute.entity';
import { AttributeValueDto } from '../attribute-value/attribute-value.dto';

export class AttributeWithValuesDto {
  @ApiProperty({ example: 1, description: 'ID del atributo' })
  id: number;

  @ApiProperty({ example: 'Color', description: 'Nombre del atributo' })
  name: string;

  @ApiProperty({
    type: () => [AttributeValueDto],
    description: 'Valores del atributo',
  })
  values: AttributeValueDto[];

  static fromEntity(
    attribute: Attribute,
    values: AttributeValueDto[],
  ): AttributeWithValuesDto {
    const dto = new AttributeWithValuesDto();
    dto.id = attribute.id;
    dto.name = attribute.name;
    dto.values = values;
    return dto;
  }
}
