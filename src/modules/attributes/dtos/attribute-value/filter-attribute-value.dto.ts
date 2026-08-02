import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class AttributeValueFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'rojo',
    description: 'Búsqueda insensible a tildes/mayúsculas sobre el valor',
  })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtra valores del atributo indicado',
  })
  attributeId?: number;
}
