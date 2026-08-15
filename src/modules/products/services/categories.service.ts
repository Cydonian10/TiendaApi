import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CategoryDto } from '../dtos/category/category.dto';
import { CategoryFilterDto } from '../dtos/category/filter-category.dto';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import { isUniqueViolation } from '@/common/utils/pg-errors';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(
    filter: CategoryFilterDto,
  ): Promise<PaginatedResult<CategoryDto>> {
    const qb = this.categoryRepository.createQueryBuilder('c');
    if (filter.search) {
      qb.andWhere(`unaccent(LOWER(c.name)) ILIKE unaccent(LOWER(:q))`, {
        q: `%${filter.search}%`,
      });
    }
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => CategoryDto.fromEntity(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<CategoryDto> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} no encontrada`);
    }
    return CategoryDto.fromEntity(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    const category = this.categoryRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    try {
      await this.categoryRepository.save(category);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe una categoría con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return CategoryDto.fromEntity(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} no encontrada`);
    }
    if (dto.name !== undefined) {
      category.name = dto.name;
    }
    if (dto.description !== undefined) {
      category.description = dto.description;
    }
    try {
      await this.categoryRepository.save(category);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe una categoría con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return CategoryDto.fromEntity(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} no encontrada`);
    }
    const rows = await this.categoryRepository.manager.query<unknown[]>(
      `SELECT COUNT(*)::int AS total
       FROM base_product_category
       WHERE "categoryId" = $1`,
      [id],
    );
    const total = Number((rows[0] as { total?: unknown })?.total ?? 0);
    if (total > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría ${id} porque tiene base-products asociados`,
      );
    }
    await this.categoryRepository.delete(id);
  }
}
