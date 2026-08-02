import { ConflictException, Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/database/unitOfWork';
import { Attribute } from '../entities/attribute.entity';
import { AttributeValue } from '../entities/attribute-value.entity';
import { CreateAttributeBatchDto } from '../dtos/attribute/create-attribute-batch.dto';
import { AttributeWithValuesDto } from '../dtos/attribute/attribute-with-values.dto';
import { AttributeValueDto } from '../dtos/attribute-value/attribute-value.dto';
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
}
