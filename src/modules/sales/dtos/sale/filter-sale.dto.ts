import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { SaleStatus } from '../../entities/sale.entity';

export class FilterSaleDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ example: 1, description: 'ID de la sesión de caja' })
  cashOpeningId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ example: 1, description: 'ID del vendedor (Person)' })
  sellerId?: number;

  @IsOptional()
  @IsEnum(SaleStatus)
  @ApiPropertyOptional({ enum: SaleStatus, example: SaleStatus.PENDING })
  status?: SaleStatus;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    example: '2026-08-08',
    description: 'Fecha inicial de venta (ISO 8601)',
  })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    example: '2026-08-08T23:59:59.999Z',
    description: 'Fecha final de venta (ISO 8601)',
  })
  endDate?: string;
}
