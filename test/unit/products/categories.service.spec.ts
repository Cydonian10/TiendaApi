import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../../src/modules/products/services/categories.service';
import { Category } from '../../../src/modules/products/entities/category.entity';
import { CategoryFilterDto } from '../../../src/modules/products/dtos/category/filter-category.dto';
import { CreateCategoryDto } from '../../../src/modules/products/dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../../../src/modules/products/dtos/category/update-category.dto';

function createQueryBuilderStub(rows: Category[], total: number) {
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

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: { query: jest.Mock };
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile();
    service = module.get(CategoriesService);
  });

  describe('findAll', () => {
    it('paginates and maps to CategoryDto', async () => {
      const { qb, createQueryBuilder } = createQueryBuilderStub(
        [
          { id: 1, name: 'Ferretería', description: null },
          { id: 2, name: 'Construcción', description: 'Materiales' },
        ] as Category[],
        2,
      );
      repo.createQueryBuilder = createQueryBuilder;
      const filter = new CategoryFilterDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(createQueryBuilder).toHaveBeenCalledWith('c');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [
          { id: 1, name: 'Ferretería', description: null },
          { id: 2, name: 'Construcción', description: 'Materiales' },
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
      const filter = new CategoryFilterDto();
      filter.page = 1;
      filter.limit = 20;
      filter.search = 'ferre';

      await service.findAll(filter);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'unaccent(LOWER(c.name)) ILIKE unaccent(LOWER(:q))',
        { q: '%ferre%' },
      );
    });
  });

  describe('findOne', () => {
    it('returns the CategoryDto when it exists', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        name: 'Ferretería',
        description: null,
      });
      await expect(service.findOne(1)).resolves.toEqual({
        id: 1,
        name: 'Ferretería',
        description: null,
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
    it('creates with description and returns the CategoryDto', async () => {
      const category = {
        id: 1,
        name: 'Ferretería',
        description: 'Artículos de ferretería',
      };
      repo.create.mockReturnValue(category);
      repo.save.mockResolvedValue(category);
      const dto = new CreateCategoryDto();
      dto.name = 'Ferretería';
      dto.description = 'Artículos de ferretería';

      await expect(service.create(dto)).resolves.toEqual(category);
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Ferretería',
        description: 'Artículos de ferretería',
      });
    });

    it('creates with null description when omitted', async () => {
      const category = { id: 1, name: 'Pinturas', description: null };
      repo.create.mockReturnValue(category);
      repo.save.mockResolvedValue(category);
      const dto = new CreateCategoryDto();
      dto.name = 'Pinturas';

      await expect(service.create(dto)).resolves.toEqual(category);
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Pinturas',
        description: null,
      });
    });

    it('throws ConflictException on unique violation', async () => {
      repo.create.mockReturnValue({ name: 'Ferretería' });
      repo.save.mockRejectedValue(pgError('23505'));
      const dto = new CreateCategoryDto();
      dto.name = 'Ferretería';

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates name/description and returns the CategoryDto', async () => {
      const category = { id: 1, name: 'Ferretería', description: null };
      repo.findOneBy.mockResolvedValue(category);
      repo.save.mockResolvedValue({ ...category, description: 'Materiales' });
      const dto = new UpdateCategoryDto();
      dto.description = 'Materiales';

      await expect(service.update(1, dto)).resolves.toEqual({
        id: 1,
        name: 'Ferretería',
        description: 'Materiales',
      });
    });

    it('throws NotFoundException when the category does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const dto = new UpdateCategoryDto();
      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException on unique violation', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        name: 'Ferretería',
        description: null,
      });
      repo.save.mockRejectedValue(pgError('23505'));
      const dto = new UpdateCategoryDto();
      dto.name = 'Pinturas';

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the category when it has no references', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Ferretería' });
      repo.manager.query.mockResolvedValue([{ total: 0 }]);
      repo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('throws ConflictException when it has base-products associated', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Ferretería' });
      repo.manager.query.mockResolvedValue([{ total: 3 }]);

      await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the category does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
