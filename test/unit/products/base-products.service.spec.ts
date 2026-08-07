/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                     @typescript-eslint/no-unsafe-return,
                     @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { BaseProductsService } from '../../../src/modules/products/services/base-products.service';
import { BaseProduct } from '../../../src/modules/products/entities/base-product.entity';
import { Product } from '../../../src/modules/products/entities/producto.entity';
import { MeasurementUnit } from '../../../src/modules/measurement-units/entities/measurement-unit.entity';
import { CreateBaseProductDto } from '../../../src/modules/products/dtos/base-product/create-base-product.dto';
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
});
