import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseProductsService } from '../services/base-products.service';
import { BaseProductFilterDto } from '../dtos/base-product/filter-base-product.dto';
import { CreateBaseProductDto } from '../dtos/base-product/create-base-product.dto';
import { UpdateBaseProductDto } from '../dtos/base-product/update-base-product.dto';

@ApiTags('Base Products')
@Controller('base-products')
export class BaseProductsController {
  constructor(private readonly baseProductsService: BaseProductsService) {}

  @Post()
  create(@Body() dto: CreateBaseProductDto) {
    return this.baseProductsService.create(dto);
  }

  @Get()
  findAll(@Query() filter: BaseProductFilterDto) {
    return this.baseProductsService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.baseProductsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBaseProductDto,
  ) {
    return this.baseProductsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.baseProductsService.remove(id);
  }
}
