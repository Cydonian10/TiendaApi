import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Cerámica', description: 'Nombre de la marca' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Marca de cerámicos',
    description: 'Descripción de la marca',
  })
  description?: string;
}
