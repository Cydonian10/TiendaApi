import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseProduct } from '../entities/base-product.entity';
import { BaseProductDto } from '../dtos/base-product/base-product.dto';
import { BaseProductFilterDto } from '../dtos/base-product/filter-base-product.dto';
import { CreateBaseProductDto } from '../dtos/base-product/create-base-product.dto';
import { UpdateBaseProductDto } from '../dtos/base-product/update-base-product.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/pg-errors';

@Injectable()
export class BaseProductsService {
  constructor(
    @InjectRepository(BaseProduct)
    private readonly baseProductRepository: Repository<BaseProduct>,
  ) {}

  async findAll(
    filter: BaseProductFilterDto,
  ): Promise<PaginatedResult<BaseProductDto>> {
    const search = filter.search ?? null;
    const rows = await this.baseProductRepository.manager.query<unknown[]>(
      `SELECT bp.id AS id, bp.name AS name, COUNT(p.id)::int AS "productCount"
       FROM base_product bp
       LEFT JOIN product p ON p."baseProductId" = bp.id
       WHERE ($1::text IS NULL OR unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER('%' || $1 || '%')))
       GROUP BY bp.id
       ORDER BY bp.id ASC
       LIMIT $2 OFFSET $3`,
      [search, filter.limit, (filter.page - 1) * filter.limit],
    );

    console.log('rows', rows);

    const totalRows = await this.baseProductRepository.manager.query<unknown[]>(
      `SELECT COUNT(*)::int AS total
       FROM base_product bp
       WHERE ($1::text IS NULL OR unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER('%' || $1 || '%')))`,
      [search],
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
      `SELECT bp.id AS id, bp.name AS name, COUNT(p.id)::int AS "productCount"
       FROM base_product bp
       LEFT JOIN product p ON p."baseProductId" = bp.id
       WHERE bp.id = $1
       GROUP BY bp.id`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    return BaseProductDto.fromRow(rows[0]);
  }

  async create(dto: CreateBaseProductDto): Promise<BaseProductDto> {
    const baseProduct = this.baseProductRepository.create({
      name: dto.name,
    });
    try {
      await this.baseProductRepository.save(baseProduct);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe un producto base con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return BaseProductDto.fromEntity(baseProduct);
  }

  async update(id: number, dto: UpdateBaseProductDto): Promise<BaseProductDto> {
    const baseProduct = await this.baseProductRepository.findOneBy({ id });
    if (!baseProduct) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    if (dto.name !== undefined) {
      baseProduct.name = dto.name;
    }
    try {
      await this.baseProductRepository.save(baseProduct);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe un producto base con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return BaseProductDto.fromEntity(baseProduct);
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
}
