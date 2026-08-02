import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttributesService } from '../../../src/modules/attributes/services/attributes.service';
import { Attribute } from '../../../src/modules/attributes/entities/attribute.entity';
import { AttributeFilterDto } from '../../../src/modules/attributes/dtos/attribute/filter-attribute.dto';
import { CreateAttributeDto } from '../../../src/modules/attributes/dtos/attribute/create-attribute.dto';
import { UpdateAttributeDto } from '../../../src/modules/attributes/dtos/attribute/update-attribute.dto';

function createQueryBuilderStub(rows: Attribute[], total: number) {
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

describe('AttributesService', () => {
  let service: AttributesService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        AttributesService,
        { provide: getRepositoryToken(Attribute), useValue: repo },
      ],
    }).compile();
    service = module.get(AttributesService);
  });

  describe('findAll', () => {
    it('paginates and maps to AttributeDto', async () => {
      const { qb, createQueryBuilder } = createQueryBuilderStub(
        [
          { id: 1, name: 'Color' },
          { id: 2, name: 'Talla' },
        ] as Attribute[],
        2,
      );
      repo.createQueryBuilder = createQueryBuilder;
      const filter = new AttributeFilterDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(createQueryBuilder).toHaveBeenCalledWith('a');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [
          { id: 1, name: 'Color' },
          { id: 2, name: 'Talla' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        lastPage: 1,
      });
    });

    it('applies the search filter', async () => {
      const { qb, createQueryBuilder } = createQueryBuilderStub([], 0);
      repo.createQueryBuilder = createQueryBuilder;
      const filter = new AttributeFilterDto();
      filter.page = 1;
      filter.limit = 20;
      filter.search = 'color';

      await service.findAll(filter);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'unaccent(LOWER(a.name)) ILIKE unaccent(LOWER(:q))',
        { q: '%color%' },
      );
    });

    it('computes lastPage as 0 when there are no rows', async () => {
      const { createQueryBuilder } = createQueryBuilderStub([], 0);
      repo.createQueryBuilder = createQueryBuilder;
      const filter = new AttributeFilterDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(result.lastPage).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns the AttributeDto when it exists', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Color' });
      await expect(service.findOne(1)).resolves.toEqual({
        id: 1,
        name: 'Color',
      });
    });

    it('throws NotFoundException when it does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns the AttributeDto', async () => {
      const attribute = { id: 1, name: 'Color' };
      repo.create.mockReturnValue(attribute);
      repo.save.mockResolvedValue(attribute);
      const dto = new CreateAttributeDto();
      dto.name = 'Color';

      await expect(service.create(dto)).resolves.toEqual({
        id: 1,
        name: 'Color',
      });
      expect(repo.create).toHaveBeenCalledWith({ name: 'Color' });
    });

    it('throws ConflictException on unique violation', async () => {
      repo.create.mockReturnValue({ name: 'Color' });
      repo.save.mockRejectedValue(pgError('23505'));

      const dto = new CreateAttributeDto();
      dto.name = 'Color';

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates the name and returns the AttributeDto', async () => {
      const attribute = { id: 1, name: 'Color' };
      repo.findOneBy.mockResolvedValue(attribute);
      repo.save.mockResolvedValue({ ...attribute, name: 'Color' });
      const dto = new UpdateAttributeDto();
      dto.name = 'Color';

      await expect(service.update(1, dto)).resolves.toEqual({
        id: 1,
        name: 'Color',
      });
    });

    it('throws NotFoundException when the attribute does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const dto = new UpdateAttributeDto();
      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException on unique violation', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Color' });
      repo.save.mockRejectedValue(pgError('23505'));
      const dto = new UpdateAttributeDto();
      dto.name = 'Talla';

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the attribute', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Color' });
      repo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when the attribute does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException on foreign key violation', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Color' });
      repo.delete.mockRejectedValue(pgError('23503'));

      await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
