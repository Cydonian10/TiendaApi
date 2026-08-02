import { ConflictException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { UnitOfWork } from '@/database/unitOfWork';
import { Attribute } from '../entities/attribute.entity';
import { AttributeValue } from '../entities/attribute-value.entity';
import { CreateAttributeBatchDto } from '../dtos/attribute/create-attribute-batch.dto';
import { AttributeWithValuesDto } from '../dtos/attribute/attribute-with-values.dto';
import { AttributeValueDto } from '../dtos/attribute-value/attribute-value.dto';
import { AttributeFilterDto } from '../dtos/attribute/filter-attribute.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import { isUniqueViolation } from '@/common/utils/pg-errors';

@Injectable()
export class AttributesBatchService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async createWithValues(
    dto: CreateAttributeBatchDto,
  ): Promise<{ attribute: AttributeWithValuesDto; created: boolean }> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const attributeRepository = queryRunner.manager.getRepository(Attribute);
      const valueRepository = queryRunner.manager.getRepository(AttributeValue);

      let attribute = await attributeRepository.findOneBy({ name: dto.name });
      let created = false;
      if (!attribute) {
        attribute = attributeRepository.create({ name: dto.name });
        await attributeRepository.save(attribute);
        created = true;
      }

      const existingValues = await valueRepository.find({
        where: { attributeId: attribute.id },
      });
      const existingValueSet = new Set(
        existingValues.map((existingValue) => existingValue.value),
      );

      for (const batchValue of dto.values) {
        if (existingValueSet.has(batchValue.value)) {
          continue;
        }
        const value = valueRepository.create({
          value: batchValue.value,
          attribute,
          attributeId: attribute.id,
        });
        try {
          await valueRepository.save(value);
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(
              `Ya existe el valor "${batchValue.value}" para el atributo ${attribute.id}`,
            );
          }
          throw error;
        }
      }

      const allValues = await valueRepository.find({
        where: { attributeId: attribute.id },
      });
      return {
        attribute: AttributeWithValuesDto.fromEntity(
          attribute,
          allValues.map((value) => AttributeValueDto.fromEntity(value)),
        ),
        created,
      };
    });
  }

  async findAllWithValues(
    filter: AttributeFilterDto,
  ): Promise<PaginatedResult<AttributeWithValuesDto>> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const attributeRepository = queryRunner.manager.getRepository(Attribute);
      const valueRepository = queryRunner.manager.getRepository(AttributeValue);

      const qb = attributeRepository.createQueryBuilder('a');
      if (filter.search) {
        qb.andWhere(`unaccent(LOWER(a.name)) ILIKE unaccent(LOWER(:q))`, {
          q: `%${filter.search}%`,
        });
      }
      qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
      const [rows, total] = await qb.getManyAndCount();

      let values: AttributeValue[] = [];
      if (rows.length > 0) {
        values = await valueRepository.find({
          where: { attributeId: In(rows.map((row) => row.id)) },
        });
      }
      const valuesByAttribute = new Map<number, AttributeValueDto[]>();
      for (const value of values) {
        const list = valuesByAttribute.get(value.attributeId) ?? [];
        list.push(AttributeValueDto.fromEntity(value));
        valuesByAttribute.set(value.attributeId, list);
      }

      return {
        data: rows.map((row) =>
          AttributeWithValuesDto.fromEntity(
            row,
            valuesByAttribute.get(row.id) ?? [],
          ),
        ),
        total,
        page: filter.page,
        limit: filter.limit,
        lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
      };
    });
  }
}
