import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class BaseProductFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'clavo',
    description: 'Búsqueda insensible a tildes/mayúsculas sobre el nombre',
  })
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtra por id de marca',
  })
  brandId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({
    example: 2,
    description: 'Filtra por id de categoría',
  })
  categoryId?: number;
}
