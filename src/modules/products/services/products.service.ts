import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOfWork } from '@/database/unitOfWork';
import { isUniqueViolation } from '@/common/utils/pg-errors';
import { Product } from '../entities/producto.entity';
import { BaseProduct } from '../entities/base-product.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';
import { Attribute } from '../../attributes/entities/attribute.entity';
import { AttributeValue } from '../../attributes/entities/attribute-value.entity';
import { CreateProductDto } from '../dtos/product/create-product.dto';
import { ProductDto } from '../dtos/product/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const baseProduct = await manager.findOneBy(BaseProduct, {
        id: dto.baseProductId,
      });
      if (!baseProduct) {
        throw new NotFoundException(
          `BaseProduct ${dto.baseProductId} no encontrado`,
        );
      }

      const attributeParts: {
        attributeId: number;
        attributeName: string;
        attributeValue: string;
      }[] = [];

      for (const item of dto.productAttributes) {
        const attribute = await manager.findOneBy(Attribute, {
          id: item.attributeId,
        });
        const attributeValue = await manager.findOneBy(AttributeValue, {
          id: item.attributeValueId,
        });

        if (
          !attribute ||
          !attributeValue ||
          attributeValue.attributeId !== item.attributeId
        ) {
          throw new BadRequestException(
            `El valor de atributo ${item.attributeValueId} no pertenece al atributo ${item.attributeId}`,
          );
        }
        attributeParts.push({
          attributeId: attribute.id,
          attributeName: attribute.name,
          attributeValue: attributeValue.value,
        });
      }

      attributeParts.sort((a, b) =>
        a.attributeName.localeCompare(b.attributeName),
      );
      const name =
        baseProduct.name +
        (attributeParts.length
          ? ' - ' +
            attributeParts
              .map((p) => `${p.attributeName}: ${p.attributeValue}`)
              .join(', ')
          : '');

      const product = manager.create(Product, {
        name,
        stock: dto.stock.toFixed(2),
        price: dto.price.toFixed(2),
        baseProduct,
      });
      const savedProduct = await manager.save(product);

      try {
        await manager.save(
          ProductAttribute,
          dto.productAttributes.map((item) =>
            manager.create(ProductAttribute, {
              product: savedProduct,
              attribute: { id: item.attributeId },
              attributeValue: { id: item.attributeValueId },
            }),
          ),
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(
            `Ya existe un atributo repetido en el producto ${savedProduct.id}`,
          );
        }
        throw error;
      }

      const loaded = await manager.findOne(Product, {
        where: { id: savedProduct.id },
        relations: {
          baseProduct: true,
          productAttributes: { attribute: true, attributeValue: true },
        },
      });
      return ProductDto.fromEntity(loaded!);
    });
  }

  findAll() {}

  findOne() {}

  update() {}

  remove() {}
}
