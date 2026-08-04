import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class ProductFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'tornillo',
    description:
      'Búsqueda insensible a tildes/mayúsculas sobre el nombre computado del producto',
  })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ example: 1, description: 'Filtra por producto base' })
  baseProductId?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @ApiPropertyOptional({
    example: 1.0,
    description: 'Precio mínimo (inclusive)',
  })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @ApiPropertyOptional({
    example: 100.0,
    description: 'Precio máximo (inclusive)',
  })
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @ApiPropertyOptional({ example: 0, description: 'Stock mínimo (inclusive)' })
  minStock?: number;
}
