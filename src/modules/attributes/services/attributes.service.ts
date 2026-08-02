import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from '../entities/attribute.entity';
import { AttributeDto } from '../dtos/attribute/attribute.dto';
import { AttributeFilterDto } from '../dtos/attribute/filter-attribute.dto';
import { CreateAttributeDto } from '../dtos/attribute/create-attribute.dto';
import { UpdateAttributeDto } from '../dtos/attribute/update-attribute.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/pg-errors';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
  ) {}

  async findAll(
    filter: AttributeFilterDto,
  ): Promise<PaginatedResult<AttributeDto>> {
    const qb = this.attributeRepository.createQueryBuilder('a');
    if (filter.search) {
      qb.andWhere(`unaccent(LOWER(a.name)) ILIKE unaccent(LOWER(:q))`, {
        q: `%${filter.search}%`,
      });
    }
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => AttributeDto.fromEntity(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<AttributeDto> {
    const attribute = await this.attributeRepository.findOneBy({ id });
    if (!attribute) {
      throw new NotFoundException(`Attribute ${id} no encontrado`);
    }
    return AttributeDto.fromEntity(attribute);
  }

  async create(dto: CreateAttributeDto): Promise<AttributeDto> {
    const attribute = this.attributeRepository.create({ name: dto.name });
    try {
      await this.attributeRepository.save(attribute);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe un atributo con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return AttributeDto.fromEntity(attribute);
  }

  async update(id: number, dto: UpdateAttributeDto): Promise<AttributeDto> {
    const attribute = await this.attributeRepository.findOneBy({ id });
    if (!attribute) {
      throw new NotFoundException(`Attribute ${id} no encontrado`);
    }
    if (dto.name !== undefined) {
      attribute.name = dto.name;
    }
    try {
      await this.attributeRepository.save(attribute);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe un atributo con el nombre "${dto.name}"`,
        );
      }
      throw e;
    }
    return AttributeDto.fromEntity(attribute);
  }

  async remove(id: number): Promise<void> {
    const attribute = await this.attributeRepository.findOneBy({ id });
    if (!attribute) {
      throw new NotFoundException(`Attribute ${id} no encontrado`);
    }
    try {
      await this.attributeRepository.delete(id);
    } catch (e) {
      if (isForeignKeyViolation(e)) {
        throw new ConflictException(
          `No se puede eliminar el atributo ${id} porque tiene valores asociados`,
        );
      }
      throw e;
    }
  }
}
