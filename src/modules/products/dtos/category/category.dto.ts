import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../entities/category.entity';

export class CategoryDto {
  @ApiProperty({ example: 1, description: 'ID de la categoría' })
  id: number;

  @ApiProperty({ example: 'Ferretería', description: 'Nombre de la categoría' })
  name: string;

  @ApiProperty({
    example: 'Artículos de ferretería',
    description: 'Descripción de la categoría',
    nullable: true,
  })
  description: string | null;

  static fromEntity(c: Category): CategoryDto {
    const dto = new CategoryDto();
    dto.id = c.id;
    dto.name = c.name;
    dto.description = c.description;
    return dto;
  }
}
