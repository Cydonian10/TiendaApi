import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ProductsService } from '../services/products.service';

@Controller('products')
export class ProductsController {

    constructor(private readonly productsService: ProductsService) { }

    @Post()
    create() { }

    @Get()
    findAll() { }

    @Get(':id')
    findOne() { }

    @Patch(':id')
    update() { }

    @Delete(':id')
    remove() { }
}
