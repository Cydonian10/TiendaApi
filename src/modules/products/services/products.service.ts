import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, EntityManager, Repository } from 'typeorm';
import { UnitOfWork } from '@/database/unitOfWork';
import { isUniqueViolation } from '@/common/utils/pg-errors';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import { Product } from '../entities/producto.entity';
import { BaseProduct } from '../entities/base-product.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';
import { Attribute } from '../../attributes/entities/attribute.entity';
import { AttributeValue } from '../../attributes/entities/attribute-value.entity';
import { CreateProductDto } from '../dtos/product/create-product.dto';
import { UpdateProductDto } from '../dtos/product/update-product.dto';
import { ProductFilterDto } from '../dtos/product/filter-product.dto';
import { ProductDto } from '../dtos/product/product.dto';
import { ProductAttributeOrderItemDto } from '../dtos/product/update-attribute-orders.dto';

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

      await this.validateAttributeItems(manager, dto.productAttributes);
      const attributeKey = this.computeAttributeKey(dto.productAttributes);

      const product = manager.create(Product, {
        stock: dto.stock.toFixed(2),
        price: dto.price.toFixed(2),
        attributeKey,
        baseProduct,
      });

      let savedProduct: Product;
      try {
        savedProduct = await manager.save(product);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(
            `Ya existe un producto del mismo baseProduct con los mismos attributes`,
          );
        }
        throw error;
      }

      try {
        await manager.save(
          ProductAttribute,
          dto.productAttributes.map((item) =>
            manager.create(ProductAttribute, {
              product: savedProduct,
              attribute: { id: item.attributeId },
              attributeValue: { id: item.attributeValueId },
              order: item.order,
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

      return this.loadProductDto(manager, savedProduct.id);
    });
  }

  async findAll(
    filter: ProductFilterDto,
  ): Promise<PaginatedResult<ProductDto>> {
    const qb = this.productRepository
      .createQueryBuilder('p')
      .orderBy('p.id', 'ASC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (filter.search) {
      qb.leftJoin('p.baseProduct', 'bp');
      qb.andWhere('unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER(:search))', {
        search: `%${filter.search}%`,
      });
    }

    if (filter.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: filter.minPrice });
    }
    if (filter.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: filter.maxPrice });
    }
    if (filter.minStock !== undefined) {
      qb.andWhere('p.stock >= :minStock', { minStock: filter.minStock });
    }

    const [products, total] = await qb.getManyAndCount();

    const ids = products.map((p) => p.id);
    const loadedProducts =
      ids.length > 0
        ? await this.productRepository.find({
            where: { id: In(ids) },
            relations: {
              baseProduct: { units: { unit: true } },
              productAttributes: { attribute: true, attributeValue: true },
            },
            order: { id: 'ASC' },
          })
        : [];

    return {
      data: loadedProducts.map((p) => ProductDto.fromEntity(p)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<ProductDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        baseProduct: { units: { unit: true } },
        productAttributes: { attribute: true, attributeValue: true },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} no encontrado`);
    }
    return ProductDto.fromEntity(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const product = await manager.findOne(Product, {
        where: { id },
        relations: { baseProduct: true },
      });
      if (!product) {
        throw new NotFoundException(`Product ${id} no encontrado`);
      }

      if (dto.stock !== undefined) {
        product.stock = dto.stock.toFixed(2);
      }
      if (dto.price !== undefined) {
        product.price = dto.price.toFixed(2);
      }
      if (dto.baseProductId !== undefined) {
        const baseProduct = await manager.findOneBy(BaseProduct, {
          id: dto.baseProductId,
        });
        if (!baseProduct) {
          throw new NotFoundException(
            `BaseProduct ${dto.baseProductId} no encontrado`,
          );
        }
        product.baseProduct = baseProduct;
      }

      if (dto.productAttributes !== undefined) {
        await this.validateAttributeItems(manager, dto.productAttributes);

        await manager.delete(ProductAttribute, { product: { id } });

        try {
          await manager.save(
            ProductAttribute,
            dto.productAttributes.map((item) =>
              manager.create(ProductAttribute, {
                product,
                attribute: { id: item.attributeId },
                attributeValue: { id: item.attributeValueId },
                order: item.order,
              }),
            ),
          );
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(
              `Ya existe un atributo repetido en el producto ${id}`,
            );
          }
          throw error;
        }
      }

      if (dto.productAttributes !== undefined) {
        product.attributeKey = this.computeAttributeKey(dto.productAttributes);
      }

      try {
        await manager.save(product);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(
            `Ya existe un producto del mismo baseProduct con los mismos attributes`,
          );
        }
        throw error;
      }

      return this.loadProductDto(manager, id);
    });
  }

  async remove(id: number): Promise<void> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const product = await manager.findOneBy(Product, { id });
      if (!product) {
        throw new NotFoundException(`Product ${id} no encontrado`);
      }
      await manager.delete(ProductAttribute, { product: { id } });
      await manager.delete(Product, { id });
    });
  }

  async updateAttributeOrders(
    productId: number,
    items: ProductAttributeOrderItemDto[],
  ): Promise<ProductDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const product = await manager.findOneBy(Product, { id: productId });
      if (!product) {
        throw new NotFoundException(`Product ${productId} no encontrado`);
      }

      const attributeIds = new Set<number>();
      for (const item of items) {
        if (attributeIds.has(item.attributeId)) {
          throw new BadRequestException(
            `El atributo ${item.attributeId} está repetido en el payload`,
          );
        }
        attributeIds.add(item.attributeId);
      }

      const productAttributes = await manager.find(ProductAttribute, {
        where: { product: { id: productId } },
        relations: { attribute: true },
      });
      const attributesById = new Map(
        productAttributes.map((item) => [item.attribute.id, item]),
      );
      const updatedAttributes: ProductAttribute[] = [];

      for (const item of items) {
        const productAttribute = attributesById.get(item.attributeId);
        if (!productAttribute) {
          throw new BadRequestException(
            `El atributo ${item.attributeId} no pertenece al producto ${productId}`,
          );
        }
        productAttribute.order = item.order;
        updatedAttributes.push(productAttribute);
      }

      await manager.save(ProductAttribute, updatedAttributes);

      return this.loadProductDto(manager, productId);
    });
  }

  private async validateAttributeItems(
    manager: EntityManager,
    items: { attributeId: number; attributeValueId: number }[],
  ): Promise<void> {
    for (const item of items) {
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
    }
  }

  private computeAttributeKey(
    items: { attributeId: number; attributeValueId: number }[],
  ): string {
    return [...items]
      .sort((a, b) => a.attributeId - b.attributeId)
      .map((item) => `${item.attributeId}:${item.attributeValueId}`)
      .join(',');
  }

  private async loadProductDto(
    manager: EntityManager,
    id: number,
  ): Promise<ProductDto> {
    const loaded = await manager.findOne(Product, {
      where: { id },
      relations: {
        baseProduct: { units: { unit: true } },
        productAttributes: { attribute: true, attributeValue: true },
      },
    });
    if (!loaded) {
      throw new NotFoundException(`Product ${id} no encontrado`);
    }
    return ProductDto.fromEntity(loaded);
  }
}
