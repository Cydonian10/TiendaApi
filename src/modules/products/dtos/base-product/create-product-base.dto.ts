import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ProductBaseDto {
  @IsString()
  @ApiProperty({
    description: 'The name of the base product',
    example: 'Royal 1/8',
  })
  name: string;
}
