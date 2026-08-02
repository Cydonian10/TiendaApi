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
    const qb = this.baseProductRepository.createQueryBuilder('bp');
    if (filter.search) {
      qb.andWhere(`unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER(:q))`, {
        q: `%${filter.search}%`,
      });
    }
    qb.loadRelationCountAndMap('bp.productCount', 'bp.products');
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => BaseProductDto.fromEntity(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<BaseProductDto> {
    const baseProduct = await this.baseProductRepository
      .createQueryBuilder('bp')
      .loadRelationCountAndMap('bp.productCount', 'bp.products')
      .where('bp.id = :id', { id })
      .getOne();
    if (!baseProduct) {
      throw new NotFoundException(`BaseProduct ${id} no encontrado`);
    }
    return BaseProductDto.fromEntity(baseProduct);
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

  async update(
    id: number,
    dto: UpdateBaseProductDto,
  ): Promise<BaseProductDto> {
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
