import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseProduct } from './entities/base-product.entity';
import { Product } from './entities/producto.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { BaseProductsService } from './services/base-products.service';
import { ProductsService } from './services/products.service';
import { BrandsService } from './services/brands.service';
import { CategoriesService } from './services/categories.service';
import { BaseProductsController } from './controllers/base-products.controller';
import { ProductsController } from './controllers/products.controller';
import { BrandsController } from './controllers/brands.controller';
import { CategoriesController } from './controllers/categories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BaseProduct,
      Product,
      ProductAttribute,
      Brand,
      Category,
    ]),
  ],
  controllers: [
    BaseProductsController,
    ProductsController,
    BrandsController,
    CategoriesController,
  ],
  providers: [
    BaseProductsService,
    ProductsService,
    BrandsService,
    CategoriesService,
  ],
})
export class ProductsModule {}
