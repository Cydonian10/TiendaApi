import { ApiProperty } from '@nestjs/swagger';
import { Brand } from '../../entities/brand.entity';

export class BrandDto {
  @ApiProperty({ example: 1, description: 'ID de la marca' })
  id: number;

  @ApiProperty({ example: 'Cerámica', description: 'Nombre de la marca' })
  name: string;

  @ApiProperty({
    example: 'Marca de cerámicos',
    description: 'Descripción de la marca',
    nullable: true,
  })
  description: string | null;

  static fromEntity(b: Brand): BrandDto {
    const dto = new BrandDto();
    dto.id = b.id;
    dto.name = b.name;
    dto.description = b.description;
    return dto;
  }
}
