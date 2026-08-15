import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Ferretería', description: 'Nombre de la categoría' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Artículos de ferretería',
    description: 'Descripción de la categoría',
  })
  description?: string;
}
