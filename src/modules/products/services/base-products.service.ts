import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseProduct } from '../entities/base-product.entity';
import { Product } from '../entities/producto.entity';
import { Brand } from '../entities/brand.entity';
import { Category } from '../entities/category.entity';
import { BaseProductUnit } from '../../measurement-units/entities/baseProduct-unit.entity';
import { MeasurementUnit } from '../../measurement-units/entities/measurement-unit.entity';
import { BaseProductDto } from '../dtos/base-product/base-product.dto';
import { BaseProductDetailDto } from '../dtos/base-product/base-product-detail.dto';
import { BaseProductFilterDto } from '../dtos/base-product/filter-base-product.dto';
import { CreateBaseProductDto } from '../dtos/base-product/create-base-product.dto';
import { CreateBaseProductResponseDto } from '../dtos/base-product/create-base-product-response.dto';
import { UpdateBaseProductDto } from '../dtos/base-product/update-base-product.dto';
import { ProductDto } from '../dtos/product/product.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import { UnitOfWork } from '@/database/unitOfWork';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/pg-errors';

@Injectable()
export class BaseProductsService {
  constructor(
    @InjectRepository(BaseProduct)
    private readonly baseProductRepository: Repository<BaseProduct>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async findAll(
    filter: BaseProductFilterDto,
  ): Promise<PaginatedResult<BaseProductDto>> {
    const search = filter.search ?? null;
    const brandId = filter.brandId ?? null;
    const categoryId = filter.categoryId ?? null;
    const rows = await this.baseProductRepository.manager.query<unknown[]>(
      `SELECT bp.id AS id, bp.name AS name, COUNT(p.id)::int AS "productCount",
              (SELECT COUNT(*)::int FROM "base-product-unit" bpu
               WHERE bpu."baseProductId" = bp.id) AS "unitCount",
              CASE WHEN b.id IS NULL THEN NULL
                   ELSE json_build_object('id', b.id, 'name', b.name) END AS brand,
              COALESCE(
                (SELECT json_agg(row_to_json(c) ORDER BY c.id)
                 FROM category c
                 JOIN base_product_category bpc ON bpc."categoryId" = c.id
                 WHERE bpc."baseProductId" = bp.id),
                '[]'::json
              ) AS categories
       FROM base_product bp
       LEFT JOIN brand b ON b.id = bp."brandId"
       LEFT JOIN product p ON p."baseProductId" = bp.id
       WHERE ($1::text IS NULL OR unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER('%' || $1 || '%')))
         AND ($2::int IS NULL OR bp."brandId" = $2)
         AND ($3::int IS NULL OR EXISTS (
               SELECT 1 FROM base_product_category bpc
               WHERE bpc."baseProductId" = bp.id AND bpc."categoryId" = $3
             ))
       GROUP BY bp.id, b.id
       ORDER BY bp.id ASC
       LIMIT $4 OFFSET $5`,
      [
        search,
        brandId,
        categoryId,
        filter.limit,
        (filter.page - 1) * filter.limit,
      ],
    );

    const totalRows = await this.baseProductRepository.manager.query<unknown[]>(
      `SELECT COUNT(*)::int AS total
       FROM base_product bp
       WHERE ($1::text IS NULL OR unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER('%' || $1 || '%')))
         AND ($2::int IS NULL OR bp."brandId" = $2)
         AND ($3::int IS NULL OR EXISTS (
               SELECT 1 FROM base_product_category bpc
               WHERE bpc."baseProductId" = bp.id AND bpc."categoryId" = $3
             ))`,
      [search, brandId, categoryId],
    );
    const total = Number((totalRows[0] as { total?: unknown })?.total ?? 0);

    return {
      data: rows.map((row) => BaseProductDto.fromRow(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<BaseProductDto> {
    const rows = await this.baseProductRepository.manager.query<unknown[]>(
      `SELECT bp.id AS id, bp.name AS name, COUNT(p.id)::int AS "productCount",
              (SELECT COUNT(*)::int FROM "base-product-unit" bpu
               WHERE bpu."baseProductId" = bp.id) AS "unitCount",
              CASE WHEN b.id IS NULL THEN NULL
                   ELSE json_build_object('id', b.id, 'name', b.name) END AS brand,
              COALESCE(
                (SELECT json_agg(row_to_json(c) ORDER BY c.id)
                 FROM category c
                 JOIN base_product_category bpc ON bpc."categoryId" = c.id
                 WHERE bpc."baseProductId" = bp.id),
                '[]'::json
              ) AS categories
       FROM base_product bp
       LEFT JOIN brand b ON b.id = bp."brandId"
       LEFT JOIN product p ON p."baseProductId" = bp.id
       WHERE bp.id = $1
       GROUP BY bp.id, b.id`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    return BaseProductDto.fromRow(rows[0]);
  }

  async findDetail(id: number): Promise<BaseProductDetailDto> {
    const baseProduct = await this.baseProductRepository
      .createQueryBuilder('bp')
      .leftJoinAndSelect('bp.brand', 'brand')
      .leftJoinAndSelect('bp.categories', 'category')
      .leftJoinAndSelect('bp.units', 'baseProductUnit')
      .leftJoinAndSelect('baseProductUnit.unit', 'unit')
      .where('bp.id = :id', { id })
      .getOne();
    if (!baseProduct) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    baseProduct.productCount = await this.baseProductRepository.manager
      .getRepository(Product)
      .createQueryBuilder('product')
      .where('product."baseProductId" = :id', { id })
      .getCount();
    return BaseProductDetailDto.fromEntity(baseProduct);
  }

  async create(
    dto: CreateBaseProductDto,
  ): Promise<CreateBaseProductResponseDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;

      let brand: Brand | null = null;
      if (dto.brandId !== undefined && dto.brandId !== null) {
        brand = await manager.findOneBy(Brand, { id: dto.brandId });
        if (!brand) {
          throw new NotFoundException(`Brand ${dto.brandId} no encontrada`);
        }
      }

      let categories: Category[] = [];
      if (dto.categoryIds !== undefined) {
        categories = await manager.find(Category, {
          where: { id: In(dto.categoryIds) },
        });
        if (categories.length !== dto.categoryIds.length) {
          const found = new Set(categories.map((c) => c.id));
          const missing = dto.categoryIds.find((id) => !found.has(id));
          throw new NotFoundException(`Category ${missing} no encontrada`);
        }
      }

      const baseProduct = manager.create(BaseProduct, {
        name: dto.name,
        brandId: dto.brandId ?? null,
      });
      try {
        await manager.save(baseProduct);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            `Ya existe un producto base con el nombre "${dto.name}"`,
          );
        }
        throw e;
      }

      for (const item of dto.units) {
        const unit = await manager.findOneBy(MeasurementUnit, {
          id: item.unitId,
        });
        if (!unit) {
          throw new NotFoundException(
            `MeasurementUnit ${item.unitId} no encontrada`,
          );
        }
      }

      try {
        await manager.save(
          BaseProductUnit,
          dto.units.map((item) =>
            manager.create(BaseProductUnit, {
              baseProduct,
              unit: { id: item.unitId },
              factor: item.factor.toFixed(2),
              isMain: item.isMain,
            }),
          ),
        );
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            `Ya existe una unidad del producto base asociada a esa unidad de medida`,
          );
        }
        throw e;
      }

      if (categories.length > 0) {
        await manager
          .createQueryBuilder()
          .relation(BaseProduct, 'categories')
          .of(baseProduct.id)
          .add(categories.map((c) => c.id));
      }

      const product = manager.create(Product, {
        name: baseProduct.name,
        stock: '0.00',
        price: '0.00',
        attributeKey: '',
        baseProduct,
      });
      await manager.save(product);

      const loadedProduct = await manager.findOne(Product, {
        where: { id: product.id },
        relations: {
          baseProduct: { units: { unit: true } },
          productAttributes: { attribute: true, attributeValue: true },
        },
      });
      if (!loadedProduct) {
        throw new NotFoundException(`Product ${product.id} no encontrado`);
      }

      baseProduct.productCount = 1;
      baseProduct.brand = brand;
      baseProduct.categories = categories;
      return {
        baseProduct: BaseProductDto.fromEntity(baseProduct),
        defaultProduct: ProductDto.fromEntity(loadedProduct),
      };
    });
  }

  async update(id: number, dto: UpdateBaseProductDto): Promise<BaseProductDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const baseProduct = await manager.findOne(BaseProduct, {
        where: { id },
        relations: { categories: true },
      });
      if (!baseProduct) {
        throw new NotFoundException(`BaseProduct ${id} no encontrado`);
      }
      if (dto.name !== undefined) {
        baseProduct.name = dto.name;
      }
      if (dto.brandId !== undefined) {
        if (dto.brandId === null) {
          baseProduct.brandId = null;
        } else {
          const brand = await manager.findOneBy(Brand, { id: dto.brandId });
          if (!brand) {
            throw new NotFoundException(`Brand ${dto.brandId} no encontrada`);
          }
          baseProduct.brandId = dto.brandId;
        }
      }
      if (dto.categoryIds !== undefined) {
        let categories: Category[] = [];
        if (dto.categoryIds.length > 0) {
          categories = await manager.find(Category, {
            where: { id: In(dto.categoryIds) },
          });
          if (categories.length !== dto.categoryIds.length) {
            const found = new Set(categories.map((c) => c.id));
            const missing = dto.categoryIds.find((id) => !found.has(id));
            throw new NotFoundException(`Category ${missing} no encontrada`);
          }
        }
        baseProduct.categories = categories;
      }
      try {
        await manager.save(baseProduct);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            `Ya existe un producto base con el nombre "${dto.name ?? baseProduct.name}"`,
          );
        }
        throw e;
      }
      return this.loadBaseProductDto(manager, id);
    });
  }

  async remove(id: number): Promise<void> {
    const baseProduct = await this.baseProductRepository.findOneBy({ id });
    if (!baseProduct) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    try {
      await this.baseProductRepository.delete(id);
    } catch (e) {
      if (isForeignKeyViolation(e)) {
        throw new ConflictException(
          `No se puede eliminar el producto base ${id} porque tiene productos asociados`,
        );
      }
      throw e;
    }
  }

  private async loadBaseProductDto(
    manager: EntityManager,
    id: number,
  ): Promise<BaseProductDto> {
    const bp = await manager.findOne(BaseProduct, {
      where: { id },
      relations: { brand: true, categories: true },
    });
    if (!bp) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    return BaseProductDto.fromEntity(bp);
  }
}
