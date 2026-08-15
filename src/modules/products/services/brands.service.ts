import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../entities/brand.entity';
import { BrandDto } from '../dtos/brand/brand.dto';
import { BrandFilterDto } from '../dtos/brand/filter-brand.dto';
import { CreateBrandDto } from '../dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../dtos/brand/update-brand.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/pg-errors';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async findAll(filter: BrandFilterDto): Promise<PaginatedResult<BrandDto>> {
    const qb = this.brandRepository.createQueryBuilder('b');
    if (filter.search) {
      qb.andWhere(`unaccent(LOWER(b.name)) ILIKE unaccent(LOWER(:q))`, {
        q: `%${filter.search}%`,
      });
    }
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => BrandDto.fromEntity(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<BrandDto> {
    const brand = await this.brandRepository.findOneBy({ id });
    if (!brand) {
      throw new NotFoundException(`Brand ${id} no encontrada`);
    }
    return BrandDto.fromEntity(brand);
  }

  async create(dto: CreateBrandDto): Promise<BrandDto> {
    const brand = this.brandRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    try {
      await this.brandRepository.save(brand);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe una marca con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return BrandDto.fromEntity(brand);
  }

  async update(id: number, dto: UpdateBrandDto): Promise<BrandDto> {
    const brand = await this.brandRepository.findOneBy({ id });
    if (!brand) {
      throw new NotFoundException(`Brand ${id} no encontrada`);
    }
    if (dto.name !== undefined) {
      brand.name = dto.name;
    }
    if (dto.description !== undefined) {
      brand.description = dto.description;
    }
    try {
      await this.brandRepository.save(brand);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe una marca con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return BrandDto.fromEntity(brand);
  }

  async remove(id: number): Promise<void> {
    const brand = await this.brandRepository.findOneBy({ id });
    if (!brand) {
      throw new NotFoundException(`Brand ${id} no encontrada`);
    }
    try {
      await this.brandRepository.delete(id);
    } catch (e) {
      if (isForeignKeyViolation(e)) {
        throw new ConflictException(
          `No se puede eliminar la marca ${id} porque tiene base-products asociados`,
        );
      }
      throw e;
    }
  }
}
