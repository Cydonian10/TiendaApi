import { ApiProperty } from '@nestjs/swagger';

interface ProductAttributeWithRelations {
  attribute: { id: number; name: string };
  attributeValue: { id: number; value: string };
}

export class ProductAttributeDto {
  @ApiProperty({ example: 1, description: 'ID del atributo' })
  attributeId: number;

  @ApiProperty({ example: 'Color', description: 'Nombre del atributo' })
  attributeName: string;

  @ApiProperty({ example: 5, description: 'ID del valor del atributo' })
  attributeValueId: number;

  @ApiProperty({ example: 'Rojo', description: 'Valor del atributo' })
  attributeValue: string;

  static fromEntity(pa: ProductAttributeWithRelations): ProductAttributeDto {
    const dto = new ProductAttributeDto();
    dto.attributeId = pa.attribute.id;
    dto.attributeName = pa.attribute.name;
    dto.attributeValueId = pa.attributeValue.id;
    dto.attributeValue = pa.attributeValue.value;
    return dto;
  }

  static fromRow(row: {
    attributeId: number;
    attributeName: string;
    attributeValueId: number;
    attributeValue: string;
  }): ProductAttributeDto {
    const dto = new ProductAttributeDto();
    dto.attributeId = Number(row.attributeId);
    dto.attributeName = String(row.attributeName);
    dto.attributeValueId = Number(row.attributeValueId);
    dto.attributeValue = String(row.attributeValue);
    return dto;
  }
}
