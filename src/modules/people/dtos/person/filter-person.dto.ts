import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class FilterPersonDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'CLIENTE',
    description: 'Filtra por nombre de rol exacto',
  })
  roleName?: string;
}
