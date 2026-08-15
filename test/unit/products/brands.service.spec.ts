import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BrandsService } from '../../../src/modules/products/services/brands.service';
import { Brand } from '../../../src/modules/products/entities/brand.entity';
import { BrandFilterDto } from '../../../src/modules/products/dtos/brand/filter-brand.dto';
import { CreateBrandDto } from '../../../src/modules/products/dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../../../src/modules/products/dtos/brand/update-brand.dto';

function createQueryBuilderStub(rows: Brand[], total: number) {
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

describe('BrandsService', () => {
  let service: BrandsService;
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
        BrandsService,
        { provide: getRepositoryToken(Brand), useValue: repo },
      ],
    }).compile();
    service = module.get(BrandsService);
  });

  describe('findAll', () => {
    it('paginates and maps to BrandDto', async () => {
      const { qb, createQueryBuilder } = createQueryBuilderStub(
        [
          { id: 1, name: 'Cerámica', description: null },
          { id: 2, name: 'Sika', description: 'Marca de químicos' },
        ] as Brand[],
        2,
      );
      repo.createQueryBuilder = createQueryBuilder;
      const filter = new BrandFilterDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(createQueryBuilder).toHaveBeenCalledWith('b');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [
          { id: 1, name: 'Cerámica', description: null },
          { id: 2, name: 'Sika', description: 'Marca de químicos' },
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
      const filter = new BrandFilterDto();
      filter.page = 1;
      filter.limit = 20;
      filter.search = 'ceram';

      await service.findAll(filter);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'unaccent(LOWER(b.name)) ILIKE unaccent(LOWER(:q))',
        { q: '%ceram%' },
      );
    });
  });

  describe('findOne', () => {
    it('returns the BrandDto when it exists', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        name: 'Cerámica',
        description: null,
      });
      await expect(service.findOne(1)).resolves.toEqual({
        id: 1,
        name: 'Cerámica',
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
    it('creates with description and returns the BrandDto', async () => {
      const brand = {
        id: 1,
        name: 'Cerámica',
        description: 'Marca de cerámicos',
      };
      repo.create.mockReturnValue(brand);
      repo.save.mockResolvedValue(brand);
      const dto = new CreateBrandDto();
      dto.name = 'Cerámica';
      dto.description = 'Marca de cerámicos';

      await expect(service.create(dto)).resolves.toEqual(brand);
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Cerámica',
        description: 'Marca de cerámicos',
      });
    });

    it('creates with null description when omitted', async () => {
      const brand = { id: 1, name: 'Sika', description: null };
      repo.create.mockReturnValue(brand);
      repo.save.mockResolvedValue(brand);
      const dto = new CreateBrandDto();
      dto.name = 'Sika';

      await expect(service.create(dto)).resolves.toEqual(brand);
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Sika',
        description: null,
      });
    });

    it('throws ConflictException on unique violation', async () => {
      repo.create.mockReturnValue({ name: 'Cerámica' });
      repo.save.mockRejectedValue(pgError('23505'));
      const dto = new CreateBrandDto();
      dto.name = 'Cerámica';

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates name/description and returns the BrandDto', async () => {
      const brand = { id: 1, name: 'Cerámica', description: null };
      repo.findOneBy.mockResolvedValue(brand);
      repo.save.mockResolvedValue({ ...brand, description: 'Marca' });
      const dto = new UpdateBrandDto();
      dto.description = 'Marca';

      await expect(service.update(1, dto)).resolves.toEqual({
        id: 1,
        name: 'Cerámica',
        description: 'Marca',
      });
    });

    it('throws NotFoundException when the brand does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const dto = new UpdateBrandDto();
      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException on unique violation', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        name: 'Cerámica',
        description: null,
      });
      repo.save.mockRejectedValue(pgError('23505'));
      const dto = new UpdateBrandDto();
      dto.name = 'Sika';

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the brand', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Cerámica' });
      repo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when the brand does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException on foreign key violation', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, name: 'Cerámica' });
      repo.delete.mockRejectedValue(pgError('23503'));

      await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
