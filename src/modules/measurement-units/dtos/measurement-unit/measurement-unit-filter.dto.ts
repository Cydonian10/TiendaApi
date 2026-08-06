import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class MeasurementUnitFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'kilo',
    description: 'Búsqueda insensible a tildes/mayúsculas sobre el nombre',
  })
  search?: string;
}
