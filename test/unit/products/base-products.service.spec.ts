/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                     @typescript-eslint/no-unsafe-return,
                     @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { validate } from 'class-validator';
import { BaseProductsService } from '../../../src/modules/products/services/base-products.service';
import { BaseProduct } from '../../../src/modules/products/entities/base-product.entity';
import { Product } from '../../../src/modules/products/entities/producto.entity';
import { Brand } from '../../../src/modules/products/entities/brand.entity';
import { MeasurementUnit } from '../../../src/modules/measurement-units/entities/measurement-unit.entity';
import { CreateBaseProductDto } from '../../../src/modules/products/dtos/base-product/create-base-product.dto';
import { UpdateBaseProductDto } from '../../../src/modules/products/dtos/base-product/update-base-product.dto';
import { UnitOfWork } from '../../../src/database/unitOfWork';

function pgError(code: string) {
  const error = new Error(`pg error ${code}`) as Error & { code?: string };
  error.code = code;
  return error;
}

type ManagerStub = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  find: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function makeDto(): CreateBaseProductDto {
  const dto = new CreateBaseProductDto();
  dto.name = 'Clavo';
  dto.units = [
    { unitId: 1, factor: 1, isMain: true },
    { unitId: 2, factor: 12.5, isMain: false },
  ];
  return dto;
}

const loadedProductStub = {
  id: 10,
  name: 'Clavo',
  stock: '0.00',
  price: '0.00',
  attributeKey: '',
  baseProduct: {
    id: 1,
    name: 'Clavo',
    units: [
      {
        id: 100,
        baseProductId: 1,
        isMain: true,
        factor: '1.00',
        unit: { id: 1, name: 'Kilogramo', value: 'kg' },
      },
      {
        id: 101,
        baseProductId: 1,
        isMain: false,
        factor: '12.50',
        unit: { id: 2, name: 'Gramo', value: 'g' },
      },
    ],
  },
  productAttributes: [],
};

describe('BaseProductsService.create', () => {
  let service: BaseProductsService;
  let manager: ManagerStub;
  let queryRunner: Record<string, jest.Mock | ManagerStub>;

  beforeEach(async () => {
    manager = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    queryRunner = {
      manager,
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    // UnitOfWork stub that mimics the real transactional behavior
    // (commit on success, rollback + rethrow on error).
    const unitOfWork = {
      execute: jest.fn(
        async <T>(work: (qr: QueryRunner) => Promise<T>): Promise<T> => {
          try {
            const result = await work(queryRunner as unknown as QueryRunner);
            await (queryRunner.commitTransaction as jest.Mock)();
            return result;
          } catch (e) {
            await (queryRunner.rollbackTransaction as jest.Mock)();
            throw e;
          } finally {
            await (queryRunner.release as jest.Mock)();
          }
        },
      ),
    } as unknown as UnitOfWork;

    const module = await Test.createTestingModule({
      providers: [
        BaseProductsService,
        { provide: getRepositoryToken(BaseProduct), useValue: {} },
        { provide: UnitOfWork, useValue: unitOfWork },
      ],
    }).compile();
    service = module.get(BaseProductsService);
  });

  function setupHappyPath() {
    manager.create.mockImplementation((target, data) => ({ ...data }));
    // save: single-entity calls (1 arg) set the id; bulk calls (2 args) passthrough.
    manager.save.mockImplementation((...args: any[]) => {
      if (args.length === 1) {
        const entity = args[0] as {
          id?: number;
          attributeKey?: string;
        };
        if ('attributeKey' in entity) {
          entity.id = 10;
          return entity;
        }
        entity.id = 1;
        return entity;
      }
      return args[1];
    });
    // MeasurementUnit lookups (per unit)
    manager.findOneBy.mockImplementation((target, opts) => {
      if (target === MeasurementUnit) {
        const unitId = (opts as { id: number }).id;
        if (unitId === 1 || unitId === 2) {
          return {
            id: unitId,
            name: unitId === 1 ? 'Kilogramo' : 'Gramo',
            value: unitId === 1 ? 'kg' : 'g',
          };
        }
      }
      return null;
    });
    // Product refetch (persistent; can be overridden with mockResolvedValueOnce)
    manager.findOne.mockResolvedValue(loadedProductStub);
  }

  it('happy path: returns baseProduct + defaultProduct with correct fields', async () => {
    setupHappyPath();

    const result = await service.create(makeDto());

    expect(result.baseProduct).toEqual({
      id: 1,
      name: 'Clavo',
      productCount: 1,
      brand: null,
      categories: [],
    });
    expect(result.defaultProduct).toMatchObject({
      id: 10,
      name: 'Clavo',
      stock: 0,
      price: 0,
      baseProductId: 1,
      baseProductName: 'Clavo',
      productAttributes: [],
      stockLabel: '0 kg',
    });
    expect(result.defaultProduct.units).toHaveLength(2);
    expect(result.defaultProduct.units[0]).toMatchObject({
      unitId: 1,
      isMain: true,
      factor: 1,
    });
    expect(result.defaultProduct.units[1]).toMatchObject({
      unitId: 2,
      isMain: false,
      factor: 12.5,
    });

    // refetch was called with the proper relations
    expect(manager.findOne).toHaveBeenCalledWith(Product, {
      where: { id: 10 },
      relations: {
        baseProduct: { units: { unit: true } },
        productAttributes: { attribute: true, attributeValue: true },
      },
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('throws ConflictException (409) on duplicate baseProduct name', async () => {
    manager.create.mockImplementation((target, data) => ({ ...data }));
    manager.save.mockRejectedValueOnce(pgError('23505'));

    await expect(service.create(makeDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundException (404) on missing unitId (rollback)', async () => {
    manager.create.mockImplementation((target, data) => ({ ...data }));
    // baseProduct.save ok
    manager.save.mockResolvedValueOnce({ id: 1, name: 'Clavo' });
    // MeasurementUnit lookup returns null
    manager.findOneBy.mockResolvedValue(null);

    await expect(service.create(makeDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('throws ConflictException (409) on unique violation while saving units', async () => {
    manager.create.mockImplementation((target, data) => ({ ...data }));
    manager.save.mockResolvedValueOnce({ id: 1, name: 'Clavo' });
    manager.findOneBy.mockImplementation((target, opts) => {
      if (target === MeasurementUnit) {
        return {
          id: (opts as { id: number }).id,
          name: 'X',
          value: 'x',
        };
      }
      return null;
    });
    // second save call (bulk BaseProductUnit save) rejects
    manager.save.mockRejectedValueOnce(pgError('23505'));

    await expect(service.create(makeDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('creates the default product with stock=0, price=0, attributeKey="" and no productAttributes', async () => {
    setupHappyPath();

    await service.create(makeDto());

    const productCreateCalls = manager.create.mock.calls.filter(
      (call) => call[0] === Product,
    );
    expect(productCreateCalls).toHaveLength(1);
    expect(productCreateCalls[0][1]).toMatchObject({
      name: 'Clavo',
      stock: '0.00',
      price: '0.00',
      attributeKey: '',
    });

    const productSaves = manager.save.mock.calls.filter((call) => {
      const target = call[0];
      return target && typeof target === 'object' && 'attributeKey' in target;
    });
    expect(productSaves).toHaveLength(1);
  });

  it('rolls back when the refetch returns no product', async () => {
    setupHappyPath();
    // override the persistent findOne mock with a one-shot null
    manager.findOne.mockResolvedValueOnce(null);

    await expect(service.create(makeDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('create with brandId + categoryIds persists associations and returns them', async () => {
    setupHappyPath();
    manager.findOneBy.mockImplementation((target, opts) => {
      if (target === MeasurementUnit) {
        const unitId = (opts as { id: number }).id;
        if (unitId === 1 || unitId === 2) {
          return {
            id: unitId,
            name: unitId === 1 ? 'Kilogramo' : 'Gramo',
            value: unitId === 1 ? 'kg' : 'g',
          };
        }
      }
      if (target === Brand) {
        return { id: 5, name: 'Cerámica', description: null };
      }
      return null;
    });
    manager.find.mockResolvedValue([
      { id: 1, name: 'Ferretería', description: null },
      { id: 2, name: 'Construcción', description: null },
    ]);
    const relationStub = { add: jest.fn().mockResolvedValue(undefined) };
    manager.createQueryBuilder.mockImplementation(() => ({
      relation: jest.fn().mockReturnValue({
        of: jest.fn().mockReturnValue(relationStub),
      }),
    }));

    const dto = makeDto();
    dto.brandId = 5;
    dto.categoryIds = [1, 2];
    const result = await service.create(dto);

    expect(result.baseProduct).toEqual({
      id: 1,
      name: 'Clavo',
      productCount: 1,
      brand: { id: 5, name: 'Cerámica' },
      categories: [
        { id: 1, name: 'Ferretería' },
        { id: 2, name: 'Construcción' },
      ],
    });
    expect(relationStub.add).toHaveBeenCalledWith([1, 2]);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('create with brandId null leaves brand as null', async () => {
    setupHappyPath();
    const dto = makeDto();
    dto.brandId = null;

    const result = await service.create(dto);

    expect(result.baseProduct.brand).toBeNull();
    expect(result.baseProduct.categories).toEqual([]);
  });

  it('throws NotFoundException on missing brandId with total rollback', async () => {
    manager.create.mockImplementation((target, data) => ({ ...data }));
    manager.findOneBy.mockResolvedValue(null);
    const dto = makeDto();
    dto.brandId = 999;

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundException on missing categoryId with total rollback', async () => {
    manager.create.mockImplementation((target, data) => ({ ...data }));
    manager.find.mockResolvedValue([{ id: 1, name: 'Ferretería' }]);
    const dto = makeDto();
    dto.categoryIds = [1, 999];

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('CreateBaseProductDto rejects duplicated categoryIds (400)', async () => {
    const dto = new CreateBaseProductDto();
    dto.name = 'Clavo';
    dto.units = [{ unitId: 1, factor: 1, isMain: true }];
    dto.categoryIds = [1, 1];

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'categoryIds')).toBe(true);
  });
});

describe('BaseProductsService.update', () => {
  let service: BaseProductsService;
  let manager: ManagerStub;
  let queryRunner: Record<string, jest.Mock | ManagerStub>;

  beforeEach(async () => {
    manager = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    queryRunner = {
      manager,
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    const unitOfWork = {
      execute: jest.fn(
        async <T>(work: (qr: QueryRunner) => Promise<T>): Promise<T> => {
          try {
            const result = await work(queryRunner as unknown as QueryRunner);
            await (queryRunner.commitTransaction as jest.Mock)();
            return result;
          } catch (e) {
            await (queryRunner.rollbackTransaction as jest.Mock)();
            throw e;
          } finally {
            await (queryRunner.release as jest.Mock)();
          }
        },
      ),
    } as unknown as UnitOfWork;

    const module = await Test.createTestingModule({
      providers: [
        BaseProductsService,
        { provide: getRepositoryToken(BaseProduct), useValue: {} },
        { provide: UnitOfWork, useValue: unitOfWork },
      ],
    }).compile();
    service = module.get(BaseProductsService);
  });

  it('only changes name when brandId/categoryIds are absent', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [],
    });
    manager.save.mockResolvedValue({});
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo 2',
      brand: null,
      categories: [],
    });
    const dto = new UpdateBaseProductDto();
    dto.name = 'Clavo 2';

    const result = await service.update(1, dto);

    expect(manager.save).toHaveBeenCalledWith({
      id: 1,
      name: 'Clavo 2',
      brandId: null,
      categories: [],
    });
    expect(result).toEqual({
      id: 1,
      name: 'Clavo 2',
      productCount: 0,
      brand: null,
      categories: [],
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('brandId number validates existence and reassigns', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [],
    });
    manager.findOneBy.mockResolvedValue({ id: 7, name: 'Sika' });
    manager.save.mockResolvedValue({});
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brand: { id: 7, name: 'Sika' },
      categories: [],
    });
    const dto = new UpdateBaseProductDto();
    dto.brandId = 7;

    const result = await service.update(1, dto);

    expect(manager.findOneBy).toHaveBeenCalledWith(Brand, { id: 7 });
    expect(result.brand).toEqual({ id: 7, name: 'Sika' });
  });

  it('brandId null clears the brand', async () => {
    const bp = {
      id: 1,
      name: 'Clavo',
      brandId: 5,
      categories: [],
    };
    manager.findOne.mockResolvedValueOnce(bp);
    manager.save.mockResolvedValue({});
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brand: null,
      categories: [],
    });
    const dto = new UpdateBaseProductDto();
    dto.brandId = null;

    const result = await service.update(1, dto);

    expect(bp.brandId).toBeNull();
    expect(manager.findOneBy).not.toHaveBeenCalled();
    expect(result.brand).toBeNull();
  });

  it('missing brandId throws NotFoundException (rollback)', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [],
    });
    manager.findOneBy.mockResolvedValue(null);
    const dto = new UpdateBaseProductDto();
    dto.brandId = 999;

    await expect(service.update(1, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('categoryIds present replaces the set', async () => {
    const bp = {
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [{ id: 1, name: 'Ferretería' }],
    };
    manager.findOne.mockResolvedValueOnce(bp);
    manager.find.mockResolvedValue([{ id: 2, name: 'Construcción' }]);
    manager.save.mockResolvedValue({});
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brand: null,
      categories: [{ id: 2, name: 'Construcción' }],
    });

    const dto = new UpdateBaseProductDto();
    dto.categoryIds = [2];
    const result = await service.update(1, dto);

    expect(bp.categories).toEqual([{ id: 2, name: 'Construcción' }]);
    expect(result.categories).toEqual([{ id: 2, name: 'Construcción' }]);
  });

  it('categoryIds [] clears the categories', async () => {
    const bp = {
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [{ id: 1, name: 'Ferretería' }],
    };
    manager.findOne.mockResolvedValueOnce(bp);
    manager.save.mockResolvedValue({});
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brand: null,
      categories: [],
    });

    const dto = new UpdateBaseProductDto();
    dto.categoryIds = [];
    const result = await service.update(1, dto);

    expect(bp.categories).toEqual([]);
    expect(manager.find).not.toHaveBeenCalled();
    expect(result.categories).toEqual([]);
  });

  it('missing categoryId throws NotFoundException (rollback)', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [],
    });
    manager.find.mockResolvedValue([{ id: 1, name: 'Ferretería' }]);
    const dto = new UpdateBaseProductDto();
    dto.categoryIds = [1, 999];

    await expect(service.update(1, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the base product does not exist', async () => {
    manager.findOne.mockResolvedValueOnce(null);
    const dto = new UpdateBaseProductDto();

    await expect(service.update(1, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictException on unique name violation (rollback)', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Clavo',
      brandId: null,
      categories: [],
    });
    manager.save.mockRejectedValue(pgError('23505'));
    const dto = new UpdateBaseProductDto();
    dto.name = 'Clavo repetido';

    await expect(service.update(1, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });
});
