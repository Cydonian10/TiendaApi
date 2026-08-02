import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttributeValue } from '../entities/attribute-value.entity';
import { Attribute } from '../entities/attribute.entity';
import { AttributeValueDto } from '../dtos/attribute-value/attribute-value.dto';
import { AttributeValueFilterDto } from '../dtos/attribute-value/filter-attribute-value.dto';
import { CreateAttributeValueDto } from '../dtos/attribute-value/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../dtos/attribute-value/update-attribute-value.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/pg-errors';

@Injectable()
export class AttributeValuesService {
  constructor(
    @InjectRepository(AttributeValue)
    private readonly valueRepository: Repository<AttributeValue>,
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
  ) {}

  async findAll(
    filter: AttributeValueFilterDto,
  ): Promise<PaginatedResult<AttributeValueDto>> {
    const qb = this.valueRepository.createQueryBuilder('av');
    if (filter.search) {
      qb.andWhere(`unaccent(LOWER(av.value)) ILIKE unaccent(LOWER(:q))`, {
        q: `%${filter.search}%`,
      });
    }
    if (filter.attributeId) {
      qb.andWhere('av.attributeId = :attributeId', {
        attributeId: filter.attributeId,
      });
    }
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => AttributeValueDto.fromEntity(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<AttributeValueDto> {
    const value = await this.valueRepository.findOneBy({ id });
    if (!value) {
      throw new NotFoundException(`AttributeValue ${id} no encontrado`);
    }
    return AttributeValueDto.fromEntity(value);
  }

  async create(dto: CreateAttributeValueDto): Promise<AttributeValueDto> {
    const attribute = await this.attributeRepository.findOneBy({
      id: dto.attributeId,
    });
    if (!attribute) {
      throw new NotFoundException(`Attribute ${dto.attributeId} no encontrado`);
    }
    const value = this.valueRepository.create({
      value: dto.value,
      attribute,
      attributeId: dto.attributeId,
    });
    try {
      await this.valueRepository.save(value);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe el valor "${dto.value}" para el atributo ${dto.attributeId}`,
        );
      }
      throw e;
    }
    return AttributeValueDto.fromEntity(value);
  }

  async update(
    id: number,
    dto: UpdateAttributeValueDto,
  ): Promise<AttributeValueDto> {
    const value = await this.valueRepository.findOneBy({ id });
    if (!value) {
      throw new NotFoundException(`AttributeValue ${id} no encontrado`);
    }
    if (dto.value !== undefined) {
      value.value = dto.value;
    }
    if (dto.attributeId !== undefined) {
      const attribute = await this.attributeRepository.findOneBy({
        id: dto.attributeId,
      });
      if (!attribute) {
        throw new NotFoundException(
          `Attribute ${dto.attributeId} no encontrado`,
        );
      }
      value.attribute = attribute;
      value.attributeId = dto.attributeId;
    }
    try {
      await this.valueRepository.save(value);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe ese valor para el atributo indicado`,
        );
      }
      throw e;
    }
    return AttributeValueDto.fromEntity(value);
  }

  async remove(id: number): Promise<void> {
    const value = await this.valueRepository.findOneBy({ id });
    if (!value) {
      throw new NotFoundException(`AttributeValue ${id} no encontrado`);
    }
    try {
      await this.valueRepository.delete(id);
    } catch (e) {
      if (isForeignKeyViolation(e)) {
        throw new ConflictException(
          `No se puede eliminar el valor ${id} porque está referenciado por productos`,
        );
      }
      throw e;
    }
  }
}
