import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBaseProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Clavo', description: 'Nombre del producto base' })
  name: string;
}
