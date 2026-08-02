import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttributeValuesService } from '../../../src/modules/attributes/services/attribute-values.service';
import { AttributeValue } from '../../../src/modules/attributes/entities/attribute-value.entity';
import { Attribute } from '../../../src/modules/attributes/entities/attribute.entity';
import { AttributeValueFilterDto } from '../../../src/modules/attributes/dtos/attribute-value/filter-attribute-value.dto';
import { CreateAttributeValueDto } from '../../../src/modules/attributes/dtos/attribute-value/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../../../src/modules/attributes/dtos/attribute-value/update-attribute-value.dto';

function createQueryBuilderStub(rows: AttributeValue[], total: number) {
  const qb = {
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
  };
  return { qb, createQueryBuilder: jest.fn(() => qb) };
}

function pgError(code: string) {
  const error = new Error(`pg error ${code}`) as Error & { code?: string };
  error.code = code;
  return error;
}

describe('AttributeValuesService', () => {
  let service: AttributeValuesService;
  let valueRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let attributeRepo: {
    findOneBy: jest.Mock;
  };

  beforeEach(async () => {
    valueRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    attributeRepo = { findOneBy: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AttributeValuesService,
        { provide: getRepositoryToken(AttributeValue), useValue: valueRepo },
        { provide: getRepositoryToken(Attribute), useValue: attributeRepo },
      ],
    }).compile();
    service = module.get(AttributeValuesService);
  });

  describe('findAll', () => {
    it('paginates and maps to AttributeValueDto', async () => {
      const { qb, createQueryBuilder } = createQueryBuilderStub(
        [
          { id: 1, value: 'Rojo', attributeId: 1 },
          { id: 2, value: 'Azul', attributeId: 1 },
        ] as AttributeValue[],
        2,
      );
      valueRepo.createQueryBuilder = createQueryBuilder;
      const filter = new AttributeValueFilterDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(createQueryBuilder).toHaveBeenCalledWith('av');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [
          { id: 1, value: 'Rojo', attributeId: 1 },
          { id: 2, value: 'Azul', attributeId: 1 },
        ],
        total: 2,
        page: 1,
        limit: 20,
        lastPage: 1,
      });
    });

    it('applies search and attributeId filters', async () => {
      const { qb, createQueryBuilder } = createQueryBuilderStub([], 0);
      valueRepo.createQueryBuilder = createQueryBuilder;
      const filter = new AttributeValueFilterDto();
      filter.page = 1;
      filter.limit = 20;
      filter.search = 'roj';
      filter.attributeId = 5;

      await service.findAll(filter);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'unaccent(LOWER(av.value)) ILIKE unaccent(LOWER(:q))',
        { q: '%roj%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'av.attributeId = :attributeId',
        {
          attributeId: 5,
        },
      );
    });

    it('computes lastPage as 0 when there are no rows', async () => {
      const { createQueryBuilder } = createQueryBuilderStub([], 0);
      valueRepo.createQueryBuilder = createQueryBuilder;
      const filter = new AttributeValueFilterDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(result.lastPage).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns the AttributeValueDto when it exists', async () => {
      valueRepo.findOneBy.mockResolvedValue({
        id: 1,
        value: 'Rojo',
        attributeId: 1,
      });
      await expect(service.findOne(1)).resolves.toEqual({
        id: 1,
        value: 'Rojo',
        attributeId: 1,
      });
    });

    it('throws NotFoundException when it does not exist', async () => {
      valueRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the attribute does not exist', async () => {
      attributeRepo.findOneBy.mockResolvedValue(null);
      const dto = new CreateAttributeValueDto();
      dto.value = 'Rojo';
      dto.attributeId = 1;

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates and returns the AttributeValueDto', async () => {
      const attribute = { id: 1, name: 'Color' };
      const value = { id: 1, value: 'Rojo', attribute, attributeId: 1 };
      attributeRepo.findOneBy.mockResolvedValue(attribute);
      valueRepo.create.mockReturnValue(value);
      valueRepo.save.mockResolvedValue(value);
      const dto = new CreateAttributeValueDto();
      dto.value = 'Rojo';
      dto.attributeId = 1;

      await expect(service.create(dto)).resolves.toEqual({
        id: 1,
        value: 'Rojo',
        attributeId: 1,
      });
      expect(valueRepo.create).toHaveBeenCalledWith({
        value: 'Rojo',
        attribute,
        attributeId: 1,
      });
    });

    it('throws ConflictException on unique violation', async () => {
      attributeRepo.findOneBy.mockResolvedValue({ id: 1, name: 'Color' });
      valueRepo.create.mockReturnValue({});
      valueRepo.save.mockRejectedValue(pgError('23505'));
      const dto = new CreateAttributeValueDto();
      dto.value = 'Rojo';
      dto.attributeId = 1;

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates the value and returns the AttributeValueDto', async () => {
      const value = { id: 1, value: 'Rojo', attributeId: 1 };
      valueRepo.findOneBy.mockResolvedValue(value);
      valueRepo.save.mockResolvedValue({ ...value, value: 'Rosa' });
      const dto = new UpdateAttributeValueDto();
      dto.value = 'Rosa';

      await expect(service.update(1, dto)).resolves.toEqual({
        id: 1,
        value: 'Rosa',
        attributeId: 1,
      });
    });

    it('throws NotFoundException when the value does not exist', async () => {
      valueRepo.findOneBy.mockResolvedValue(null);
      const dto = new UpdateAttributeValueDto();
      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException when moving to a non-existent attribute', async () => {
      valueRepo.findOneBy.mockResolvedValue({ id: 1, attributeId: 1 });
      attributeRepo.findOneBy.mockResolvedValue(null);
      const dto = new UpdateAttributeValueDto();
      dto.attributeId = 99;

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the value', async () => {
      valueRepo.findOneBy.mockResolvedValue({ id: 1, value: 'Rojo' });
      valueRepo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(valueRepo.delete).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when the value does not exist', async () => {
      valueRepo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException on foreign key violation', async () => {
      valueRepo.findOneBy.mockResolvedValue({ id: 1, value: 'Rojo' });
      valueRepo.delete.mockRejectedValue(pgError('23503'));

      await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
