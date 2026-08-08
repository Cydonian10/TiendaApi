import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class FilterSaleDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ example: 1, description: 'ID del cliente (Person)' })
  customerId?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    example: '2026-08-08',
    description: 'Fecha de la venta (YYYY-MM-DD)',
  })
  saleDate?: string;
}
