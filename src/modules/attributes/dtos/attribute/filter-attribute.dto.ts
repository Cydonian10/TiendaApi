import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class AttributeFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'color',
    description: 'Búsqueda insensible a tildes/mayúsculas sobre el nombre',
  })
  search?: string;
}
