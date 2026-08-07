import { ApiProperty } from '@nestjs/swagger';
import { BaseProductDto } from './base-product.dto';
import { ProductDto } from '../product/product.dto';

export class CreateBaseProductResponseDto {
  @ApiProperty({ type: () => BaseProductDto })
  baseProduct: BaseProductDto;

  @ApiProperty({ type: () => ProductDto })
  defaultProduct: ProductDto;
}
