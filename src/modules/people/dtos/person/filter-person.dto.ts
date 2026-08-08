import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dtos/pagination.dto';

export class FilterPersonDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'CLIENTE',
    description: 'Filtra por nombre de rol exacto',
  })
  roleName?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    description: 'Filtra por personas con registro de auth',
  })
  hasAuth?: boolean;
}
