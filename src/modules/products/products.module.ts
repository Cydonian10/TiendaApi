import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseProduct } from './entities/base-product.entity';
import { Product } from './entities/producto.entity';
import { BaseProductsService } from './services/base-products.service';
import { ProductsService } from './services/products.service';
import { BaseProductsController } from './controllers/base-products.controller';
import { ProductsController } from './controllers/products.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([BaseProduct, Product]),
    ],
    controllers: [BaseProductsController, ProductsController],
    providers: [BaseProductsService, ProductsService],
})
export class ProductsModule { }
