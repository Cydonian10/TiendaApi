import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { BaseProductsService } from '../services/base-products.service';

@Controller('base-products')
export class BaseProductsController {
  constructor(private readonly baseProductsService: BaseProductsService) {}

  @Post()
  create() {}

  @Get()
  findAll() {
    return {
      message: 'This action returns all base products',
    };
  }

  @Get(':id')
  findOne() {}

  @Patch(':id')
  update() {}

  @Delete(':id')
  remove() {}
}
